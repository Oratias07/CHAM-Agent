/**
 * Pre-execution Code Security Filter
 * Static analysis to detect dangerous patterns before sending to sandbox.
 * Even though Judge0 sandboxes execution, we filter first as defense-in-depth.
 */

const BLOCKED_PATTERNS = {
  python: {
    network: [
      /\bimport\s+socket\b/,
      /\bfrom\s+socket\b/,
      /\bimport\s+requests\b/,
      /\bfrom\s+requests\b/,
      /\bimport\s+urllib\b/,
      /\bfrom\s+urllib\b/,
      /\bimport\s+http\b/,
      /\bfrom\s+http\b/,
      /\bimport\s+ftplib\b/,
      /\bimport\s+smtplib\b/,
      /\bimport\s+paramiko\b/,
      /\bimport\s+asyncio\b.*\bopen_connection\b/,
      /\burllib\.request\b/,
      /\bhttplib\b/,
    ],
    filesystem: [
      /\bopen\s*\(\s*['"][^'"]*['"]\s*,\s*['"]w/,  // open(..., 'w')
      /\bos\.remove\b/,
      /\bos\.unlink\b/,
      /\bos\.rmdir\b/,
      /\bshutil\.rmtree\b/,
      /\bshutil\.move\b/,
      /\bos\.rename\b/,
      /\bpathlib\.Path\b.*\b(unlink|rmdir|write_text|write_bytes)\b/,
    ],
    process: [
      /\bos\.system\b/,
      /\bos\.popen\b/,
      /\bos\.exec\w*\b/,
      /\bsubprocess\b/,
      /\bimport\s+subprocess\b/,
      /\bfrom\s+subprocess\b/,
      /\b__import__\b/,
      /\beval\s*\(/,
      /\bexec\s*\(/,
      /\bcompile\s*\(/,
      /\bos\.fork\b/,
      /\bos\.spawn\b/,
      /\bctypes\b/,
    ],
    dangerous: [
      /\bos\.environ\b/,
      /\bos\.getenv\b/,
      /\bsignal\b/,
      /\bimport\s+sys\b.*\bsys\.exit\b/,
      /\bglobals\s*\(\s*\)/,
      /\blocals\s*\(\s*\)/,
      /\b__builtins__\b/,
      /\b__class__\b.*\b__subclasses__\b/,
    ],
  },
  javascript: {
    network: [
      /\brequire\s*\(\s*['"](?:http|https|net|dgram|dns|tls)['"]\s*\)/,
      /\bimport\b.*\bfrom\s+['"](?:http|https|net|dgram|dns|tls)['"]/,
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bWebSocket\b/,
      /\bnew\s+URL\b/,
    ],
    filesystem: [
      /\brequire\s*\(\s*['"]fs['"]\s*\)/,
      /\bimport\b.*\bfrom\s+['"]fs['"]/,
      /\bfs\.\w+Sync\b/,
      /\bfs\.promises\b/,
      /\bfs\.write\b/,
      /\bfs\.unlink\b/,
      /\bfs\.rmdir\b/,
      /\bfs\.rm\b/,
    ],
    process: [
      /\brequire\s*\(\s*['"]child_process['"]\s*\)/,
      /\bimport\b.*\bfrom\s+['"]child_process['"]/,
      /\bchild_process\b/,
      /\bprocess\.exit\b/,
      /\bprocess\.env\b/,
      /\bprocess\.kill\b/,
      /\beval\s*\(/,
      /\bFunction\s*\(/,
      /\bnew\s+Function\b/,
    ],
    dangerous: [
      /\brequire\s*\(\s*['"]vm['"]\s*\)/,
      /\brequire\s*\(\s*['"]cluster['"]\s*\)/,
      /\brequire\s*\(\s*['"]worker_threads['"]\s*\)/,
      /\bglobal\.\w+/,
      /\bglobalThis\b/,
    ],
  },
  java: {
    network: [
      /\bjava\.net\b/,
      /\bSocket\b/,
      /\bServerSocket\b/,
      /\bHttpURLConnection\b/,
      /\bURLConnection\b/,
      /\bURL\b.*\bopenConnection\b/,
    ],
    filesystem: [
      /\bFileWriter\b/,
      /\bFileOutputStream\b/,
      /\bFiles\.delete\b/,
      /\bFiles\.write\b/,
      /\bnew\s+File\b.*\bdelete\b/,
      /\bRandomAccessFile\b/,
    ],
    process: [
      /\bRuntime\b.*\bexec\b/,
      /\bProcessBuilder\b/,
      /\bSystem\.exit\b/,
      /\bSystem\.getenv\b/,
      /\bReflection\b/,
      /\bjava\.lang\.reflect\b/,
    ],
    dangerous: [
      /\bSystem\.getProperty\b/,
      /\bSecurityManager\b/,
      /\bClassLoader\b/,
      /\bThread\b.*\bstart\b/,
    ],
  },
  c: {
    network: [
      /#\s*include\s*<\s*sys\/socket\.h\s*>/,
      /#\s*include\s*<\s*netinet\b/,
      /#\s*include\s*<\s*arpa\/inet\.h\s*>/,
      /#\s*include\s*<\s*netdb\.h\s*>/,
      /\bsocket\s*\(/,
      /\bconnect\s*\(/,
      /\bbind\s*\(/,
      /\blisten\s*\(/,
    ],
    filesystem: [
      /\bfopen\s*\(.*,\s*"w/,
      /\bremove\s*\(/,
      /\bunlink\s*\(/,
      /\brmdir\s*\(/,
      /\brename\s*\(/,
    ],
    process: [
      /\bsystem\s*\(/,
      /\bexec\w*\s*\(/,
      /\bfork\s*\(/,
      /\bpopen\s*\(/,
      /\bdlopen\s*\(/,
      /\bptrace\s*\(/,
    ],
    dangerous: [
      /\bgetenv\s*\(/,
      /\bsetenv\s*\(/,
      /\basm\b/,
      /\b__asm__\b/,
      /\bmmap\s*\(/,
    ],
  },
};

// C++ uses C patterns plus additional ones
BLOCKED_PATTERNS['cpp'] = {
  network: [
    ...BLOCKED_PATTERNS.c.network,
    /#\s*include\s*<\s*boost\/asio\b/,
  ],
  filesystem: [
    ...BLOCKED_PATTERNS.c.filesystem,
    /\bstd::filesystem\b.*\b(remove|rename)\b/,
    /\bstd::ofstream\b/,
  ],
  process: [
    ...BLOCKED_PATTERNS.c.process,
    /\bstd::system\b/,
    /\bstd::thread\b/,
  ],
  dangerous: [
    ...BLOCKED_PATTERNS.c.dangerous,
    /\bstd::getenv\b/,
  ],
};

/**
 * Analyze code for dangerous patterns before sandbox execution.
 * @param {string} code - The student's source code
 * @param {string} language - Programming language (python, javascript, java, c, cpp)
 * @returns {{ allowed: boolean, violations: Array<{category: string, pattern: string, line: number}> }}
 */
export function filterCode(code, language) {
  const lang = language.toLowerCase().replace('c++', 'cpp');
  const patterns = BLOCKED_PATTERNS[lang];

  if (!patterns) {
    // Unknown language — allow but flag
    return { allowed: true, violations: [], warning: `No filter rules for language: ${language}` };
  }

  const violations = [];
  const lines = code.split('\n');

  for (const [category, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          violations.push({
            category,
            pattern: regex.source,
            line: i + 1,
            lineContent: lines[i].trim().substring(0, 100),
          });
        }
      }
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
  };
}
