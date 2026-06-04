# CHAM Agent — Weekly Security & Architecture Audit (2026-06-04)

**Auditor:** Claude (automated)  
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `LecturerDashboard.tsx`  
**Prior audit:** `docs/audits/weekly-audit-2026-05-21.md` (2 CRITICAL open)  
**Date:** 2026-06-04

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Missing rate limiting | `POST /grades/save` (`api/index.js:691`) has no rate limit — carry-forward from 2026-05-21 | **Open** |
| 2 | CRITICAL | Session/RBAC regressions | IDOR on teacher review routes — any lecturer can read student PII and override grades for any submission | **Open (new)** |
| 3 | CRITICAL | Session/RBAC regressions | IDOR on course enrollment action routes — any lecturer can approve/reject/remove students and grant extensions in any course | **Open (new)** |
| 4 | CRITICAL | Unprotected LLM call sites | All call sites use `buildSafePrompt()` / `buildSafeChatPrompt()` + orchestrator | ✓ Clean |
| 5 | CRITICAL | Secrets in tracked files | No hardcoded secrets found | ✓ Clean |
| 6 | HIGH | Unsafe JSON parsing | All LLM response parsing uses `safeParseLLMResponse` | ✓ Clean |
| 7 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 8 | HIGH | `alert()` in UI | No raw `alert()`/`confirm()`/`prompt()` calls found | ✓ Clean |
| 9 | MEDIUM | Hebrew/RTL consistency | `GradeBook.tsx:40` physical `scrollBy.left` (7th consecutive audit); `StudentAssignments.tsx:134` `text-left`; `borderRight`/`paddingRight` in 2 locations | Report only |
| 10 | MEDIUM | Prompt version drift | `PROMPT_VERSION = 'v1.2.0'` still has no `prompt-v1.2.0` git tag; `package.json` at `1.1.0` | Report only |
| 11 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 files, 4th consecutive audit) | Report only |

**CRITICAL open:** 3  
**HIGH open:** 0

---

## Prior Audit Resolution Status (2026-05-21)

| Previous Finding | Resolution |
|-----------------|------------|
| CRITICAL-1 (2026-05-21): Missing rate limit on `POST /grades/save` | ❌ Still open — no rate limit middleware added |
| CRITICAL-2 (2026-05-21): IDOR on 9 assignment & material routes | ✅ Fully resolved — ownership checks added to all 9 routes (lines 832–842, 851–864, 866–880, 882–895, 904–920, 922–937, 939–992, 1347–1362, 1364–1374) |

---

## CRITICAL Findings

---

### CRITICAL-1 — Missing Rate Limit on `POST /grades/save` (Check #2, Carry-Forward)

**Severity:** Critical  
**Check:** Missing rate limiting (Check #2)  
**Status:** Open — carries forward from 2026-05-21  
**First raised:** 2026-05-21  
**GitHub Issue:** To be opened with label `security`

#### Affected route

| Route | File | Line |
|-------|------|------|
| `POST /grades/save` | `api/index.js` | 691 |

#### Evidence

```js
// api/index.js:691 — no rate limit middleware (unchanged since 2026-05-21 audit)
router.post('/grades/save', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(403).json({ error: 'Forbidden' });
  await connectDB();
  const { exerciseId, studentId, score, feedback } = req.body;
  await Grade.findOneAndUpdate(
    { userId: req.user.googleId, exerciseId, studentId },
    { score, feedback, timestamp: Date.now() },
    { upsert: true }
  );
  await Submission.findOneAndUpdate(
    { assignmentId: exerciseId, studentId },
    { score, feedback, status: 'evaluated' }
  );
  res.json({ success: true });
});
```

Comparable routes that DO have protection: `POST /messages` (line 647, `messagesRateLimit`), `POST /lecturer/materials` (line 1335, `uploadRateLimit`).

#### Impact

An authenticated lecturer can flood Grade and Submission collections at unbounded frequency. Because `Submission.findOneAndUpdate` uses `{ assignmentId, studentId }` as filter, rapid POSTs can cause write contention on submission records being concurrently processed by the CHAM pipeline.

#### Required Fix

One line:
```js
router.post('/grades/save', uploadRateLimit, async (req, res) => {
```

---

### CRITICAL-2 — IDOR on Teacher Review Routes (Check #3, New)

**Severity:** Critical  
**Check:** Session/RBAC regressions (Check #3)  
**Status:** Open — new finding  
**GitHub Issue:** To be opened with label `security`

#### Affected routes

| Route | File | Lines | Impact |
|-------|------|-------|--------|
| `GET /teacher/review/:submissionId` | `api/index.js` | 1203–1222 | Any lecturer reads full submission, assignment, assessment, and student PII for any submission system-wide |
| `POST /teacher/submit-review` | `api/index.js` | 1224–1281 | Any lecturer overrides the final grade and review comments for any submission system-wide |

#### Evidence

```js
// api/index.js:1203 — VULNERABLE: no ownership check
router.get('/teacher/review/:submissionId', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const submission = await Submission.findById(req.params.submissionId);
  // ← no check that submission.courseId belongs to req.user's courses
  ...
  res.json({
    submission: submission.toJSON(),  // full studentCode, grades, feedback
    assignment: assignment?.toJSON(), // masterSolution, rubric
    student: student ? { name: student.name, email: student.email, picture: student.picture } : null,
  });
});

// api/index.js:1224 — VULNERABLE: no ownership check
router.post('/teacher/submit-review', submitRateLimit, async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const { submission_id, human_score, comments, override_auto_score } = req.body;
  const submission = await Submission.findById(submission_id);
  // ← no check that submission.courseId belongs to req.user's courses
  ...
  await Submission.updateOne({ _id: submission_id }, { score: finalScore, ... });
```

Contrast with `GET /teacher/review-queue` (line 1151), which correctly scopes to the lecturer's own courses:
```js
const courses = await Course.find({ lecturerId: req.user.googleId });
const courseIds = courses.map(c => c._id.toString());
const queue = await HumanReviewQueue.find({ course_id: { $in: courseIds }, reviewed: false });
```

#### Impact

A malicious authenticated lecturer can:
1. **Read** student source code, grades, feedback, and email for any submission in any course
2. **Read** master solutions and rubrics for any assignment (via the joined `assignment` object)
3. **Override the final grade** of any student in any course to any value 0–100
4. **Overwrite review comments** for completed reviews across the system
5. Silently bypass the `reviewed` flag in `HumanReviewQueue`, preventing legitimate reviewers from knowing a grade was tampered with

#### Required Fix

Add a two-step ownership check in both routes:

```js
// For GET /teacher/review/:submissionId
const submission = await Submission.findById(req.params.submissionId);
if (!submission) return res.status(404).json({ message: 'Submission not found' });
const course = await Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });

// For POST /teacher/submit-review
const submission = await Submission.findById(submission_id);
if (!submission) return res.status(404).json({ message: 'Submission not found' });
const course = await Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
```

---

### CRITICAL-3 — IDOR on Course Enrollment Action Routes (Check #3, New)

**Severity:** Critical  
**Check:** Session/RBAC regressions (Check #3)  
**Status:** Open — new finding  
**GitHub Issue:** To be opened with label `security`

#### Affected routes

| Route | File | Lines | Impact |
|-------|------|-------|--------|
| `POST /lecturer/courses/:id/approve` | `api/index.js` | 1283–1299 | Enroll any student into any course |
| `POST /lecturer/courses/:id/reject` | `api/index.js` | 1301–1315 | Reject waitlisted students from any course |
| `POST /lecturer/courses/:id/remove-student` | `api/index.js` | 1318–1325 | Remove enrolled students from any course |
| `POST /lecturer/submissions/:id/extension` | `api/index.js` | 897–902 | Grant deadline extension on any submission system-wide |
| `GET /lecturer/courses/:id/all-submissions` | `api/index.js` | 1139–1148 | Read all submissions (with student code) for any course |

#### Evidence

```js
// api/index.js:1283 — VULNERABLE: finds course but never verifies it belongs to the caller
router.post('/lecturer/courses/:id/approve', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const { studentId } = req.body;
  const course = await Course.findById(req.params.id); // ← no lecturerId filter
  await Course.updateOne({ _id: req.params.id }, { $pull: { pendingStudentIds: studentId }, $addToSet: { enrolledStudentIds: studentId } });
  await User.updateOne({ googleId: studentId }, { $addToSet: { enrolledCourseIds: req.params.id }, $inc: { unseenApprovals: 1 } });
  ...
});

// api/index.js:897 — VULNERABLE: no ownership check at all
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
  res.json(submissions); // includes studentCode for all students in any course
});
```

Contrast with course PUT/DELETE, which correctly enforce ownership:
```js
// api/index.js:1092 — CORRECT
router.put('/lecturer/courses/:id', uploadRateLimit, async (req, res) => {
  const course = await Course.findOneAndUpdate(
    { _id: req.params.id, lecturerId: req.user.googleId }, // ← ownership enforced
    req.body, { new: true }
  );
});
```

#### Impact

A malicious authenticated lecturer can:
1. **Enroll** arbitrary students into any course (spoofing approval notifications to those students)
2. **Reject or remove** students from courses they do not manage
3. **Grant deadline extensions** to any student on any submission, bypassing instructor authority
4. **Exfiltrate all student source code** for any course by querying `/all-submissions`
5. Perform all of the above without appearing in the target course's audit trail

#### Required Fix

For course action routes, add `lecturerId` to the Course lookup:
```js
const course = await Course.findOne({ _id: req.params.id, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
```

For `POST /lecturer/submissions/:id/extension`, look up the submission first and verify its course ownership:
```js
const submission = await Submission.findById(req.params.id);
if (!submission) return res.status(404).send();
const course = await Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
await Submission.findByIdAndUpdate(req.params.id, { extensionUntil: req.body.extensionUntil }, { new: true });
```

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| 5 — Unsafe JSON parsing | ✓ Clean | All `JSON.parse` in `lib/llm/safeParse.js` are inside `safeParseLLMResponse()`. No bare `JSON.parse(llmResponse)` found outside the safe wrapper in `api/`, `services/`, or `lib/`. |
| 6 — Missing output validation | ✓ Clean | `validateLLMOutput()` called at `api/index.js:809` (`POST /evaluate`) and `semanticAssessment.js:105` (Layer 2). Both paths validated before returning results to callers. |
| 7 — `alert()` in UI | ✓ Clean | All matches for "alert" in TSX files are React state variables or audit comments. No `alert(`, `confirm(`, or `prompt(` browser API calls present. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8)

**Status:** Mixed — `GradeBook.tsx:40` flagged for the **7th consecutive audit** (since 2026-04-17) with no remediation.

#### `GradeBook.tsx:40` — Physical `scrollBy.left` (Recurring — 7th audit)

```tsx
// components/GradeBook.tsx:40
scrollContainerRef.current.scrollBy({ left: direction === 'left' ? 400 : -400, behavior: 'smooth' });
```

`ScrollByOptions.left` is a physical CSS axis. In an RTL document the grade table scroll arrows move in the wrong direction for Hebrew users. Unchanged across 7 audits.

```tsx
// Fix (unchanged from prior audits):
const isRtl = document.documentElement.dir === 'rtl';
const delta = direction === 'right' ? 400 : -400;
scrollContainerRef.current.scrollBy({ left: isRtl ? -delta : delta, behavior: 'smooth' });
```

#### `StudentAssignments.tsx:134` — `text-left` (Recurring — 2nd audit)

```tsx
// components/StudentAssignments.tsx:134
<div className="text-left">
  <p ...>תאריך הגשה</p>
```

Hebrew due-date text uses physical `text-left` inside a `dir="rtl"` parent. Replace with `text-end`.

#### `StudentAssignments.tsx:176` and `AssignmentManager.tsx:263,417` — Physical `borderRight`/`paddingRight` (Recurring — 5th audit)

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

**Status:** Persistent — flagged in 2026-05-07, 2026-05-14, 2026-05-21 audits.

`lib/constants.js:1` exports `PROMPT_VERSION = 'v1.2.0'`. Audit baseline is `v1.1.0`. The version was bumped in commit `8dad476` without a corresponding git tag. `package.json` is still at `"version": "1.1.0"`.

Recommended actions (unchanged from prior audits):
1. `git tag prompt-v1.2.0 8dad476`
2. Align `package.json` to `"version": "1.2.0"`
3. Future prompt template changes must bump `PROMPT_VERSION` in the same commit as the template change

---

### MEDIUM-3 — Dead Code / Orphaned Files (Check #10)

**Status:** Persistent — flagged in 2026-05-07, 2026-05-14, 2026-05-21 audits (4th consecutive).

```
ForExample/custominstr.EXMP.txt
ForExample/mastersolutionEXMP.txt
ForExample/questionEXMP.txt
ForExample/rubricEXMP.txt
ForExample/student1codeEXMP.txt
ForExample/student2codeEXMP.txt
```

Not imported from any code path. Contain no secrets. Fourth consecutive audit without action.

Recommended: Move to `docs/examples/` or add to `.gitignore`.

---

## Checks With No New Findings

| Check | Result |
|-------|--------|
| 1 — Unprotected LLM call sites | ✓ Clean — `POST /evaluate` (line 768): `buildSafePrompt()` + `evaluateWithFallback()`; `POST /chat` (lines 733–749): `buildSafePrompt()` or `buildSafeChatPrompt()` + `evaluateWithFallback()`; `POST /student/chat` (line 606): `buildSafeChatPrompt()` + `evaluateWithFallback()`; `semanticAssessment.js:85`: `buildSafePrompt()` + `evaluateWithFallback()`. All LLM SDK usage is encapsulated in provider classes called exclusively through `LLMOrchestrator`. |
| 4 — Secrets in tracked files | ✓ Clean — `README.md` has only `XXXX` placeholder patterns; `.env.example` has no real values; session secret fallback (`api/index.js:300`) is dev-only, guarded by production check at line 296; skill docs contain template URIs only. |

---

## Cumulative Open Items (All Audits)

| Finding | First Raised | Status |
|---------|-------------|--------|
| CRITICAL: Missing rate limit on `POST /grades/save` | 2026-05-21 | **Open — 2 audits** |
| CRITICAL: IDOR on teacher review routes | 2026-06-04 | **Open (new)** |
| CRITICAL: IDOR on course enrollment action routes | 2026-06-04 | **Open (new)** |
| MEDIUM: `GradeBook.tsx:40` RTL `scrollBy.left` | 2026-04-17 | **Unresolved — 7 audits** |
| MEDIUM: `borderRight`/`paddingRight` in 3 files | 2026-04-30 | **Unresolved — 5 audits** |
| MEDIUM: `StudentAssignments.tsx:134` `text-left` | 2026-05-21 | **Unresolved — 2 audits** |
| MEDIUM: Prompt version tag missing | 2026-05-07 | **Unresolved — 4 audits** |
| MEDIUM: `ForExample/` dead files | 2026-05-07 | **Unresolved — 4 audits** |

---

## Recommendations (Priority Order)

1. **[IMMEDIATE]** Fix IDOR on teacher review routes (CRITICAL-2). Grade override vulnerability — two-step ownership check needed in `GET /teacher/review/:submissionId` and `POST /teacher/submit-review`.
2. **[IMMEDIATE]** Fix IDOR on course enrollment routes (CRITICAL-3). Five routes need `lecturerId` ownership enforcement.
3. **[IMMEDIATE]** Add `uploadRateLimit` to `POST /grades/save` (CRITICAL-1). One-line fix, pending for 2 audits.
4. **[SHORT-TERM]** Fix `GradeBook.tsx:40` RTL `scrollBy.left` — seventh consecutive audit without resolution.
5. **[SHORT-TERM]** Fix remaining `borderRight`/`paddingRight` and `text-left` RTL issues.
6. **[CLEANUP]** `git tag prompt-v1.2.0 8dad476`. Align `package.json` to `1.2.0`.
7. **[OPTIONAL]** Move `ForExample/` to `docs/examples/`.
