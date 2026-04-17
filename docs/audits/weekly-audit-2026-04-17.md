# CHAM Agent — Weekly Security & Architecture Audit (2026-04-17)

**Auditor:** Claude (automated)  
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `server.js`, `server_reference.js`  
**Prior audit:** `docs/audits/trial-audit-2026-04-16.md` (4 CRITICAL + 3 HIGH fixed)  
**Date:** 2026-04-17

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Unprotected LLM call sites | Direct SDK calls in `server_reference.js` and `server.js` | Open |
| 2 | CRITICAL | Missing rate limiting | `POST /lecturer/assignments/:id/submit-manual` triggers LLM + Judge0 with no rate limit | Open |
| 3 | CRITICAL | RBAC bypass | `POST /api/grades/save` has no role check; students can set their own grades | Open |
| 4 | CRITICAL | RBAC regression | 9 routes under `/api/student/*` missing student-role assertion | Open |
| 5 | HIGH | Unsafe JSON parsing | `server_reference.js:126` uses bare `JSON.parse(response.text)` | Open |
| 6 | HIGH | Missing output validation | `semanticAssessment.js` happy path skips `validateLLMOutput()`; score range 0–100 vs schema 0–10 | Open |
| 7 | HIGH | `alert()` in UI | No violations found ✓ | — |
| 8 | MEDIUM | Hebrew/RTL | `GradeBook.tsx:40` uses hardcoded `left`/`right` in `scrollBy` | Report only |
| 9 | MEDIUM | Prompt version drift | Layer 2 prompt has no version tracking; PROMPT_VERSION only stamped on `/evaluate` | Report only |
| 10 | MEDIUM | Dead code | `server_reference.js`, `server.js` unreferenced from production entry points | Report only |

**CRITICAL:** 4 findings → 4 GitHub issues (label: `security`)  
**HIGH:** 2 findings → 1 consolidated GitHub issue (label: `code-quality`)

---

## CRITICAL Findings

### CRITICAL-1 — Unprotected LLM Call Sites in Tracked Files

**Check:** Every call to Groq/Gemini/OpenAI must go through `LLMOrchestrator.evaluateWithFallback()` **and** `buildSafePrompt()`. Flag any direct SDK call bypassing either.

#### 1a. `server_reference.js:119–126` — Triple violation

```js
// server_reference.js:119
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const response = await ai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: `Evaluate this code based on rubric: ${rubric}. Question: ${question}. Student: ${studentCode}`,
  // ↑ raw string interpolation — no buildSafePrompt(), no injection detection
  config: { responseMimeType: "application/json" }
});
res.json(JSON.parse(response.text));  // line 126: bare JSON.parse, no safeParseLLMResponse
```

**Violations:**
1. Direct `GoogleGenAI` SDK instantiation — bypasses `LLMOrchestrator.evaluateWithFallback()`
2. Raw `${rubric}. … ${studentCode}` interpolation — bypasses `buildSafePrompt()` entirely; no injection detection, no XML fencing
3. `JSON.parse(response.text)` without `safeParseLLMResponse` — unguarded parse throw on malformed LLM output

**File:** `server_reference.js`, lines 115–130  
**Production impact:** File is not currently routed by `vercel.json`. However it is tracked in git, will appear in PRs and code reviews, and could mislead contributors into copying the unguarded pattern.

#### 1b. `server.js:434–463` — Orchestrator bypass

```js
// server.js:434
const ai = new GoogleGenAI({ apiKey: aiKey });
// ...uses buildSafePrompt() ✓ and validateLLMOutput() ✓
const response = await ai.models.generateContent({  // line 456
  model: 'gemini-2.0-flash',
  contents: prompt,
  config: { responseMimeType: "application/json", temperature: 0.2 }
});
```

**Violation:** Direct `GoogleGenAI` call — bypasses `LLMOrchestrator.evaluateWithFallback()`. No multi-provider fallback (Groq → Gemini → OpenAI). If Gemini is unavailable the endpoint fails completely instead of falling through.

`buildSafePrompt()` and `validateLLMOutput()` **are** present — only the orchestrator is missing.

**File:** `server.js`, lines 425–479  
**Production impact:** `server.js` is not in `vercel.json` production routing, but is tracked in git.

**Dead import in production path:**  
`services/semanticAssessment.js:8` — `import { GoogleGenAI } from '@google/genai';` is imported but never used. The actual LLM call goes through the orchestrator (line 102). Leftover from the refactor; creates misleading surface area.

---

### CRITICAL-2 — Missing Rate Limit on LLM-Triggering Route

**Check:** Every Express route accepting user-controlled code/text must be protected by `express-rate-limit`.

**File:** `api/index.js:878`  
**Route:** `POST /lecturer/assignments/:id/submit-manual`

```js
// api/index.js:878 — no rate limit middleware
router.post('/lecturer/assignments/:id/submit-manual', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  // ...
  const chamResult = await assessSubmission({ submission, assignment, models });
  // ↑ triggers Layer 1 (Judge0 compute) + Layer 2 (LLM evaluation)
```

**Impact:** A malicious or compromised lecturer account can send unlimited requests to this endpoint. Each request:
- Spins up a Judge0 sandbox execution (compute cost, network cost)
- Makes one or more LLM API calls through the orchestrator (API quota cost)

The existing rate-limited path (`POST /student/assignments/:id/submit`) has `submitRateLimit` (20/15 min). The equivalent manual-submit path has no protection.

**Fix:** Apply `llmRateLimit` (100/hr) or a dedicated `submitRateLimit` (20/15 min) as the first middleware argument.

---

### CRITICAL-3 — RBAC Bypass: Students Can Set Their Own Grades

**Check:** Routes under `/api/student/*` must assert student role; all authenticated routes must enforce appropriate role separation.

**File:** `api/index.js:684–703`  
**Route:** `POST /api/grades/save`

```js
// api/index.js:684
router.post('/grades/save', async (req, res) => {
  if (!req.user) return res.status(401).send();  // ← authentication only, no role check
  await connectDB();
  const { exerciseId, studentId, score, feedback } = req.body;

  await Grade.findOneAndUpdate(
    { userId: req.user.googleId, exerciseId, studentId },
    { score, feedback, timestamp: Date.now() },
    { upsert: true }
  );

  // api/index.js:697 — writes to Submission collection
  await Submission.findOneAndUpdate(
    { assignmentId: exerciseId, studentId },
    { score, feedback, status: 'evaluated' }  // ← sets score and marks as evaluated
  );

  res.json({ success: true });
});
```

**Attack vector:** A student sends:
```
POST /api/grades/save
{ "exerciseId": "<their assignmentId>", "studentId": "<their googleId>", "score": 100, "feedback": "perfect" }
```

This:
1. Creates/overwrites a `Grade` document with their chosen score
2. Updates the `Submission` document (`{ score: 100, status: 'evaluated' }`) — bypassing the entire CHAM pipeline

This is a direct privilege escalation: any authenticated student can award themselves a perfect grade on any assignment in any course.

**Fix:** Add `if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();` before the handler body.

---

### CRITICAL-4 — RBAC Regression: Student Routes Missing Role Assertion

**Check:** Every route under `/api/student/*` must assert student role.

**File:** `api/index.js`  
**Affected routes** (authentication check only, no `role !== 'student'` guard):

| Line | Route | Risk |
|------|-------|------|
| 443 | `POST /student/materials/:id/view` | Lecturers can mark materials as viewed by any ID |
| 506 | `POST /student/clear-notifications` | Lecturers can clear any user's notifications |
| 534 | `GET /student/submissions` | Lecturers can query the submissions store as-student |
| 541 | `GET /student/waitlist-history` | Lecturers can access their own waitlist history as if a student |
| 548 | `GET /student/courses/:courseId/materials` | Lecturers can query student-facing material list |
| 558 | `GET /student/materials/:id/content` | Lecturers can read student_private materials by guessing IDs |
| 567 | `POST /student/private-materials` | Lecturers can create records with `type: 'student_private'` attributed to their own `ownerId` |
| 930 | `GET /student/courses/:courseId/assignments` | Lecturers can call student assignment endpoint; also returns assignments for any courseId without enrollment check |
| **939** | **`POST /student/assignments/:id/submit`** | **Lecturers can submit code on behalf of any student, creating a `Submission` attributed to the lecturer's `googleId`** |

Most critical: line 939 (`POST /student/assignments/:id/submit`) — a lecturer calling this endpoint with a student's `assignmentId` creates a submission attributed to the lecturer's ID; combined with CRITICAL-3 they could then grade that submission.

**Fix:** Add `req.user.role !== 'student'` to the guard on each of the above routes (same pattern already applied to lecturer-prefixed routes in this file).

---

## HIGH Findings (Consolidated)

### HIGH-A — `validateLLMOutput()` Skipped in CHAM Layer 2 Happy Path

**File:** `services/semanticAssessment.js:107–122`

```js
// semanticAssessment.js:107
if (!result.parsed) {
  // Only this branch calls validateLLMOutput:
  const validation = validateLLMOutput(result.raw, REQUIRED_FIELDS);
  if (!validation.valid) { return { ..., flags_for_human_review: ['llm_output_invalid'] }; }
  result.parsed = validation.data;
}

// Happy path (result.parsed IS present) falls through here without validation:
const data = result.parsed;  // line 122 — score range check skipped
```

When the Gemini/Groq/OpenAI provider successfully parses the JSON response, `result.parsed` is non-null and `validateLLMOutput()` is never called. The score range enforcement (checking each criterion score is within 0–100) and the required-field check are bypassed. A provider could return `{ code_quality: { score: 9999 } }` and it would propagate to `assessmentDoc`.

### HIGH-B — Score Range Mismatch: Prompt Schema (0–10) vs Validator (0–100)

**Files:** `api/index.js:764` and `services/promptGuard.js:141`

The `/evaluate` endpoint tells the LLM:
```js
// api/index.js:764
'"score": number (0-10),'
```

But `validateLLMOutput` checks:
```js
// services/promptGuard.js:141
if (value < 0 || value > 100) {
```

An LLM returning `{ score: 75 }` on a 0–100 misinterpretation of the prompt passes validation and is returned to the client as a valid 0–10 score — but `75` is not a valid value in the intended 0–10 range. The frontend would display an inflated score.

### HIGH-C — `server_reference.js:126`: Bare `JSON.parse` Without `safeParseLLMResponse`

Covered structurally under CRITICAL-1a, but specifically violates the HIGH check independently:

```js
res.json(JSON.parse(response.text));  // server_reference.js:126
```

No `safeParseLLMResponse` wrapper. Markdown-fenced responses cause an uncaught exception propagating as HTTP 500 with no graceful fallback.

---

## MEDIUM Findings (Weekly Report Only)

### MEDIUM-8 — Hebrew/RTL Consistency

**File:** `components/GradeBook.tsx:40`

```js
scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
```

Uses absolute `left`/`right` direction strings from the parameter without RTL-awareness. In an RTL layout (Hebrew UI), "left" should scroll toward the start, not toward the physical left. The parameter itself uses English strings `'left'`/`'right'` instead of logical `'start'`/`'end'`.

**Fix:** Use CSS logical properties or invert scroll direction when `document.dir === 'rtl'`.

No other hardcoded `left:`/`right:` CSS-in-JS violations found in scanned components.

---

### MEDIUM-9 — Prompt Version Drift

**File:** `api/index.js:15` — `const PROMPT_VERSION = 'v1.1.0';`

`PROMPT_VERSION` is stamped only on `/api/evaluate` (line 795) responses. The CHAM Layer 2 evaluation (`semanticAssessment.js`) uses a separate `SYSTEM_INSTRUCTION` + `OUTPUT_SCHEMA` prompt template that has no version tracking — changes to it do not trigger a version bump and are not recorded in assessment documents.

Additionally, `semanticAssessment.js` imports `GoogleGenAI` on line 8 but never calls it. This dead import is a leftover from the pre-orchestrator code path.

**Fix:**
1. Move `PROMPT_VERSION` to a shared constant (e.g., `lib/llm/index.js`) and include it in CHAM `AssessmentLayer` documents.
2. Remove the dead `import { GoogleGenAI }` from `semanticAssessment.js:8`.

---

### MEDIUM-10 — Dead Code / Orphaned Files

| File | References | Issues |
|------|-----------|--------|
| `server_reference.js` | None (not in `package.json`, `api/index.js`, `App.tsx`, or `vercel.json`) | CRITICAL-1a violations; should be deleted |
| `server.js` | None (not routed in `vercel.json`) | CRITICAL-1b orchestrator bypass; no `NODE_ENV=production` guard |

**Recommendation:** Delete `server_reference.js` (all patterns are anti-patterns relative to current architecture). Add `if (process.env.NODE_ENV === 'production') { throw new Error('server.js must not run in production'); }` to top of `server.js`.

---

## Checks With No Violations

| Check | Result |
|-------|--------|
| Check 1 (production entry `api/index.js`) | All LLM calls go through `LLMOrchestrator.evaluateWithFallback()` ✓ |
| Check 2 — `/api/evaluate`, `/api/chat`, `/api/student/chat`, `/api/student/assignments/:id/submit`, `POST /messages`, `PUT /messages/:id`, `POST /student/private-materials`, `POST /lecturer/archive` | All rate-limited ✓ |
| Check 3 — `/api/lecturer/*` RBAC | All lecturer-prefixed routes assert `role !== 'lecturer'` ✓ |
| Check 3 — `/api/auth/dev` production guard | Disabled when `NODE_ENV=production` ✓ |
| Check 4 — Secrets in tracked files | No hardcoded API keys, MONGODB URIs, OAuth secrets, or session secrets found; `README.md:234` has placeholder only ✓ |
| Check 5 — `validateLLMOutput` uses `safeParseLLMResponse` | Fixed in prior audit; `promptGuard.js` delegates to `safeParseLLMResponse` ✓ |
| Check 7 — `alert()`/`confirm()`/`prompt()` in React | All replaced with inline state patterns; no browser dialog calls in production components ✓ |

---

## Appendix: Files Scanned

```
api/index.js (1299 lines)
lib/llm/orchestrator.js
lib/llm/safeParse.js
lib/llm/providers/gemini.js
lib/llm/providers/groq.js  [not fully read — structure mirrors gemini.js]
lib/llm/providers/openai.js [not fully read — structure mirrors gemini.js]
services/promptGuard.js
services/chamAssessment.js
services/semanticAssessment.js
server.js
server_reference.js
package.json
vercel.json
App.tsx
LecturerDashboard.tsx
components/GradeBook.tsx
components/AssignmentManager.tsx
components/CourseManager.tsx
components/ResultSection.tsx
docs/audits/trial-audit-2026-04-16.md
```
