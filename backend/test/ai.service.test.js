const test = require('node:test');
const assert = require('node:assert/strict');

const { AIService, analyzeCode } = require('../src/services/ai/ai.service');

const validInput = {
  developerId: 'DEV001',
  language: 'javascript',
  sourceCode: "const query = 'SELECT * FROM users WHERE id = ' + req.query.id;",
  staticFindings: [{ ruleId: 'sql-injection', type: 'SQL_INJECTION', category: 'SECURITY' }],
  developerHistory: [{ type: 'SQL_INJECTION', count: 2 }],
};

test('analyzeCode accepts valid contract input and returns findings', async () => {
  const result = await analyzeCode(validInput);
  assert.equal(Array.isArray(result.findings), true);
});

test('validateAIInput rejects empty source code', async () => {
  await assert.rejects(
    () => analyzeCode({ ...validInput, sourceCode: '' }),
    /sourceCode cannot be empty/i
  );
});

test('validateAIInput rejects unsupported language', async () => {
  await assert.rejects(
    () => analyzeCode({ ...validInput, language: 'assembly' }),
    /unsupported language/i
  );
});

test('AI output must not include severity field', async () => {
  const service = new AIService({
    client: {
      async generateStructuredFindings() {
        return {
          findings: [
            {
              id: 'F001',
              category: 'SECURITY',
              type: 'SQL_INJECTION',
              title: 'Unsanitized input',
              file: 'input.js',
              line: 4,
              evidence: 'req.query.id',
              rootCause: 'Untrusted input reaches query builder',
              impact: 'Unauthorized data access',
              recommendation: 'Use parameterized queries',
              relatedFindings: [],
              confidence: 'HIGH',
              severity: 'CRITICAL',
            },
          ],
        };
      },
    },
  });

  await assert.rejects(() => service.analyzeCode(validInput), /must not include severity/i);
});

test('SQL injection input produces structured finding output', async () => {
  const service = new AIService({
    client: {
      async generateStructuredFindings() {
        return {
          findings: [
            {
              id: 'F001',
              category: 'SECURITY',
              type: 'SQL_INJECTION',
              title: 'Unsanitized user input reaches SQL query',
              file: 'input.js',
              line: 4,
              evidence: "req.query.id",
              rootCause: 'User-controlled input is concatenated into a SQL statement.',
              impact: 'The query may be modified to expose or alter records.',
              recommendation: 'Use parameterized queries and validation before database calls.',
              relatedFindings: [],
              confidence: 'HIGH',
            },
          ],
        };
      },
    },
  });

  const result = await service.analyzeCode(validInput);
  assert.equal(result.findings[0].type, 'SQL_INJECTION');
  assert.equal(result.findings[0].category, 'SECURITY');
});

test('hardcoded secret should be categorized as security issue only when evidence exists', async () => {
  const service = new AIService({
    client: {
      async generateStructuredFindings() {
        return {
          findings: [
            {
              id: 'F002',
              category: 'SECURITY',
              type: 'HARDCODED_SECRET',
              title: 'Hardcoded credential found in source code',
              file: 'config.js',
              line: 2,
              evidence: "const password = 'admin123';",
              rootCause: 'Credentials are embedded directly in source.',
              impact: 'Secrets are exposed to anyone with source access.',
              recommendation: 'Store credentials in environment variables or a secret manager.',
              relatedFindings: [],
              confidence: 'HIGH',
            },
          ],
        };
      },
    },
  });

  const result = await service.analyzeCode({
    ...validInput,
    sourceCode: "const password = 'admin123';\nconsole.log(password);",
  });

  assert.equal(result.findings[0].type, 'HARDCODED_SECRET');
});

test('safe code should return an empty findings array', async () => {
  const service = new AIService({
    client: {
      async generateStructuredFindings() {
        return { findings: [] };
      },
    },
  });

  const result = await service.analyzeCode({
    ...validInput,
    sourceCode: "function add(a, b) { return a + b; }",
  });

  assert.deepEqual(result.findings, []);
});

test('related findings can be linked and kept in structured form', async () => {
  const service = new AIService({
    client: {
      async generateStructuredFindings() {
        return {
          findings: [
            {
              id: 'F003',
              category: 'SECURITY',
              type: 'DYNAMIC_SQL',
              title: 'Dynamic SQL query assembly',
              file: 'db.js',
              line: 7,
              evidence: "query = 'SELECT * FROM users WHERE id = ' + input;",
              rootCause: 'Query text is built from untrusted input.',
              impact: 'SQL injection is possible.',
              recommendation: 'Use parameterized queries.',
              relatedFindings: ['F004'],
              confidence: 'HIGH',
            },
            {
              id: 'F004',
              category: 'SECURITY',
              type: 'UNSAFE_DB_CALL',
              title: 'Unsafe database execution path',
              file: 'db.js',
              line: 8,
              evidence: 'db.execute(query)',
              rootCause: 'The tainted query is passed directly to the database driver.',
              impact: 'Attackers can influence database behavior.',
              recommendation: 'Validate and parameterize the query before execution.',
              relatedFindings: ['F003'],
              confidence: 'HIGH',
            },
          ],
        };
      },
    },
  });

  const result = await service.analyzeCode(validInput);
  assert.equal(result.findings[0].relatedFindings.length, 1);
  assert.equal(result.findings[1].relatedFindings[0], 'F003');
});

test('developer history is treated as context and not fabricated', async () => {
  const service = new AIService({
    client: {
      async generateStructuredFindings() {
        return {
          findings: [
            {
              id: 'F005',
              category: 'SECURITY',
              type: 'SQL_INJECTION',
              title: 'Recurring SQL injection pattern',
              file: 'app.js',
              line: 10,
              evidence: "const sql = 'SELECT * FROM users WHERE id = ' + req.query.id;",
              rootCause: 'Reused unsafe SQL construction pattern.',
              impact: 'This issue matches developer history and should be reviewed again.',
              recommendation: 'Use parameterized queries and validate input to prevent recurrence.',
              relatedFindings: [],
              confidence: 'HIGH',
            },
          ],
        };
      },
    },
  });

  const result = await service.analyzeCode({
    ...validInput,
    developerHistory: [{ type: 'SQL_INJECTION', count: 5 }],
  });

  assert.equal(result.findings[0].type, 'SQL_INJECTION');
  assert.equal(result.findings[0].confidence, 'HIGH');
});

test('malformed or empty model output is rejected with AI_INVALID_OUTPUT', async () => {
  const service = new AIService({
    client: {
      async generateStructuredFindings() {
        return { wrong: 'structure' };
      },
    },
  });

  await assert.rejects(() => service.analyzeCode(validInput), /AI_INVALID_OUTPUT|AI output/i);
});
