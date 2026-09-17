'use strict';

/**
 * CodeLens AI - Static Analysis Adapter
 *
 * Responsibility:
 *   - Analyze JavaScript/TypeScript source code as TEXT.
 *   - Produce normalized raw findings.
 *
 * IMPORTANT:
 *   - Submitted source code is NEVER executed.
 *   - This is a deterministic MVP fallback adapter.
 *   - It is NOT Semgrep.
 *
 * Contract input:
 * {
 *   language: "javascript" | "typescript",
 *   sourceCode: "..."
 * }
 *
 * Contract output:
 * {
 *   findings: [
 *     {
 *       ruleId: "...",
 *       type: "...",
 *       category: "SECURITY" | "BUG" | "CODE_SMELL",
 *       message: "...",
 *       line: 4,
 *       evidence: "..."
 *     }
 *   ]
 * }
 */

const MAX_SOURCE_CODE_LENGTH = 1_000_000;

const SUPPORTED_LANGUAGES = new Set([
  'javascript',
  'js',
  'typescript',
  'ts'
]);

const RULES = [
  {
    ruleId: 'JS-SQL-INJECTION-001',
    type: 'SQL_INJECTION',
    category: 'SECURITY',
    message: 'Possible SQL injection: SQL query is constructed using untrusted request data.',
    detect: detectSqlInjection
  },
  {
    ruleId: 'JS-HARDCODED-SECRET-001',
    type: 'HARDCODED_SECRET',
    category: 'SECURITY',
    message: 'Possible hardcoded secret detected. Secrets should be stored using a secret-management mechanism.',
    detect: detectHardcodedSecret
  },
  {
    ruleId: 'JS-COMMAND-INJECTION-001',
    type: 'COMMAND_INJECTION',
    category: 'SECURITY',
    message: 'Possible command injection: untrusted request data is passed to command execution.',
    detect: detectCommandInjection
  },
  {
    ruleId: 'JS-MISSING-INPUT-VALIDATION-001',
    type: 'MISSING_INPUT_VALIDATION',
    category: 'SECURITY',
    message: 'Possible missing input validation: request data is used without an identifiable validation step.',
    detect: detectMissingInputValidation
  }
];

/**
 * Main analyzer entry point.
 *
 * @param {Object} input
 * @param {string} input.language
 * @param {string} input.sourceCode
 * @returns {{findings: Array}}
 */
function analyze(input) {
  validateInput(input);

  const sourceCode = input.sourceCode;
  const findings = [];

  for (const rule of RULES) {
    const matches = rule.detect(sourceCode);

    for (const match of matches) {
      findings.push({
        ruleId: rule.ruleId,
        type: rule.type,
        category: rule.category,
        message: rule.message,
        line: match.line,
        evidence: match.evidence
      });
    }
  }

  return {
    findings: sortFindings(findings)
  };
}

/**
 * Validate analyzer input.
 */
function validateInput(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('Analyzer input must be an object.');
  }

  if (
    typeof input.language !== 'string' ||
    !SUPPORTED_LANGUAGES.has(input.language.toLowerCase())
  ) {
    throw new TypeError(
      'Unsupported language. Supported languages: JavaScript and TypeScript.'
    );
  }

  if (typeof input.sourceCode !== 'string') {
    throw new TypeError('sourceCode must be a string.');
  }

  if (input.sourceCode.trim().length === 0) {
    throw new TypeError('sourceCode cannot be empty.');
  }

  if (input.sourceCode.length > MAX_SOURCE_CODE_LENGTH) {
    throw new RangeError(
      `sourceCode exceeds the maximum allowed size of ${MAX_SOURCE_CODE_LENGTH} characters.`
    );
  }
}

/**
 * SQL injection detection.
 *
 * Looks for SQL statements being built with:
 *   - req.query
 *   - req.body
 *   - req.params
 *
 * Example detected:
 *   const query = "SELECT * FROM users WHERE id = " + req.query.id;
 */
function detectSqlInjection(sourceCode) {
  const findings = [];
  const lines = sourceCode.split(/\r?\n/);

  const sqlPattern =
    /\b(?:SELECT|INSERT|UPDATE|DELETE)\b[\s\S]{0,500}\+\s*(?:req\.(?:query|body|params)\.[A-Za-z_$][\w$]*)/i;

  lines.forEach((line, index) => {
    if (sqlPattern.test(line)) {
      findings.push({
        line: index + 1,
        evidence: line.trim()
      });
    }
  });

  return findings;
}

/**
 * Hardcoded secret detection.
 *
 * Detects common secret-like variable names assigned directly
 * to non-empty string literals.
 *
 * Example:
 *   const API_KEY = "sk_test_123";
 *
 * Does NOT flag:
 *   const API_KEY = process.env.API_KEY;
 */
function detectHardcodedSecret(sourceCode) {
  const findings = [];
  const lines = sourceCode.split(/\r?\n/);

  const secretPattern =
    /\b(?:api[_-]?key|api[_-]?secret|secret[_-]?key|password|passwd|token|access[_-]?token|client[_-]?secret)\b\s*[:=]\s*["'`](?!["'`])[^"'`]{4,}["'`]/i;

  lines.forEach((line, index) => {
    if (secretPattern.test(line)) {
      findings.push({
        line: index + 1,
        evidence: line.trim()
      });
    }
  });

  return findings;
}

/**
 * Command injection detection.
 *
 * Detects request data flowing directly into child_process.exec()
 * or exec imported from child_process.
 *
 * Examples:
 *   exec(req.query.command);
 *   child_process.exec(req.body.command);
 */
function detectCommandInjection(sourceCode) {
  const findings = [];
  const lines = sourceCode.split(/\r?\n/);

  const directExecPattern =
    /\b(?:child_process\.)?exec\s*\(\s*(?:req\.(?:query|body|params)\.[A-Za-z_$][\w$]*)/;

  lines.forEach((line, index) => {
    if (directExecPattern.test(line)) {
      findings.push({
        line: index + 1,
        evidence: line.trim()
      });
    }
  });

  return findings;
}

/**
 * Missing input validation detection.
 *
 * This is intentionally a conservative deterministic heuristic.
 *
 * It looks for direct assignment of request data to a variable followed
 * by usage in a function call, without common validation markers.
 *
 * Example detected:
 *   const email = req.body.email;
 *   createUser(email);
 */
function detectMissingInputValidation(sourceCode) {
  const findings = [];
  const lines = sourceCode.split(/\r?\n/);

  const requestAssignmentPattern =
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*req\.(?:body|query|params)\.([A-Za-z_$][\w$]*)\s*;/;

  const validationPattern =
    /\b(?:validate|validator|schema|zod|joi|yup|sanitize|sanitizeInput|isValid|check|assert|parse)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(requestAssignmentPattern);

    if (!match) {
      continue;
    }

    const variableName = match[1];

    /*
     * Inspect a small local region after the assignment.
     * This avoids treating every request parameter as automatically unsafe.
     */
    const end = Math.min(i + 5, lines.length - 1);
    const localRegion = lines.slice(i, end + 1).join('\n');

    if (validationPattern.test(localRegion)) {
      continue;
    }

    /*
     * Detect direct use of the request-derived variable in a function call.
     */
    const usagePattern = new RegExp(
      `\\b[A-Za-z_$][\\w$]*\\s*\\([^)]*\\b${escapeRegExp(variableName)}\\b[^)]*\\)`
    );

    if (usagePattern.test(localRegion)) {
      findings.push({
        line: i + 1,
        evidence: lines[i].trim()
      });
    }
  }

  return findings;
}

/**
 * Escape text before placing it inside a RegExp.
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Keep finding output deterministic.
 */
function sortFindings(findings) {
  return findings.sort((a, b) => {
    if (a.line !== b.line) {
      return a.line - b.line;
    }

    return a.type.localeCompare(b.type);
  });
}

module.exports = {
  analyze,
  MAX_SOURCE_CODE_LENGTH,
  SUPPORTED_LANGUAGES
};