const { AIClient } = require('./ai.client');
const { buildSystemPrompt, buildUserPrompt } = require('./ai.prompt');
const { validateAIInput, validateAIOutput } = require('./ai.schema');
const { AIUnavailableError, AIInvalidOutputError, InvalidInputError, SourceTooLargeError } = require('./ai.errors');

const DEFAULT_MAX_SOURCE_LENGTH = 250000;

class AIService {
  constructor({ client = new AIClient(), maxSourceLength = DEFAULT_MAX_SOURCE_LENGTH } = {}) {
    this.client = client;
    this.maxSourceLength = maxSourceLength;
  }

  validateInput(input) {
    const safeInput = validateAIInput(input);

    if (safeInput.sourceCode.length > this.maxSourceLength) {
      throw new SourceTooLargeError(this.maxSourceLength);
    }

    return safeInput;
  }

  async analyzeCode(input) {
    try {
      const safeInput = this.validateInput(input);
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(safeInput);

      const rawResponse = await this.client.generateStructuredFindings({
        systemPrompt,
        userPrompt,
      });

      const validated = validateAIOutput(rawResponse);

      return {
        findings: validated.findings,
      };
    } catch (error) {
      if (error instanceof InvalidInputError || error instanceof SourceTooLargeError) {
        throw error;
      }

      if (error instanceof AIUnavailableError || error instanceof AIInvalidOutputError) {
        throw error;
      }

      throw new AIUnavailableError({
        reason: 'Unexpected AI service failure.',
        details: error.message,
      });
    }
  }
}

async function analyzeCode(input) {
  const service = new AIService();
  return service.analyzeCode(input);
}

module.exports = {
  AIService,
  analyzeCode,
};