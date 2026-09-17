class AIServiceError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.details = details;
  }
}

class InvalidInputError extends AIServiceError {
  constructor(details = null) {
    const reason = details && typeof details === 'object' && details.reason
      ? details.reason
      : 'AI input validation failed.';

    super('VALIDATION_ERROR', reason, details);
  }
}

class AIUnavailableError extends AIServiceError {
  constructor(details = null) {
    const reason = details && typeof details === 'object' && details.reason
      ? details.reason
      : 'Analysis service is temporarily unavailable.';

    super('AI_UNAVAILABLE', reason, details);
  }
}

class AIInvalidOutputError extends AIServiceError {
  constructor(details = null) {
    const reason = details && typeof details === 'object' && details.reason
      ? details.reason
      : 'AI returned invalid structured output.';

    super('AI_INVALID_OUTPUT', reason, details);
  }
}

class SourceTooLargeError extends AIServiceError {
  constructor(maxLength) {
    super('VALIDATION_ERROR', `Source code exceeds the maximum allowed length of ${maxLength} characters.`, {
      maxLength,
    });
  }
}

module.exports = {
  AIServiceError,
  InvalidInputError,
  AIUnavailableError,
  AIInvalidOutputError,
  SourceTooLargeError,
};
