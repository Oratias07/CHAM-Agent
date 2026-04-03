/**
 * Google Gemini LLM Provider
 * Uses @google/genai SDK. Supports gemini-2.0-flash and gemini-2.0-flash-lite.
 */

import { GoogleGenAI } from '@google/genai';
import { safeParseLLMResponse } from '../safeParse.js';

const MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];

export class GeminiProvider {
  name = 'gemini';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      this._unavailable = true;
      return;
    }
    this._client = new GoogleGenAI({ apiKey });
    this._unavailable = false;
  }

  async isHealthy() {
    if (this._unavailable) return false;
    try {
      // Lightweight check — generate a trivial completion
      await this._client.models.generateContent({
        model: MODELS[0],
        contents: 'Reply with "ok"',
        config: { maxOutputTokens: 5 },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Evaluate code using Gemini.
   * @param {string} prompt - Full prompt (already built by buildSafePrompt)
   * @param {object} [options]
   * @param {number} [options.temperature=0.2]
   * @param {boolean} [options.jsonMode=true]
   * @returns {Promise<{raw: string, model: string, provider: string}>}
   */
  async evaluate(prompt, options = {}) {
    if (this._unavailable) throw new Error('Gemini API key not configured');

    const { temperature = 0.2, jsonMode = true } = options;
    let lastErr;

    for (const model of MODELS) {
      try {
        const config = { temperature };
        if (jsonMode) config.responseMimeType = 'application/json';

        const response = await this._client.models.generateContent({
          model,
          contents: prompt,
          config,
        });

        if (!response.text) throw new Error('Empty response from Gemini');

        return {
          raw: response.text,
          parsed: safeParseLLMResponse(response.text),
          model,
          provider: this.name,
        };
      } catch (err) {
        lastErr = err;
        // Continue to next model on rate limit, quota, server errors, or timeouts
        if (err.status === 429 || err.status === 403 || err.status >= 500 || err.name === 'TimeoutError' || err.name === 'AbortError') continue;
        throw err;
      }
    }
    throw lastErr;
  }
}
