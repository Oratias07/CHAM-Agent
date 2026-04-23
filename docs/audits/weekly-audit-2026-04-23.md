# CHAM Agent — Weekly Security & Architecture Audit (2026-04-23)

**Auditor:** Claude (automated)
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`
**Prior audit:** `docs/audits/weekly-audit-2026-04-17.md` (4 CRITICAL + 2 HIGH — all resolved in commit `495648b`)
**Date:** 2026-04-23

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Unprotected LLM call sites | `/chat` and `/student/chat` use `sanitizeForPrompt()` directly — injection detection bypassed | **Open** |
| 2 | CRITICAL | Missing rate limiting | `POST /lecturer/materials` and `PUT /lecturer/materials/:id` accept file content without rate limit | **Open** |
| 3 | CRITICAL | RBAC regression | `GET /student/course-contacts/:courseId` asserts authentication but not student role | **Open** |
| 4 | CRITICAL | Secrets in code | No violations found | ✓ Clean |
| 5 | HIGH | Unsafe JSON parsing | All LLM parsing goes through `safeParseLLMResponse` | ✓ Clean |
| 6 | HIGH | Missing output validation | Nested criterion scores (`code_quality.score` etc.) escape range check in `validateLLMOutput` | **Open** |
| 7 | HIGH | `alert()` in UI | No violations found | ✓ Clean |
| 8 | MEDIUM | Hebrew/RTL consistency | `GradeBook.tsx:40` `scrollBy` uses physical `left`/`right` — not RTL-aware (carried from 2026-04-17) | Report only |
| 9 | MEDIUM | Prompt version drift | `PROMPT_VERSION` not stamped on CHAM Layer 2 assessment documents (carried from 2026-04-17) | Report only |
| 10 | MEDIUM | Dead code | `server_reference.js`, `server.js` deleted ✓; `geminiService.ts` has misleading name but is referenced | Report only |

**CRITICAL open:** 3 findings → 3 GitHub issues (label: `security`)
**HIGH open:** 1 finding → 1 consolidated GitHub issue (label: `code-quality`)

---

## Prior Audit Resolution Status

All 4 CRITICAL and 2 HIGH findings from `weekly-audit-2026-04-17.md` are confirmed resolved:

| Prior finding | Resolution | Commit |
|---------------|-----------|--------|
| CRITICAL-1 — Direct SDK in `server_reference.js`, `server.js` | Both files deleted | `495648b` |
| CRITICAL-2 — `submit-manual` missing rate limit | `llmRateLimit` added at `api/index.js:878` | `495648b` |
| CRITICAL-3 — `grades/save` RBAC bypass | Lecturer role check added at `api/index.js:685` | `495648b` |
| CRITICAL-4 — 9 student routes missing role assertions | All 9 routes now assert `role !== 'student'` | `495648b` |
| HIGH-A — `semanticAssessment.js` happy path skips validation | `validateLLMOutput` now always called (`semanticAssessment.js:109`) | `495648b` |
| HIGH-B — Score range mismatch 0–10 vs 0–100 | Both prompt and validator now use 0–100 scale | `495648b` |
| HIGH-C — `server_reference.js` bare `JSON.parse` | File deleted | `495648b` |
| MEDIUM-9 dead import `GoogleGenAI` in `semanticAssessment.js` | Import removed | `495648b` |

---

## CRITICAL Findings

### CRITICAL-1 — `/chat` and `/student/chat` Bypass `buildSafePrompt()`

**Check:** Every call to Groq/Gemini/OpenAI APIs must go through `LLMOrchestrator.evaluateWithFallback()` AND wrap user-controlled input through `buildSafePrompt()`.

Both routes correctly use `LLMOrchestrator.evaluateWithFallback()` ✓, but neither wraps user-controlled input through `buildSafePrompt()`.

#### 1a. `POST /student/chat` — `api/index.js:579–619`

```js
// api/index.js:585
const sanitizedMessage = sanitizeForPrompt(message || '');
// ...
const combinedPrompt = `You are a helpful and specialized Course Assistant.
// ...
Student question: ${sanitizedMessage}`;
```

`sanitizeForPrompt()` performs XML-tag escaping and length truncation, but **does not call `detectInjection()`**. A student embedding injection patterns (`ignore previous instructions`, `you are now a…`, `override scoring`) in their chat message will not be detected or flagged. The `injectionDetected`/`injectionFlags` metadata is never populated, so the smart-routing layer cannot use it to send the result to human review.

**`buildSafePrompt()` additionally provides:**
- `detectInjection()` scan over all 32 patterns
- Structured `<student_code>` fencing with contextual injection warning
- `{ injectionDetected, injectionFlags }` return values for audit logging

#### 1b. `POST /chat` — `api/index.js:713–744`

```js
// api/index.js:721
let userContent = `Lecturer asks: ${message}`;
if (context) {
  const safeCode = context.studentCode
    ? `\n<student_code>\n${sanitizeForPrompt(context.studentCode)}\n</student_code>`
    : '';
  userContent = `Context:\n- Question: ${context.question || ''}\n- Rubric: ${context.rubric || ''}${safeCode}\n\nLecturer asks: ${message}`;
}
```

Three user-controlled fields are embedded with no or partial sanitization:
- `context.studentCode` — goes through `sanitizeForPrompt()` only (same gap as above)
- `context.question` — embedded raw with no sanitization at all
- `context.rubric` — embedded raw with no sanitization at all
- `message` (lecturer question) — embedded raw with no sanitization at all

**Impact:** A student who crafts a question or rubric field containing injection patterns can influence the LLM response when a lecturer uses the `/chat` endpoint to discuss their submission.

**Files:** `api/index.js:585`, `api/index.js:721–727`

**Fix:** Replace both `sanitizeForPrompt()` call sites with `buildSafePrompt()`. For the `/chat` lecturer endpoint, use `buildSafePrompt()` for `context.studentCode` and sanitize `context.question`/`context.rubric` through `sanitizeForPrompt()`.

---

### CRITICAL-2 — Missing Rate Limits on Material Upload Routes

**Check:** Every Express route accepting user-controlled code, text, or file content must be protected by `express-rate-limit`.

**File:** `api/index.js:1270` and `api/index.js:1281`

```js
// api/index.js:1270 — no rate limit
router.post('/lecturer/materials', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const material = await Material.create({
    ...req.body,        // ← accepts arbitrary body including large file content
    ownerId: req.user.googleId,
    type: 'lecturer_shared'
  });
  res.json(material);
});

// api/index.js:1281 — no rate limit
router.put('/lecturer/materials/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const material = await Material.findByIdAndUpdate(req.params.id, req.body, { new: true });
  // ↑ accepts arbitrary body update including large content field
  res.json(material);
});
```

**Impact:** A compromised or malicious lecturer account can flood MongoDB Atlas with unlimited large document writes. Each request can push up to the 10 MB Express body limit. The equivalent student upload path (`POST /student/private-materials`) is already protected by `uploadRateLimit` (20/hr) — the lecturer path is the unprotected analogue.

**Existing rate limits for reference:**

| Route | Limit |
|-------|-------|
| `POST /student/private-materials` | `uploadRateLimit` (20/hr) ✓ |
| `POST /lecturer/archive` | `uploadRateLimit` (20/hr) ✓ |
| `POST /lecturer/materials` | **none** ✗ |
| `PUT /lecturer/materials/:id` | **none** ✗ |

**Fix:** Add `uploadRateLimit` as the second argument to both route declarations:
```js
router.post('/lecturer/materials', uploadRateLimit, async (req, res) => { ... });
router.put('/lecturer/materials/:id', uploadRateLimit, async (req, res) => { ... });
```

---

### CRITICAL-3 — RBAC Regression: `/student/course-contacts/:courseId` Missing Role Assertion

**Check:** Every route under `/api/student/*` must assert student role.

**File:** `api/index.js:477–490`

```js
// api/index.js:477
router.get('/student/course-contacts/:courseId', async (req, res) => {
  if (!req.user) return res.status(401).send();   // ← authentication only; no role check
  await connectDB();
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).send();

  const lecturer = await User.findOne({ googleId: course.lecturerId });
  const students = await User.find({ googleId: { $in: course.enrolledStudentIds, $ne: req.user.googleId } });

  res.json({ lecturer: ..., students: ... });   // returns names + profile pictures of all enrolled students
});
```

**Impact:** Any authenticated user — including a lecturer — can call this endpoint with any `courseId`, not just courses they own or are enrolled in. A lecturer supplying a `courseId` for a course they do not teach can enumerate the names and profile pictures of all enrolled students in that course.

**Policy violation:** All 9 student routes flagged in the 2026-04-17 audit were fixed in `495648b`, but this route (`/student/course-contacts/:courseId`) was not flagged in that audit. The fix missed it. It is the only remaining `/student/*` route without a role assertion.

**Fix:**
```js
router.get('/student/course-contacts/:courseId', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  // ...
```

---

## HIGH Findings (Consolidated)

### HIGH-1 — Shallow Score Validation: Nested Criterion Scores Escape Range Check

**Check:** All evaluation results returned to clients must pass `validateLLMOutput()` with score range 0–100 enforced.

**Files:** `services/promptGuard.js:139–144`, `services/semanticAssessment.js:109`

`validateLLMOutput` enforces score bounds only at the top level of the parsed object:

```js
// services/promptGuard.js:139
for (const [key, value] of Object.entries(parsed)) {
  if (key.toLowerCase().includes('score') && typeof value === 'number') {
    if (value < 0 || value > 100) {
      errors.push(`${key} out of range: ${value} (expected 0-100)`);
    }
  }
}
```

`Object.entries(parsed)` iterates **one level deep only**. It catches `overall_score` and `confidence` (top-level numbers), but not nested criterion scores.

The CHAM Layer 2 assessment schema uses nested structures:

```json
{
  "code_quality":   { "score": 9999, "feedback": "..." },
  "documentation":  { "score": -50,  "feedback": "..." },
  "complexity":     { "score": 0-100, "big_o": "O(n)", "feedback": "..." },
  "error_handling": { "score": 0-100, "feedback": "..." },
  "best_practices": { "score": 0-100, "feedback": "..." },
  "overall_score": 0-100,
  "confidence": 0-100
}
```

`code_quality.score`, `documentation.score`, etc. are nested under object values. The validator's loop sees `code_quality` → value is an object (not a number) → skips the range check. A rogue or hallucinating LLM can return `code_quality.score: 9999` and it will propagate through `semanticAssessment.js` into the `AssessmentLayer` document unchecked.

**`semanticAssessment.js:134–140`** then computes a weighted overall from the unchecked values:

```js
const computed = Math.round(
  (data.code_quality.score || data.code_quality) * CRITERIA_WEIGHTS.code_quality +
  // ...
);
```

An out-of-range criterion score feeds directly into the `computed` override path, which can produce a `final_score` outside 0–100 despite the `overallScore` guard.

**Fix options:**
1. Extend `validateLLMOutput` to recurse into object values: check any `{ score: number }` sub-object.
2. Add explicit criterion-score clamps in `semanticAssessment.js` after validation: `Math.min(100, Math.max(0, data.code_quality.score))`.
3. Both — defensive validation at schema entry + defensive clamps at computation.

**Recommended:** Option 3. The validator should reject, not just clamp.

---

## MEDIUM Findings (Weekly Report Only)

### MEDIUM-8 — Hebrew/RTL: `GradeBook.tsx:40` `scrollBy` Not RTL-Aware

**File:** `components/GradeBook.tsx:40` (carried from 2026-04-17 audit)

```js
scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
```

The `direction` parameter uses English strings `'left'`/`'right'`. In an RTL layout (Hebrew UI), logical "previous" corresponds to physical `right` (not `left`). The current implementation inverts the expected navigation direction for Hebrew speakers.

`GradeBook.tsx:129–130` correctly uses `dir="rtl"` on table headers and `text-right` — the scrolling direction is the only remaining RTL inconsistency in this file.

**Recommended fix:**
```js
const isRTL = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl';
const delta = (direction === 'left' ? -400 : 400) * (isRTL ? -1 : 1);
scrollContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
```

---

### MEDIUM-9 — Prompt Version Drift: `PROMPT_VERSION` Not Stamped on Layer 2 Assessments

**File:** `api/index.js:15` — `const PROMPT_VERSION = 'v1.1.0';` (carried from 2026-04-17 audit)

`PROMPT_VERSION` is stamped on `/api/evaluate` responses (line 795) and stored in the result object. It is **not** included in `AssessmentLayer` documents created by the CHAM pipeline, which means the Layer 2 prompt version used for any given submission is not auditable after the fact.

`semanticAssessment.js` has its own `SYSTEM_INSTRUCTION` and `OUTPUT_SCHEMA` constants that can change independently of `PROMPT_VERSION` in `api/index.js`. There is no version tracking for these templates.

**Recommended fix:**
1. Export `PROMPT_VERSION` from a shared module (e.g. `lib/llm/index.js`).
2. Include `prompt_version` in the `AssessmentLayer` document schema and populate it from the shared constant.
3. Bump `PROMPT_VERSION` whenever `SYSTEM_INSTRUCTION` or `OUTPUT_SCHEMA` in `semanticAssessment.js` changes.

---

### MEDIUM-10 — Dead Code / Stale Files

| File | Status | Notes |
|------|--------|-------|
| `server_reference.js` | **Deleted** ✓ | Previously flagged; resolved in `495648b` |
| `server.js` | **Deleted** ✓ | Previously flagged; resolved in `495648b` |
| `services/geminiService.ts` | Active (referenced) | Imported by `components/ChatBot.tsx:4`. Filename implies direct Gemini SDK access but the file is actually a thin wrapper over the backend API (`fetch('/api/chat')`, `fetch('/api/student/chat')`). Misleading name but not dead code. Consider renaming to `chatService.ts`. |

---

## Checks With No Violations

| Check | Result |
|-------|--------|
| Check 1 — LLM orchestrator usage in `api/index.js` evaluate/CHAM paths | `LLMOrchestrator.evaluateWithFallback()` used on all evaluation paths ✓ |
| Check 1 — `buildSafePrompt()` in `semanticAssessment.js` | Used correctly ✓ |
| Check 1 — `buildSafePrompt()` in `/api/evaluate` | Used correctly ✓ |
| Check 2 — `POST /evaluate`, `/student/chat`, `/chat`, `submit-manual`, `POST /messages`, `PUT /messages/:id`, `POST /student/private-materials`, `POST /lecturer/archive` | All rate-limited ✓ |
| Check 3 — All `/api/lecturer/*` and `/teacher/*` routes | Lecturer role asserted ✓ |
| Check 3 — `/api/auth/dev` production guard | Disabled when `NODE_ENV=production` (`api/index.js:369`) ✓ |
| Check 3 — `/api/grades/save` RBAC | Lecturer role assertion fixed; returns 403 for non-lecturers ✓ |
| Check 4 — Secrets in tracked files | No hardcoded API keys, MongoDB URIs, OAuth secrets, or session secrets found ✓ |
| Check 5 — `safeParseLLMResponse` wrapper | All `JSON.parse` of LLM responses goes through `safeParseLLMResponse` ✓ |
| Check 6 — Top-level score range validation | `overall_score` and `confidence` checked correctly by `validateLLMOutput` ✓ |
| Check 7 — `alert()`/`confirm()`/`prompt()` | None found in production React components ✓ |
| Session secret guard | Production throws if `SESSION_SECRET` absent (`api/index.js:298–300`) ✓ |

---

## Files Scanned

```
api/index.js (1299 lines)
lib/llm/orchestrator.js
lib/llm/safeParse.js
lib/llm/providers/gemini.js
services/promptGuard.js
services/semanticAssessment.js
services/chamAssessment.js
services/geminiService.ts
components/GradeBook.tsx
components/ChatBot.tsx
components/AssignmentManager.tsx
components/CourseManager.tsx
App.tsx
package.json
vercel.json
docs/audits/weekly-audit-2026-04-17.md
```
