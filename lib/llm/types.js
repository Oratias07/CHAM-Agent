/**
 * LLM Provider Interface & Types
 * All providers must implement evaluate() and isHealthy().
 */

/**
 * @typedef {object} EvalResult
 * @property {number} score - Overall score (0-100 or 0-10 depending on context)
 * @property {string} feedback - Textual feedback
 * @property {object} [criteria] - Per-criterion breakdown
 * @property {number} confidence - 0-100 confidence in evaluation
 * @property {string} model - Model ID used
 * @property {string} provider - Provider name
 */

/**
 * @typedef {object} ILLMProvider
 * @property {string} name - Provider identifier
 * @property {function(string, string, string): Promise<EvalResult>} evaluate
 * @property {function(): Promise<boolean>} isHealthy
 */

export const PROVIDER_NAMES = {
  GEMINI: 'gemini',
  GROQ: 'groq',
  OPENAI: 'openai',
};
