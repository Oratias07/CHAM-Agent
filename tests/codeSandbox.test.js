import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test internal helpers and the exported executeTests.
// Since buildHeaders, getApiUrl, buildTestInput, compareOutput are not exported,
// we test them indirectly through executeTests + mock fetch.

// Mock codeFilter to isolate codeSandbox tests
vi.mock('../services/codeFilter.js', () => ({
  filterCode: vi.fn(() => ({ allowed: true, violations: [] })),
}));

import { executeTests } from '../services/codeSandbox.js';
import { filterCode } from '../services/codeFilter.js';

describe('codeSandbox', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('JUDGE0_API_URL', 'https://judge0.test.local');
    filterCode.mockReturnValue({ allowed: true, violations: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // ── Environment config ──
  describe('environment config', () => {
    it('throws when JUDGE0_API_URL is not set', async () => {
      vi.stubEnv('JUDGE0_API_URL', '');

      const result = await executeTests({
        code: 'print(1)',
        language: 'python',
        tests: [{ input: '', expected_output: '1', test_type: 'equality' }],
      });
      expect(result.score).toBe(0);
      expect(result.execution_errors[0]).toContain('JUDGE0_API_URL');
    });

    it('does not require JUDGE0_API_KEY', async () => {
      // No API key set — should still attempt to call fetch
      vi.stubEnv('JUDGE0_API_KEY', '');

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          stdout: Buffer.from('1\n').toString('base64'),
          stderr: '',
          compile_output: '',
          status: { id: 3, description: 'Accepted' },
          time: '0.01',
          memory: 1024,
        }),
      });

      const result = await executeTests({
        code: 'print(1)',
        language: 'python',
        tests: [{ input: '', expected_output: '1', test_type: 'equality' }],
      });
      expect(result.score).toBe(100);

      // Verify no RapidAPI headers were sent
      const headers = fetch.mock.calls[0][1].headers;
      expect(headers['X-RapidAPI-Key']).toBeUndefined();
      expect(headers['X-RapidAPI-Host']).toBeUndefined();
    });

    it('includes RapidAPI headers when API key is set', async () => {
      vi.stubEnv('JUDGE0_API_KEY', 'test-key-123');

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          stdout: Buffer.from('1\n').toString('base64'),
          stderr: '',
          compile_output: '',
          status: { id: 3, description: 'Accepted' },
          time: '0.01',
          memory: 1024,
        }),
      });

      await executeTests({
        code: 'print(1)',
        language: 'python',
        tests: [{ input: '', expected_output: '1', test_type: 'equality' }],
      });

      const headers = fetch.mock.calls[0][1].headers;
      expect(headers['X-RapidAPI-Key']).toBe('test-key-123');
      expect(headers['X-RapidAPI-Host']).toBe('judge0-ce.p.rapidapi.com');
    });
  });

  // ── Security filter ──
  describe('security filter integration', () => {
    it('blocks code that fails security filter', async () => {
      filterCode.mockReturnValue({
        allowed: false,
        violations: [
          { category: 'process', pattern: 'os.system', line: 1, lineContent: 'os.system("rm -rf /")' },
        ],
      });

      const result = await executeTests({
        code: 'os.system("rm -rf /")',
        language: 'python',
        tests: [{ input: '', expected_output: '', test_type: 'equality', description: 'test1' }],
      });

      expect(result.score).toBe(0);
      expect(result.security_blocked).toBe(true);
      expect(result.filter_violations).toHaveLength(1);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  // ── No tests ──
  describe('no tests defined', () => {
    it('returns score 100 when no tests provided', async () => {
      const result = await executeTests({ code: 'print(1)', language: 'python', tests: [] });
      expect(result.score).toBe(100);
      expect(result.total_tests).toBe(0);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  // ── Single test execution ──
  describe('single test execution', () => {
    it('scores 100 on passing test', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          stdout: Buffer.from('42\n').toString('base64'),
          stderr: '',
          compile_output: '',
          status: { id: 3, description: 'Accepted' },
          time: '0.05',
          memory: 2048,
        }),
      });

      const result = await executeTests({
        code: 'print(42)',
        language: 'python',
        tests: [{ input: '', expected_output: '42', test_type: 'equality', description: 'Output 42' }],
      });

      expect(result.score).toBe(100);
      expect(result.passed).toBe(1);
      expect(result.test_results[0].status).toBe('passed');
      // Single test uses non-batch endpoint with wait=true
      expect(fetch.mock.calls[0][0]).toContain('wait=true');
    });

    it('scores 0 on wrong answer', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          stdout: Buffer.from('43\n').toString('base64'),
          stderr: '',
          compile_output: '',
          status: { id: 3, description: 'Accepted' },
          time: '0.05',
          memory: 2048,
        }),
      });

      const result = await executeTests({
        code: 'print(43)',
        language: 'python',
        tests: [{ input: '', expected_output: '42', test_type: 'equality' }],
      });

      expect(result.score).toBe(0);
      expect(result.test_results[0].status).toBe('wrong_answer');
    });

    it('handles compilation error', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          stdout: '',
          stderr: '',
          compile_output: Buffer.from('syntax error').toString('base64'),
          status: { id: 6, description: 'Compilation Error' },
          time: null,
          memory: null,
        }),
      });

      const result = await executeTests({
        code: 'invalid code{{{',
        language: 'java',
        tests: [{ input: '', expected_output: '', test_type: 'equality' }],
      });

      expect(result.score).toBe(0);
      expect(result.test_results[0].status).toBe('compilation_error');
    });

    it('handles runtime error', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          stdout: '',
          stderr: Buffer.from('ZeroDivisionError').toString('base64'),
          compile_output: '',
          status: { id: 11, description: 'Runtime Error (NZEC)' },
          time: '0.01',
          memory: 1024,
        }),
      });

      const result = await executeTests({
        code: 'print(1/0)',
        language: 'python',
        tests: [{ input: '', expected_output: '1', test_type: 'equality' }],
      });

      expect(result.score).toBe(0);
      expect(result.test_results[0].status).toBe('runtime_error');
    });

    it('handles time limit exceeded', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          stdout: '',
          stderr: '',
          compile_output: '',
          status: { id: 5, description: 'Time Limit Exceeded' },
          time: '15',
          memory: 256000,
        }),
      });

      const result = await executeTests({
        code: 'while True: pass',
        language: 'python',
        tests: [{ input: '', expected_output: '', test_type: 'equality' }],
      });

      expect(result.test_results[0].status).toBe('time_limit_exceeded');
    });

    it('handles exception test type correctly', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          stdout: '',
          stderr: Buffer.from('ValueError: invalid literal').toString('base64'),
          compile_output: '',
          status: { id: 11, description: 'Runtime Error (NZEC)' },
          time: '0.01',
          memory: 1024,
        }),
      });

      const result = await executeTests({
        code: 'int("abc")',
        language: 'python',
        tests: [{
          input: '', expected_output: 'ValueError',
          test_type: 'exception', description: 'Should raise ValueError',
        }],
      });

      expect(result.score).toBe(100);
      expect(result.test_results[0].status).toBe('passed');
    });
  });

  // ── Batch test execution ──
  describe('batch execution (multiple tests)', () => {
    it('uses batch endpoint for 2+ tests', async () => {
      // batch POST returns tokens
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { token: 'token-1' },
          { token: 'token-2' },
        ]),
      });

      // poll returns results
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          submissions: [
            {
              stdout: Buffer.from('1\n').toString('base64'),
              stderr: '', compile_output: '',
              status: { id: 3 }, time: '0.01', memory: 1024,
            },
            {
              stdout: Buffer.from('4\n').toString('base64'),
              stderr: '', compile_output: '',
              status: { id: 3 }, time: '0.01', memory: 1024,
            },
          ],
        }),
      });

      const result = await executeTests({
        code: 'n=int(input())\nprint(n*n)',
        language: 'python',
        tests: [
          { input: '1', expected_output: '1', test_type: 'equality' },
          { input: '2', expected_output: '4', test_type: 'equality' },
        ],
      });

      expect(result.score).toBe(100);
      expect(result.passed).toBe(2);
      expect(result.total_tests).toBe(2);
      // First call is batch submit, second is poll
      expect(fetch.mock.calls[0][0]).toContain('/submissions/batch');
    });

    it('computes partial score correctly', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ token: 't1' }, { token: 't2' }, { token: 't3' }]),
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          submissions: [
            { stdout: Buffer.from('1\n').toString('base64'), stderr: '', compile_output: '', status: { id: 3 }, time: '0.01', memory: 1024 },
            { stdout: Buffer.from('wrong\n').toString('base64'), stderr: '', compile_output: '', status: { id: 3 }, time: '0.01', memory: 1024 },
            { stdout: Buffer.from('9\n').toString('base64'), stderr: '', compile_output: '', status: { id: 3 }, time: '0.01', memory: 1024 },
          ],
        }),
      });

      const result = await executeTests({
        code: 'code',
        language: 'python',
        tests: [
          { input: '1', expected_output: '1', test_type: 'equality' },
          { input: '2', expected_output: '4', test_type: 'equality' },
          { input: '3', expected_output: '9', test_type: 'equality' },
        ],
      });

      expect(result.score).toBe(67); // 2/3 rounded
      expect(result.passed).toBe(2);
      expect(result.failed_tests).toHaveLength(1);
    });
  });

  // ── Compare output modes ──
  describe('output comparison (via test execution)', () => {
    function mockSingleResult(stdout) {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          stdout: Buffer.from(stdout).toString('base64'),
          stderr: '', compile_output: '',
          status: { id: 3, description: 'Accepted' },
          time: '0.01', memory: 1024,
        }),
      });
    }

    it('trims whitespace in equality comparison', async () => {
      mockSingleResult('  42  \n');
      const result = await executeTests({
        code: 'print(42)',
        language: 'python',
        tests: [{ input: '', expected_output: '42', test_type: 'equality' }],
      });
      expect(result.score).toBe(100);
    });

    it('supports contains comparison', async () => {
      mockSingleResult('Hello World!\n');
      const result = await executeTests({
        code: 'print("Hello World!")',
        language: 'python',
        tests: [{ input: '', expected_output: 'World', test_type: 'contains' }],
      });
      expect(result.score).toBe(100);
    });

    it('supports regex comparison', async () => {
      mockSingleResult('abc123\n');
      const result = await executeTests({
        code: 'x',
        language: 'python',
        tests: [{ input: '', expected_output: '^[a-z]+\\d+$', test_type: 'regex' }],
      });
      expect(result.score).toBe(100);
    });
  });

  // ── Language support ──
  describe('language support', () => {
    it('rejects unsupported language', async () => {
      const result = await executeTests({
        code: 'code',
        language: 'rust',
        tests: [{ input: '', expected_output: '', test_type: 'equality' }],
      });
      expect(result.score).toBe(0);
      expect(result.execution_errors[0]).toContain('Unsupported language');
    });
  });

  // ── API error handling ──
  describe('API error handling', () => {
    it('handles fetch failure gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await executeTests({
        code: 'print(1)',
        language: 'python',
        tests: [{ input: '', expected_output: '1', test_type: 'equality' }],
      });

      expect(result.score).toBe(0);
      expect(result.execution_errors[0]).toContain('Network error');
    });

    it('handles non-ok response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service Unavailable'),
      });

      const result = await executeTests({
        code: 'print(1)',
        language: 'python',
        tests: [{ input: '', expected_output: '1', test_type: 'equality' }],
      });

      expect(result.score).toBe(0);
      expect(result.execution_errors[0]).toContain('503');
    });
  });
});
