import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock @google/genai for GeminiProvider ──
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

import { GeminiProvider } from '../lib/llm/providers/gemini.js';
import { GroqProvider } from '../lib/llm/providers/groq.js';
import { OpenAIProvider } from '../lib/llm/providers/openai.js';

// ── Helpers ──
function mockFetchSuccess(content) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      choices: [{ message: { content } }],
    }),
  });
}

function mockFetch429ThenSuccess(content) {
  return vi.fn()
    .mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate limited'),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content } }],
      }),
    });
}

function mockFetchError(status, message) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(message),
  });
}

// ═══════════════════════════════════════════════
// GeminiProvider
// ═══════════════════════════════════════════════
describe('GeminiProvider', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    mockGenerateContent.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('constructor', () => {
    it('is available when GEMINI_API_KEY is set', () => {
      const p = new GeminiProvider();
      expect(p._unavailable).toBe(false);
      expect(p.name).toBe('gemini');
    });

    it('is unavailable when no API key', () => {
      vi.stubEnv('GEMINI_API_KEY', '');
      vi.stubEnv('API_KEY', '');
      const p = new GeminiProvider();
      expect(p._unavailable).toBe(true);
    });

    it('falls back to API_KEY env var', () => {
      vi.stubEnv('GEMINI_API_KEY', '');
      vi.stubEnv('API_KEY', 'fallback-key');
      const p = new GeminiProvider();
      expect(p._unavailable).toBe(false);
    });
  });

  describe('evaluate', () => {
    it('returns parsed result on success', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '{"score": 90, "feedback": "excellent"}',
      });

      const p = new GeminiProvider();
      const result = await p.evaluate('test prompt');

      expect(result.provider).toBe('gemini');
      expect(result.model).toBe('gemini-2.0-flash');
      expect(result.parsed).toEqual({ score: 90, feedback: 'excellent' });
      expect(result.raw).toBe('{"score": 90, "feedback": "excellent"}');
    });

    it('passes temperature and jsonMode to config', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: '{"ok": true}' });

      const p = new GeminiProvider();
      await p.evaluate('prompt', { temperature: 0.7, jsonMode: true });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            temperature: 0.7,
            responseMimeType: 'application/json',
          }),
        })
      );
    });

    it('omits responseMimeType when jsonMode is false', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'plain text' });

      const p = new GeminiProvider();
      await p.evaluate('prompt', { jsonMode: false });

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.config).not.toHaveProperty('responseMimeType');
    });

    it('falls back to second model on 429', async () => {
      const quotaErr = new Error('quota');
      quotaErr.status = 429;
      mockGenerateContent
        .mockRejectedValueOnce(quotaErr)
        .mockResolvedValueOnce({ text: '{"score": 70}' });

      const p = new GeminiProvider();
      const result = await p.evaluate('prompt');

      expect(result.model).toBe('gemini-2.0-flash-lite');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('falls back to second model on 403', async () => {
      const authErr = new Error('forbidden');
      authErr.status = 403;
      mockGenerateContent
        .mockRejectedValueOnce(authErr)
        .mockResolvedValueOnce({ text: '{"score": 60}' });

      const p = new GeminiProvider();
      const result = await p.evaluate('prompt');

      expect(result.model).toBe('gemini-2.0-flash-lite');
    });

    it('does NOT fall back on non-429/403 errors — throws immediately', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('network down'));

      const p = new GeminiProvider();
      await expect(p.evaluate('prompt')).rejects.toThrow('network down');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('throws when both models fail with 429', async () => {
      const err = new Error('quota');
      err.status = 429;
      mockGenerateContent.mockRejectedValue(err);

      const p = new GeminiProvider();
      await expect(p.evaluate('prompt')).rejects.toThrow('quota');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('throws on empty response', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: '' });

      const p = new GeminiProvider();
      await expect(p.evaluate('prompt')).rejects.toThrow('Empty response');
    });

    it('throws when unavailable', async () => {
      vi.stubEnv('GEMINI_API_KEY', '');
      vi.stubEnv('API_KEY', '');
      const p = new GeminiProvider();
      await expect(p.evaluate('prompt')).rejects.toThrow('not configured');
    });
  });

  describe('isHealthy', () => {
    it('returns false when unavailable', async () => {
      vi.stubEnv('GEMINI_API_KEY', '');
      vi.stubEnv('API_KEY', '');
      const p = new GeminiProvider();
      expect(await p.isHealthy()).toBe(false);
    });

    it('returns true when API responds', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'ok' });
      const p = new GeminiProvider();
      expect(await p.isHealthy()).toBe(true);
    });

    it('returns false when API throws', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('down'));
      const p = new GeminiProvider();
      expect(await p.isHealthy()).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════
// GroqProvider
// ═══════════════════════════════════════════════
describe('GroqProvider', () => {
  let originalFetch;

  beforeEach(() => {
    vi.stubEnv('GROQ_API_KEY', 'test-groq-key');
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('is available when GROQ_API_KEY is set', () => {
      const p = new GroqProvider();
      expect(p._unavailable).toBe(false);
      expect(p.name).toBe('groq');
    });

    it('is unavailable when no API key', () => {
      vi.stubEnv('GROQ_API_KEY', '');
      const p = new GroqProvider();
      expect(p._unavailable).toBe(true);
    });
  });

  describe('evaluate', () => {
    it('returns parsed result on success', async () => {
      globalThis.fetch = mockFetchSuccess('{"score": 88}');

      const p = new GroqProvider();
      const result = await p.evaluate('test prompt');

      expect(result.provider).toBe('groq');
      expect(result.model).toBe('llama-3.3-70b-versatile');
      expect(result.parsed).toEqual({ score: 88 });
    });

    it('sends correct request structure', async () => {
      globalThis.fetch = mockFetchSuccess('{"ok": true}');

      const p = new GroqProvider();
      await p.evaluate('my prompt', { temperature: 0.5, jsonMode: true });

      const [url, opts] = globalThis.fetch.mock.calls[0];
      expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
      expect(opts.method).toBe('POST');

      const body = JSON.parse(opts.body);
      expect(body.temperature).toBe(0.5);
      expect(body.response_format).toEqual({ type: 'json_object' });
      expect(body.messages[1].content).toBe('my prompt');
    });

    it('omits response_format when jsonMode is false', async () => {
      globalThis.fetch = mockFetchSuccess('plain text');

      const p = new GroqProvider();
      await p.evaluate('prompt', { jsonMode: false });

      const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
      expect(body).not.toHaveProperty('response_format');
    });

    it('falls back to second model on 429', async () => {
      globalThis.fetch = mockFetch429ThenSuccess('{"score": 75}');

      const p = new GroqProvider();
      const result = await p.evaluate('prompt');

      expect(result.model).toBe('llama-3.1-8b-instant');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('throws on non-429 API error', async () => {
      globalThis.fetch = mockFetchError(500, 'Internal Server Error');

      const p = new GroqProvider();
      await expect(p.evaluate('prompt')).rejects.toThrow('Groq API error 500');
    });

    it('throws on empty response content', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: '' } }] }),
      });

      const p = new GroqProvider();
      await expect(p.evaluate('prompt')).rejects.toThrow('Empty response');
    });

    it('throws on null choices', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [] }),
      });

      const p = new GroqProvider();
      await expect(p.evaluate('prompt')).rejects.toThrow('Empty response');
    });

    it('throws when unavailable', async () => {
      vi.stubEnv('GROQ_API_KEY', '');
      const p = new GroqProvider();
      await expect(p.evaluate('prompt')).rejects.toThrow('not configured');
    });

    it('throws when both models fail with 429', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('rate limited'),
      });

      const p = new GroqProvider();
      await expect(p.evaluate('prompt')).rejects.toThrow('rate limited');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('includes Authorization header', async () => {
      globalThis.fetch = mockFetchSuccess('{"ok": true}');

      const p = new GroqProvider();
      await p.evaluate('prompt');

      const headers = globalThis.fetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe('Bearer test-groq-key');
    });
  });

  describe('isHealthy', () => {
    it('returns false when unavailable', async () => {
      vi.stubEnv('GROQ_API_KEY', '');
      const p = new GroqProvider();
      expect(await p.isHealthy()).toBe(false);
    });

    it('returns true when models endpoint responds ok', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
      const p = new GroqProvider();
      expect(await p.isHealthy()).toBe(true);
    });

    it('returns false when models endpoint fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
      const p = new GroqProvider();
      expect(await p.isHealthy()).toBe(false);
    });

    it('returns false on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'));
      const p = new GroqProvider();
      expect(await p.isHealthy()).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════
// OpenAIProvider
// ═══════════════════════════════════════════════
describe('OpenAIProvider', () => {
  let originalFetch;

  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('is available when OPENAI_API_KEY is set', () => {
      const p = new OpenAIProvider();
      expect(p._unavailable).toBe(false);
      expect(p.name).toBe('openai');
    });

    it('is unavailable when no API key', () => {
      vi.stubEnv('OPENAI_API_KEY', '');
      const p = new OpenAIProvider();
      expect(p._unavailable).toBe(true);
    });
  });

  describe('evaluate', () => {
    it('returns parsed result on success', async () => {
      globalThis.fetch = mockFetchSuccess('{"score": 92}');

      const p = new OpenAIProvider();
      const result = await p.evaluate('test prompt');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4o-mini');
      expect(result.parsed).toEqual({ score: 92 });
    });

    it('sends to OpenAI API URL', async () => {
      globalThis.fetch = mockFetchSuccess('{"ok": true}');

      const p = new OpenAIProvider();
      await p.evaluate('prompt');

      expect(globalThis.fetch.mock.calls[0][0]).toBe(
        'https://api.openai.com/v1/chat/completions'
      );
    });

    it('falls back to gpt-3.5-turbo on 429', async () => {
      globalThis.fetch = mockFetch429ThenSuccess('{"score": 60}');

      const p = new OpenAIProvider();
      const result = await p.evaluate('prompt');

      expect(result.model).toBe('gpt-3.5-turbo');
    });

    it('throws on 500 error', async () => {
      globalThis.fetch = mockFetchError(500, 'server error');

      const p = new OpenAIProvider();
      await expect(p.evaluate('prompt')).rejects.toThrow('OpenAI API error 500');
    });

    it('throws when unavailable', async () => {
      vi.stubEnv('OPENAI_API_KEY', '');
      const p = new OpenAIProvider();
      await expect(p.evaluate('prompt')).rejects.toThrow('not configured');
    });

    it('includes Authorization header', async () => {
      globalThis.fetch = mockFetchSuccess('{"ok": true}');

      const p = new OpenAIProvider();
      await p.evaluate('prompt');

      const headers = globalThis.fetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe('Bearer test-openai-key');
    });
  });

  describe('isHealthy', () => {
    it('returns false when unavailable', async () => {
      vi.stubEnv('OPENAI_API_KEY', '');
      const p = new OpenAIProvider();
      expect(await p.isHealthy()).toBe(false);
    });

    it('returns true when models endpoint responds ok', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
      const p = new OpenAIProvider();
      expect(await p.isHealthy()).toBe(true);
    });

    it('returns false on failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'));
      const p = new OpenAIProvider();
      expect(await p.isHealthy()).toBe(false);
    });
  });
});
