/**
 * OpenAI LLM Provider
 * Fallback provider using OpenAI-compatible API.
 * Uses direct fetch — no SDK dependency needed.
 */

import { safeParseLLMResponse } from '../safeParse.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODELS = ['gpt-4o-mini', 'gpt-3.5-turbo'];

export class OpenAIProvider {
  name = 'openai';

  constructor() {
    this._apiKey = process.env.OPENAI_API_KEY;
    this._unavailable = !this._apiKey;
  }

  async isHealthy() {
    if (this._unavailable) return false;
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${this._apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Evaluate code using OpenAI.
   * @param {string} prompt - Full prompt text
   * @param {object} [options]
   * @returns {Promise<{raw: string, model: string, provider: string}>}
   */
  async evaluate(prompt, options = {}) {
    if (this._unavailable) throw new Error('OpenAI API key not configured');

    const { temperature = 0.2, jsonMode = true } = options;
    let lastErr;

    for (const model of MODELS) {
      try {
        const body = {
          model,
          messages: [
            { role: 'system', content: 'You are an expert code reviewer. Respond with valid JSON only.' },
            { role: 'user', content: prompt },
          ],
          temperature,
          max_tokens: 4096,
        };
        if (jsonMode) body.response_format = { type: 'json_object' };

        const res = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this._apiKey}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30000),
        });

        if (res.status === 429) {
          lastErr = new Error('OpenAI rate limited');
          lastErr.status = 429;
          continue;
        }
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`OpenAI API error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty response from OpenAI');

        return {
          raw: content,
          parsed: safeParseLLMResponse(content),
          model,
          provider: this.name,
        };
      } catch (err) {
        lastErr = err;
        if (err.status === 429) continue;
        throw err;
      }
    }
    throw lastErr;
  }
}
