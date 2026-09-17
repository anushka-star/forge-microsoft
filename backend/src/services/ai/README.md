# AI Service Module

This module is the AI reasoning boundary for CodeLens AI.

## Environment variables

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_MODEL`

Optional fallbacks:
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`

## Input contract

```json
{
  "developerId": "DEV001",
  "language": "javascript",
  "sourceCode": "const sql = 'SELECT * FROM users';",
  "staticFindings": [],
  "developerHistory": []
}
```

## Output contract

```json
{
  "findings": [
    {
      "id": "F001",
      "category": "SECURITY",
      "type": "SQL_INJECTION",
      "title": "Unsanitized user input reaches SQL query",
      "file": "input.js",
      "line": 4,
      "evidence": "req.query.id",
      "rootCause": "Input is concatenated into a SQL statement.",
      "impact": "An attacker could alter query logic.",
      "recommendation": "Use parameterized queries and validate input.",
      "relatedFindings": [],
      "confidence": "HIGH"
    }
  ]
}
```

## AI rules

- No severity is returned by the AI.
- No fabricated evidence.
- No invented developer history or URLs.
- No source execution.
- If the evidence is weak, omit the finding.

## Failure behavior

- `AI_UNAVAILABLE`
- `AI_INVALID_OUTPUT`
- `VALIDATION_ERROR`

## Example usage

```js
const { analyzeCode } = require('./ai.service');

const result = await analyzeCode({
  developerId: 'DEV001',
  language: 'javascript',
  sourceCode: "const query = 'SELECT * FROM users WHERE id = ' + req.query.id;",
  staticFindings: [],
  developerHistory: [],
});

console.log(result);
```