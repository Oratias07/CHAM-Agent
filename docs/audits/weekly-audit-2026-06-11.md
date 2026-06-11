# CHAM Agent — Weekly Security & Architecture Audit (2026-06-11)

**Auditor:** Claude (automated)  
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `LecturerDashboard.tsx`  
**Prior audit:** `docs/audits/weekly-audit-2026-06-04.md` (3 CRITICAL open)  
**Date:** 2026-06-11

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Unprotected LLM call sites | All LLM call sites use `buildSafePrompt()`/`buildSafeChatPrompt()` + `evaluateWithFallback()` | ✓ Clean |
| 2 | CRITICAL | Missing rate limiting | `POST /student/join-course` (`api/index.js:456`) — no rate limit (issue #25, 3rd audit) | **Open** |
| 3 | CRITICAL | Session/RBAC regressions | IDOR on teacher review routes (lines 1203, 1224) — issue #29, 2nd audit | **Open** |
| 4 | CRITICAL | Session/RBAC regressions | IDOR on course enrollment action routes (5 routes) — issue #30, 2nd audit | **Open** |
| 5 | CRITICAL | Secrets in tracked files | No hardcoded secrets found | ✓ Clean |
| 6 | HIGH | Unsafe JSON parsing from LLM | All LLM response parsing uses `safeParseLLMResponse` | ✓ Clean |
| 7 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths; recursive score-range check confirmed | ✓ Clean |
| 8 | HIGH | `alert()` usage in UI | No `alert()`/`confirm()`/`prompt()` browser calls in React components | ✓ Clean |
| 9 | MEDIUM | Hebrew/RTL consistency | `GradeBook.tsx:40` physical `scrollBy.left` (8th audit); `borderRight`/`paddingRight` in 3 files (6th audit); `StudentAssignments.tsx:134` `text-left` (3rd audit) | Report only |
| 10 | MEDIUM | Prompt version drift | `PROMPT_VERSION = 'v1.2.0'` — git tag `prompt-v1.2.0` still missing (5th audit); `package.json` now at `2.1.1` (updated since last audit) | Report only |
| 11 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 files, 5th audit); `server_reference.js` not found in repo | Report only |

**CRITICAL open:** 3 (all carry-forward — no new critical findings this week)  
**HIGH open:** 0  
**Resolved since last audit:** `POST /grades/save` rate limit (issue #28 → closed)

---

## Prior Audit Resolution Status (2026-06-04)

| Previous Finding | Resolution |
|-----------------|------------|
| CRITICAL-1 (2026-06-04): Missing rate limit on `POST /grades/save` | ✅ **Resolved** — `uploadRateLimit` confirmed at `api/index.js:691`. GitHub issue #28 closed. |
| CRITICAL-2 (2026-06-04): IDOR on teacher review routes (#29) | ❌ Still open — no ownership checks added |
| CRITICAL-3 (2026-06-04): IDOR on course enrollment action routes (#30) | ❌ Still open — no ownership checks added |

### Additional Issues Closed This Audit (Confirmed Resolved)

| Issue | Title | Resolved At |
|-------|-------|-------------|
| #22 | Missing rate limit on `POST /grades/save` (duplicate) | `api/index.js:691` |
| #7 | `/chat` and `/student/chat` bypass `buildSafePrompt()` | `api/index.js:606,733` |
| #12 | `/student/chat` embeds unsanitized materials | `api/index.js:606` |
| #16 | Unprotected LLM call sites + Gemini key check | `lib/llm/orchestrator.js`, all providers |
| #20 | Chat routes bypass `buildSafePrompt()` re-open | `api/index.js:606,733` |
| #4 | 9 routes under `/api/student/*` missing student role | All `student/` routes |
| #9 | `GET /student/course-contacts/:courseId` missing role | `api/index.js:481` |
| #14 | `POST /chat` missing lecturer role assertion | `api/index.js:721` |
| #18 | `/evaluate` accessible to students; self-promotion via `/user/update-role` | `api/index.js:769,390` |
| #13 | Rate limits on `POST/PUT /lecturer/assignments` | `api/index.js:832,851` |
| #8 | Rate limits on `POST/PUT /lecturer/materials` | `api/index.js:1335,1347` |
| #23 | IDOR on 9 assignment & material routes | Per 2026-06-04 audit — ownership checks confirmed |
| #10 | `validateLLMOutput` shallow nested score check | `services/promptGuard.js:189–201` |

---

## CRITICAL Findings

---

### CRITICAL-1 — Missing Rate Limit on `POST /student/join-course` (Check #2, Carry-Forward 3rd Audit)

**Severity:** Critical  
**Check:** Missing rate limiting (Check #2)  
**Status:** Open — first raised 2026-05-28  
**GitHub Issue:** [#25](https://github.com/Oratias07/CHAM-Agent/issues/25)

#### Affected route

| Route | File | Line |
|-------|------|------|
| `POST /student/join-course` | `api/index.js` | 456 |

#### Evidence

```js
// api/index.js:456 — no rate limit middleware (unchanged across 3 audits)
router.post('/student/join-course', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  await connectDB();
  const { code } = req.body; // user-controlled text: course enrollment code
  const course = await Course.findOne({ code });
  if (!course) return res.status(404).json({ message: "Course not found" });
  ...
  await WaitlistHistory.create({         // creates a DB record per request
    studentId: req.user.googleId,
    courseId: course._id,
    courseName: course.name,
    status: 'pending'
  });
```

Comparable routes that DO have protection: `POST /student/assignments/:id/submit` (`submitRateLimit`, 20/15 min), `POST /messages` (`messagesRateLimit`, 60/min).

#### Impact

1. **Database flooding:** An authenticated student can create unlimited `WaitlistHistory` documents and fire unlimited `Course.findOne({ code })` queries.
2. **Course-code brute force:** No throttle on failed lookups enables O(36^6) enumeration of 6-character course codes at LAN speeds.
3. **Lecturer inbox spam:** Each request sends a join notification to the course's lecturer.

#### Required Fix

```js
router.post('/student/join-course', submitRateLimit, async (req, res) => {
```

---

### CRITICAL-2 — IDOR on Teacher Review Routes (Check #3, Carry-Forward 2nd Audit)

**Severity:** Critical  
**Check:** Session/RBAC regressions (Check #3)  
**Status:** Open — first raised 2026-06-04  
**GitHub Issue:** [#29](https://github.com/Oratias07/CHAM-Agent/issues/29)

#### Affected routes

| Route | File | Lines | Impact |
|-------|------|-------|--------|
| `GET /teacher/review/:submissionId` | `api/index.js` | 1203–1222 | Any lecturer reads student PII + master solutions for any submission |
| `POST /teacher/submit-review` | `api/index.js` | 1224–1281 | Any lecturer overrides the final grade of any student in any course |

#### Evidence

```js
// api/index.js:1203 — VULNERABLE: no ownership check
router.get('/teacher/review/:submissionId', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  const submission = await Submission.findById(req.params.submissionId);
  // ← no Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId })
  res.json({
    submission: submission.toJSON(),  // includes full studentCode, final_score, feedback
    assignment: assignment?.toJSON(), // includes masterSolution and rubric
    student: { name, email, picture },
  });
});

// api/index.js:1224 — VULNERABLE: no ownership check
router.post('/teacher/submit-review', submitRateLimit, async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  const submission = await Submission.findById(submission_id);
  // ← no ownership verification before grade override
  await Submission.updateOne({ _id: submission_id }, { score: finalScore, ... });
});
```

Contrast with `GET /teacher/review-queue` (`api/index.js:1151`), which correctly scopes to the lecturer's own courses via `Course.find({ lecturerId: req.user.googleId })`.

#### Required Fix

```js
// Add after findById in both routes:
const course = await Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
```

---

### CRITICAL-3 — IDOR on Course Enrollment Action Routes (Check #3, Carry-Forward 2nd Audit)

**Severity:** Critical  
**Check:** Session/RBAC regressions (Check #3)  
**Status:** Open — first raised 2026-06-04  
**GitHub Issue:** [#30](https://github.com/Oratias07/CHAM-Agent/issues/30)

#### Affected routes

| Route | File | Lines | Impact |
|-------|------|-------|--------|
| `POST /lecturer/courses/:id/approve` | `api/index.js` | 1283–1299 | Enroll any student into any course |
| `POST /lecturer/courses/:id/reject` | `api/index.js` | 1301–1315 | Reject waitlisted students from any course |
| `POST /lecturer/courses/:id/remove-student` | `api/index.js` | 1318–1325 | Remove enrolled students from any course |
| `POST /lecturer/submissions/:id/extension` | `api/index.js` | 897–902 | Grant deadline extension on any submission system-wide |
| `GET /lecturer/courses/:id/all-submissions` | `api/index.js` | 1139–1148 | Exfiltrate all student code for any course |

#### Evidence

```js
// api/index.js:1283 — VULNERABLE: Course.findById with no lecturerId filter
router.post('/lecturer/courses/:id/approve', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  const course = await Course.findById(req.params.id); // ← no lecturerId filter
  await Course.updateOne({ _id: req.params.id }, {
    $pull: { pendingStudentIds: studentId },
    $addToSet: { enrolledStudentIds: studentId }
  });
});

// api/index.js:897 — VULNERABLE: no ownership check at all
router.post('/lecturer/submissions/:id/extension', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  const submission = await Submission.findByIdAndUpdate(
    req.params.id, { extensionUntil: req.body.extensionUntil }, { new: true }
  );
  // ← no submission.courseId → Course ownership check
});
```

Contrast with `PUT /lecturer/courses/:id` (`api/index.js:1092`) which correctly uses `Course.findOneAndUpdate({ _id: req.params.id, lecturerId: req.user.googleId })`.

#### Required Fix

For course action routes (approve/reject/remove-student):
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

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| 5 — Unsafe JSON parsing | ✓ Clean | Every `JSON.parse` in `lib/llm/safeParse.js` is inside `safeParseLLMResponse()`. No bare `JSON.parse(llmResponse)` outside the safe wrapper in `api/`, `services/`, or `lib/`. Test fixtures in `tests/` are excluded from scope. |
| 6 — Missing output validation | ✓ Clean | `validateLLMOutput()` called at `api/index.js:809` (`POST /evaluate`) and `services/semanticAssessment.js:105` (Layer 2). Recursive `checkScores()` at `services/promptGuard.js:189` validates nested criterion scores against 0–100 range. |
| 7 — `alert()` in UI | ✓ Clean | All `alert`/`confirm`/`prompt` occurrences in TSX files are comments explaining prior replacements (e.g. `// Audit #7: replaces alert()`). No browser API calls present. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8)

**Status:** Ongoing — three distinct sub-issues, all unresolved.

#### `GradeBook.tsx:40` — Physical `scrollBy.left` (8th consecutive audit)

```tsx
// components/GradeBook.tsx:40 — unchanged across 8 audits
scrollContainerRef.current.scrollBy({ left: direction === 'left' ? 400 : -400, behavior: 'smooth' });
```

`ScrollByOptions.left` is a physical axis. In an RTL document the grade-table scroll arrows move in the wrong direction for Hebrew users.

```tsx
// Fix:
const isRtl = document.documentElement.dir === 'rtl';
const delta = direction === 'right' ? 400 : -400;
scrollContainerRef.current.scrollBy({ left: isRtl ? -delta : delta, behavior: 'smooth' });
```

#### `StudentAssignments.tsx:134` — `text-left` (3rd consecutive audit)

```tsx
// components/StudentAssignments.tsx:134
<div className="text-left">
  <p ...>תאריך הגשה</p>
```

Hebrew due-date text uses physical `text-left` inside a `dir="rtl"` parent. Replace with `text-end`.

#### Physical `borderRight` / `paddingRight` in 3 locations (6th consecutive audit)

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

**Status:** Persistent — flagged since 2026-05-07 (5th audit). Partially improved.

`lib/constants.js:1` exports `PROMPT_VERSION = 'v1.2.0'`. A `prompt-v1.2.0` git tag was never created. `package.json` was updated to `"version": "2.1.1"` since the last audit (was `1.1.0`) — this version bump appears to track the overall app, not the prompt schema.

Note: The audit brief references `PROMPT_VERSION = 'v1.1.0'` as baseline; the actual code has been at `v1.2.0` since an earlier cycle. The version constant itself is not in regression — the missing artifact is the git tag.

Recommended actions (unchanged from prior audits):
1. `git tag prompt-v1.2.0 <commit-where-prompt-changed>`
2. Future prompt template changes must bump `PROMPT_VERSION` in the same commit as the template change.

---

### MEDIUM-3 — Dead Code / Orphaned Files (Check #10)

**Status:** Persistent — flagged since 2026-05-07 (5th audit).

#### `ForExample/` directory (6 files)

```
ForExample/custominstr.EXMP.txt
ForExample/mastersolutionEXMP.txt
ForExample/questionEXMP.txt
ForExample/rubricEXMP.txt
ForExample/student1codeEXMP.txt
ForExample/student2codeEXMP.txt
```

Not referenced from any code path (`api/index.js`, `App.tsx`, `package.json`, `vercel.json`). Contain no secrets. Fifth consecutive audit without action.

Recommended: Move to `docs/examples/` or add to `.gitignore`.

#### `server_reference.js` — Not Found

The audit brief mentions `server_reference.js` as a potentially stale file. A full filesystem search confirms this file does **not exist** in the repository. No action needed.

---

## Checks With No New Findings

| Check | Result |
|-------|--------|
| 1 — Unprotected LLM call sites | ✓ Clean — `POST /evaluate` (`api/index.js:768`): `buildSafePrompt()` + `evaluateWithFallback()`; `POST /chat` (`api/index.js:729–764`): `buildSafePrompt()` or `buildSafeChatPrompt()` + `evaluateWithFallback()`; `POST /student/chat` (`api/index.js:581`): `buildSafeChatPrompt()` + `evaluateWithFallback()`; `services/semanticAssessment.js:85`: `buildSafePrompt()` + `evaluateWithFallback()`. All provider SDK calls are encapsulated in provider classes (`lib/llm/providers/`) called exclusively through `LLMOrchestrator`. No direct provider SDK usage outside those classes. |
| 3 (partial) — `POST /auth/dev` production gate | ✓ Clean — `api/index.js:367`: `if (process.env.NODE_ENV === 'production') return res.status(403)`. Production SESSION_SECRET enforcement at lines 296–298 also confirmed. |
| 3 (partial) — `/api/lecturer/*` role enforcement | ✓ Clean — All 22 routes under `/lecturer/*` and `/teacher/*` have `req.user.role !== 'lecturer'` guard. |
| 3 (partial) — `/api/student/*` role enforcement | ✓ Clean — All routes under `/student/*` have `req.user.role !== 'student'` guard (fixed prior cycles). |
| 4 — Secrets in tracked files | ✓ Clean — `README.md` contains only `XXXX` placeholder patterns; `.env.example` has no real values; session secret fallback at `api/index.js:300` is dev-only, guarded by production throw at lines 296–298; skill docs contain template URIs only. |

---

## Cumulative Open Items (All Audits)

| Finding | GitHub Issue | First Raised | Consecutive Audits Open |
|---------|-------------|-------------|------------------------|
| CRITICAL: IDOR on teacher review routes | [#29](https://github.com/Oratias07/CHAM-Agent/issues/29) | 2026-06-04 | 2 |
| CRITICAL: IDOR on course enrollment action routes | [#30](https://github.com/Oratias07/CHAM-Agent/issues/30) | 2026-06-04 | 2 |
| CRITICAL: Missing rate limit on `POST /student/join-course` | [#25](https://github.com/Oratias07/CHAM-Agent/issues/25) | 2026-05-28 | 3 |
| MEDIUM: `GradeBook.tsx:40` RTL `scrollBy.left` | — | 2026-04-17 | 8 |
| MEDIUM: `borderRight`/`paddingRight` in 3 files | — | 2026-04-30 | 6 |
| MEDIUM: `StudentAssignments.tsx:134` `text-left` | — | 2026-05-21 | 3 |
| MEDIUM: `prompt-v1.2.0` git tag missing | — | 2026-05-07 | 5 |
| MEDIUM: `ForExample/` dead files | — | 2026-05-07 | 5 |

---

## Recommendations (Priority Order)

1. **[IMMEDIATE]** Fix IDOR on teacher review routes (issue #29). A single `Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId })` check in two routes. Grade override vulnerability — two audits without remediation.
2. **[IMMEDIATE]** Fix IDOR on course enrollment action routes (issue #30). Five routes need `lecturerId` ownership enforcement. Two audits without remediation.
3. **[IMMEDIATE]** Add `submitRateLimit` to `POST /student/join-course` (issue #25). One-line fix, open for three audits.
4. **[SHORT-TERM]** Fix `GradeBook.tsx:40` RTL `scrollBy.left` — eighth consecutive audit without resolution.
5. **[SHORT-TERM]** Fix remaining `borderRight`/`paddingRight` and `text-left` RTL issues.
6. **[CLEANUP]** `git tag prompt-v1.2.0 <sha>` — five audits without this one-liner.
7. **[OPTIONAL]** Move `ForExample/` to `docs/examples/`.
