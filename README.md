# CodeLens AI - Analyzer Rules

## Purpose

This directory contains deterministic rule documentation and mappings
used by the CodeLens AI static-analysis evidence layer.

The analyzer operates on source code as text.

Submitted source code is never executed.

## Current Analyzer

The current MVP implementation uses a small deterministic JavaScript/
TypeScript rule adapter.

It is NOT Semgrep.

Semgrep CE should only be claimed as supported after installation and
execution have been verified in the hackathon environment.

## Supported Finding Types

### SQL_INJECTION

Rule ID:

JS-SQL-INJECTION-001

Category:

SECURITY

Detects SQL statements constructed using untrusted request data such as:

- req.query
- req.body
- req.params

Example pattern:

```javascript
const query = "SELECT * FROM users WHERE id = " + req.query.id;