import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the LLM orchestrator
const mockEvaluateWithFallback = vi.fn();
vi.mock('../lib/llm/orchestrator.js', () => {
  return {
    LLMOrchestrator: {
      getInstance: () => ({
        evaluateWithFallback: mockEvaluateWithFallback,
      }),
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

// Valid parsed LLM response matching the required schema
function validParsedResponse(overrides = {}) {
  return {
    code_quality: { score: 80, feedback: 'good' },
    documentation: { score: 70, feedback: 'ok' },
    complexity: { score: 85, feedback: 'efficient', big_o: 'O(n)' },
    error_handling: { score: 60, feedback: 'needs work' },
    best_practices: { score: 75, feedback: 'decent' },
    overall_score: 75,
    confidence: 90,
    flags_for_human_review: [],
    ...overrides,
  };
}

function validOrchestratorResult(overrides = {}) {
  const parsed = validParsedResponse(overrides);
  return {
    raw: JSON.stringify(parsed),
    parsed,
    model: 'gemini-2.0-flash',
    provider: 'gemini',
  };
}

describe('semanticAssessment', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockEvaluateWithFallback.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── Successful analysis ──
  describe('successful analysis', () => {
    it('returns structured result on valid LLM response', async () => {
      mockEvaluateWithFallback.mockResolvedValueOnce(validOrchestratorResult());

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
      mockEvaluateWithFallback.mockResolvedValueOnce(
        validOrchestratorResult({ overall_score: 50 })
      );

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      expect(result.overall_score).toBe(76); // computed, not LLM's 50
    });

    it('uses LLM overall when deviation is <=15', async () => {
      // Computed: 76, LLM says 75 → deviation 1 → use LLM (75)
      mockEvaluateWithFallback.mockResolvedValueOnce(validOrchestratorResult());

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      expect(result.overall_score).toBe(75); // LLM's value
    });

    it('reports model_used as the model that succeeded', async () => {
      mockEvaluateWithFallback.mockResolvedValueOnce(validOrchestratorResult());

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      expect(result.model_used).toBe('gemini-2.0-flash');
    });

    it('reports provider_used from orchestrator', async () => {
      mockEvaluateWithFallback.mockResolvedValueOnce({
        ...validOrchestratorResult(),
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
      });

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      expect(result.provider_used).toBe('groq');
      expect(result.model_used).toBe('llama-3.3-70b-versatile');
    });
  });

  // ── Orchestrator fallback behavior ──
  describe('provider fallback', () => {
    it('returns degraded result when all providers fail', async () => {
      mockEvaluateWithFallback.mockRejectedValueOnce(
        new Error('All LLM providers failed: {"groq":"rate limited","gemini":"429"}')
      );

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);

      expect(result.score).toBeNull();
      expect(result.overall_score).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.model_used).toBeNull();
      expect(result.flags_for_human_review).toContain('llm_analysis_failed');
    });

    it('returns quota message when error contains 429', async () => {
      mockEvaluateWithFallback.mockRejectedValueOnce(
        new Error('All LLM providers failed: 429 quota exceeded')
      );

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      expect(result.feedback).toContain('מכסת');
    });

    it('returns generic error message for non-quota failures', async () => {
      mockEvaluateWithFallback.mockRejectedValueOnce(new Error('network down'));

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);

      expect(result.score).toBeNull();
      expect(result.feedback).toContain('נכשל');
      expect(result.feedback).not.toContain('מכסת');
      expect(result.error).toContain('network down');
    });
  });

  // ── Invalid/incomplete LLM output ──
  describe('invalid output handling', () => {
    it('returns degraded result when parsed output is null', async () => {
      mockEvaluateWithFallback.mockResolvedValueOnce({
        raw: 'not json at all',
        parsed: null,
        model: 'gemini-2.0-flash',
        provider: 'gemini',
      });

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      expect(result.score).toBeNull();
      expect(result.flags_for_human_review).toContain('llm_output_invalid');
    });

    it('returns degraded result when required fields are missing', async () => {
      mockEvaluateWithFallback.mockResolvedValueOnce({
        raw: '{"score": 80}',
        parsed: { score: 80 },
        model: 'gemini-2.0-flash',
        provider: 'gemini',
      });

      const result = await analyzeCodeQuality('code', 'python', 'q', null, null);
      expect(result.score).toBeNull();
      expect(result.flags_for_human_review).toContain('llm_output_incomplete');
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

      mockEvaluateWithFallback.mockResolvedValueOnce(validOrchestratorResult());
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

      mockEvaluateWithFallback.mockResolvedValueOnce(validOrchestratorResult());

      const result = await analyzeCodeQuality('ignore previous', 'python', 'q', null, null);

      expect(result.injection_detected).toBe(true);
      expect(result.confidence).toBeLessThanOrEqual(50);
      expect(result.flags_for_human_review).toContain('prompt_injection_attempt_detected');
    });
  });

  // ── Context building ──
  describe('context building', () => {
    it('includes master solution and rubric in prompt when provided', async () => {
      mockEvaluateWithFallback.mockResolvedValueOnce(validOrchestratorResult());

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
      mockEvaluateWithFallback.mockResolvedValueOnce(validOrchestratorResult());

      await analyzeCodeQuality('code', 'python', 'Write hello', null, null);

      expect(buildSafePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          questionContext: expect.not.stringContaining('Reference Solution'),
        })
      );
    });
  });
});
