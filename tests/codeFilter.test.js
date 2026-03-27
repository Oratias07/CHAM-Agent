import { describe, it, expect } from 'vitest';
import { filterCode } from '../services/codeFilter.js';

describe('codeFilter', () => {
  // ── Python ──
  describe('python', () => {
    it('blocks network imports', () => {
      const r = filterCode('import socket', 'python');
      expect(r.allowed).toBe(false);
      expect(r.violations[0].category).toBe('network');
    });

    it('blocks requests import', () => {
      const r = filterCode('import requests\nrequests.get("http://evil.com")', 'python');
      expect(r.allowed).toBe(false);
      expect(r.violations.some(v => v.category === 'network')).toBe(true);
    });

    it('blocks filesystem write', () => {
      const r = filterCode("open('data.txt', 'w')", 'python');
      expect(r.allowed).toBe(false);
      expect(r.violations[0].category).toBe('filesystem');
    });

    it('blocks os.system', () => {
      const r = filterCode('import os\nos.system("rm -rf /")', 'python');
      expect(r.allowed).toBe(false);
      expect(r.violations.some(v => v.category === 'process')).toBe(true);
    });

    it('blocks subprocess', () => {
      const r = filterCode('import subprocess', 'python');
      expect(r.allowed).toBe(false);
    });

    it('blocks eval/exec', () => {
      const r = filterCode('eval("1+1")\nexec("print(1)")', 'python');
      expect(r.allowed).toBe(false);
      expect(r.violations.length).toBe(2);
    });

    it('blocks os.environ access', () => {
      const r = filterCode('import os\nos.environ["SECRET"]', 'python');
      expect(r.allowed).toBe(false);
      expect(r.violations.some(v => v.category === 'dangerous')).toBe(true);
    });

    it('allows safe code', () => {
      const code = `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))`;
      const r = filterCode(code, 'python');
      expect(r.allowed).toBe(true);
      expect(r.violations).toHaveLength(0);
    });

    it('reports correct line numbers', () => {
      const code = 'x = 1\ny = 2\nimport socket\nz = 3';
      const r = filterCode(code, 'python');
      expect(r.violations[0].line).toBe(3);
    });

    it('reports multiple violations', () => {
      const code = 'import socket\nimport subprocess\nos.system("ls")';
      const r = filterCode(code, 'python');
      expect(r.violations.length).toBeGreaterThanOrEqual(3);
    });

    it('truncates long line content to 100 chars', () => {
      const longLine = 'import socket' + ' '.repeat(200);
      const r = filterCode(longLine, 'python');
      expect(r.violations[0].lineContent.length).toBeLessThanOrEqual(100);
    });
  });

  // ── JavaScript ──
  describe('javascript', () => {
    it('blocks require("http")', () => {
      const r = filterCode("const http = require('http')", 'javascript');
      expect(r.allowed).toBe(false);
      expect(r.violations[0].category).toBe('network');
    });

    it('blocks fetch calls', () => {
      const r = filterCode('fetch("http://evil.com")', 'javascript');
      expect(r.allowed).toBe(false);
    });

    it('blocks require("fs")', () => {
      const r = filterCode("const fs = require('fs')", 'javascript');
      expect(r.allowed).toBe(false);
      expect(r.violations[0].category).toBe('filesystem');
    });

    it('blocks child_process', () => {
      const r = filterCode("require('child_process')", 'javascript');
      expect(r.allowed).toBe(false);
    });

    it('blocks process.env', () => {
      const r = filterCode('const key = process.env.SECRET', 'javascript');
      expect(r.allowed).toBe(false);
    });

    it('blocks eval', () => {
      const r = filterCode('eval("alert(1)")', 'javascript');
      expect(r.allowed).toBe(false);
    });

    it('allows safe code', () => {
      const code = `
function isPrime(n) {
  if (n <= 1) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}
console.log(isPrime(17));`;
      const r = filterCode(code, 'javascript');
      expect(r.allowed).toBe(true);
    });
  });

  // ── Java ──
  describe('java', () => {
    it('blocks java.net usage', () => {
      const r = filterCode('import java.net.Socket;', 'java');
      expect(r.allowed).toBe(false);
    });

    it('blocks Runtime.exec', () => {
      const r = filterCode('Runtime.getRuntime().exec("ls")', 'java');
      expect(r.allowed).toBe(false);
    });

    it('blocks System.exit', () => {
      const r = filterCode('System.exit(0);', 'java');
      expect(r.allowed).toBe(false);
    });

    it('allows safe code', () => {
      const code = `
public class Main {
  public static void main(String[] args) {
    System.out.println("Hello");
  }
}`;
      const r = filterCode(code, 'java');
      expect(r.allowed).toBe(true);
    });
  });

  // ── C ──
  describe('c', () => {
    it('blocks socket.h include', () => {
      const r = filterCode('#include <sys/socket.h>', 'c');
      expect(r.allowed).toBe(false);
      expect(r.violations[0].category).toBe('network');
    });

    it('blocks socket.h include with spaces after #', () => {
      const r = filterCode('# include <sys/socket.h>', 'c');
      expect(r.allowed).toBe(false);
    });

    it('blocks netinet include', () => {
      const r = filterCode('#include <netinet/in.h>', 'c');
      expect(r.allowed).toBe(false);
    });

    it('blocks arpa/inet.h include', () => {
      const r = filterCode('#include <arpa/inet.h>', 'c');
      expect(r.allowed).toBe(false);
    });

    it('blocks netdb.h include', () => {
      const r = filterCode('#include <netdb.h>', 'c');
      expect(r.allowed).toBe(false);
    });

    it('blocks socket() call', () => {
      const r = filterCode('int fd = socket(AF_INET, SOCK_STREAM, 0);', 'c');
      expect(r.allowed).toBe(false);
      expect(r.violations[0].category).toBe('network');
    });

    it('blocks system() call', () => {
      const r = filterCode('system("rm -rf /");', 'c');
      expect(r.allowed).toBe(false);
    });

    it('blocks fork()', () => {
      const r = filterCode('pid_t pid = fork();', 'c');
      expect(r.allowed).toBe(false);
    });

    it('allows safe code', () => {
      const code = `
#include <stdio.h>
int main() {
  printf("Hello\\n");
  return 0;
}`;
      const r = filterCode(code, 'c');
      expect(r.allowed).toBe(true);
    });
  });

  // ── C++ ──
  describe('cpp', () => {
    it('inherits C patterns', () => {
      const r = filterCode('system("ls");', 'cpp');
      expect(r.allowed).toBe(false);
    });

    it('blocks boost/asio include', () => {
      const r = filterCode('#include <boost/asio>', 'cpp');
      expect(r.allowed).toBe(false);
    });

    it('blocks boost/asio with space after #', () => {
      const r = filterCode('# include <boost/asio>', 'cpp');
      expect(r.allowed).toBe(false);
    });

    it('blocks std::ofstream', () => {
      const r = filterCode('std::ofstream out("file.txt");', 'cpp');
      expect(r.allowed).toBe(false);
    });

    it('accepts c++ as language name', () => {
      const r = filterCode('system("ls");', 'c++');
      expect(r.allowed).toBe(false);
    });

    it('allows safe code', () => {
      const code = `
#include <iostream>
int main() {
  std::cout << "Hello" << std::endl;
  return 0;
}`;
      const r = filterCode(code, 'cpp');
      expect(r.allowed).toBe(true);
    });
  });

  // ── Edge cases ──
  describe('edge cases', () => {
    it('returns warning for unknown language', () => {
      const r = filterCode('some code', 'rust');
      expect(r.allowed).toBe(true);
      expect(r.warning).toContain('rust');
    });

    it('handles empty code', () => {
      const r = filterCode('', 'python');
      expect(r.allowed).toBe(true);
      expect(r.violations).toHaveLength(0);
    });

    it('is case-insensitive for language', () => {
      const r = filterCode('import socket', 'Python');
      expect(r.allowed).toBe(false);
    });
  });
});
