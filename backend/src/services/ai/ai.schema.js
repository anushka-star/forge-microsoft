const { InvalidInputError, AIInvalidOutputError } = require('./ai.errors');

const VALID_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'csharp',
  'go',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'sql',
  'plaintext',
];

const VALID_CATEGORIES = ['SECURITY', 'BUG', 'CODE_SMELL'];
const VALID_CONFIDENCE = ['HIGH', 'MEDIUM', 'LOW'];
const VALID_FINDING_KEYS = [
  'id',
  'category',
  'type',
  'title',
  'file',
  'line',
  'evidence',
  'rootCause',
  'impact',
  'recommendation',
  'relatedFindings',
  'confidence',
];

const STRICT_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'category',
          'type',
          'title',
          'evidence',
          'rootCause',
          'impact',
          'recommendation',
          'relatedFindings',
          'confidence',
        ],
        properties: {
          id: { type: 'string' },
          category: { type: 'string', enum: VALID_CATEGORIES },
          type: { type: 'string' },
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'number' },
          evidence: { type: 'string' },
          rootCause: { type: 'string' },
          impact: { type: 'string' },
          recommendation: { type: 'string' },
          relatedFindings: {
            type: 'array',
            items: { type: 'string' },
          },
          confidence: { type: 'string', enum: VALID_CONFIDENCE },
        },
      },
    },
  },
};

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value, fieldName) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} cannot be empty.`);
  }

  return trimmed;
}

function normalizeArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array.`);
  }

  return value;
}

function validateAIInput(input) {
  try {
    if (!isPlainObject(input)) {
      throw new Error('AI input must be an object.');
    }

    const developerId = normalizeString(input.developerId, 'developerId');
    const language = normalizeString(input.language, 'language').toLowerCase();
    const sourceCode = input.sourceCode;

    if (typeof sourceCode !== 'string') {
      throw new Error('sourceCode must be a string.');
    }

    if (sourceCode.trim().length === 0) {
      throw new Error('sourceCode cannot be empty.');
    }

    if (!VALID_LANGUAGES.includes(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const staticFindings = normalizeArray(input.staticFindings, 'staticFindings');
    const developerHistory = normalizeArray(input.developerHistory, 'developerHistory');

    return {
      developerId,
      language,
      sourceCode,
      staticFindings,
      developerHistory,
    };
  } catch (error) {
    if (error instanceof InvalidInputError) {
      throw error;
    }

    throw new InvalidInputError({ reason: error.message });
  }
}

function validateAIOutput(payload) {
  try {
    if (!isPlainObject(payload)) {
      throw new Error('AI output must be an object.');
    }

    if (!Array.isArray(payload.findings)) {
      throw new Error('AI output.findings must be an array.');
    }

    payload.findings.forEach((finding, index) => {
      if (!isPlainObject(finding)) {
        throw new Error(`Finding at index ${index} must be an object.`);
      }

      if (finding.severity !== undefined) {
        throw new Error(`Finding at index ${index} must not include severity.`);
      }

      const keys = Object.keys(finding);
      const hasUnexpectedKey = keys.some((key) => !VALID_FINDING_KEYS.includes(key));
      if (hasUnexpectedKey) {
        throw new Error(`Finding at index ${index} contains unsupported fields.`);
      }

      if (typeof finding.id !== 'string' || !finding.id.trim()) {
        throw new Error(`Finding at index ${index} has an invalid id.`);
      }

      if (!VALID_CATEGORIES.includes(finding.category)) {
        throw new Error(`Finding at index ${index} has an invalid category.`);
      }

      if (typeof finding.type !== 'string' || !finding.type.trim()) {
        throw new Error(`Finding at index ${index} has an invalid type.`);
      }

      if (typeof finding.title !== 'string' || !finding.title.trim()) {
        throw new Error(`Finding at index ${index} has an invalid title.`);
      }

      if (typeof finding.file !== 'string' && finding.file !== undefined) {
        throw new Error(`Finding at index ${index} file must be a string or omitted.`);
      }

      if (typeof finding.line !== 'number' && finding.line !== undefined) {
        throw new Error(`Finding at index ${index} line must be a number or omitted.`);
      }

      if (typeof finding.evidence !== 'string' || !finding.evidence.trim()) {
        throw new Error(`Finding at index ${index} needs a valid evidence string.`);
      }

      if (typeof finding.rootCause !== 'string' || !finding.rootCause.trim()) {
        throw new Error(`Finding at index ${index} needs a valid rootCause string.`);
      }

      if (typeof finding.impact !== 'string' || !finding.impact.trim()) {
        throw new Error(`Finding at index ${index} needs a valid impact string.`);
      }

      if (typeof finding.recommendation !== 'string' || !finding.recommendation.trim()) {
        throw new Error(`Finding at index ${index} needs a valid recommendation string.`);
      }

      if (!Array.isArray(finding.relatedFindings)) {
        throw new Error(`Finding at index ${index} relatedFindings must be an array.`);
      }

      if (!VALID_CONFIDENCE.includes(finding.confidence)) {
        throw new Error(`Finding at index ${index} has an invalid confidence.`);
      }
    });

    return payload;
  } catch (error) {
    if (error instanceof AIInvalidOutputError) {
      throw error;
    }

    throw new AIInvalidOutputError({ reason: error.message });
  }
}

module.exports = {
  VALID_LANGUAGES,
  VALID_CATEGORIES,
  VALID_CONFIDENCE,
  STRICT_OUTPUT_SCHEMA,
  validateAIInput,
  validateAIOutput,
};