# CHAM Agent — Weekly Security & Architecture Audit (2026-06-25)

**Auditor:** Claude (automated)  
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `LecturerDashboard.tsx`, `.claude/settings.local.json`  
**Prior audit file:** `docs/audits/weekly-audit-2026-06-04.md` (2026-06-04)  
**Note on audit gap:** Issues #33–36 were opened 2026-06-18 and reference `docs/audits/weekly-audit-2026-06-18.md`, but no such file exists in the repository. This report carries forward those findings and fills the missing week.  
**Date:** 2026-06-25

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Check #4 — Secrets in tracked files | Plaintext MongoDB Atlas credentials in `.claude/settings.local.json` (git-tracked; no `.gitignore`) | **Open — 2 weeks (first raised 2026-06-18, Issue #33)** |
| 2 | CRITICAL | Check #3 — Session/RBAC | IDOR on teacher review routes — any lecturer reads/overrides grades for any submission | **Open — 4 weeks (first raised 2026-06-04, Issues #29, #35)** |
| 3 | CRITICAL | Check #3 — Session/RBAC | IDOR on course enrollment + data-access routes — 9 routes missing ownership enforcement | **Open — 5 weeks (first raised 2026-05-28, Issues #25, #26, #30, #36)** |
| 4 | CRITICAL | Check #2 — Rate limiting | `POST /student/join-course` (line 456) missing rate limit — course-code brute-force | **Open — 5 weeks (first raised 2026-05-28, Issues #25, #34)** |
| 5 | CRITICAL | Check #1 — LLM call sites | All call sites use `buildSafePrompt()` / `buildSafeChatPrompt()` + orchestrator | ✓ Clean |
| 6 | CRITICAL | Check #4 — Secrets | No new hardcoded secrets found in JS/TS/JSON source | ✓ Clean |
| 7 | HIGH | Check #5 — JSON parsing | All LLM response parsing uses `safeParseLLMResponse` | ✓ Clean |
| 8 | HIGH | Check #6 — Output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 9 | HIGH | Check #7 — `alert()` in UI | No raw `alert()`/`confirm()`/`prompt()` calls in React components | ✓ Clean |
| 10 | MEDIUM | Check #8 — Hebrew/RTL | `GradeBook.tsx:40` physical `scrollBy.left` (8th audit); `StudentAssignments.tsx:134` `text-left`; `borderRight`/`paddingRight` in 3 locations | Report only |
| 11 | MEDIUM | Check #9 — Prompt version drift | `PROMPT_VERSION = 'v1.2.0'` without a `prompt-v1.2.0` git tag; `package.json` still at `1.1.0` | Report only |
| 12 | MEDIUM | Check #10 — Dead code | `ForExample/` (6 files, 5th consecutive audit); missing `.gitignore` increases future leak risk | Report only |

**CRITICAL open:** 4  
**HIGH open:** 0

---

## Prior Audit Resolution Status (2026-06-04 → 2026-06-25)

| Finding | First Raised | 2026-06-04 Status | Current Status |
|---------|-------------|-------------------|----------------|
| CRITICAL: `POST /grades/save` no rate limit | 2026-05-21 | Open | **Resolved** — `uploadRateLimit` applied at line 691 ✓ |
| CRITICAL: IDOR teacher review routes | 2026-06-04 | Open (new) | **Still open** — code unchanged |
| CRITICAL: IDOR enrollment action routes | 2026-06-04 | Open (new) | **Still open** — code unchanged |
| Issues #1, #2, #3, #17 (April/May audits) | 2026-04-17/05-07 | Open | **Resolved in code** — issues should be closed (server_reference.js deleted; submit-manual has `llmRateLimit`; grades/save has role check + rate limit; 4 routes in #17 all have `uploadRateLimit`/`submitRateLimit`) |

---

## CRITICAL Findings

---

### CRITICAL-1 — Plaintext MongoDB Atlas Credentials in Git-Tracked File

**Severity:** Critical  
**Check:** #4 — Secrets in tracked files  
**Status:** Open — 2nd consecutive week without remediation  
**First raised:** 2026-06-18  
**GitHub Issue:** [#33](../../issues/33)

#### Affected File

| File | Lines |
|------|-------|
| `.claude/settings.local.json` | 26–27 |

#### Evidence

```json
".claude/settings.local.json:26"
"Bash(MONGODB_URI=\"mongodb://Vercel-Admin-st-system-db:AFGkvWViMkf9ucHT@ac-d5h6cow-shard-00-00.lznnim2.mongodb.net:27017,...\" node:*)"

".claude/settings.local.json:27"
"Bash(MONGODB_URI=\"mongodb://Vercel-Admin-st-system-db:RsPJMRrw5lAVWBl5@ac-d5h6cow-shard-00-00.lznnim2.mongodb.net:27017,...\" node:*)"
```

Confirmed via `git ls-files .claude/settings.local.json` → returns the path (file is tracked).  
There is **no `.gitignore` file** in the repository — nothing prevents further accidental credential commits.

#### Aggravating Factors

1. Two distinct passwords (`AFGkvWViMkf9ucHT`, `RsPJMRrw5lAVWBl5`) for `Vercel-Admin-st-system-db` — the `Vercel-Admin` prefix suggests broad administrative privileges.
2. Even after removing the file, both passwords remain in git history accessible via `git log -p`.
3. No `.gitignore` exists — any `.env`, `.pem`, or secrets file created locally will be auto-staged.

#### Impact

Anyone with repository read access can connect to the production MongoDB Atlas cluster with admin-level credentials. This enables direct access to all student submissions, grades, user PII, master solutions, and course materials.

#### Required Fix (in order)

1. **Immediately rotate both Atlas passwords** — treat as fully compromised since 2026-06-18
2. Remove credential-bearing entries from `.claude/settings.local.json`
3. Add `.claude/settings.local.json` to `.gitignore` (also add `.env*`, `*.pem`, `*.key`)
4. Rewrite git history with BFG Repo Cleaner or `git filter-repo --path .claude/settings.local.json --invert-paths`
5. Force-push cleaned history and invalidate all existing clones

---

### CRITICAL-2 — IDOR on Teacher Review Routes

**Severity:** Critical  
**Check:** #3 — Session/RBAC regressions  
**Status:** Open — 4th consecutive week without remediation  
**First raised:** 2026-06-04  
**GitHub Issues:** [#29](../../issues/29) (2026-06-04), [#35](../../issues/35) (2026-06-18)

#### Affected Routes

| Route | File | Lines | Impact |
|-------|------|-------|--------|
| `GET /teacher/review/:submissionId` | `api/index.js` | 1203–1222 | Any lecturer reads studentCode, grades, master solutions, student email for **any** submission |
| `POST /teacher/submit-review` | `api/index.js` | 1224–1281 | Any lecturer overrides final grade (0–100) for **any** submission |

#### Evidence

```js
// api/index.js:1203 — role check only, NO course-ownership check
router.get('/teacher/review/:submissionId', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  const submission = await Submission.findById(req.params.submissionId);
  // ← missing: Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId })
  const assignment = await Assignment.findById(submission.assignmentId);
  res.json({
    submission: submission.toJSON(),  // full studentCode + grades
    assignment: assignment?.toJSON(), // masterSolution, rubric
    student: { name, email, picture }
  });
});

// api/index.js:1224 — role check only, NO ownership check
router.post('/teacher/submit-review', submitRateLimit, async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  const submission = await Submission.findById(submission_id);
  // ← missing ownership check
  await Submission.updateOne({ _id: submission_id }, { score: finalScore, ... });
});
```

Contrast with `GET /teacher/review-queue` (line 1151), which correctly scopes to the lecturer's own courses.

#### Required Fix

```js
const submission = await Submission.findById(/* submissionId */);
if (!submission) return res.status(404).json({ message: 'Submission not found' });
const course = await Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
```

Apply at `api/index.js:1207` (GET route) and `api/index.js:1235` (POST route).

---

### CRITICAL-3 — IDOR on Course Enrollment and Data-Access Routes (9 Routes)

**Severity:** Critical  
**Check:** #3 — Session/RBAC regressions  
**Status:** Open — 5th consecutive week without remediation  
**First raised:** 2026-05-28  
**GitHub Issues:** [#26](../../issues/26) (2026-05-28), [#30](../../issues/30) (2026-06-04), [#36](../../issues/36) (2026-06-18)

#### Affected Routes

| Route | File | Lines | Impact |
|-------|------|-------|--------|
| `GET /lecturer/courses/:courseId/assignments` | `api/index.js` | 844–849 | Exposes masterSolution, rubric, unit_tests for any course |
| `POST /lecturer/submissions/:id/extension` | `api/index.js` | 897–902 | Grants deadline extension on any submission |
| `GET /lecturer/courses/:id/waitlist` | `api/index.js` | 1107–1119 | Exposes student PII for any course |
| `GET /lecturer/courses/:id/waitlist-history` | `api/index.js` | 1122–1137 | Exposes enrollment history for any course |
| `GET /lecturer/courses/:id/all-submissions` | `api/index.js` | 1139–1148 | Exposes all student code and scores for any course |
| `POST /lecturer/courses/:id/approve` | `api/index.js` | 1283–1299 | Enrolls any student into any course |
| `POST /lecturer/courses/:id/reject` | `api/index.js` | 1301–1315 | Rejects waitlisted students from any course |
| `POST /lecturer/courses/:id/remove-student` | `api/index.js` | 1318–1325 | Removes enrolled students from any course |
| `GET /lecturer/courses/:id/materials` | `api/index.js` | 1328–1333 | Exposes material metadata for any course |

#### Pattern (all 9 routes)

All 9 routes check `req.user.role !== 'lecturer'` but do not verify the `:id` or `:courseId` belongs to the requesting lecturer. Compare with the correct pattern used in fixed routes (e.g. line 1092):

```js
// CORRECT (line 1092):
Course.findOneAndUpdate({ _id: req.params.id, lecturerId: req.user.googleId }, ...)

// VULNERABLE (line 1283 example — same pattern on all 9):
const course = await Course.findById(req.params.id); // ← no lecturerId constraint
await Course.updateOne({ _id: req.params.id }, { ... }); // ← unscoped write
```

#### Required Fix

For 8 of the 9 routes (course-ID-based):
```js
const course = await Course.findOne({ _id: req.params.id, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
```

For `POST /lecturer/submissions/:id/extension` (submission-ID-based):
```js
const submission = await Submission.findById(req.params.id);
if (!submission) return res.status(404).send();
const course = await Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
await Submission.findByIdAndUpdate(req.params.id, { extensionUntil: req.body.extensionUntil }, { new: true });
```

---

### CRITICAL-4 — Missing Rate Limit on `POST /student/join-course`

**Severity:** Critical  
**Check:** #2 — Missing rate limiting  
**Status:** Open — 5th consecutive week without remediation  
**First raised:** 2026-05-28  
**GitHub Issues:** [#25](../../issues/25) (2026-05-28), [#34](../../issues/34) (2026-06-18)

#### Affected Route

| Route | File | Line |
|-------|------|------|
| `POST /student/join-course` | `api/index.js` | 456 |

#### Evidence

```js
// api/index.js:456 — no rate limit middleware
router.post('/student/join-course', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  const { code } = req.body;
  const course = await Course.findOne({ code }); // ← unbounded lookup
```

Course codes: `Math.random().toString(36).substring(2, 8).toUpperCase()` — 6-char base-36, ~2.18 billion combinations. Without rate limiting, an authenticated student can automate enumeration.

#### Required Fix

```js
// api/index.js:456
router.post('/student/join-course', submitRateLimit, async (req, res) => {
```

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| #5 — Unsafe JSON parsing | ✓ Clean | All `JSON.parse` in `lib/llm/safeParse.js` is inside `safeParseLLMResponse()`. No bare `JSON.parse(llmResponse)` in `api/`, `services/`, or `lib/`. |
| #6 — Missing output validation | ✓ Clean | `validateLLMOutput()` at `api/index.js:809` (`POST /evaluate`) and `semanticAssessment.js:105` (Layer 2). |
| #7 — `alert()` in UI | ✓ Clean | All `alert`/`confirm`/`prompt` matches in TSX files are state variable names or audit comments. No browser dialog calls. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8)

**Status:** Persistent — `GradeBook.tsx:40` flagged for the **8th consecutive audit** (since 2026-04-17) with no remediation.

#### `GradeBook.tsx:40` — Physical `scrollBy.left` (8th audit)

```tsx
// components/GradeBook.tsx:40
scrollContainerRef.current.scrollBy({ left: direction === 'left' ? 400 : -400, behavior: 'smooth' });
```

`ScrollByOptions.left` is a physical axis. In an RTL document the scroll arrows move backwards for Hebrew users.

```tsx
// Fix:
const isRtl = document.documentElement.dir === 'rtl';
const delta = direction === 'right' ? 400 : -400;
scrollContainerRef.current.scrollBy({ left: isRtl ? -delta : delta, behavior: 'smooth' });
```

#### `StudentAssignments.tsx:134` — `text-left` (3rd audit)

```tsx
// components/StudentAssignments.tsx:134
<div className="text-left">
  <p ...>תאריך הגשה</p>
```

Hebrew text with physical `text-left`. Replace with `text-end`.

#### Physical `borderRight`/`paddingRight` in 3 locations (6th audit)

```tsx
// components/StudentAssignments.tsx:176
style={{ borderRight: '3px solid #FF9800', paddingRight: '8px' }}

// components/AssignmentManager.tsx:263
style={{ borderRight: '3px solid #FF9800', paddingRight: '8px', marginBottom: '4px' }}

// components/AssignmentManager.tsx:417
style={{ borderRight: '3px solid #FF9800', paddingRight: '8px' }}
```

Replace with logical properties:
```tsx
style={{ borderInlineEnd: '3px solid #FF9800', paddingInlineEnd: '8px' }}
```

---

### MEDIUM-2 — Prompt Version Drift (Check #9)

**Status:** Persistent — flagged in 5 consecutive audits (2026-05-07 through 2026-06-25).

`lib/constants.js:1` exports `PROMPT_VERSION = 'v1.2.0'`. The version was bumped in commit `8dad476` (2026-04-30) but without a corresponding git tag. `package.json` remains at `"version": "1.1.0"`.

Recommended actions (unchanged):
1. `git tag prompt-v1.2.0 8dad476`
2. Update `package.json` to `"version": "1.2.0"`
3. Any future prompt template changes must bump `PROMPT_VERSION` in the same commit

---

### MEDIUM-3 — Dead Code / Orphaned Files and Missing `.gitignore` (Check #10)

**Status:** `ForExample/` flagged for the 5th consecutive audit; missing `.gitignore` newly observed as an aggravating factor for CRITICAL-1.

```
ForExample/custominstr.EXMP.txt
ForExample/mastersolutionEXMP.txt
ForExample/questionEXMP.txt
ForExample/rubricEXMP.txt
ForExample/student1codeEXMP.txt
ForExample/student2codeEXMP.txt
```

Not imported from any code path. Contain no secrets.

**New:** There is no `.gitignore` file in the repository. This means any `.env`, `.pem`, `*.key`, or other secrets file created locally will be auto-staged. Minimum recommended additions:

```gitignore
.env
.env.*
!.env.example
.claude/settings.local.json
*.pem
*.key
node_modules/
dist/
```

Note: `[full_path_of_file_1]` and `[full_path_of_file_2]` referenced in the audit spec template remain unfilled placeholder strings — no real file paths were ever supplied.

---

## Checks With No New Findings

| Check | Result |
|-------|--------|
| #1 — Unprotected LLM call sites | ✓ Clean — all 4 call sites (`POST /evaluate`, `POST /chat`, `POST /student/chat`, `semanticAssessment.js`) use `buildSafePrompt()`/`buildSafeChatPrompt()` + `LLMOrchestrator.evaluateWithFallback()`. LLM SDK usage fully encapsulated in provider classes. |
| #4 — Secrets in JS/TS/JSON source | ✓ Clean — `README.md` has XXXX placeholder patterns only; session secret fallback is dev-only with production guard at `api/index.js:296`; skill docs contain template URIs only. (Credentials in `.claude/settings.local.json` tracked separately as CRITICAL-1.) |

---

## Resolved Since Last Audit

| Finding | Fix Commit | Verification |
|---------|-----------|-------------|
| CRITICAL: `POST /grades/save` no rate limit (2026-05-21) | Unknown | `uploadRateLimit` applied at `api/index.js:691` ✓ |
| CRITICAL: `POST /grades/save` no role check (Issue #3, 2026-04-17) | Unknown | `req.user.role !== 'lecturer'` check at `api/index.js:692` ✓ |
| CRITICAL: `POST /lecturer/assignments/:id/submit-manual` no rate limit (Issue #2) | Unknown | `llmRateLimit` applied at `api/index.js:939` ✓ |
| CRITICAL: Direct SDK calls in `server_reference.js`/`server.js` (Issue #1) | `495648b` | Files deleted ✓ |
| CRITICAL: 4 routes missing rate limits (Issue #17) | Unknown | All 4 routes now have appropriate limiters ✓ |

**Recommended action:** Close GitHub issues #1, #2, #3, #17 as resolved.

---

## Cumulative Open Items

| Finding | First Raised | Consecutive Audits Open |
|---------|-------------|------------------------|
| CRITICAL: MongoDB Atlas credentials in `.claude/settings.local.json` | 2026-06-18 | **2** |
| CRITICAL: IDOR on teacher review routes | 2026-06-04 | **4** |
| CRITICAL: IDOR on course enrollment/data-access routes (9 routes) | 2026-05-28 | **5** |
| CRITICAL: Missing rate limit on `POST /student/join-course` | 2026-05-28 | **5** |
| MEDIUM: `GradeBook.tsx:40` RTL `scrollBy.left` | 2026-04-17 | **8** |
| MEDIUM: `borderRight`/`paddingRight` in 3 files | 2026-04-30 | **6** |
| MEDIUM: `StudentAssignments.tsx:134` `text-left` | 2026-05-21 | **3** |
| MEDIUM: Prompt version tag missing | 2026-05-07 | **5** |
| MEDIUM: `ForExample/` unreferenced files | 2026-05-07 | **5** |

---

## Recommendations (Priority Order)

1. **[CRITICAL/IMMEDIATE]** Rotate MongoDB Atlas passwords and remove credentials from `.claude/settings.local.json`. Rewrite git history. Add `.gitignore`. These credentials have been exposed for at least 7 days.
2. **[CRITICAL/IMMEDIATE]** Fix IDOR on teacher review routes (2 routes, 4-line fix). Grade override vulnerability.
3. **[CRITICAL/IMMEDIATE]** Fix IDOR on course enrollment/data routes (9 routes). Same pattern per route.
4. **[CRITICAL/IMMEDIATE]** Add `submitRateLimit` to `POST /student/join-course` (1-line fix, 5 weeks overdue).
5. **[ADMIN]** Close resolved issues #1, #2, #3, #17.
6. **[SHORT-TERM]** Fix `GradeBook.tsx:40` RTL `scrollBy.left` — 8 consecutive audits without resolution.
7. **[SHORT-TERM]** Fix remaining `borderRight`/`paddingRight` and `text-left` RTL issues.
8. **[CLEANUP]** `git tag prompt-v1.2.0 8dad476`. Update `package.json` to `1.2.0`.
9. **[OPTIONAL]** Move `ForExample/` to `docs/examples/` or delete.
