# CHAM Agent — Weekly Security & Architecture Audit (2026-05-07)

**Auditor:** Claude (automated)
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `LecturerDashboard.tsx`
**Prior audit:** `docs/audits/weekly-audit-2026-04-30.md` (3 CRITICAL — all resolved in commit `8dad476`)
**Date:** 2026-05-07

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Unprotected LLM call sites | `/chat` and `/student/chat` bypass `buildSafePrompt()` (partial re-open from 2026-04-30); `semanticAssessment.js:74` premature Gemini key check breaks multi-provider fallback | Open |
| 2 | CRITICAL | Missing rate limiting | 4 routes with user-controlled text input lack rate limiting: `POST /user/update-role`, `POST /lecturer/courses`, `PUT /lecturer/courses/:id`, `POST /teacher/submit-review` | Open |
| 3 | CRITICAL | RBAC regression | `POST /evaluate` (line 767) has no role check — students can call the LLM evaluation endpoint directly, bypassing CHAM; `POST /user/update-role` allows any authenticated user to self-promote to lecturer | Open |
| 4 | CRITICAL | Secrets in tracked files | No hardcoded API keys, MongoDB URIs, OAuth secrets, or session secrets found | ✓ Clean |
| 5 | HIGH | Unsafe JSON parsing | All LLM response parsing uses `safeParseLLMResponse` | ✓ Clean |
| 6 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 7 | HIGH | `alert()` in UI | No raw `alert()`/`confirm()`/`prompt()` calls — all replaced with inline state | ✓ Clean |
| 8 | MEDIUM | Hebrew/RTL consistency | `GradeBook.tsx:40` `scrollBy` hardcodes physical `left`/`right` (unresolved from 2026-04-17); `StudentAssignments.tsx:134` uses `text-left` | Report only |
| 9 | MEDIUM | Prompt version drift | `lib/constants.js` has `PROMPT_VERSION = 'v1.2.0'`; `package.json` version is `1.1.0` — out of sync | Report only |
| 10 | MEDIUM | Dead code / orphaned files | `services/chatService.ts:5` — `evaluateSubmission` exported but never imported anywhere | Report only |

**CRITICAL:** 3 new/regressed findings  
**HIGH:** 0 findings → no consolidated issue opened  

---

## Prior Audit Resolution Status

All 3 CRITICAL findings from `2026-04-30` were resolved in `8dad476`. However:
- **CRITICAL-1** (chat routes bypassing `buildSafePrompt()`) is a **partial re-open**: the material sanitization fix was applied, but the chat endpoints still use individual sanitization functions rather than the `buildSafePrompt()` composite.
- **CRITICAL-2** and **CRITICAL-3** from 2026-04-30 are fully resolved.

---

## CRITICAL Findings

---

### CRITICAL-1 — Unprotected LLM Call Sites

**Severity:** Critical  
**Check:** Unprotected LLM call sites (Check #1)  
**Status:** Open (partial re-open from 2026-04-30 CRITICAL-1 + new sub-finding)

#### Finding 1a — Chat routes bypass `buildSafePrompt()`

**Files:**
- `api/index.js:577–631` (`POST /student/chat`)
- `api/index.js:725–763` (`POST /chat`)

**Description:**  
Both chat routes call `orchestrator.evaluateWithFallback()` (✓) but construct their prompts manually using `sanitizeForPrompt()` and `detectInjection()` in isolation rather than through the `buildSafePrompt()` composite function. The stated convention is that *every* LLM call must use `buildSafePrompt()` for user-controlled input. The effective sanitization is equivalent but the convention is not upheld, and the divergence means future changes to `buildSafePrompt()` (e.g., new injection pattern categories, fencing updates) will not automatically apply to chat paths.

**Evidence:**

```js
// api/index.js:583-586 (student chat) — manual sanitization instead of buildSafePrompt()
const sanitizedMessage = sanitizeForPrompt(message || '');
const { flags: injectionFlags } = detectInjection(message || '');
// ... materials also sanitized individually via sanitizeForPrompt
```

```js
// api/index.js:733-744 (lecturer chat) — same pattern
const safeCode = context.studentCode
  ? `\n<student_code>\n${sanitizeForPrompt(context.studentCode)}\n</student_code>`
  : '';
const { flags: codeInjFlags } = detectInjection(context.studentCode || '');
```

**Impact:**  
- Injection protection is fragmented — changes to `buildSafePrompt()` won't propagate to chat
- Prompt structure inconsistency; no shared injection warning template

---

#### Finding 1b — `semanticAssessment.js` premature Gemini key check breaks multi-provider fallback

**File:** `services/semanticAssessment.js:74–77`

```js
const aiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!aiKey) {
  throw new Error('AI API key not configured');
}
```

**Description:**  
`analyzeCodeQuality()` (Layer 2 of CHAM) checks exclusively for `GEMINI_API_KEY` or `API_KEY` at the top of the function and throws if neither is set — **before** reaching `LLMOrchestrator.getInstance()`. If the deployment only configures `GROQ_API_KEY` or `OPENAI_API_KEY`, Layer 2 unconditionally throws, `chamAssessment.js` catches the error with `confidence: 0` and `flags_for_human_review: ['llm_analysis_failed']`, and smart routing sends every submission to human review queue (because analysis failure is an automatic trigger). This renders the auto-grading pipeline unusable on non-Gemini deployments.

**Impact:**
- Layer 2 (semantic analysis) silently disabled when only Groq/OpenAI is configured
- All submissions routed to human review, defeating the purpose of CHAM
- Violates the multi-provider fallback architecture guarantee

---

### CRITICAL-2 — Missing Rate Limiting

**Severity:** Critical  
**Check:** Missing rate limiting (Check #2)  
**Status:** Open (new findings; previous 2026-04-30 violations fully resolved)

**Description:**  
Four routes that accept user-controlled text content lack rate limiting. The existing limits cover LLM calls, uploads, submissions, and messages — but these four were missed.

| Route | File Location | Missing Protection | Content Type |
|-------|--------------|-------------------|--------------|
| `POST /user/update-role` | `api/index.js:384` | No rate limit | `{ role }` body |
| `POST /lecturer/courses` | `api/index.js:1038` | No rate limit | `{ name, description, ... }` text |
| `PUT /lecturer/courses/:id` | `api/index.js:1046` | No rate limit | `{ name, description, ... }` text |
| `POST /teacher/submit-review` | `api/index.js:1178` | No rate limit | `{ comments, human_score, ... }` text |

**Details:**

**`POST /user/update-role` (line 384):** No rate limit on role-change requests. While the endpoint is used legitimately during onboarding, unlimited calls allow brute-force probing of system behavior and tie up DB writes.

**`POST /lecturer/courses` (line 1038):** Creates a new course with `name`, `description`, and other text fields. A malicious lecturer could spam the endpoint to exhaust DB storage.

**`PUT /lecturer/courses/:id` (line 1046):** Updates course text fields. Without a rate limit, large text payloads can be sent at unlimited rate.

**`POST /teacher/submit-review` (line 1178):** Accepts a `comments` field (free text) and `human_score`. No rate limit means an attacker with lecturer credentials could flood review completions.

---

### CRITICAL-3 — Session/RBAC Regressions

**Severity:** Critical  
**Check:** Session/RBAC regressions (Check #3)  
**Status:** Open (new findings)

#### Finding 3a — `POST /evaluate` accessible to all authenticated users (no role check)

**File:** `api/index.js:767`

```js
router.post('/evaluate', llmRateLimit, async (req, res) => {
  if (!req.user) return res.status(401).send();  // ← only authentication, no role
  // ...
```

**Description:**  
The `/evaluate` endpoint performs direct LLM code evaluation, constructing an evaluation prompt using `buildSafePrompt()` and returning scored feedback. Any authenticated user — including students — can call this endpoint directly. Students can use this to:

1. Get AI evaluation of arbitrary code without going through the CHAM submission pipeline
2. Bypass assignment deadline enforcement (no `openDate`/`dueDate` check)
3. Bypass course enrollment validation
4. Bypass the code security filter (`codeFilter.js`) and Judge0 sandbox (Layer 1)
5. Receive evaluation results without the smart-routing safety net

The `/evaluate` route is called by `apiService.evaluate()` (services/apiService.ts:235). The exported `evaluateSubmission()` function in `chatService.ts` also wraps this endpoint and is available in the frontend bundle even though it's currently unused.

**Expected:** Route should assert `req.user.role === 'lecturer'` — students should submit only through `POST /student/assignments/:id/submit` which enforces the full CHAM pipeline.

---

#### Finding 3b — `POST /user/update-role` allows students to self-promote to lecturer

**File:** `api/index.js:384–389`

```js
router.post('/user/update-role', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const user = await User.findOneAndUpdate(
    { googleId: req.user.googleId },
    { role: req.body.role },  // ← role taken directly from request body
    { new: true }
  );
  res.json(user);
});
```

**Description:**  
This endpoint sets `role` to whatever the caller provides in `req.body.role`. There is no validation that:
1. The requested role is a valid enum value (though the Mongoose schema `enum` will reject non-valid values)
2. **The user is not changing FROM an already-set role** — an existing student can call `POST /api/user/update-role` with `{ "role": "lecturer" }` at any time and gain full lecturer privileges

The endpoint is designed for the onboarding flow (`RoleSelector.tsx`), where new users (role `null`) select their initial role. Once set, there is no guard preventing a re-call. Any student with a valid session cookie can POST `{ "role": "lecturer" }` and immediately access all lecturer routes (`/api/lecturer/*`, `/api/teacher/*`, `/api/grades/save`, `/api/chat`, `/api/evaluate`).

**Impact:** Complete privilege escalation — students can gain lecturer access and:
- View all students' submissions and grades
- Release feedback for all assignments
- Access the lecturer grading assistant
- Create and delete courses and assignments
- Submit manual evaluations for any student

---

## HIGH Findings

**None.** All HIGH-severity checks pass:

| Check | Status |
|-------|--------|
| Unsafe JSON parsing (Check #5) | ✓ Clean — all providers use `safeParseLLMResponse`; no bare `JSON.parse(llmResponse)` |
| Missing output validation (Check #6) | ✓ Clean — `validateLLMOutput()` called at `api/index.js:808` and `semanticAssessment.js:109` |
| `alert()` in UI (Check #7) | ✓ Clean — all `alert()`/`confirm()`/`prompt()` replaced with inline state (Audit #7 comments) |

---

## MEDIUM Findings (Weekly Report Only)

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8)

**Status:** Partially unresolved (flagged in 2026-04-17, 2026-04-23, 2026-04-30 — `GradeBook` item still open)

#### GradeBook.tsx:40 — Hardcoded physical `left`/`right` in `scrollBy`

```tsx
// components/GradeBook.tsx:40
scrollContainerRef.current.scrollBy({ left: direction === 'left' ? 400 : -400, behavior: 'smooth' });
```

`ScrollByOptions.left` is a physical property. In an RTL context, pressing the "left" arrow should scroll towards the start of the document (logically right), but this code inverts the behavior. The correct fix is either:
- Use CSS `scroll-snap` / `scroll-margin-inline` with RTL-aware logic
- Or: `left: direction === 'right' ? 400 : -400` when `document.dir === 'rtl'`

**This is the third consecutive audit where this item appears unresolved.**

#### StudentAssignments.tsx:134 — `text-left` class without directional context

```tsx
// components/StudentAssignments.tsx:134
<div className="text-left">
```

In a Hebrew/RTL UI, `text-left` is a physical alignment that overrides RTL text alignment. Should use `text-start` or add `dir="ltr"` only if the content is genuinely LTR (e.g., code, English labels).

---

### MEDIUM-2 — Prompt Version Drift (Check #9)

**Status:** Informational

`lib/constants.js` exports `PROMPT_VERSION = 'v1.2.0'`, but `package.json` has `"version": "1.1.0"`. These are versioned separately, but the disparity is potentially confusing. The last bump of `PROMPT_VERSION` from `v1.1.0` to `v1.2.0` was in commit `8dad476`. No git tag for `v1.2.0` exists. Recommend creating a tag `prompt-v1.2.0` and aligning `package.json` to `1.2.0` if the semantic content of prompts changed significantly.

---

### MEDIUM-3 — Dead Code / Orphaned Export (Check #10)

**File:** `services/chatService.ts:5–8`

```ts
export const evaluateSubmission = async (
  inputs: GradingInputs
): Promise<GradingResult> => {
  return await apiService.evaluate(inputs);
};
```

`evaluateSubmission` is exported from `chatService.ts` but is **never imported anywhere** in the codebase. The two consumers of `chatService.ts` (`components/ChatBot.tsx`) import only `sendChatMessage` and `sendStudentChatMessage`. This dead export also serves as a convenient API surface for students to invoke `/api/evaluate` from the browser console.

Recommend: remove `evaluateSubmission` from `chatService.ts` (the proper student evaluation path is `apiService.submitAssignment()`).

---

## Checks With No Findings

| Check | Result |
|-------|--------|
| 4 — Secrets in tracked files | ✓ Clean — README examples use `XXXX` placeholders; `api/index.js:300` fallback secret is dev-only with production guard at line 296 |
| 5 — Unsafe JSON parsing | ✓ Clean |
| 6 — Missing output validation | ✓ Clean |
| 7 — `alert()` in UI | ✓ Clean |

---

## Recommendations (Priority Order)

1. **[IMMEDIATE]** Fix `POST /user/update-role` RBAC: add a guard that prevents changing from an already-set role. If role is `null`, allow setting it; otherwise require admin authority or block the endpoint entirely.
2. **[IMMEDIATE]** Add `lecturer` role assertion to `POST /evaluate` — or restrict it to only be callable from the CHAM pipeline.
3. **[SHORT-TERM]** Add rate limits to all four routes identified in CRITICAL-2.
4. **[SHORT-TERM]** Remove the premature Gemini key check in `semanticAssessment.js:74–77`.
5. **[ONGOING]** Fix `GradeBook.tsx:40` RTL scrollBy — third consecutive audit without resolution.
6. **[CLEANUP]** Remove `evaluateSubmission` dead export from `chatService.ts`.
7. **[CLEANUP]** Align `package.json` version with `PROMPT_VERSION` and add a git tag.
