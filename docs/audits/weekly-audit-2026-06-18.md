# CHAM Agent — Weekly Security & Architecture Audit (2026-06-18)

**Auditor:** Claude (automated)  
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `LecturerDashboard.tsx`, `.claude/`  
**Prior audit:** `docs/audits/weekly-audit-2026-06-04.md` (3 CRITICAL open)  
**Date:** 2026-06-18

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Secrets in tracked files | Two plaintext MongoDB Atlas passwords embedded in `.claude/settings.local.json` (lines 26–27), a git-tracked file | **Open (new)** |
| 2 | CRITICAL | Missing rate limiting | `POST /student/join-course` (`api/index.js:456`) accepts a user-supplied course code with no rate limit — brute-force vector | **Open (new)** |
| 3 | CRITICAL | Session/RBAC regressions | IDOR on `GET /teacher/review/:submissionId` and `POST /teacher/submit-review` — any lecturer reads PII and overrides grades for any submission | **Open (carry-forward from 2026-06-04)** |
| 4 | CRITICAL | Session/RBAC regressions | IDOR on 5 course enrollment/management routes — any lecturer approves/rejects/removes students and grants extensions in any course | **Open (carry-forward from 2026-06-04)** |
| 5 | CRITICAL | Missing rate limiting | `POST /grades/save` (`api/index.js:691`) missing `uploadRateLimit` | ✅ Resolved — `uploadRateLimit` now applied |
| 6 | CRITICAL | Unprotected LLM call sites | All call sites use `buildSafePrompt()` / `buildSafeChatPrompt()` + orchestrator | ✓ Clean |
| 7 | HIGH | Unsafe JSON parsing | All LLM response parsing uses `safeParseLLMResponse` | ✓ Clean |
| 8 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 9 | HIGH | `alert()` in UI | No raw `alert()`/`confirm()`/`prompt()` calls found | ✓ Clean |
| 10 | MEDIUM | Hebrew/RTL consistency | `GradeBook.tsx:40` `scrollBy.left` (8th consecutive audit); `StudentAssignments.tsx:134` `text-left`; `borderRight`/`paddingRight` in 3 locations | Report only |
| 11 | MEDIUM | Prompt version drift | `PROMPT_VERSION = 'v1.2.0'` — no `prompt-v1.2.0` git tag; `package.json` still at `1.1.0` | Report only |
| 12 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 files, 5th consecutive audit) | Report only |

**CRITICAL open:** 4 (2 new, 2 carry-forward)  
**HIGH open:** 0

---

## Prior Audit Resolution Status (2026-06-04)

| Previous Finding | Resolution |
|-----------------|------------|
| CRITICAL-1 (2026-06-04): Missing rate limit on `POST /grades/save` | ✅ Resolved — `uploadRateLimit` middleware added at `api/index.js:691` |
| CRITICAL-2 (2026-06-04): IDOR on `GET /teacher/review/:submissionId` and `POST /teacher/submit-review` | ❌ Still open — no ownership checks added |
| CRITICAL-3 (2026-06-04): IDOR on 5 course enrollment/management routes | ❌ Still open — no ownership checks added |

---

## CRITICAL Findings

---

### CRITICAL-1 (NEW) — Plaintext MongoDB Credentials in Git-Tracked File (Check #4)

**Severity:** Critical  
**Check:** Secrets in tracked files (Check #4)  
**Status:** Open — new finding  
**GitHub Issue:** To be opened with label `security`

#### Affected file

| File | Lines | Content |
|------|-------|---------|
| `.claude/settings.local.json` | 26–27 | Two complete MongoDB Atlas connection strings with plaintext passwords |

#### Evidence

```json
// .claude/settings.local.json:26-27 — CONTAINS REAL CREDENTIALS
"Bash(MONGODB_URI=\"mongodb://Vercel-Admin-st-system-db:<REDACTED>@ac-d5h6cow-shard-00-00.lznnim2.mongodb.net:27017,...\" node:*)",
"Bash(MONGODB_URI=\"mongodb://Vercel-Admin-st-system-db:<REDACTED>@ac-d5h6cow-shard-00-00.lznnim2.mongodb.net:27017,...\" node:*)"
```

Two distinct passwords (`<REDACTED>` and `<REDACTED>`) for the Atlas user `Vercel-Admin-st-system-db` are embedded inline in Claude Code permission allowlist entries. The file is tracked in git (confirmed by `git ls-files .claude/settings.local.json`) and is **not** listed in `.gitignore`.

The `.gitignore` only excludes `.env`, `.env.local`, and `.env.production`. It does not exclude `.claude/settings.local.json`.

#### Impact

- Anyone with access to the repository can extract and use these credentials to connect directly to the MongoDB Atlas cluster.
- The atlas hostname `ac-d5h6cow-shard-00-00.lznnim2.mongodb.net` is exposed in the connection string, giving attackers full topology information.
- Both credential variants (suggesting the password was rotated at some point) are present in the git history, meaning a password rotation does not fully remediate the exposure without a history rewrite.
- The `Vercel-Admin` prefix in the username suggests this account may have broad administrative privileges on the Atlas project.

#### Required Fix

**Immediate actions (in this order):**
1. **Rotate both Atlas passwords now** — even if the repo is private, treat them as compromised.
2. Remove the credential-bearing lines from `.claude/settings.local.json`.
3. Add `.claude/settings.local.json` to `.gitignore`.
4. Rewrite git history to scrub the credentials from all prior commits:
   ```bash
   git filter-repo --path .claude/settings.local.json --invert-paths
   # or use BFG Repo Cleaner
   ```
5. Force-push the cleaned history to all remotes and invalidate any existing forks/clones.

---

### CRITICAL-2 (NEW) — Missing Rate Limit on `POST /student/join-course` (Check #2)

**Severity:** Critical  
**Check:** Missing rate limiting (Check #2)  
**Status:** Open — new finding  
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
  await connectDB();
  const { code } = req.body;
  const course = await Course.findOne({ code });
  ...
});
```

Course codes are generated as `Math.random().toString(36).substring(2, 8).toUpperCase()` (`api/index.js:1087`) — 6-character base-36 strings (~2.2 billion possibilities). Without rate limiting, an authenticated student can enumerate course codes at the full throughput of the Express server.

Comparison: `POST /student/assignments/:id/submit` has `submitRateLimit` (20 requests / 15 min); `POST /messages` has `messagesRateLimit` (60 / min). This route has nothing.

#### Impact

- An attacker authenticated as a student can brute-force course join codes and enroll in any course on the system without the lecturer's approval (they are placed in `pendingStudentIds`, but they could also trigger mass `WaitlistHistory` writes).
- Database write amplification: each probe creates a `WaitlistHistory` record on a successful course code match.
- At typical serverless throughput, ~1,000 requests/second can enumerate a meaningful fraction of the 2.2 billion code space over time.

#### Required Fix

```js
// api/index.js:456
router.post('/student/join-course', submitRateLimit, async (req, res) => {
```

`submitRateLimit` (20 / 15 min) is the appropriate limit; alternatively, a dedicated lower limit (5 / 15 min) would further reduce enumeration risk.

---

### CRITICAL-3 (CARRY-FORWARD) — IDOR on Teacher Review Routes (Check #3)

**Severity:** Critical  
**Check:** Session/RBAC regressions (Check #3)  
**Status:** Open — 2nd consecutive audit without remediation (first raised: 2026-06-04)  
**GitHub Issue:** To be opened with label `security`

#### Affected routes

| Route | File | Lines | Impact |
|-------|------|-------|--------|
| `GET /teacher/review/:submissionId` | `api/index.js` | 1203–1222 | Any lecturer reads full submission, assignment, assessment, and student PII for any submission |
| `POST /teacher/submit-review` | `api/index.js` | 1224–1281 | Any lecturer overrides the final grade and review comments for any submission |

#### Evidence

```js
// api/index.js:1203–1222 — VULNERABLE: role check only, no ownership check
router.get('/teacher/review/:submissionId', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const submission = await Submission.findById(req.params.submissionId);
  // ← no: Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId })
  const assignment = await Assignment.findById(submission.assignmentId);
  const assessment = await AssessmentLayer.findOne({ submission_id: submission._id });
  const student = await User.findOne({ googleId: submission.studentId });
  res.json({
    submission: submission.toJSON(),   // studentCode, grades, feedback
    assignment: assignment?.toJSON(),  // masterSolution, rubric
    student: { name, email, picture },
    ...
  });
});

// api/index.js:1224–1281 — VULNERABLE: no ownership check
router.post('/teacher/submit-review', submitRateLimit, async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const { submission_id, human_score, comments, override_auto_score } = req.body;
  const submission = await Submission.findById(submission_id);
  // ← no ownership check
  ...
  await Submission.updateOne({ _id: submission_id }, { score: finalScore, ... });
});
```

Contrast with `GET /teacher/review-queue` (line 1151) which correctly scopes to the lecturer's own courses:
```js
const courses = await Course.find({ lecturerId: req.user.googleId });
const courseIds = courses.map(c => c._id.toString());
const queue = await HumanReviewQueue.find({ course_id: { $in: courseIds }, ... });
```

#### Impact

A malicious authenticated lecturer can:
1. Read student source code, grades, and email for any submission system-wide
2. Read master solutions and rubrics for any assignment via the joined `assignment` object
3. Override the final grade of any student in any course to any value 0–100
4. Overwrite review comments for completed reviews
5. Do all of the above without appearing in the target course's audit trail

#### Required Fix

```js
// api/index.js:1203 — add after findById
const submission = await Submission.findById(req.params.submissionId);
if (!submission) return res.status(404).json({ message: 'Submission not found' });
const course = await Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });

// api/index.js:1224 — add after findById
const submission = await Submission.findById(submission_id);
if (!submission) return res.status(404).json({ message: 'Submission not found' });
const course = await Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
```

---

### CRITICAL-4 (CARRY-FORWARD) — IDOR on Course Enrollment Action Routes (Check #3)

**Severity:** Critical  
**Check:** Session/RBAC regressions (Check #3)  
**Status:** Open — 2nd consecutive audit without remediation (first raised: 2026-06-04)  
**GitHub Issue:** To be opened with label `security`

#### Affected routes

| Route | File | Lines | Impact |
|-------|------|-------|--------|
| `POST /lecturer/courses/:id/approve` | `api/index.js` | 1283–1299 | Enroll any student into any course |
| `POST /lecturer/courses/:id/reject` | `api/index.js` | 1301–1315 | Remove waitlisted students from any course |
| `POST /lecturer/courses/:id/remove-student` | `api/index.js` | 1318–1325 | Remove enrolled students from any course |
| `POST /lecturer/submissions/:id/extension` | `api/index.js` | 897–902 | Grant deadline extension on any submission |
| `GET /lecturer/courses/:id/all-submissions` | `api/index.js` | 1139–1148 | Read all student submissions for any course |

#### Evidence

```js
// api/index.js:1283 — VULNERABLE: finds course but never verifies lecturerId
router.post('/lecturer/courses/:id/approve', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const { studentId } = req.body;
  const course = await Course.findById(req.params.id); // ← no lecturerId filter
  await Course.updateOne({ _id: req.params.id }, { $pull: { pendingStudentIds: studentId }, $addToSet: { enrolledStudentIds: studentId } });
  await User.updateOne({ googleId: studentId }, { $addToSet: { enrolledCourseIds: req.params.id }, $inc: { unseenApprovals: 1 } });
  ...
});

// api/index.js:897 — VULNERABLE: zero ownership check
router.post('/lecturer/submissions/:id/extension', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const submission = await Submission.findByIdAndUpdate(
    req.params.id, { extensionUntil: req.body.extensionUntil }, { new: true }
  );
  res.json(submission);
});

// api/index.js:1139 — VULNERABLE: no ownership check
router.get('/lecturer/courses/:id/all-submissions', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const submissions = await Submission.find({ courseId: req.params.id, ... });
  res.json(submissions); // studentCode exposed for all students in any course
});
```

Contrast with routes that DO enforce ownership (e.g., `PUT /lecturer/courses/:id`, line 1092):
```js
const course = await Course.findOneAndUpdate(
  { _id: req.params.id, lecturerId: req.user.googleId }, // ← correct
  ...
);
```

#### Impact

A malicious authenticated lecturer can:
1. Enroll arbitrary students into any course (sending them spoofed approval notifications)
2. Remove students from courses they do not manage
3. Grant or revoke deadline extensions for any submission system-wide
4. Exfiltrate all student source code for any course via `/all-submissions`

#### Required Fix

For course action routes (`approve`, `reject`, `remove-student`):
```js
const course = await Course.findOne({ _id: req.params.id, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
```

For `POST /lecturer/submissions/:id/extension`:
```js
const submission = await Submission.findById(req.params.id);
if (!submission) return res.status(404).send();
const course = await Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
await Submission.findByIdAndUpdate(req.params.id, { extensionUntil: req.body.extensionUntil }, { new: true });
```

For `GET /lecturer/courses/:id/all-submissions`:
```js
const course = await Course.findOne({ _id: req.params.id, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
```

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| 5 — Unsafe JSON parsing | ✓ Clean | All `JSON.parse` calls in `lib/llm/safeParse.js` are inside `safeParseLLMResponse()`. No bare `JSON.parse(llmResponse)` outside the safe wrapper in `api/`, `services/`, or `lib/`. Test files reference `JSON.parse` for fixture/mock data only — not LLM responses. |
| 6 — Missing output validation | ✓ Clean | `validateLLMOutput()` called at `api/index.js:809` (`POST /evaluate`) and `services/semanticAssessment.js:105` (Layer 2). Both paths validated before returning results to callers. Free-text paths (`/chat`, `/student/chat`) return raw strings and correctly bypass JSON validation. |
| 7 — `alert()` in UI | ✓ Clean | All `alert`/`confirm`/`prompt` occurrences in TSX files are comments marking where they were removed. No live browser API calls (`alert(`, `confirm(`, `prompt(`) exist in any component. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8)

**Status:** Persistent — multiple violations unchanged from prior audits.

#### `GradeBook.tsx:40` — Physical `scrollBy.left` (**8th consecutive audit**)

```tsx
// components/GradeBook.tsx:40
scrollContainerRef.current.scrollBy({ left: direction === 'left' ? 400 : -400, behavior: 'smooth' });
```

In an RTL document, `ScrollByOptions.left` moves in the wrong physical direction for Hebrew users. Unresolved since the first audit (2026-04-17).

**Fix (unchanged from prior audits):**
```tsx
const isRtl = document.documentElement.dir === 'rtl';
const delta = direction === 'right' ? 400 : -400;
scrollContainerRef.current.scrollBy({ left: isRtl ? -delta : delta, behavior: 'smooth' });
```

#### `StudentAssignments.tsx:134` — `text-left` (3rd audit)

```tsx
<div className="text-left">
  <p ...>תאריך הגשה</p>
```

Hebrew due-date text forced to physical `text-left` inside a `dir="rtl"` parent. Replace with `text-end`.

#### `StudentAssignments.tsx:176`, `AssignmentManager.tsx:263`, `AssignmentManager.tsx:417` — Physical `borderRight`/`paddingRight` (6th audit)

```tsx
style={{ borderRight: '3px solid #FF9800', paddingRight: '8px' }}
```

Replace with logical CSS properties:
```tsx
style={{ borderInlineEnd: '3px solid #FF9800', paddingInlineEnd: '8px' }}
```

---

### MEDIUM-2 — Prompt Version Drift (Check #9)

**Status:** Persistent — flagged in 2026-05-07, 2026-05-14, 2026-05-21, 2026-06-04 audits (5th audit).

`lib/constants.js:1` exports `PROMPT_VERSION = 'v1.2.0'`. The version was bumped correctly in commit `8dad476` alongside prompt template changes, but no `prompt-v1.2.0` git tag has been created and `package.json` remains at `"version": "1.1.0"`.

**Recommended actions (unchanged):**
1. `git tag prompt-v1.2.0 8dad476`
2. Align `package.json` to `"version": "1.2.0"`
3. Enforce: future prompt template changes must bump `PROMPT_VERSION` in the same commit

---

### MEDIUM-3 — Dead Code / Orphaned Files (Check #10)

**Status:** Persistent — flagged in 2026-05-07, 2026-05-14, 2026-05-21, 2026-06-04 audits (5th consecutive).

```
ForExample/custominstr.EXMP.txt
ForExample/mastersolutionEXMP.txt
ForExample/questionEXMP.txt
ForExample/rubricEXMP.txt
ForExample/student1codeEXMP.txt
ForExample/student2codeEXMP.txt
```

Not imported from any code path. Contain no secrets. Fifth consecutive audit without action.

Note: `server_reference.js` (referenced in the audit checklist template) does not exist in the repository — not a finding.

**Recommended:** Move to `docs/examples/` or add to `.gitignore`.

---

## Checks With No New Findings

| Check | Result |
|-------|--------|
| 1 — Unprotected LLM call sites | ✓ Clean — `POST /evaluate` (`api/index.js:768`): `buildSafePrompt()` + `evaluateWithFallback()`; `POST /chat` (`api/index.js:733–749`): `buildSafePrompt()` or `buildSafeChatPrompt()` + `evaluateWithFallback()`; `POST /student/chat` (`api/index.js:606`): `buildSafeChatPrompt()` + `evaluateWithFallback()`; `services/semanticAssessment.js:85`: `buildSafePrompt()` + `evaluateWithFallback()`. All LLM SDK usage encapsulated in provider classes called exclusively via `LLMOrchestrator`. No direct Gemini/Groq/OpenAI SDK calls outside `lib/llm/providers/`. |
| 3 — `/api/auth/dev` in production | ✓ Clean — `api/index.js:367` returns 403 when `NODE_ENV === 'production'`. |

---

## Cumulative Open Items (All Audits)

| Finding | First Raised | Audits Open | Status |
|---------|-------------|-------------|--------|
| CRITICAL: Hardcoded MongoDB credentials in `.claude/settings.local.json` | 2026-06-18 | 1 | **Open (new)** |
| CRITICAL: Missing rate limit on `POST /student/join-course` | 2026-06-18 | 1 | **Open (new)** |
| CRITICAL: IDOR on teacher review routes | 2026-06-04 | 2 | **Open** |
| CRITICAL: IDOR on course enrollment action routes | 2026-06-04 | 2 | **Open** |
| MEDIUM: `GradeBook.tsx:40` RTL `scrollBy.left` | 2026-04-17 | 8 | **Unresolved** |
| MEDIUM: `borderRight`/`paddingRight` in 3 files | 2026-04-30 | 6 | **Unresolved** |
| MEDIUM: `StudentAssignments.tsx:134` `text-left` | 2026-05-21 | 3 | **Unresolved** |
| MEDIUM: Prompt version tag missing | 2026-05-07 | 5 | **Unresolved** |
| MEDIUM: `ForExample/` dead files | 2026-05-07 | 5 | **Unresolved** |

---

## Recommendations (Priority Order)

1. **[IMMEDIATE]** Rotate the two exposed MongoDB Atlas passwords (`<REDACTED>`, `<REDACTED>`) — treat as compromised. Add `.claude/settings.local.json` to `.gitignore` and scrub git history.
2. **[IMMEDIATE]** Fix IDOR on teacher review routes (CRITICAL-3) — grade override vulnerability, 2nd audit without fix.
3. **[IMMEDIATE]** Fix IDOR on course enrollment routes (CRITICAL-4) — data exfiltration + enrollment manipulation, 2nd audit without fix.
4. **[SHORT-TERM]** Add `submitRateLimit` to `POST /student/join-course` (CRITICAL-2) — one-line fix.
5. **[SHORT-TERM]** Fix `GradeBook.tsx:40` RTL `scrollBy.left` — 8th consecutive audit without resolution.
6. **[SHORT-TERM]** Fix remaining `borderRight`/`paddingRight` and `text-left` RTL issues.
7. **[CLEANUP]** `git tag prompt-v1.2.0 8dad476`. Align `package.json` to `1.2.0`.
8. **[OPTIONAL]** Move `ForExample/` to `docs/examples/`.
