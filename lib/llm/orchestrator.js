/**
 * LLM Orchestrator — Multi-provider fallback chain.
 * Tries providers in configured order. If one fails, falls through to the next.
 * Logs every attempt for audit trail.
 */

import { GeminiProvider } from './providers/gemini.js';
import { GroqProvider } from './providers/groq.js';
import { OpenAIProvider } from './providers/openai.js';

// Provider order: configurable via LLM_PROVIDER_ORDER env var
// Default: groq (free) → gemini (primary) → openai (fallback)
function getProviderOrder() {
  const order = process.env.LLM_PROVIDER_ORDER;
  if (order) return order.split(',').map(s => s.trim().toLowerCase());
  return ['groq', 'gemini', 'openai'];
}

const PROVIDER_MAP = {
  gemini: GeminiProvider,
  groq: GroqProvider,
  openai: OpenAIProvider,
};

let _instance = null;

export class LLMOrchestrator {
  constructor() {
    const order = getProviderOrder();
    this.providers = order
      .filter(name => PROVIDER_MAP[name])
      .map(name => new PROVIDER_MAP[name]());
    this._log = [];
  }

  /**
   * Get singleton instance (providers are stateless, safe to reuse).
   */
  static getInstance() {
    if (!_instance) _instance = new LLMOrchestrator();
    return _instance;
  }

  /**
   * Reset singleton (useful for testing or after env changes).
   */
  static reset() {
    _instance = null;
  }

  /**
   * Evaluate with fallback across all configured providers.
   * @param {string} prompt - Full prompt text
   * @param {object} [options] - { temperature, jsonMode, requiredFields }
   * @returns {Promise<{raw: string, parsed: object, model: string, provider: string}>}
   */
  async evaluateWithFallback(prompt, options = {}) {
    const errors = {};
    const startTime = Date.now();

    for (const provider of this.providers) {
      const attemptStart = Date.now();
      try {
        const result = await provider.evaluate(prompt, options);

        // Validate parsed output if requiredFields specified
        if (options.requiredFields && result.parsed) {
          const missing = options.requiredFields.filter(f => !(f in result.parsed));
          if (missing.length > 0) {
            throw new Error(`Missing fields in response: ${missing.join(', ')}`);
          }
        }

        // Log success
        this._logAttempt({
          provider: provider.name,
          model: result.model,
          success: true,
          latencyMs: Date.now() - attemptStart,
        });

        return result;
      } catch (err) {
        errors[provider.name] = err.message;
        this._logAttempt({
          provider: provider.name,
          model: 'unknown',
          success: false,
          error: err.message,
          latencyMs: Date.now() - attemptStart,
        });
        console.warn(`[LLMOrchestrator] ${provider.name} failed: ${err.message}`);
      }
    }

    // All providers exhausted
    const totalMs = Date.now() - startTime;
    console.error(`[LLMOrchestrator] All providers failed after ${totalMs}ms`, errors);
    throw new Error(`All LLM providers failed: ${JSON.stringify(errors)}`);
  }

  /**
   * Get available (configured) providers.
   */
  getAvailableProviders() {
    return this.providers.map(p => ({
      name: p.name,
      configured: !p._unavailable,
    }));
  }

  /**
   * Get recent evaluation log entries.
   */
  getRecentLog(limit = 50) {
    return this._log.slice(-limit);
  }

  _logAttempt(entry) {
    entry.timestamp = new Date().toISOString();
    this._log.push(entry);
    // Keep log bounded
    if (this._log.length > 500) this._log.splice(0, this._log.length - 500);
  }
}
