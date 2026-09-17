const { AIUnavailableError, AIInvalidOutputError } = require('./ai.errors');
const { STRICT_OUTPUT_SCHEMA } = require('./ai.schema');

class AIClient {
  constructor({
    provider = process.env.AI_PROVIDER || 'mock',
    apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.AI_API_KEY,
    endpoint = process.env.AZURE_OPENAI_ENDPOINT || process.env.AI_BASE_URL,
    model = process.env.AZURE_OPENAI_MODEL || process.env.AI_MODEL || 'gpt-4o-mini',
  } = {}) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.endpoint = endpoint;
    this.model = model;
  }

  async generateStructuredFindings({ systemPrompt, userPrompt }) {
    const shouldUseMock = this.provider === 'mock' || !this.apiKey || !this.endpoint;

    if (shouldUseMock) {
      return this.generateMockResponse(userPrompt);
    }

    try {
      const url = `${this.endpoint.replace(/\/$/, '')}/openai/deployments/${this.model}/chat/completions?api-version=2024-10-21`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'codelens_findings_response',
              schema: STRICT_OUTPUT_SCHEMA,
              strict: true,
            },
          },
          model: this.model,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new AIUnavailableError({
          reason: 'Azure OpenAI request failed.',
          status: response.status,
          response: text,
        });
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (typeof content !== 'string') {
        throw new AIInvalidOutputError({
          reason: 'Model response did not include a JSON string payload.',
          raw: data,
        });
      }

      return JSON.parse(content);
    } catch (error) {
      if (error instanceof AIUnavailableError || error instanceof AIInvalidOutputError) {
        throw error;
      }

      throw new AIUnavailableError({
        reason: 'Request to the AI provider failed.',
        details: error.message,
      });
    }
  }

  generateMockResponse(userPrompt) {
    const payload = typeof userPrompt === 'string' ? JSON.parse(userPrompt) : userPrompt;
    const sourceCode = payload?.sourceCode || '';

    if (!sourceCode.trim()) {
      return { findings: [] };
    }

    return {
      findings: [
        {
          id: 'F001',
          category: 'SECURITY',
          type: 'SQL_INJECTION',
          title: 'Unsanitized user input reaches SQL query',
          file: 'input.js',
          line: 4,
          evidence: 'req.query.id',
          rootCause: 'User-controlled input is concatenated into a SQL statement without parameterization.',
          impact: 'An attacker could alter query logic or access unauthorized data.',
          recommendation: 'Use parameterized queries and input validation before database access.',
          relatedFindings: [],
          confidence: 'HIGH',
        },
      ],
    };
  }
}

module.exports = {
  AIClient,
};