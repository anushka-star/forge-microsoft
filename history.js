'use strict';

/**
 * CodeLens AI - Developer History Service
 *
 * This module provides persistence/query support for developer
 * finding history.
 *
 * IMPORTANT:
 * - Uses the existing PostgreSQL database defined by CONTRACT.md.
 * - Does NOT create a database.
 * - Does NOT create additional tables.
 * - Repeated findings are identified by normalized finding_type.
 * - Exact finding wording is NOT used for repetition.
 */

/**
 * Validate required history input.
 */
function validateHistoryInput(developerId, findingType) {
  if (
    typeof developerId !== 'string' ||
    developerId.trim().length === 0
  ) {
    throw new TypeError('developerId must be a non-empty string.');
  }

  if (
    typeof findingType !== 'string' ||
    findingType.trim().length === 0
  ) {
    throw new TypeError('findingType must be a non-empty string.');
  }
}

/**
 * Record a finding occurrence for a developer.
 *
 * If this finding type has never been seen by the developer:
 *   occurrence_count = 1
 *
 * Otherwise:
 *   occurrence_count = previous occurrence_count + 1
 *
 * @param {Object} db PostgreSQL pool/client with query()
 * @param {string} developerId
 * @param {string} findingType
 * @returns {Promise<Object>}
 */
async function recordFinding(db, developerId, findingType) {
  validateHistoryInput(developerId, findingType);

  if (!db || typeof db.query !== 'function') {
    throw new TypeError('A PostgreSQL database client/pool is required.');
  }

  const query = `
    INSERT INTO finding_history (
      developer_id,
      finding_type,
      first_seen,
      last_seen,
      occurrence_count
    )
    VALUES (
      $1,
      $2,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      1
    )
    ON CONFLICT (developer_id, finding_type)
    DO UPDATE SET
      last_seen = CURRENT_TIMESTAMP,
      occurrence_count = finding_history.occurrence_count + 1
    RETURNING
      id,
      developer_id,
      finding_type,
      first_seen,
      last_seen,
      occurrence_count;
  `;

  const values = [developerId, findingType];

  const result = await db.query(query, values);

  return result.rows[0];
}

/**
 * Get the current occurrence number for a finding type.
 *
 * This returns the occurrence count AFTER the current finding
 * has been recorded.
 *
 * @param {Object} db PostgreSQL pool/client
 * @param {string} developerId
 * @param {string} findingType
 * @returns {Promise<number>}
 */
async function getOccurrenceNumber(db, developerId, findingType) {
  validateHistoryInput(developerId, findingType);

  if (!db || typeof db.query !== 'function') {
    throw new TypeError('A PostgreSQL database client/pool is required.');
  }

  const query = `
    SELECT occurrence_count
    FROM finding_history
    WHERE developer_id = $1
      AND finding_type = $2
    LIMIT 1;
  `;

  const values = [developerId, findingType];

  const result = await db.query(query, values);

  if (result.rows.length === 0) {
    return 0;
  }

  return Number(result.rows[0].occurrence_count);
}

/**
 * Get all finding history for a developer.
 *
 * @param {Object} db PostgreSQL pool/client
 * @param {string} developerId
 * @returns {Promise<Array>}
 */
async function getDeveloperHistory(db, developerId) {
  if (
    typeof developerId !== 'string' ||
    developerId.trim().length === 0
  ) {
    throw new TypeError('developerId must be a non-empty string.');
  }

  if (!db || typeof db.query !== 'function') {
    throw new TypeError('A PostgreSQL database client/pool is required.');
  }

  const query = `
    SELECT
      id,
      developer_id,
      finding_type,
      first_seen,
      last_seen,
      occurrence_count
    FROM finding_history
    WHERE developer_id = $1
    ORDER BY last_seen DESC, finding_type ASC;
  `;

  const result = await db.query(query, [developerId]);

  return result.rows;
}

/**
 * Get the previous occurrence count BEFORE recording a new occurrence.
 *
 * Useful when the backend needs to know:
 *
 * Previous SQL_INJECTION count = 5
 * Current SQL_INJECTION       = 6
 *
 * @param {Object} db PostgreSQL pool/client
 * @param {string} developerId
 * @param {string} findingType
 * @returns {Promise<number>}
 */
async function getPreviousOccurrenceCount(
  db,
  developerId,
  findingType
) {
  validateHistoryInput(developerId, findingType);

  if (!db || typeof db.query !== 'function') {
    throw new TypeError('A PostgreSQL database client/pool is required.');
  }

  const query = `
    SELECT occurrence_count
    FROM finding_history
    WHERE developer_id = $1
      AND finding_type = $2
    LIMIT 1;
  `;

  const result = await db.query(query, [
    developerId,
    findingType
  ]);

  if (result.rows.length === 0) {
    return 0;
  }

  return Number(result.rows[0].occurrence_count);
}

module.exports = {
  recordFinding,
  getOccurrenceNumber,
  getPreviousOccurrenceCount,
  getDeveloperHistory
};