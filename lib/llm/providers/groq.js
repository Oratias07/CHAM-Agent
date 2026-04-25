/**
 * Groq LLM Provider
 * Free-tier provider using Llama models via Groq's inference API.
 * Uses direct fetch — no SDK dependency needed.
 */

import { safeParseLLMResponse } from '../safeParse.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

export class GroqProvider {
  name = 'groq';

  constructor() {
    this._apiKey = process.env.GROQ_API_KEY;
    this._unavailable = !this._apiKey;
  }

  async isHealthy() {
    if (this._unavailable) return false;
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${this._apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Evaluate code using Groq.
   * @param {string} prompt - Full prompt text
   * @param {object} [options]
   * @returns {Promise<{raw: string, model: string, provider: string}>}
   */
  async evaluate(prompt, options = {}) {
    if (this._unavailable) throw new Error('Groq API key not configured');

    const { temperature = 0.2, jsonMode = true } = options;
    let lastErr;

    for (const model of MODELS) {
      try {
        const body = {
          model,
          messages: [
            {
              role: 'system',
              content: jsonMode
                ? 'You are an expert code reviewer. Respond with valid JSON only.'
                : 'You are a helpful academic AI assistant. Respond in the same language the user writes in.',
            },
            { role: 'user', content: prompt },
          ],
          temperature,
          max_tokens: 4096,
        };
        if (jsonMode) body.response_format = { type: 'json_object' };

        const res = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this._apiKey}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30000),
        });

        if (res.status === 429) {
          lastErr = new Error('Groq rate limited');
          lastErr.status = 429;
          continue;
        }
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Groq API error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty response from Groq');

        return {
          raw: content,
          parsed: safeParseLLMResponse(content),
          model,
          provider: this.name,
        };
      } catch (err) {
        lastErr = err;
        // Continue to next model on rate limit, server errors, or timeouts
        if (err.status === 429 || err.status >= 500 || err.name === 'TimeoutError' || err.name === 'AbortError') continue;
        throw err;
      }
    }
    throw lastErr;
  }
}
