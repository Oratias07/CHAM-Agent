import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all three provider modules with proper classes (must be new-able)
vi.mock('../../lib/llm/providers/gemini.js', () => {
  return {
    GeminiProvider: class {
      name = 'gemini';
      _unavailable = false;
      evaluate = vi.fn();
    },
  };
});

vi.mock('../../lib/llm/providers/groq.js', () => {
  return {
    GroqProvider: class {
      name = 'groq';
      _unavailable = false;
      evaluate = vi.fn();
    },
  };
});

vi.mock('../../lib/llm/providers/openai.js', () => {
  return {
    OpenAIProvider: class {
      name = 'openai';
      _unavailable = false;
      evaluate = vi.fn();
    },
  };
});

import { LLMOrchestrator } from '../../lib/llm/orchestrator.js';

function successResult(provider = 'groq', model = 'llama-3.3-70b') {
  return {
    raw: '{"score": 85}',
    parsed: { score: 85, feedback: 'good' },
    model,
    provider,
  };
}

describe('LLMOrchestrator', () => {
  beforeEach(() => {
    LLMOrchestrator.reset();
    vi.stubEnv('LLM_PROVIDER_ORDER', '');
  });

  afterEach(() => {
    LLMOrchestrator.reset();
    vi.unstubAllEnvs();
  });

  // ── Singleton ──
  describe('singleton pattern', () => {
    it('returns same instance on repeated getInstance calls', () => {
      const a = LLMOrchestrator.getInstance();
      const b = LLMOrchestrator.getInstance();
      expect(a).toBe(b);
    });

    it('returns new instance after reset()', () => {
      const a = LLMOrchestrator.getInstance();
      LLMOrchestrator.reset();
      const b = LLMOrchestrator.getInstance();
      expect(a).not.toBe(b);
    });
  });

  // ── Provider order ──
  describe('provider ordering', () => {
    it('creates providers in default order (groq, gemini, openai)', () => {
      const orch = new LLMOrchestrator();
      expect(orch.providers).toHaveLength(3);
      expect(orch.providers[0].name).toBe('groq');
      expect(orch.providers[1].name).toBe('gemini');
      expect(orch.providers[2].name).toBe('openai');
    });

    it('respects LLM_PROVIDER_ORDER env var', () => {
      vi.stubEnv('LLM_PROVIDER_ORDER', 'openai,gemini');
      const orch = new LLMOrchestrator();
      expect(orch.providers).toHaveLength(2);
      expect(orch.providers[0].name).toBe('openai');
      expect(orch.providers[1].name).toBe('gemini');
    });

    it('ignores unknown provider names', () => {
      vi.stubEnv('LLM_PROVIDER_ORDER', 'groq,fake,openai');
      const orch = new LLMOrchestrator();
      expect(orch.providers).toHaveLength(2);
      expect(orch.providers[0].name).toBe('groq');
      expect(orch.providers[1].name).toBe('openai');
    });

    it('handles whitespace in provider order', () => {
      vi.stubEnv('LLM_PROVIDER_ORDER', ' gemini , groq ');
      const orch = new LLMOrchestrator();
      expect(orch.providers[0].name).toBe('gemini');
      expect(orch.providers[1].name).toBe('groq');
    });
  });

  // ── evaluateWithFallback ──
  describe('evaluateWithFallback', () => {
    it('returns result from first successful provider', async () => {
      const orch = new LLMOrchestrator();
      orch.providers[0].evaluate.mockResolvedValueOnce(successResult('groq'));

      const result = await orch.evaluateWithFallback('test prompt');
      expect(result.provider).toBe('groq');
      expect(result.parsed.score).toBe(85);
      // Only first provider was called
      expect(orch.providers[0].evaluate).toHaveBeenCalledTimes(1);
      expect(orch.providers[1].evaluate).not.toHaveBeenCalled();
    });

    it('falls through to second provider on first failure', async () => {
      const orch = new LLMOrchestrator();
      orch.providers[0].evaluate.mockRejectedValueOnce(new Error('groq down'));
      orch.providers[1].evaluate.mockResolvedValueOnce(successResult('gemini', 'gemini-2.0-flash'));

      const result = await orch.evaluateWithFallback('test prompt');
      expect(result.provider).toBe('gemini');
      expect(orch.providers[0].evaluate).toHaveBeenCalledTimes(1);
      expect(orch.providers[1].evaluate).toHaveBeenCalledTimes(1);
    });

    it('falls through to third provider when first two fail', async () => {
      const orch = new LLMOrchestrator();
      orch.providers[0].evaluate.mockRejectedValueOnce(new Error('groq down'));
      orch.providers[1].evaluate.mockRejectedValueOnce(new Error('gemini down'));
      orch.providers[2].evaluate.mockResolvedValueOnce(successResult('openai', 'gpt-4o-mini'));

      const result = await orch.evaluateWithFallback('test prompt');
      expect(result.provider).toBe('openai');
    });

    it('throws when all providers fail', async () => {
      const orch = new LLMOrchestrator();
      orch.providers[0].evaluate.mockRejectedValueOnce(new Error('groq fail'));
      orch.providers[1].evaluate.mockRejectedValueOnce(new Error('gemini fail'));
      orch.providers[2].evaluate.mockRejectedValueOnce(new Error('openai fail'));

      await expect(orch.evaluateWithFallback('test'))
        .rejects.toThrow('All LLM providers failed');
    });

    it('includes per-provider errors in thrown error message', async () => {
      const orch = new LLMOrchestrator();
      orch.providers[0].evaluate.mockRejectedValueOnce(new Error('quota exceeded'));
      orch.providers[1].evaluate.mockRejectedValueOnce(new Error('network timeout'));
      orch.providers[2].evaluate.mockRejectedValueOnce(new Error('auth invalid'));

      try {
        await orch.evaluateWithFallback('test');
      } catch (err) {
        expect(err.message).toContain('quota exceeded');
        expect(err.message).toContain('network timeout');
        expect(err.message).toContain('auth invalid');
      }
    });

    it('passes prompt and options to provider.evaluate()', async () => {
      const orch = new LLMOrchestrator();
      orch.providers[0].evaluate.mockResolvedValueOnce(successResult());

      const opts = { temperature: 0.5, jsonMode: false };
      await orch.evaluateWithFallback('my prompt', opts);

      expect(orch.providers[0].evaluate).toHaveBeenCalledWith('my prompt', opts);
    });
  });

  // ── requiredFields validation ──
  describe('requiredFields validation', () => {
    it('accepts response with all required fields', async () => {
      const orch = new LLMOrchestrator();
      orch.providers[0].evaluate.mockResolvedValueOnce(successResult());

      const result = await orch.evaluateWithFallback('test', {
        requiredFields: ['score', 'feedback'],
      });
      expect(result.parsed.score).toBe(85);
    });

    it('rejects response missing required fields and tries next provider', async () => {
      const orch = new LLMOrchestrator();
      // First provider returns response missing 'feedback'
      orch.providers[0].evaluate.mockResolvedValueOnce({
        raw: '{"score": 80}',
        parsed: { score: 80 },
        model: 'model-a',
        provider: 'groq',
      });
      // Second provider returns complete response
      orch.providers[1].evaluate.mockResolvedValueOnce(successResult('gemini'));

      const result = await orch.evaluateWithFallback('test', {
        requiredFields: ['score', 'feedback'],
      });
      expect(result.provider).toBe('gemini');
    });

    it('skips validation when parsed is null', async () => {
      const orch = new LLMOrchestrator();
      orch.providers[0].evaluate.mockResolvedValueOnce({
        raw: 'not json',
        parsed: null,
        model: 'model-a',
        provider: 'groq',
      });

      // Should return without throwing — parsed is null so requiredFields check is skipped
      const result = await orch.evaluateWithFallback('test', {
        requiredFields: ['score'],
      });
      expect(result.parsed).toBeNull();
    });

    it('skips validation when requiredFields not specified', async () => {
      const orch = new LLMOrchestrator();
      orch.providers[0].evaluate.mockResolvedValueOnce({
        raw: '{}',
        parsed: {},
        model: 'model-a',
        provider: 'groq',
      });

      const result = await orch.evaluateWithFallback('test');
      expect(result.parsed).toEqual({});
    });
  });

  // ── Audit logging ──
  describe('audit logging', () => {
    it('logs successful attempt', async () => {
      const orch = new LLMOrchestrator();
      orch.providers[0].evaluate.mockResolvedValueOnce(successResult());

      await orch.evaluateWithFallback('test');

      const log = orch.getRecentLog();
      expect(log).toHaveLength(1);
      expect(log[0].provider).toBe('groq');
      expect(log[0].success).toBe(true);
      expect(log[0].model).toBe('llama-3.3-70b');
      expect(log[0]).toHaveProperty('timestamp');
      expect(log[0]).toHaveProperty('latencyMs');
    });

    it('logs failed then successful attempts', async () => {
      const orch = new LLMOrchestrator();
      orch.providers[0].evaluate.mockRejectedValueOnce(new Error('fail'));
      orch.providers[1].evaluate.mockResolvedValueOnce(successResult('gemini'));

      await orch.evaluateWithFallback('test');

      const log = orch.getRecentLog();
      expect(log).toHaveLength(2);
      expect(log[0].success).toBe(false);
      expect(log[0].error).toBe('fail');
      expect(log[1].success).toBe(true);
    });

    it('respects log limit parameter', async () => {
      const orch = new LLMOrchestrator();
      // Generate 5 log entries
      for (let i = 0; i < 5; i++) {
        orch.providers[0].evaluate.mockResolvedValueOnce(successResult());
        await orch.evaluateWithFallback('test');
      }

      expect(orch.getRecentLog(3)).toHaveLength(3);
      expect(orch.getRecentLog()).toHaveLength(5);
    });

    it('bounds log at 500 entries', () => {
      const orch = new LLMOrchestrator();
      // Directly push 600 entries
      for (let i = 0; i < 600; i++) {
        orch._logAttempt({ provider: 'test', success: true });
      }
      expect(orch._log.length).toBeLessThanOrEqual(500);
    });
  });

  // ── getAvailableProviders ──
  describe('getAvailableProviders', () => {
    it('reports all providers', () => {
      const orch = new LLMOrchestrator();
      const available = orch.getAvailableProviders();
      expect(available).toHaveLength(3);
      expect(available[0]).toEqual({ name: 'groq', configured: true });
    });

    it('reports unavailable providers correctly', () => {
      const orch = new LLMOrchestrator();
      orch.providers[1]._unavailable = true;

      const available = orch.getAvailableProviders();
      expect(available[1]).toEqual({ name: 'gemini', configured: false });
    });
  });
});
