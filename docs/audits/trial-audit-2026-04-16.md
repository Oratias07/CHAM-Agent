# CHAM Agent — Trial Audit (2026-04-16)

## Summary

| Severity | Count | Fixed (2026-04-16) |
|----------|-------|--------------------|
| CRITICAL | 4     | 4 ✓               |
| HIGH     | 3     | 3 ✓               |
| MEDIUM   | 3     | 0 (out of scope)  |

---

## CRITICAL Findings

### Check 1 — Unprotected LLM Call Sites

#### 1a. `/chat` — Bypasses LLMOrchestrator and buildSafePrompt

- **File:** `api/index.js:706`
- **Issue:** The lecturer general-chat endpoint instantiates `GoogleGenAI` directly and does its own inline prompt construction, bypassing both `LLMOrchestrator.evaluateWithFallback()` and `buildSafePrompt()`. Injection detection (the 30+ pattern scan) is completely skipped; the inline sanitization only truncates and XML-tags student code but does not run `detectInjection()`.
- **Evidence:**
  ```js
  const ai = new GoogleGenAI({ apiKey: aiKey });
  // ... manual prompt construction, no buildSafePrompt() call
  const response = await ai.models.generateContent({ model, contents: [...] });
  return res.json({ text: response.text });
  ```
- **Fix:** Replace the direct `GoogleGenAI` call with `LLMOrchestrator.evaluateWithFallback()` and route the user context through `buildSafePrompt()`.
- **Fixed:** `api/index.js` — removed `GoogleGenAI` import; replaced handler with `LLMOrchestrator.evaluateWithFallback(combinedPrompt, { jsonMode: false })`; student code now goes through `sanitizeForPrompt()`.

#### 1b. `/student/chat` — Raw student message sent to Gemini without buildSafePrompt

- **File:** `api/index.js:558`
- **Issue:** The student chat endpoint instantiates `GoogleGenAI` directly. The student's `message` field from `req.body` is placed verbatim in a `role: 'user'` turn — no injection detection, no sanitization via `buildSafePrompt()`, no orchestrator fallback chain.
- **Evidence:**
  ```js
  const ai = new GoogleGenAI({ apiKey: aiKey });
  // ...
  { role: 'user', parts: [{ text: message }] }  // raw user input
  ```
- **Fix:** Pass the student message through `buildSafePrompt()` or at minimum `sanitizeForPrompt()` + `detectInjection()`, and replace with `LLMOrchestrator.evaluateWithFallback()`.
- **Fixed:** `api/index.js` — replaced handler with `LLMOrchestrator.evaluateWithFallback()`; student message now passed through `sanitizeForPrompt()` before prompt assembly.

---

### Check 2 — Missing Rate Limiting

#### 2a. `POST /messages` — No rate limit on direct messages

- **File:** `api/index.js:633`
- **Issue:** The direct-message creation endpoint accepts arbitrary `text` from `req.body` and has no `express-rate-limit` middleware, enabling DB-flooding message spam.
- **Evidence:**
  ```js
  router.post('/messages', async (req, res) => {
    if (!req.user) return res.status(401).send();
    // No rate limit middleware
    const msg = await DirectMessage.create({ ... text: req.body.text ... });
  ```
- **Fix:** Apply a `rateLimit` (e.g., 60 messages/minute per IP) before the route handler.
- **Fixed:** `api/index.js` — added `messagesRateLimit` (60/min) to `POST /messages` and `PUT /messages/:id`.

#### 2b. `POST /student/private-materials` — No rate limit on content upload

- **File:** `api/index.js:546`
- **Issue:** Students can POST arbitrary content (up to the 10 MB body limit) without any rate limiting, enabling storage exhaustion.
- **Evidence:**
  ```js
  router.post('/student/private-materials', async (req, res) => {
    if (!req.user) return res.status(401).send();
    const material = await Material.create({ ...req.body, ... });
  ```
- **Fix:** Apply a moderate rate limit (e.g., 20 uploads/hour per IP).
- **Fixed:** `api/index.js` — added `uploadRateLimit` (20/hr) to `POST /student/private-materials`.

#### 2c. `POST /lecturer/archive` — No rate limit

- **File:** `api/index.js:410`
- **Issue:** Accepts a full gradebook snapshot in `req.body` (Mixed schema, unbounded) with no rate limiting.
- **Evidence:**
  ```js
  router.post('/lecturer/archive', async (req, res) => {
    if (!req.user) return res.status(401).send();
    const archive = await Archive.create({ lecturerId: req.user.googleId, ...req.body, ... });
  ```
- **Fix:** Apply a rate limit and also see RBAC issue 3b for the missing role check on this route.
- **Fixed:** `api/index.js` — added `uploadRateLimit` (20/hr) to `POST /lecturer/archive`.

---

### Check 3 — Session/RBAC Regressions

#### 3a. `GET /lecturer/courses/:id/waitlist` — Missing lecturer role assertion

- **File:** `api/index.js:1044`
- **Issue:** Route is prefixed `/lecturer/` but only checks `req.user`, not `req.user.role === 'lecturer'`. Any authenticated student who knows a `courseId` can enumerate the full pending and enrolled student lists.
- **Evidence:**
  ```js
  router.get('/lecturer/courses/:id/waitlist', async (req, res) => {
    if (!req.user) return res.status(401).send();  // ← role check missing
    const course = await Course.findById(req.params.id);
    const pending = await User.find({ googleId: { $in: course.pendingStudentIds } });
  ```
- **Fix:** Change guard to `if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();`
- **Fixed:** `api/index.js` — guard updated.

#### 3b. `GET /lecturer/courses/:courseId/assignments` — Missing lecturer role assertion

- **File:** `api/index.js:821`
- **Issue:** Any authenticated user can fetch full assignment data for any course (including `masterSolution` and `rubric`) by guessing the `courseId`.
- **Evidence:**
  ```js
  router.get('/lecturer/courses/:courseId/assignments', async (req, res) => {
    if (!req.user) return res.status(401).send();  // ← role check missing
    const assignments = await Assignment.find({ courseId: req.params.courseId })
  ```
- **Fix:** Add `req.user.role !== 'lecturer'` check; also verify `lecturerId === req.user.googleId` to prevent cross-lecturer access.
- **Fixed:** `api/index.js` — role guard added. Cross-lecturer `courseId` scope left for a follow-up (requires joining on `lecturerId`).

#### 3c. `GET /lecturer/courses/:id/materials` — Missing lecturer role assertion

- **File:** `api/index.js:1265`
- **Issue:** Same pattern — returns all `lecturer_shared` materials for a course to any authenticated user.
- **Evidence:**
  ```js
  router.get('/lecturer/courses/:id/materials', async (req, res) => {
    if (!req.user) return res.status(401).send();  // ← role check missing
    const materials = await Material.find({ courseId: req.params.id, type: 'lecturer_shared' })
  ```
- **Fix:** Add lecturer role guard.
- **Fixed:** `api/index.js` — guard updated.

#### 3d. `POST /lecturer/archive` — Missing lecturer role assertion

- **File:** `api/index.js:410`
- **Issue:** Students can create archive documents attributed to any `lecturerId` they inject via `req.body` (the spread `...req.body` is used directly with no field whitelist).
- **Evidence:**
  ```js
  router.post('/lecturer/archive', async (req, res) => {
    if (!req.user) return res.status(401).send();  // ← role check missing
    const archive = await Archive.create({ lecturerId: req.user.googleId, ...req.body, ... });
  ```
  Note: `lecturerId` is set from `req.user.googleId` first but `...req.body` is spread after, so a `lecturerId` field in the body will **not** override it (object spread is left-to-right). However the role check is still missing.
- **Fix:** Add `req.user.role !== 'lecturer'` guard.
- **Fixed:** `api/index.js` — guard updated.

---

### Check 4 — Secrets in Code

#### 4a. Hardcoded session secret fallback

- **File:** `api/index.js:281`
- **Issue:** If `SESSION_SECRET` is not set in the environment, Express sessions fall back to the hardcoded string `'academic-integrity-secret-123'`. An attacker with knowledge of this default could forge session cookies.
- **Evidence:**
  ```js
  secret: process.env.SESSION_SECRET || 'academic-integrity-secret-123',
  ```
- **Fix:** Remove the fallback entirely — throw a startup error if `SESSION_SECRET` is missing in production (`if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') throw new Error(...)`).
- **Fixed:** `api/index.js` — added production guard that throws `[Security] SESSION_SECRET environment variable is required in production`; non-production fallback uses `'dev-secret-not-for-production'`.

---

## HIGH Findings

### Check 5 — Unsafe JSON Parsing from LLM

#### 5a. `validateLLMOutput` does not use `safeParseLLMResponse`

- **File:** `services/promptGuard.js:120`
- **Issue:** `validateLLMOutput()` performs its own `JSON.parse()` logic that does **not** strip markdown code fences (` ```json `) before parsing. If an LLM returns JSON wrapped in a markdown fence, `validateLLMOutput` will return `valid: false` and the assessment will be flagged as invalid, even though `safeParseLLMResponse` would have parsed it successfully. Called in `semanticAssessment.js:109` as a fallback path. The duplicated parsing logic is brittle.
- **Evidence:**
  ```js
  // promptGuard.js:123 — no markdown fence handling
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  ```
- **Fix:** Replace the internal parsing in `validateLLMOutput` with `safeParseLLMResponse(rawText)`.
- **Fixed:** `services/promptGuard.js` — added `import { safeParseLLMResponse }` from `../lib/llm/safeParse.js`; replaced the try/catch parsing block with a single `safeParseLLMResponse(rawText)` call.

---

### Check 6 — Missing Output Validation

#### 6a. `POST /evaluate` skips `validateLLMOutput()` before responding

- **File:** `api/index.js:795`
- **Issue:** The `/evaluate` endpoint calls `LLMOrchestrator.evaluateWithFallback()` and returns `response.parsed` directly to the client without calling `validateLLMOutput()`. The ARCHITECTURE.md diagram (section 3.2) explicitly shows `Backend→Guard: validateLLMOutput(parsed)` as a required step, but it is absent in the implementation. A malformed or manipulated LLM response (e.g., `score: 10.5` on a 0–10 scale) reaches the client unchecked.
- **Evidence:**
  ```js
  const result = response.parsed || {};
  result.prompt_version = PROMPT_VERSION;
  result.model = response.model;
  result.provider = response.provider;
  // ← no validateLLMOutput() call here
  return res.json(result);
  ```
- **Fix:** Add `const validation = validateLLMOutput(response.raw, ['score', 'feedback']); if (!validation.valid) { /* handle */ }` before returning.
- **Fixed:** `api/index.js` — added `validateLLMOutput(response.raw, ['score', 'feedback'])` call; returns HTTP 500 with Hebrew error message if validation fails; result is now sourced from `validation.data` instead of `response.parsed`.

---

### Check 7 — `alert()` / `confirm()` / `prompt()` in UI

Multiple components use native browser dialogs, which violates `SOURCE_OF_TRUTH.md §9 rule 4` and `§8` ("No `alert()` or `confirm()` anywhere") and breaks the Hebrew RTL UI pattern (native dialogs do not respect RTL).

| File | Line | Call | Language |
|------|------|------|----------|
| `App.tsx` | 33 | `alert("Login failed.")` | English |
| `App.tsx` | 81 | `alert(res.message)` | — |
| `App.tsx` | 83 | `alert(err.message)` | — |
| `LecturerDashboard.tsx` | 258 | `prompt("Enter a name for this session to archive it:")` | English |
| `components/AssignmentManager.tsx` | 79 | `confirm('למחוק משימה זו?...')` | Hebrew |
| `components/AssignmentManager.tsx` | 88 | `prompt('הזן תאריך הארכה (YYYY-MM-DD):')` | Hebrew |
| `components/AssignmentManager.tsx` | 93 | `alert('שגיאה בהארכת מועד.')` | Hebrew |
| `components/CourseManager.tsx` | 94 | `confirm('למחוק חומר זה?')` | Hebrew |
| `components/ResultSection.tsx` | 167 | `alert('Pedagogical feedback copied!')` | English |

- **Fix:** Replace all `alert`/`confirm`/`prompt` calls with inline React state (toast notifications, modal components, or inline confirmation UI using the `removingId` pattern already in use elsewhere).
- **Fixed:**
  - `components/ResultSection.tsx` — added `copied` state; button shows `✓ הועתק` for 2s instead of `alert()`.
  - `components/CourseManager.tsx` — added `deletingMatId` state; delete button arms on first click, executes on second ("אישור?"), replacing `confirm()`.
  - `components/AssignmentManager.tsx` — added `deletingId` (two-step confirm, replacing `confirm()`); added `extendingSubId`/`extendDate`/`extendError` states with inline date-picker row, replacing `prompt()` and `alert()`.
  - `App.tsx` — added `loginError` state (toast overlay, replacing `alert("Login failed.")`); added `joinMsg` state (inline banner, replacing `alert(res.message)` and `alert(err.message)`).
  - `LecturerDashboard.tsx` — added `archiveNameInput` state; `onResetSystem` now opens an inline modal with a text input and confirm button, replacing `prompt()`.

---

## MEDIUM Findings

### Check 8 — Hebrew/RTL Consistency

Several user-visible strings are English where Hebrew is required by the project's language policy.

| File | Line | String |
|------|------|--------|
| `api/index.js` | 609 | `"Assistant unavailable: " + err.message` (student chat error) |
| `api/index.js` | 710 | `"AI engine not configured. Please set GEMINI_API_KEY."` |
| `api/index.js` | 748 | `"Assistant unavailable: " + err.message` (lecturer chat error) |
| `App.tsx` | 33 | `"Login failed."` |
| `App.tsx` | 73 | `"Join Academy"` (heading) |
| `App.tsx` | 74 | `"Enter the course code provided by your instructor."` |
| `LecturerDashboard.tsx` | 258 | `"Enter a name for this session to archive it:"` |
| `components/ResultSection.tsx` | 167 | `"Pedagogical feedback copied!"` |

- **Fix:** Replace with Hebrew equivalents per `SOURCE_OF_TRUTH.md §9 rule 3`. For the chat error messages, use `"שגיאה בשירות ה-AI: " + err.message`.

---

### Check 9 — Prompt Version Drift

- **File:** `api/index.js:16` — `PROMPT_VERSION = 'v1.1.0'`
- **Issue:** This check requires `git log` history to verify whether prompt templates in `lib/llm/providers/` or `services/semanticAssessment.js` were modified after `PROMPT_VERSION` was last bumped. The git log from this audit session returned no results for the affected paths, making it impossible to confirm or deny drift via static analysis. The `PROMPT_VERSION` constant is only stamped on `/evaluate` responses — it is not used in the CHAM pipeline responses (`/student/assignments/:id/submit`), meaning Layer 2 evaluations have no version audit trail at all.
- **Fix:** (1) Verify `git log --follow -p lib/llm/ services/semanticAssessment.js` to confirm the version is current. (2) Include `prompt_version` in CHAM pipeline assessment documents.

---

### Check 10 — Dead Code

#### 10a. `server_reference.js`

- **File:** `server_reference.js` (project root)
- **Issue:** This file is not imported by `api/index.js`, not listed in `package.json` scripts, not referenced from `App.tsx`, and not routed in `vercel.json`. It is unreferenced dead code in a tracked file, which expands the attack surface if it contains any executable logic.
- **Fix:** Verify it's truly unused (`grep -r "server_reference"` returns no imports), then delete it.

#### 10b. `server.js` — intentional local-only file with no runtime guard

- **File:** `server.js`
- **Issue:** Documented as local-dev only (not deployed), but contains no `NODE_ENV` guard to prevent accidental deployment. If `vercel.json` were ever misconfigured to include it, it would expose a second unguarded Express entry point.
- **Fix:** Add `if (process.env.NODE_ENV === 'production') process.exit(1)` at the top as a safety net.

---

## Noise Report

The following checks produced ambiguity or would generate false positives at scale before being turned into a scheduled routine:

| Check | Issue |
|-------|-------|
| **Check 9 — Prompt version drift** | Requires git history (`git log --follow -p`) to evaluate. Static file scanning alone cannot detect drift; the check effectively becomes a "was this file modified?" test that depends on commit timestamps. Before scheduling, wire it to a CI step that fails when a prompt file changes without a corresponding `PROMPT_VERSION` bump. |
| **Check 2 — Rate limiting** | The rule "every POST/PUT with body must use rate-limit" is too broad. Routes like `POST /lecturer/courses/:id/approve` that write only small structured fields are low-risk and don't warrant the same rate-limit class as LLM or storage endpoints. Before scheduling, define severity tiers (LLM, storage-heavy, structural mutations) with different limit classes. |
| **Check 8 — Hebrew/RTL strings** | Automated scanning for non-Hebrew string literals produces high false-positive rates (variable names, console.log, class names, comments). Suggest scoping the check to: (a) string literals passed to `res.json()` or JSX text nodes, (b) filtering out dev-only code paths. |
