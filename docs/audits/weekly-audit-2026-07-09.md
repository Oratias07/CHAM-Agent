# CHAM Agent — Weekly Security & Architecture Audit (2026-07-09)

**Auditor:** Claude (automated)  
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `vite.config.ts`, `.claude/settings.local.json`  
**Prior audit:** `docs/audits/weekly-audit-2026-07-02.md` (1 CRITICAL open)  
**Date:** 2026-07-09

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Secrets in code | `.claude/settings.local.json` (git-tracked) contains two live MongoDB Atlas connection strings with plaintext passwords | **Open (new)** |
| 2 | CRITICAL | Secrets in code | `vite.config.ts:7` bakes `process.env.API_KEY` into the client JS bundle at build time | **Open (new)** |
| 3 | CRITICAL | Missing rate limiting | `POST /student/join-course` (`api/index.js:456`) — no rate limit | **Open (carried from 2026-07-02)** |
| 4 | CRITICAL | Session/RBAC regressions | IDOR on 4 lecturer read-routes — no course ownership check (`api/index.js:845,1113,1128,1352`) | **Open (new)** |
| 5 | CRITICAL | Session/RBAC regressions | IDOR on 2 student read-routes — no enrollment check (`api/index.js:1001,550`) | **Open (new)** |
| 6 | CRITICAL | Session/RBAC regressions | Mass assignment in `POST /lecturer/archive`: `lecturerId` overridable via `req.body` (`api/index.js:436-440`) | **Open (new)** |
| 7 | HIGH | Unsafe JSON parsing | All LLM response parsing uses `safeParseLLMResponse` | ✓ Clean |
| 8 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 9 | HIGH | `alert()` in UI | No raw `alert()`/`confirm()`/`prompt()` calls in production components | ✓ Clean |
| 10 | MEDIUM | Hebrew/RTL consistency | `GradeBook.tsx:40`, `StudentAssignments.tsx:134,176`, `AssignmentManager.tsx:263,417`, `ReviewQueue.tsx:253,418` | Report only |
| 11 | MEDIUM | Prompt version drift | `PROMPT_VERSION = 'v1.2.0'` has no `prompt-v1.2.0` git tag; `package.json` still at `1.1.0` | Report only |
| 12 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 files, 6th consecutive audit) | Report only |

**CRITICAL open:** 6  
**HIGH open:** 0

---

## Prior Audit Resolution Status (2026-07-02)

| Previous Finding | Resolution |
|-----------------|------------|
| CRITICAL-1 (2026-07-02): Missing rate limit on `POST /student/join-course` | ❌ Unresolved — no fix committed since 2026-07-02 |

---

## CRITICAL Findings

---

### CRITICAL-1 — Live MongoDB Credentials in Git-Tracked `settings.local.json` (Check #4, New)

**Severity:** Critical  
**Check:** Secrets in code (Check #4)  
**Status:** Open — new finding  
**First raised:** 2026-07-09  
**GitHub Issue:** To be opened with label `security`

#### Affected file

| File | Lines | Secret type |
|------|-------|-------------|
| `.claude/settings.local.json` | 26 | MongoDB Atlas URI — user `Vercel-Admin-st-system-db`, password `AFGkvWViMkf9ucHT` |
| `.claude/settings.local.json` | 27 | MongoDB Atlas URI — user `Vercel-Admin-st-system-db`, password `RsPJMRrw5lAVWBl5` |

#### Evidence

```json
// .claude/settings.local.json:26 (git-tracked, committed in history)
"Bash(MONGODB_URI=\"mongodb://Vercel-Admin-st-system-db:AFGkvWViMkf9ucHT@ac-d5h6cow-shard-00-00.lznnim2.mongodb.net:...\" node:*)",

// .claude/settings.local.json:27
"Bash(MONGODB_URI=\"mongodb://Vercel-Admin-st-system-db:RsPJMRrw5lAVWBl5@ac-d5h6cow-shard-00-00.lznnim2.mongodb.net:...\" node:*)"
```

`git ls-files .claude/settings.local.json` confirms the file is tracked. `.gitignore` excludes `.env*` but has no entry for `.claude/settings.local.json`.

#### Impact

Any person with read access to the repository can authenticate directly to MongoDB Atlas and perform arbitrary reads and writes on the production database — including reading all student submissions, grades, personal emails, session data, and master solutions; modifying or deleting grades; and escalating privilege by editing user roles.

#### Required Fix

**Immediate (today):**
1. Rotate both MongoDB Atlas credentials now — the current passwords are compromised once this file is in any git clone.
2. Remove the credential-bearing entries from `.claude/settings.local.json` and replace with a reference to `.env`: use `node -e "require('dotenv').config(); ..."` or set `MONGODB_URI` in the shell before running, rather than embedding the URI in the allow-list.
3. Add `.claude/settings.local.json` to `.gitignore`.
4. Scrub the secrets from git history: `git filter-repo --path .claude/settings.local.json --invert-paths` (or BFG). Force-push. Notify all collaborators to re-clone.

---

### CRITICAL-2 — `vite.config.ts` Bakes `process.env.API_KEY` into Client Bundle (Check #4, New)

**Severity:** Critical  
**Check:** Secrets in code (Check #4)  
**Status:** Open — new finding  
**First raised:** 2026-07-09  
**GitHub Issue:** To be opened with label `security`

#### Affected file

| File | Line | Issue |
|------|------|-------|
| `vite.config.ts` | 7 | `'process.env.API_KEY': JSON.stringify(process.env.API_KEY)` |

#### Evidence

```ts
// vite.config.ts:7
define: {
  'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
},
```

Vite's `define` substitutes the value as a string literal at bundle time. If `API_KEY` is set in the Vercel build environment (which it is — it is documented as the generic Gemini key fallback in `lib/llm/providers/gemini.js`), the key is embedded verbatim in the compiled JavaScript served to every browser.

#### Impact

Any user who opens DevTools → Sources and searches for `"AIza"` (Gemini key prefix) can extract the Gemini API key and use it at full quota against the project's Google Cloud billing account. There is no CORS restriction on Gemini's public API endpoints.

#### Required Fix

1. Remove the `define` block from `vite.config.ts` entirely — the frontend should never reference `API_KEY` or any other server-side credential.
2. If the frontend genuinely needs a key (unlikely — all LLM calls go through the Express API), use a Vercel Function secret that is not exported to `VITE_*` environment variables.
3. Verify no `process.env.*` references remain in TSX/TS files after the change.

```ts
// vite.config.ts — remove these lines:
define: {
  'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
},
```

---

### CRITICAL-3 — Missing Rate Limit on `POST /student/join-course` (Check #2, Carried)

**Severity:** Critical  
**Check:** Missing rate limiting (Check #2)  
**Status:** Open — carried from 2026-07-02 (no fix after 7 days)  
**First raised:** 2026-07-02  
**GitHub Issue:** To be opened with label `security`

#### Affected route

| Route | File | Line |
|-------|------|------|
| `POST /student/join-course` | `api/index.js` | 456 |

#### Evidence

```js
// api/index.js:456 — no rate limit middleware
router.post('/student/join-course', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  const { code } = req.body;                    // user-controlled input
  const course = await Course.findOne({ code }); // DB read every request
  ...
  await Course.updateOne(...);                   // DB write
  await WaitlistHistory.create({ ... });         // DB write
});
```

Every other POST endpoint accepting user-controlled input is protected: `POST /student/private-materials` (`uploadRateLimit`), `POST /messages` (`messagesRateLimit`), `POST /student/chat` (`llmRateLimit`). This route has no protection.

#### Impact

1. **Course code enumeration** — 6-char alphanumeric (~2.2B combos), no throttle; thousands of guesses per second feasible through Vercel CDN.
2. **Waitlist flooding** — valid code matches write to `Course.pendingStudentIds` and `WaitlistHistory`, generating spurious lecturer notifications and Atlas write load.

#### Required Fix

```js
// Option A — reuse existing limiter (simplest)
router.post('/student/join-course', submitRateLimit, async (req, res) => {

// Option B — dedicated limit
const joinCourseLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10,
  message: { message: 'יותר מדי בקשות הצטרפות. נסה שוב מאוחר יותר.' } });
router.post('/student/join-course', joinCourseLimit, async (req, res) => {
```

---

### CRITICAL-4 — IDOR: Lecturer Can Read Any Course's Data (Check #3, New)

**Severity:** Critical  
**Check:** Session/RBAC regressions (Check #3)  
**Status:** Open — new finding  
**First raised:** 2026-07-09  
**GitHub Issue:** To be opened with label `security`

#### Affected routes

| Route | File | Line | Missing check |
|-------|------|------|---------------|
| `GET /lecturer/courses/:courseId/assignments` | `api/index.js` | 845 | No `lecturerId` filter |
| `GET /lecturer/courses/:id/waitlist` | `api/index.js` | 1113 | `Course.findById` — no `lecturerId` filter |
| `GET /lecturer/courses/:id/waitlist-history` | `api/index.js` | 1128 | No `lecturerId` filter |
| `GET /lecturer/courses/:id/materials` | `api/index.js` | 1352 | No `lecturerId` filter |

#### Evidence

```js
// api/index.js:845-849 — any lecturer, any courseId
router.get('/lecturer/courses/:courseId/assignments', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  const assignments = await Assignment.find({ courseId: req.params.courseId });
  res.json(assignments);  // includes question, rubric, masterSolution
});

// api/index.js:1113-1120 — findById without ownership check
const course = await Course.findById(req.params.id);  // ← not filtered by lecturerId
if (!course) return res.status(404).send();
// continues to return pending/enrolled student lists

// api/index.js:1128-1130
const history = await WaitlistHistory.find({ courseId: req.params.id }); // ← no ownership check

// api/index.js:1352-1356
const materials = await Material.find({ courseId: req.params.id, type: 'lecturer_shared' }); // ← no ownership check
```

The write/mutation routes for these same resources DO have the ownership check (e.g., `PUT /lecturer/courses/:id` at line 1099 uses `{ _id: req.params.id, lecturerId: req.user.googleId }`). The read routes were missed when IDORs were patched in commit `9d3d875`.

#### Impact

Any authenticated lecturer can send a request with another course's MongoDB `_id` (obtainable by joining a course as a student or from UI network traffic) to:
- Read all assignment questions, rubrics, and master solutions (academic confidentiality breach)
- Read the pending and enrolled student rosters (PII exposure — student names, pictures, Google IDs)
- Read the waitlist history with timestamps (PII)
- Read the material metadata listing for any course

#### Required Fix

Add `lecturerId: req.user.googleId` to the lookup query in all four routes:

```js
// Line 845 — assignments
const course = await Course.findOne({ _id: req.params.courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
const assignments = await Assignment.find({ courseId: req.params.courseId });

// Line 1113 — waitlist
const course = await Course.findOne({ _id: req.params.id, lecturerId: req.user.googleId });
if (!course) return res.status(403).send();

// Line 1128 — waitlist-history
const course = await Course.findOne({ _id: req.params.id, lecturerId: req.user.googleId });
if (!course) return res.status(403).send();
const history = await WaitlistHistory.find({ courseId: req.params.id });

// Line 1352 — materials
const course = await Course.findOne({ _id: req.params.id, lecturerId: req.user.googleId });
if (!course) return res.status(403).send();
const materials = await Material.find({ courseId: req.params.id, type: 'lecturer_shared' });
```

---

### CRITICAL-5 — IDOR: Student Can Access Any Course Without Enrollment (Check #3, New)

**Severity:** Critical  
**Check:** Session/RBAC regressions (Check #3)  
**Status:** Open — new finding  
**First raised:** 2026-07-09  
**GitHub Issue:** To be opened with label `security`

#### Affected routes

| Route | File | Line | Missing check |
|-------|------|------|---------------|
| `GET /student/courses/:courseId/assignments` | `api/index.js` | 1001 | No enrollment check |
| `GET /student/courses/:courseId/materials` | `api/index.js` | 550 | No enrollment check |

#### Evidence

```js
// api/index.js:1001-1007 — no enrollment check
router.get('/student/courses/:courseId/assignments', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  const assignments = await Assignment.find({ courseId: req.params.courseId });
  // includes question, rubric, masterSolution for every assignment
  const submissions = await Submission.find({ studentId: req.user.googleId, courseId: req.params.courseId });
  res.json({ assignments, submissions });
});

// api/index.js:550-557 — no enrollment check
router.get('/student/courses/:courseId/materials', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  const lecturerMaterials = await Material.find({ courseId: req.params.courseId, isVisible: true, type: 'lecturer_shared' }).select('-content');
  res.json({ lecturerMaterials, studentMaterials });
});
```

#### Impact

Any student who has any valid courseId (e.g., by joining one course and seeing its ID in the network tab, or by brute-forcing short IDs) can:
- Exfiltrate all assignment questions, rubrics, and master solutions for any course
- See the material listing (including filenames) for any course

Note: material *content* is protected at the content endpoint (`/student/materials/:id/content` at line 560-566, which checks `type === 'lecturer_shared'`), but the directory listing is fully open.

#### Required Fix

```js
// After role check, verify enrollment:
const isEnrolled = req.user.enrolledCourseIds?.includes(req.params.courseId);
if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });
```

Apply to both `GET /student/courses/:courseId/assignments` (line 1001) and `GET /student/courses/:courseId/materials` (line 550).

---

### CRITICAL-6 — Mass Assignment in `POST /lecturer/archive` Allows `lecturerId` Override (Check #3, New)

**Severity:** Critical  
**Check:** Session/RBAC regressions (Check #3)  
**Status:** Open — new finding  
**First raised:** 2026-07-09  
**GitHub Issue:** To be opened with label `security`

#### Affected route

| Route | File | Lines |
|-------|------|-------|
| `POST /lecturer/archive` | `api/index.js` | 433–441 |

#### Evidence

```js
// api/index.js:436-440
const archive = await Archive.create({
  lecturerId: req.user.googleId,  // ← set FIRST
  ...req.body,                     // ← spread SECOND — overrides lecturerId if body contains it
  timestamp: new Date()
});
```

JavaScript object spread is evaluated left-to-right; later keys overwrite earlier ones. Sending `{ "lecturerId": "victim-lecturer-id", "sessionName": "...", "data": {...} }` in the request body causes the archive to be attributed to the victim rather than the authenticated user.

#### Impact

A lecturer can create archives attributed to any other lecturer. These fabricated archives appear in the victim's `GET /lecturer/dashboard-init` response (which fetches `Archive.find({ lecturerId: req.user.googleId })`) and in any exports, potentially poisoning grade records or impersonating another lecturer's assessment history.

#### Required Fix

Place server-controlled fields after `...req.body`, or whitelist the body fields explicitly:

```js
// Option A — move server fields after the spread (they win)
const archive = await Archive.create({
  ...req.body,
  lecturerId: req.user.googleId,   // ← overrides any lecturerId from body
  timestamp: new Date()
});

// Option B — explicit whitelist (safer, prevents other field injection)
const { sessionName, courseId, data, stats } = req.body;
const archive = await Archive.create({
  lecturerId: req.user.googleId,
  sessionName, courseId, data, stats,
  timestamp: new Date()
});
```

Option B is preferred — it also prevents injection of `_id`, `__v`, or any future schema fields.

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| 5 — Unsafe JSON parsing | ✓ Clean | `safeParseLLMResponse()` is the sole parse path for all LLM output. No bare `JSON.parse(llmResponse)` found anywhere in `api/`, `services/`, `lib/`. |
| 6 — Missing output validation | ✓ Clean | `validateLLMOutput()` called at `api/index.js:810` (`POST /evaluate`) and `services/semanticAssessment.js:105` (Layer 2). Both paths block malformed output before returning. |
| 7 — `alert()` in UI | ✓ Clean | All audit comments reference prior replacements (Audit #7 tags in `CourseManager.tsx`, `AssignmentManager.tsx`, `ResultSection.tsx`). No live `alert()`, `confirm()`, or `prompt()` calls in any component. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8)

**Status:** Persistent — multiple recurring locations.

| Location | Issue | Audit count |
|----------|-------|-------------|
| `GradeBook.tsx:40` | `scrollBy({ left: ... })` — physical axis, wrong direction in RTL | 9th consecutive |
| `StudentAssignments.tsx:134` | `text-left` on Hebrew text | 4th consecutive |
| `StudentAssignments.tsx:176` | `borderRight`/`paddingRight` physical properties | 7th consecutive |
| `AssignmentManager.tsx:263,417` | `borderRight`/`paddingRight` physical properties | 7th consecutive |
| `ReviewQueue.tsx:253,418` | `borderRight` physical property (new last audit) | 2nd audit |

Fixes are unchanged from prior audits — replace with logical CSS properties (`borderInlineEnd`, `paddingInlineEnd`, `text-end`) and RTL-aware scroll delta.

---

### MEDIUM-2 — Prompt Version Drift (Check #9)

**Status:** Persistent — 6th consecutive audit.

`lib/constants.js:1` exports `PROMPT_VERSION = 'v1.2.0'`. No `prompt-v1.2.0` git tag exists. `package.json` is still at `"version": "1.1.0"`.

Recommended actions (unchanged):
1. `git tag prompt-v1.2.0 <commit-of-prompt-bump>`
2. Align `package.json` to `"version": "1.2.0"`
3. Future prompt changes must bump `PROMPT_VERSION` in the same commit

---

### MEDIUM-3 — Dead Code / Orphaned Files (Check #10)

**Status:** Persistent — 6th consecutive audit.

```
ForExample/custominstr.EXMP.txt
ForExample/mastersolutionEXMP.txt
ForExample/questionEXMP.txt
ForExample/rubricEXMP.txt
ForExample/student1codeEXMP.txt
ForExample/student2codeEXMP.txt
```

Not imported from any code path. `server_reference.js` is not present in current tree. Move `ForExample/` to `docs/examples/` or add to `.gitignore`.

---

## Checks With No New Findings

| Check | Result |
|-------|--------|
| 1 — Unprotected LLM call sites | ✓ Clean — All four LLM-calling sites (`POST /evaluate`, `POST /chat`, `POST /student/chat`, `services/semanticAssessment.js`) use both `buildSafePrompt()`/`buildSafeChatPrompt()` AND `evaluateWithFallback()`. No direct SDK calls outside provider classes. |
| 3 (partial) — `/auth/dev` production guard | ✓ Clean — `POST /auth/dev` returns 403 in production (`api/index.js:367`). |

---

## Cumulative Open Items (All Audits)

| Finding | First Raised | Status |
|---------|-------------|--------|
| CRITICAL: Live MongoDB credentials in `settings.local.json` (git-tracked) | 2026-07-09 | **New** |
| CRITICAL: `vite.config.ts` API_KEY client bundle exposure | 2026-07-09 | **New** |
| CRITICAL: Missing rate limit on `POST /student/join-course` | 2026-07-02 | **Unresolved — 2 audits** |
| CRITICAL: IDOR — lecturer reads any course (assignments, waitlist, materials) | 2026-07-09 | **New** |
| CRITICAL: IDOR — student reads any course without enrollment | 2026-07-09 | **New** |
| CRITICAL: Mass assignment in `POST /lecturer/archive` (`lecturerId` overridable) | 2026-07-09 | **New** |
| MEDIUM: `GradeBook.tsx:40` RTL `scrollBy.left` | 2026-04-17 | **Unresolved — 9 audits** |
| MEDIUM: `borderRight`/`paddingRight` in `StudentAssignments.tsx:176`, `AssignmentManager.tsx:263,417` | 2026-04-30 | **Unresolved — 7 audits** |
| MEDIUM: `StudentAssignments.tsx:134` `text-left` | 2026-05-21 | **Unresolved — 4 audits** |
| MEDIUM: Prompt version tag missing | 2026-05-07 | **Unresolved — 6 audits** |
| MEDIUM: `ForExample/` dead files | 2026-05-07 | **Unresolved — 6 audits** |
| MEDIUM: `ReviewQueue.tsx:253,418` physical `borderRight` | 2026-07-02 | **Unresolved — 2 audits** |

---

## Recommendations (Priority Order)

1. **[IMMEDIATE — today]** Rotate both MongoDB Atlas passwords. Remove credentials from `settings.local.json`. Scrub git history. Add file to `.gitignore`. (CRITICAL-1)
2. **[IMMEDIATE — today]** Remove `define: { 'process.env.API_KEY': ... }` from `vite.config.ts`. Redeploy. (CRITICAL-2)
3. **[THIS WEEK]** Fix IDOR on 4 lecturer read-routes — add `lecturerId: req.user.googleId` to `Course.find*` calls at lines 845, 1113, 1128, 1352. (CRITICAL-4)
4. **[THIS WEEK]** Fix IDOR on 2 student read-routes — add enrollment check at lines 1001, 550. (CRITICAL-5)
5. **[THIS WEEK]** Fix mass assignment in `POST /lecturer/archive` — move server fields after spread or whitelist body. (CRITICAL-6)
6. **[THIS WEEK]** Add rate limit to `POST /student/join-course` (CRITICAL-3 — 2nd audit, still one line).
7. **[SHORT-TERM]** Fix `GradeBook.tsx:40` RTL `scrollBy.left` — 9 consecutive audits without action.
8. **[SHORT-TERM]** Fix remaining RTL `borderRight`/`paddingRight`/`text-left` issues.
9. **[CLEANUP]** `git tag prompt-v1.2.0`. Align `package.json` to `1.2.0`.
10. **[OPTIONAL]** Move `ForExample/` to `docs/examples/`.
