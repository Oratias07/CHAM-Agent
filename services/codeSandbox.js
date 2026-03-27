/**
 * Judge0 Code Execution Service (Layer 1)
 * Executes student code against unit tests in an isolated sandbox.
 * Network is disabled, CPU/memory/time are limited.
 */

import { filterCode } from './codeFilter.js';

// Judge0 language IDs
const LANGUAGE_IDS = {
  python: 71,    // Python 3.8.1
  javascript: 63, // Node.js 12.14.0
  java: 62,       // Java (OpenJDK 13.0.1)
  c: 50,          // C (GCC 9.2.0)
  cpp: 54,        // C++ (GCC 9.2.0)
  'c++': 54,
};

// Sandbox limits
const SANDBOX_LIMITS = {
  cpu_time_limit: 5,       // seconds
  wall_time_limit: 15,     // seconds
  memory_limit: 256000,    // KB (256MB)
  stack_limit: 64000,      // KB (64MB)
  max_file_size: 1024,     // KB
  enable_network: false,   // CRITICAL: no network access
};

/**
 * Build stdin for a test case based on language.
 * For Python/JS: pass input via stdin.
 * For Java/C/C++: same approach, code reads from stdin.
 */
function buildTestInput(test) {
  if (typeof test.input === 'string') return test.input;
  if (Array.isArray(test.input)) return test.input.join('\n');
  return JSON.stringify(test.input);
}

/**
 * Compare actual output with expected output.
 */
function compareOutput(actual, expected, testType = 'equality') {
  const actualTrimmed = (actual || '').trim();
  const expectedTrimmed = (expected || '').trim();

  switch (testType) {
    case 'equality':
      return actualTrimmed === expectedTrimmed;

    case 'contains':
      return actualTrimmed.includes(expectedTrimmed);

    case 'range': {
      const actualNum = parseFloat(actualTrimmed);
      const expectedObj = typeof expected === 'object' ? expected : { min: parseFloat(expected), max: parseFloat(expected) };
      return actualNum >= expectedObj.min && actualNum <= expectedObj.max;
    }

    case 'regex':
      return new RegExp(expected).test(actualTrimmed);

    case 'exception':
      // For exception tests, we expect stderr to contain the expected error
      return true; // handled separately in evaluateTestResult

    default:
      return actualTrimmed === expectedTrimmed;
  }
}

/**
 * Build request headers for Judge0 API.
 * Supports both self-hosted (no key) and RapidAPI (with key) deployments.
 */
function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const apiKey = process.env.JUDGE0_API_KEY;
  if (apiKey) {
    headers['X-RapidAPI-Key'] = apiKey;
    headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
  }
  return headers;
}

function getApiUrl() {
  const url = process.env.JUDGE0_API_URL;
  if (!url) throw new Error('JUDGE0_API_URL not configured');
  return url;
}

/**
 * Submit code to Judge0 API for execution.
 */
async function submitToJudge0(code, language, stdin) {
  const apiUrl = getApiUrl();

  const languageId = LANGUAGE_IDS[language.toLowerCase()];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const payload = {
    source_code: Buffer.from(code).toString('base64'),
    language_id: languageId,
    stdin: stdin ? Buffer.from(stdin).toString('base64') : '',
    ...SANDBOX_LIMITS,
  };

  const response = await fetch(`${apiUrl}/submissions?base64_encoded=true&wait=true`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Judge0 API error: ${response.status} - ${error}`);
  }

  const result = await response.json();

  return {
    stdout: result.stdout ? Buffer.from(result.stdout, 'base64').toString() : '',
    stderr: result.stderr ? Buffer.from(result.stderr, 'base64').toString() : '',
    compile_output: result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : '',
    status: result.status,
    time: result.time,
    memory: result.memory,
  };
}

/**
 * Submit code to Judge0 in batch mode (multiple test cases at once).
 */
async function submitBatchToJudge0(code, language, tests) {
  const apiUrl = getApiUrl();

  const languageId = LANGUAGE_IDS[language.toLowerCase()];
  if (!languageId) throw new Error(`Unsupported language: ${language}`);

  const submissions = tests.map(test => ({
    source_code: Buffer.from(code).toString('base64'),
    language_id: languageId,
    stdin: Buffer.from(buildTestInput(test)).toString('base64'),
    expected_output: test.test_type !== 'exception'
      ? Buffer.from(String(test.expected_output).trim()).toString('base64')
      : '',
    ...SANDBOX_LIMITS,
  }));

  const response = await fetch(`${apiUrl}/submissions/batch?base64_encoded=true`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ submissions }),
  });

  if (!response.ok) {
    throw new Error(`Judge0 batch API error: ${response.status}`);
  }

  const tokens = await response.json();

  // Poll for results
  const tokenStr = tokens.map(t => t.token).join(',');
  let results;
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;

    const pollResponse = await fetch(
      `${apiUrl}/submissions/batch?tokens=${tokenStr}&base64_encoded=true`,
      { headers: buildHeaders() },
    );

    if (!pollResponse.ok) continue;

    const pollResult = await pollResponse.json();
    const allDone = pollResult.submissions.every(s => s.status?.id >= 3);

    if (allDone) {
      results = pollResult.submissions;
      break;
    }
  }

  if (!results) {
    throw new Error('Judge0 execution timed out after polling');
  }

  return results.map(r => ({
    stdout: r.stdout ? Buffer.from(r.stdout, 'base64').toString() : '',
    stderr: r.stderr ? Buffer.from(r.stderr, 'base64').toString() : '',
    compile_output: r.compile_output ? Buffer.from(r.compile_output, 'base64').toString() : '',
    status: r.status,
    time: r.time,
    memory: r.memory,
  }));
}

/**
 * Execute student code against unit tests.
 * This is the main entry point for Layer 1.
 *
 * @param {object} params
 * @param {string} params.code - Student's source code
 * @param {string} params.language - Programming language
 * @param {Array} params.tests - Array of test cases: { input, expected_output, test_type, description }
 * @returns {object} Layer 1 results
 */
export async function executeTests({ code, language, tests }) {
  // Step 1: Pre-execution security filter
  const filterResult = filterCode(code, language);
  if (!filterResult.allowed) {
    return {
      score: 0,
      total_tests: tests.length,
      passed: 0,
      failed_tests: tests.map((t, i) => ({
        test_index: i,
        description: t.description || `Test ${i + 1}`,
        status: 'blocked',
        reason: 'Code blocked by security filter',
      })),
      execution_errors: filterResult.violations.map(v =>
        `Security violation (line ${v.line}): ${v.category} - ${v.lineContent}`
      ),
      security_blocked: true,
      filter_violations: filterResult.violations,
    };
  }

  // Step 2: Execute against tests
  if (!tests || tests.length === 0) {
    return {
      score: 100, // No tests = pass by default (Layer 2 will handle quality)
      total_tests: 0,
      passed: 0,
      failed_tests: [],
      execution_errors: [],
      note: 'No unit tests defined for this question',
    };
  }

  try {
    // Use batch if multiple tests, single if one
    let results;
    if (tests.length === 1) {
      const result = await submitToJudge0(code, language, buildTestInput(tests[0]));
      results = [result];
    } else {
      results = await submitBatchToJudge0(code, language, tests);
    }

    // Step 3: Evaluate results
    const testResults = [];
    let passedCount = 0;

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      const result = results[i];

      // Status ID 3 = Accepted (ran without error)
      const executed = result.status?.id === 3;
      const compilationError = result.status?.id === 6;
      const runtimeError = result.status?.id >= 7 && result.status?.id <= 12;
      const timeLimitExceeded = result.status?.id === 5;
      const memoryLimitExceeded = result.status?.id === 13; // MLE is status 13 in some Judge0 versions

      let passed = false;
      let status = 'failed';
      let reason = '';

      if (compilationError) {
        status = 'compilation_error';
        reason = result.compile_output || 'Compilation failed';
      } else if (timeLimitExceeded) {
        status = 'time_limit_exceeded';
        reason = `Execution exceeded ${SANDBOX_LIMITS.wall_time_limit}s time limit`;
      } else if (memoryLimitExceeded) {
        status = 'memory_limit_exceeded';
        reason = `Execution exceeded ${SANDBOX_LIMITS.memory_limit / 1000}MB memory limit`;
      } else if (runtimeError) {
        if (test.test_type === 'exception') {
          // For exception tests, runtime error IS the expected behavior
          passed = result.stderr.includes(test.expected_output);
          status = passed ? 'passed' : 'wrong_exception';
          reason = passed ? '' : `Expected exception containing "${test.expected_output}", got: ${result.stderr.substring(0, 200)}`;
        } else {
          status = 'runtime_error';
          reason = result.stderr?.substring(0, 500) || 'Runtime error';
        }
      } else if (executed) {
        passed = compareOutput(result.stdout, String(test.expected_output), test.test_type);
        status = passed ? 'passed' : 'wrong_answer';
        if (!passed) {
          reason = `Expected: ${String(test.expected_output).substring(0, 200)}, Got: ${result.stdout.substring(0, 200)}`;
        }
      } else {
        status = 'unknown_error';
        reason = `Judge0 status: ${result.status?.description || 'unknown'}`;
      }

      if (passed) passedCount++;

      testResults.push({
        test_index: i,
        description: test.description || `Test ${i + 1}`,
        status,
        passed,
        reason,
        execution_time: result.time,
        memory_used: result.memory,
      });
    }

    const score = Math.round((passedCount / tests.length) * 100);

    return {
      score,
      total_tests: tests.length,
      passed: passedCount,
      failed_tests: testResults.filter(t => !t.passed),
      test_results: testResults,
      execution_errors: [],
      security_blocked: false,
    };

  } catch (err) {
    return {
      score: 0,
      total_tests: tests.length,
      passed: 0,
      failed_tests: [],
      execution_errors: [err.message],
      security_blocked: false,
    };
  }
}
