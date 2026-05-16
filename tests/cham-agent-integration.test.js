import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── Suite 1: Rebranding ──
describe('Rebranding - no ST System references', () => {
  const filesToCheck = [
    'package.json',
    'index.html',
    'components/Login.tsx',
    '.env.example',
    'README.md',
    'ARCHITECTURE.md',
    'APP_FEATURES.md',
    'USER_GUIDE.md',
    'TODO.md',
    'SOURCE_OF_TRUTH.md',
    'SKILLS.md',
  ];

  for (const file of filesToCheck) {
    it(`${file} has no "ST System" branding`, () => {
      const content = fs.readFileSync(path.resolve(file), 'utf8');
      // Check for exact "ST System" branding (not variable names like systemPrompt)
      const matches = content.match(/\bST System\b/g);
      expect(matches).toBeNull();
    });
  }

  it('package.json name is cham-agent', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.name).toBe('cham-agent');
  });

  it('index.html title contains CHAM Agent', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    expect(html).toContain('CHAM Agent');
  });

  it('Login.tsx contains CHAM Agent branding', () => {
    const login = fs.readFileSync('components/Login.tsx', 'utf8');
    expect(login).toContain('CHAM Agent');
    expect(login).not.toMatch(/\bST System\b/);
  });
});

// ── Suite 2: Feedback Release Schema ──
describe('Feedback release field', () => {
  it('Submission schema has feedback_released field', () => {
    const apiContent = fs.readFileSync('api/index.js', 'utf8');
    expect(apiContent).toContain('feedback_released');
    expect(apiContent).toContain("type: Boolean, default: false");
  });

  it('TypeScript types include feedback_released', () => {
    const types = fs.readFileSync('types.ts', 'utf8');
    expect(types).toContain('feedback_released?: boolean');
  });

  it('release-feedback endpoint exists', () => {
    const api = fs.readFileSync('api/index.js', 'utf8');
    expect(api).toContain("'/lecturer/assignments/:id/release-feedback'");
  });

  it('feedback-status endpoint exists', () => {
    const api = fs.readFileSync('api/index.js', 'utf8');
    expect(api).toContain("'/lecturer/assignments/:id/feedback-status'");
  });
});

// ── Suite 3: Threshold ──
describe('Threshold values (52, 42-62)', () => {
  it('smartRouting uses PASS_SCORE: 52', () => {
    const routing = fs.readFileSync('services/smartRouting.js', 'utf8');
    expect(routing).toContain('PASS_SCORE: 52');
    expect(routing).not.toContain('PASS_SCORE: 56');
  });

  it('manual submission endpoint uses threshold 52', () => {
    const api = fs.readFileSync('api/index.js', 'utf8');
    expect(api).toContain('>= 52');
  });
});

// ── Suite 4: Deductions ──
describe('Deductions system', () => {
  it('AssessmentLayer schema has deductions in layer2', () => {
    const api = fs.readFileSync('api/index.js', 'utf8');
    expect(api).toContain('deductions: [{');
    expect(api).toContain('codeQuote: String');
    expect(api).toContain('requirement: String');
    expect(api).toContain('pointsLost: Number');
  });

  it('Submission schema has deductions field', () => {
    const api = fs.readFileSync('api/index.js', 'utf8');
    // There should be two deductions schema blocks (AssessmentLayer and Submission)
    const matches = api.match(/deductions: \[\{/g);
    expect(matches?.length).toBeGreaterThanOrEqual(2);
  });

  it('TypeScript Deduction interface exists', () => {
    const types = fs.readFileSync('types.ts', 'utf8');
    expect(types).toContain('export interface Deduction');
    expect(types).toContain('codeQuote: string');
    expect(types).toContain('requirement: string');
    expect(types).toContain('pointsLost: number');
  });

  it('LLM prompt requests deductions', () => {
    const semantic = fs.readFileSync('services/semanticAssessment.js', 'utf8');
    expect(semantic).toContain('"deductions"');
    expect(semantic).toContain('codeQuote');
    expect(semantic).toContain('requirement');
    expect(semantic).toContain('pointsLost');
  });

  it('CHAM pipeline saves deductions to layer2', () => {
    const cham = fs.readFileSync('services/chamAssessment.js', 'utf8');
    expect(cham).toContain('deductions: layer2Result.deductions');
  });

  it('CHAM pipeline saves deductions to submission', () => {
    const cham = fs.readFileSync('services/chamAssessment.js', 'utf8');
    // Check deductions are saved in the Submission.updateOne call
    const updateSection = cham.substring(cham.indexOf('assessment_status: \'graded\''));
    expect(updateSection).toContain('deductions:');
  });
});

// ── Suite 5: Hebrew feedback ──
describe('Hebrew deduction labels', () => {
  it('feedback builder uses Hebrew labels (ממצא, ניכוי, בעיה)', () => {
    const semantic = fs.readFileSync('services/semanticAssessment.js', 'utf8');
    expect(semantic).toContain('ממצא');
    expect(semantic).toContain('ניכוי');
    expect(semantic).toContain('בעיה');
  });

  it('ReviewQueue deductions panel has RTL dir', () => {
    const rq = fs.readFileSync('components/ReviewQueue.tsx', 'utf8');
    expect(rq).toContain('dir="rtl"');
    expect(rq).toContain('ניכויים');
  });

  it('ResultSection deductions has RTL container', () => {
    const rs = fs.readFileSync('components/ResultSection.tsx', 'utf8');
    expect(rs).toContain('dir="rtl"');
    expect(rs).toContain('ממצאים וניכויים');
  });
});

// ── Suite 6: Line Numbers ──
describe('Line numbers component', () => {
  it('CodeBlockWithLineNumbers component exists', () => {
    expect(fs.existsSync('components/CodeBlockWithLineNumbers.tsx')).toBe(true);
  });

  it('CodeBlockWithLineNumbers renders line numbers', () => {
    const component = fs.readFileSync('components/CodeBlockWithLineNumbers.tsx', 'utf8');
    expect(component).toContain('{i + 1}');
    expect(component).toContain("direction: 'ltr'");
  });

  it('ReviewQueue uses CodeBlockWithLineNumbers', () => {
    const rq = fs.readFileSync('components/ReviewQueue.tsx', 'utf8');
    expect(rq).toContain('CodeBlockWithLineNumbers');
  });
});

// ── Suite 7: Manual Submission ──
describe('Manual submission', () => {
  it('submit-manual endpoint exists', () => {
    const api = fs.readFileSync('api/index.js', 'utf8');
    expect(api).toContain("'/lecturer/assignments/:id/submit-manual'");
  });

  it('endpoint validates required fields', () => {
    const api = fs.readFileSync('api/index.js', 'utf8');
    const endpointSection = api.substring(api.indexOf('submit-manual'));
    expect(endpointSection).toContain('studentId');
    expect(endpointSection).toContain('code');
  });

  it('endpoint runs CHAM pipeline', () => {
    const api = fs.readFileSync('api/index.js', 'utf8');
    const endpointSection = api.substring(api.indexOf('submit-manual'));
    expect(endpointSection).toContain('assessSubmission');
  });

  it('apiService has submitManual method', () => {
    const apiService = fs.readFileSync('services/apiService.ts', 'utf8');
    expect(apiService).toContain('submitManual');
    expect(apiService).toContain('submit-manual');
  });

  it('AssignmentManager has manual submit modal', () => {
    const am = fs.readFileSync('components/AssignmentManager.tsx', 'utf8');
    expect(am).toContain('showManualModal');
    expect(am).toContain('הגשה ידנית');
    expect(am).toContain('handleManualSubmit');
  });
});

// ── Suite 8: Logo ──
describe('Logo and favicon', () => {
  it('logo.png exists in public/', () => {
    expect(fs.existsSync('public/logo.png')).toBe(true);
  });

  it('index.html uses logo.png as favicon', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    expect(html).toContain('href="/logo.png"');
    expect(html).toContain('type="image/png"');
  });

  it('Login.tsx uses img tag for logo', () => {
    const login = fs.readFileSync('components/Login.tsx', 'utf8');
    expect(login).toContain('src="/logo.png"');
    expect(login).toContain('alt="CHAM Agent"');
  });

  it('App.tsx loading screen uses logo image', () => {
    const app = fs.readFileSync('App.tsx', 'utf8');
    expect(app).toContain('src="/logo.png"');
  });

  it('No text-based "ST" logos remain in components', () => {
    const files = [
      'LecturerDashboard.tsx',
      'components/StudentPortal.tsx',
      'components/InputSection.tsx',
    ];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      expect(content).not.toMatch(/>ST</);
    }
  });
});

// ── Suite 9: Deduction display in components ──
describe('Deduction UI across components', () => {
  it('StudentAssignments shows deduction preview', () => {
    const sa = fs.readFileSync('components/StudentAssignments.tsx', 'utf8');
    expect(sa).toContain('deductions');
    expect(sa).toContain('border-amber-500');
  });

  it('AssignmentManager shows expandable deductions', () => {
    const am = fs.readFileSync('components/AssignmentManager.tsx', 'utf8');
    expect(am).toContain('expandedDeductions');
    expect(am).toContain('#FF9800');
  });

  it('ReviewQueue shows deduction cards with orange border', () => {
    const rq = fs.readFileSync('components/ReviewQueue.tsx', 'utf8');
    expect(rq).toContain('4px solid #FF9800');
  });
});

// ── Suite 10: Audit 2026-04-30 regression guards ──
describe('Audit 2026-04-30 — CRITICAL fix regressions', () => {
  let api;
  beforeAll(() => { api = fs.readFileSync('api/index.js', 'utf8'); });

  // CRITICAL-3: POST /chat must require lecturer role
  it('POST /chat requires req.user.role === lecturer', () => {
    const idx = api.indexOf("router.post('/chat'");
    const snippet = api.slice(idx, idx + 600);
    expect(snippet).toContain("req.user.role !== 'lecturer'");
  });

  it('POST /chat role check is present before any LLM call', () => {
    const idx = api.indexOf("router.post('/chat'");
    const snippet = api.slice(idx, idx + 1800);
    const roleCheckIdx = snippet.indexOf("req.user.role !== 'lecturer'");
    const llmIdx = snippet.indexOf('evaluateWithFallback');
    expect(roleCheckIdx).toBeGreaterThan(-1);
    expect(llmIdx).toBeGreaterThan(-1);
    expect(roleCheckIdx).toBeLessThan(llmIdx);
  });

  // CRITICAL-2: POST and PUT /lecturer/assignments must have uploadRateLimit
  it('POST /lecturer/assignments uses uploadRateLimit', () => {
    expect(api).toMatch(/router\.post\(['"]\/lecturer\/assignments['"],\s*uploadRateLimit/);
  });

  it('PUT /lecturer/assignments/:id uses uploadRateLimit', () => {
    expect(api).toMatch(/router\.put\(['"]\/lecturer\/assignments\/:id['"],\s*uploadRateLimit/);
  });

  // CRITICAL-1 (2026-05-14): /student/chat must use buildSafeChatPrompt for composite injection protection
  it('/student/chat uses buildSafeChatPrompt for composite injection protection', () => {
    const studentChatIdx = api.indexOf("router.post('/student/chat'");
    const routeEnd = api.indexOf('\n// ', studentChatIdx + 1);
    const routeBody = api.slice(studentChatIdx, routeEnd);
    expect(routeBody).toContain('buildSafeChatPrompt');
  });

  it('/student/chat passes message to buildSafeChatPrompt as userQuestion', () => {
    const studentChatIdx = api.indexOf("router.post('/student/chat'");
    const routeEnd = api.indexOf('\n// ', studentChatIdx + 1);
    const routeBody = api.slice(studentChatIdx, routeEnd);
    expect(routeBody).toMatch(/userQuestion:\s*message/);
  });

  it('/student/chat passes course materials as courseContext to buildSafeChatPrompt', () => {
    const studentChatIdx = api.indexOf("router.post('/student/chat'");
    const routeEnd = api.indexOf('\n// ', studentChatIdx + 1);
    const routeBody = api.slice(studentChatIdx, routeEnd);
    expect(routeBody).toMatch(/courseContext/);
  });

  // CRITICAL-1 (2026-05-14): /chat must use buildSafePrompt for code fencing with proper injection protection
  it('/chat uses buildSafePrompt when context.studentCode is present', () => {
    const chatIdx = api.indexOf("router.post('/chat'");
    const routeEnd = api.indexOf('\n// ', chatIdx + 1);
    const routeBody = api.slice(chatIdx, routeEnd);
    expect(routeBody).toContain('buildSafePrompt');
  });

  it('/chat passes studentCode to buildSafePrompt for code fencing', () => {
    const chatIdx = api.indexOf("router.post('/chat'");
    const routeEnd = api.indexOf('\n// ', chatIdx + 1);
    const routeBody = api.slice(chatIdx, routeEnd);
    expect(routeBody).toMatch(/code:\s*context\.studentCode/);
  });
});

// ── Suite 11: Audit 2026-05-07 regression guards ──
describe('Audit 2026-05-07 — CRITICAL fix regressions', () => {
  let api;
  let semanticSvc;
  beforeAll(() => {
    api = fs.readFileSync('api/index.js', 'utf8');
    semanticSvc = fs.readFileSync('services/semanticAssessment.js', 'utf8');
  });

  // CRITICAL-1b: semanticAssessment.js premature Gemini key check removed
  it('semanticAssessment.js does not have premature GEMINI_API_KEY guard', () => {
    const analyzeIdx = semanticSvc.indexOf('export async function analyzeCodeQuality');
    const snippet = semanticSvc.slice(analyzeIdx, analyzeIdx + 300);
    expect(snippet).not.toContain("throw new Error('AI API key not configured')");
    expect(snippet).not.toMatch(/if\s*\(!aiKey\)/);
  });

  it('analyzeCodeQuality delegates to LLMOrchestrator without key pre-check', () => {
    const analyzeIdx = semanticSvc.indexOf('export async function analyzeCodeQuality');
    const snippet = semanticSvc.slice(analyzeIdx, analyzeIdx + 300);
    // No early return before orchestrator call
    expect(snippet).not.toContain('GEMINI_API_KEY');
  });

  // CRITICAL-3a: POST /evaluate must require lecturer role
  it('POST /evaluate requires req.user.role === lecturer', () => {
    const idx = api.indexOf("router.post('/evaluate'");
    const snippet = api.slice(idx, idx + 200);
    expect(snippet).toContain("req.user.role !== 'lecturer'");
  });

  // CRITICAL-3b: POST /user/update-role must block role change if already set
  it('POST /user/update-role guards against privilege escalation (existing role check)', () => {
    const idx = api.indexOf("router.post('/user/update-role'");
    const snippet = api.slice(idx, idx + 600);
    expect(snippet).toContain('existingUser?.role');
    expect(snippet).toContain('403');
  });

  it('POST /user/update-role validates role value before DB write', () => {
    const idx = api.indexOf("router.post('/user/update-role'");
    const snippet = api.slice(idx, idx + 400);
    expect(snippet).toMatch(/newRole\s*!==\s*'lecturer'/);
    expect(snippet).toMatch(/newRole\s*!==\s*'student'/);
  });

  // CRITICAL-2: rate limits on 4 newly guarded routes
  it('POST /lecturer/courses has rate limit', () => {
    expect(api).toMatch(/router\.post\(['"]\/lecturer\/courses['"],\s*uploadRateLimit/);
  });

  it('PUT /lecturer/courses/:id has rate limit', () => {
    expect(api).toMatch(/router\.put\(['"]\/lecturer\/courses\/:id['"],\s*uploadRateLimit/);
  });

  it('POST /user/update-role has rate limit', () => {
    expect(api).toMatch(/router\.post\(['"]\/user\/update-role['"],\s*uploadRateLimit/);
  });

  it('POST /teacher/submit-review has rate limit', () => {
    expect(api).toMatch(/router\.post\(['"]\/teacher\/submit-review['"],\s*submitRateLimit/);
  });

  // MEDIUM-3: evaluateSubmission dead export removed from chatService.ts
  it('chatService.ts does not export evaluateSubmission', () => {
    const chatSvc = fs.readFileSync('services/chatService.ts', 'utf8');
    expect(chatSvc).not.toContain('evaluateSubmission');
    expect(chatSvc).not.toContain('apiService.evaluate');
  });
});
