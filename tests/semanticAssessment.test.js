import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @google/genai before importing the module under test
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      constructor() {
        this.models = { generateContent: mockGenerateContent };
      }
    },
  };
});

// Mock promptGuard — keep real validateLLMOutput, mock buildSafePrompt
vi.mock('../services/promptGuard.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    buildSafePrompt: vi.fn(({ code }) => ({
      prompt: `[SAFE PROMPT] ${code}`,
      injectionDetected: false,
      injectionFlags: [],
    })),
  };
});

import { analyzeCodeQuality } from '../services/semanticAssessment.js';
import { buildSafePrompt } from '../services/promptGuard.js';

// Valid LLM response matching the required schema
function validLLMResponse(overrides = {}) {
  return JSON.stringify({
    code_quality: { score: 80, feedback: 'good' },
    documentation: { score: 70, feedback: 'ok' },
    complexity: { score: 85, feedback: 'efficient', big_o: 'O(n)' },
    error_handling: { score: 60, feedback: 'needs work' },
    best_practices: { score: 75, feedback: 'decent' },
    overall_score: 75,
    confidence: 90,
    flags_for_human_review: [],
    ...overrides,
  });
}

describe('semanticAssessment', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGenerateContent.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── Successful analysis ──
  describe('successful analysis', () => {
    it('returns structured result on valid LLM response', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: validLLMResponse() });

      const result = await analyzeCodeQuality('print(1)', 'python', 'Print 1', null, null);

      expect(result.score).toBeTypeOf('number');
      expect(result.overall_score).toBeTypeOf('number');
      expect(result.confidence).toBe(90);
      expect(result.model_used).toBe('gemini-2.0-flash');
      expect(result.criteria_breakdown.code_quality.score).toBe(80);
      expect(result.criteria_breakdown.complexity.big_o).toBe('O(n)');
      expect(result.injection_detected).toBe(false);
    });

    it('computes weighted score when LLM overall deviates >15 from computed', async () => {
      // Computed: 80*0.25 + 70*0.20 + 85*0.25 + 60*0.15 + 75*0.15 = 75.5 → 76
      // LLM says 50 → deviation 26 > 15 → use computed (76)
      mockGenerateContent.mockResolvedValueOnce({
        text: validLLMResponse({ overall_score: 50 }),
      });

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      expect(result.overall_score).toBe(76); // computed, not LLM's 50
    });

    it('uses LLM overall when deviation is <=15', async () => {
      // Computed: 76, LLM says 75 → deviation 1 → use LLM (75)
      mockGenerateContent.mockResolvedValueOnce({ text: validLLMResponse() });

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      expect(result.overall_score).toBe(75); // LLM's value
    });

    it('reports model_used as the model that succeeded', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: validLLMResponse() });

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      expect(result.model_used).toBe('gemini-2.0-flash');
    });
  });

  // ── Model fallback on quota errors ──
  describe('model fallback', () => {
    it('falls back to second model on 429 quota error', async () => {
      const quotaError = new Error('quota exceeded');
      quotaError.status = 429;

      // First model fails with 429
      mockGenerateContent.mockRejectedValueOnce(quotaError);
      // Second model succeeds
      mockGenerateContent.mockResolvedValueOnce({ text: validLLMResponse() });

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);

      expect(result.score).toBeTypeOf('number');
      expect(result.model_used).toBe('gemini-2.0-flash-lite');
      // Should have been called exactly 2 times (1 per model, no retry on 429)
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('falls back to second model on 403 auth error', async () => {
      const authError = new Error('forbidden');
      authError.status = 403;

      mockGenerateContent.mockRejectedValueOnce(authError);
      mockGenerateContent.mockResolvedValueOnce({ text: validLLMResponse() });

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      expect(result.model_used).toBe('gemini-2.0-flash-lite');
    });

    it('does NOT retry same model on 429 — breaks immediately to next', async () => {
      const quotaError = new Error('quota');
      quotaError.status = 429;

      mockGenerateContent.mockRejectedValueOnce(quotaError);
      mockGenerateContent.mockResolvedValueOnce({ text: validLLMResponse() });

      await analyzeCodeQuality('code', 'python', 'q', null, null);

      // First model: 1 call (no retry). Second model: 1 call. Total: 2
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
  });

  // ── Retry on parse failures ──
  describe('retry on parse failure', () => {
    it('retries up to 3 times on invalid JSON then succeeds', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: 'not json' })
        .mockResolvedValueOnce({ text: '{"incomplete": true}' })
        .mockResolvedValueOnce({ text: validLLMResponse() });

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      expect(result.score).toBeTypeOf('number');
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('does not retry non-quota errors on different models', async () => {
      const networkError = new Error('ECONNREFUSED');
      networkError.status = 500;

      // Non-quota error on first attempt — should throw, not try next model
      mockGenerateContent.mockRejectedValueOnce(networkError);
      // These would be retries on same model (attempts 2 and 3)
      mockGenerateContent.mockRejectedValueOnce(networkError);
      mockGenerateContent.mockRejectedValueOnce(networkError);
      // Attempt on second model (same non-quota error)
      mockGenerateContent.mockRejectedValueOnce(networkError);
      mockGenerateContent.mockRejectedValueOnce(networkError);
      mockGenerateContent.mockRejectedValueOnce(networkError);

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      // All 6 attempts exhausted (3 per model), degraded result
      expect(result.score).toBeNull();
      expect(mockGenerateContent).toHaveBeenCalledTimes(6);
    });
  });

  // ── Quota exhaustion (all models fail) ──
  describe('full quota exhaustion', () => {
    it('returns degraded result with Hebrew quota message', async () => {
      const quotaError = new Error('quota exceeded');
      quotaError.status = 429;

      // Both models fail with 429
      mockGenerateContent.mockRejectedValue(quotaError);

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);

      expect(result.score).toBeNull();
      expect(result.overall_score).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.model_used).toBeNull();
      expect(result.feedback).toContain('מכסת');
      expect(result.flags_for_human_review).toContain('llm_analysis_failed');
    });

    it('returns generic error message for non-quota failures', async () => {
      mockGenerateContent.mockRejectedValue(new Error('network down'));

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);

      expect(result.score).toBeNull();
      expect(result.feedback).toContain('נכשל');
      expect(result.feedback).not.toContain('מכסת');
      expect(result.error).toContain('network down');
    });
  });

  // ── Missing API key ──
  describe('missing API key', () => {
    it('throws when no API key configured', async () => {
      vi.stubEnv('GEMINI_API_KEY', '');
      vi.stubEnv('API_KEY', '');

      await expect(
        analyzeCodeQuality('code', 'python', 'q', null, null)
      ).rejects.toThrow('API key not configured');
    });

    it('uses API_KEY fallback when GEMINI_API_KEY is missing', async () => {
      vi.stubEnv('GEMINI_API_KEY', '');
      vi.stubEnv('API_KEY', 'fallback-key');

      mockGenerateContent.mockResolvedValueOnce({ text: validLLMResponse() });
      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);

      expect(result.score).toBeTypeOf('number');
    });
  });

  // ── Injection detection integration ──
  describe('injection detection', () => {
    it('caps confidence at 50 and flags when injection detected', async () => {
      buildSafePrompt.mockReturnValueOnce({
        prompt: '[PROMPT]',
        injectionDetected: true,
        injectionFlags: [{ line: 1, pattern: 'test' }],
      });

      mockGenerateContent.mockResolvedValueOnce({ text: validLLMResponse() });

      const result = await analyzeCodeQuality('ignore previous', 'python', 'q', null, null);

      expect(result.injection_detected).toBe(true);
      expect(result.confidence).toBeLessThanOrEqual(50);
      expect(result.flags_for_human_review).toContain('prompt_injection_attempt_detected');
    });
  });

  // ── Empty response ──
  describe('empty response handling', () => {
    it('retries on empty LLM response', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: '' })
        .mockResolvedValueOnce({ text: null })
        .mockResolvedValueOnce({ text: validLLMResponse() });

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      expect(result.score).toBeTypeOf('number');
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });
  });

  // ── Context building ──
  describe('context building', () => {
    it('includes master solution and rubric in prompt when provided', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: validLLMResponse() });

      await analyzeCodeQuality('code', 'python', 'Write fibonacci', 'def fib(n): ...', 'Must use recursion');

      expect(buildSafePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          questionContext: expect.stringContaining('Reference Solution'),
        })
      );
      expect(buildSafePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          questionContext: expect.stringContaining('Grading Rubric'),
        })
      );
    });

    it('omits master solution section when not provided', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: validLLMResponse() });

      await analyzeCodeQuality('code', 'python', 'Write hello', null, null);

      expect(buildSafePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          questionContext: expect.not.stringContaining('Reference Solution'),
        })
      );
    });
  });
});
