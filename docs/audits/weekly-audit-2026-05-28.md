# CHAM Agent — Weekly Security & Architecture Audit (2026-05-28)

**Auditor:** Claude (automated)
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `LecturerDashboard.tsx`
**Prior audit:** `docs/audits/weekly-audit-2026-05-21.md` (2 CRITICAL — both resolved in commit `7582047`)
**Date:** 2026-05-28

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Unprotected LLM call sites | All call sites use orchestrator + `buildSafePrompt()`/`buildSafeChatPrompt()` | ✓ Clean |
| 2 | CRITICAL | Missing rate limiting | `POST /student/join-course` (`api/index.js:456`) accepts user-controlled `code` with no rate limit | **Open** |
| 3 | CRITICAL | Session/RBAC regressions | IDOR on 9 `lecturer/*` routes — enrollment management, deadline extensions, and course data-access GET routes missing ownership checks | **Open** |
| 4 | CRITICAL | Secrets in tracked files | No hardcoded secrets found | ✓ Clean |
| 5 | HIGH | Unsafe JSON parsing | All LLM response parsing goes through `safeParseLLMResponse` | ✓ Clean |
| 6 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 7 | HIGH | `alert()` in UI | No raw `alert()`/`confirm()`/`prompt()` calls found | ✓ Clean |
| 8 | MEDIUM | Hebrew/RTL consistency | `GradeBook.tsx:40` physical `scrollBy.left` (7th consecutive audit); `StudentAssignments.tsx:134` `text-left`; physical `borderRight`/`paddingRight` in two files | Report only |
| 9 | MEDIUM | Prompt version drift | `PROMPT_VERSION = 'v1.2.0'` with no `prompt-v1.2.0` git tag; `package.json` at `1.1.0` | Report only |
| 10 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 files, 4th consecutive audit) | Report only |

**CRITICAL open:** 2
**HIGH open:** 0

---

## Prior Audit Resolution Status (2026-05-21)

Commit `7582047` ("fix: resolve CRITICAL-1 and CRITICAL-2 from 2026-05-21 audit") addressed:

| Previous Finding | Resolution |
|-----------------|------------|
| CRITICAL-1: `POST /grades/save` missing rate limit (`api/index.js:691`) | ✅ Fully resolved — `uploadRateLimit` applied (line 691) |
| CRITICAL-2: IDOR on 9 assignment & material routes | ✅ Fully resolved — all 9 routes now include ownership checks via `Course.findOne({ lecturerId: req.user.googleId })` or `Material.findOne({ ownerId: req.user.googleId })` |

Both findings from the 2026-05-21 audit are confirmed resolved in the current codebase. However, this audit identifies 9 **new** routes with the same IDOR class of vulnerability that were not covered by the prior fix.

---

## CRITICAL Findings

---

### CRITICAL-1 — Missing Rate Limit on `POST /student/join-course` (Check #2)

**Severity:** Critical
**Check:** Missing rate limiting (Check #2)
**Status:** Open — new finding
**GitHub Issue:** To be opened with label `security`

#### Affected route

| Route | File | Lines |
|-------|------|-------|
| `POST /student/join-course` | `api/index.js` | 456–477 |

#### Description

`POST /student/join-course` accepts a `code` field (the 6-character alphanumeric course join code) from the request body with no `express-rate-limit` middleware. The project's established policy (enforced on every other POST route that accepts user-controlled text) requires rate limiting on any POST/PUT that takes code, text, or file content.

#### Evidence

```js
// api/index.js:456 — no rate limit middleware
router.post('/student/join-course', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  await connectDB();
  const { code } = req.body;
  const course = await Course.findOne({ code });
  if (!course) return res.status(404).json({ message: "Course not found" });
  // ...
});
```

Course join codes are generated as `Math.random().toString(36).substring(2, 8).toUpperCase()` — a 6-character [A-Z0-9] string with approximately 2.18 billion combinations. Without rate limiting, an authenticated student can send automated requests to:
1. Enumerate all existing course codes (course discovery without lecturer consent)
2. Join courses by brute force, bypassing the intended word-of-mouth code distribution

Comparable routes that DO have protection:
- `POST /student/private-materials` (line 569): `uploadRateLimit`
- `POST /messages` (line 647): `messagesRateLimit`
- `POST /student/assignments/:id/submit` (line 1004): `submitRateLimit`

#### Impact

An authenticated student can automate course-code guessing to discover and join (pending approval) courses they were not invited to. While the lecturer must still approve enrollment, unsolicited join requests create operational noise and leak course existence/metadata to unauthorized students.

#### Required Fix

Add `submitRateLimit` (or a dedicated course-action limiter) to the route:

```js
router.post('/student/join-course', submitRateLimit, async (req, res) => {
```

---

### CRITICAL-2 — Incomplete IDOR Remediation on Enrollment and Course-Access Routes (Check #3)

**Severity:** Critical
**Check:** Session/RBAC regressions (Check #3) — Object-level authorization
**Status:** Open — new finding (same vulnerability class as 2026-05-21 CRITICAL-2, different routes)
**GitHub Issue:** To be opened with label `security`

#### Affected routes

| Route | File | Lines | Impact Category |
|-------|------|-------|-----------------|
| `GET /lecturer/courses/:courseId/assignments` | `api/index.js` | 844–849 | Information disclosure — exposes master solutions & rubrics |
| `POST /lecturer/submissions/:id/extension` | `api/index.js` | 897–902 | Privilege mutation — any lecturer grants deadline extensions |
| `GET /lecturer/courses/:id/waitlist` | `api/index.js` | 1107–1119 | Information disclosure — exposes student PII from any course |
| `GET /lecturer/courses/:id/waitlist-history` | `api/index.js` | 1122–1137 | Information disclosure — exposes enrollment history |
| `GET /lecturer/courses/:id/all-submissions` | `api/index.js` | 1139–1148 | Information disclosure — exposes student code & scores |
| `POST /lecturer/courses/:id/approve` | `api/index.js` | 1283–1299 | Privilege mutation — any lecturer approves enrollment |
| `POST /lecturer/courses/:id/reject` | `api/index.js` | 1301–1315 | Privilege mutation — any lecturer rejects enrollment |
| `POST /lecturer/courses/:id/remove-student` | `api/index.js` | 1318–1325 | Privilege mutation — any lecturer removes students |
| `GET /lecturer/courses/:id/materials` | `api/index.js` | 1328–1333 | Information disclosure — exposes course material metadata |

#### Description

All nine routes above verify that the caller has the `lecturer` role but do **not** verify that the requested resource belongs to the caller's courses. This is an Insecure Direct Object Reference (IDOR) vulnerability that allows any authenticated lecturer to read or mutate data belonging to any other lecturer's courses.

The prior audit (2026-05-21 CRITICAL-2) fixed the assignment CRUD and material update/delete routes. The fix commit (`7582047`) applied the pattern correctly to those routes but did not extend it to the enrollment management, extension, and course-level GET routes addressed here.

Three of the GET routes contain `// Audit #3a`, `// Audit #3b`, and `// Audit #3c` comments indicating a previous audit added the role check but did not add the ownership check:

```js
// api/index.js:1107 — role check only, ownership missing
router.get('/lecturer/courses/:id/waitlist', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send(); // Audit #3a
  await connectDB();
  const course = await Course.findById(req.params.id); // ← no lecturerId filter
  // ...
  res.json({ pending: ..., enrolled: ... }); // exposes student PII
});

// api/index.js:844 — same pattern, comments only note role check
router.get('/lecturer/courses/:courseId/assignments', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send(); // Audit #3b
  await connectDB();
  const assignments = await Assignment.find({ courseId: req.params.courseId }); // ← unverified courseId
  res.json(assignments); // exposes masterSolution, rubric, unit_tests
});
```

The mutation routes have the same pattern — role check present, ownership check absent:

```js
// api/index.js:1283 — any lecturer can approve students into any course
router.post('/lecturer/courses/:id/approve', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const { studentId } = req.body;
  const course = await Course.findById(req.params.id); // ← read-only, no ownership filter
  await Course.updateOne(
    { _id: req.params.id },  // ← no lecturerId constraint
    { $pull: { pendingStudentIds: studentId }, $addToSet: { enrolledStudentIds: studentId } }
  );
  // ...
});

// api/index.js:897 — any lecturer can grant extension for any submission
router.post('/lecturer/submissions/:id/extension', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const submission = await Submission.findByIdAndUpdate(
    req.params.id,   // ← no course ownership check
    { extensionUntil: req.body.extensionUntil },
    { new: true }
  );
  res.json(submission);
});
```

#### Impact

A malicious authenticated lecturer can:

1. **Read master solutions and rubrics** for any course's assignments via `GET .../assignments`
2. **Read all student code submissions and scores** for any course via `GET .../all-submissions`
3. **Read student PII** (name, picture, googleId) for any course's enrolled and pending students via `GET .../waitlist`
4. **Approve or reject enrollment requests** for any course, disrupting another lecturer's class management
5. **Forcibly remove students** from courses they do not teach
6. **Unilaterally grant deadline extensions** for any student submission, bypassing the owning lecturer's authority

#### Establishing Ownership

The `Course` model stores `lecturerId`. The correct ownership pattern (already used on the fixed routes) is:

```js
// For routes operating on a courseId directly:
const course = await Course.findOne({ _id: req.params.id, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });

// For routes operating on a submissionId, resolve to courseId first:
const submission = await Submission.findById(req.params.id);
if (!submission) return res.status(404).json({ message: 'Submission not found' });
const course = await Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
```

#### Required Fix (route by route)

| Route | Fix |
|-------|-----|
| `GET /lecturer/courses/:courseId/assignments` (line 844) | Replace `Assignment.find({ courseId })` with `Course.findOne({ _id: courseId, lecturerId: req.user.googleId })` guard first |
| `POST /lecturer/submissions/:id/extension` (line 897) | Fetch submission, then verify `Course.findOne({ _id: submission.courseId, lecturerId })` before updating |
| `GET /lecturer/courses/:id/waitlist` (line 1107) | Change `Course.findById(req.params.id)` to `Course.findOne({ _id: req.params.id, lecturerId: req.user.googleId })` |
| `GET /lecturer/courses/:id/waitlist-history` (line 1122) | Add ownership guard before `WaitlistHistory.find` |
| `GET /lecturer/courses/:id/all-submissions` (line 1139) | Add ownership guard before `Submission.find` |
| `POST /lecturer/courses/:id/approve` (line 1283) | Add `if (course.lecturerId !== req.user.googleId) return res.status(403)` after line 1287 |
| `POST /lecturer/courses/:id/reject` (line 1301) | Same as approve |
| `POST /lecturer/courses/:id/remove-student` (line 1318) | Fetch course, add ownership check before `Course.updateOne` |
| `GET /lecturer/courses/:id/materials` (line 1328) | Add `Course.findOne({ _id, lecturerId })` guard before `Material.find` |

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| 5 — Unsafe JSON parsing | ✓ Clean | All `JSON.parse` calls in `lib/llm/safeParse.js:10,15,21` are inside `safeParseLLMResponse()`. No bare `JSON.parse(llmResponse)` outside the safe wrapper in `api/`, `services/`, or `lib/`. |
| 6 — Missing output validation | ✓ Clean | `validateLLMOutput()` called at `api/index.js:809` (`POST /evaluate`) and `services/semanticAssessment.js:105` (Layer 2 semantic analysis). Chat endpoints return raw text (not structured evaluation JSON), so output validation is not applicable there. |
| 7 — `alert()` in UI | ✓ Clean | All references to "alert" in components are React state variables (`messageAlert`, `sync.alert`) or inline comments noting prior replacements. No `alert(`, `confirm(`, or `prompt(` browser API calls found in `components/`, `App.tsx`, or `LecturerDashboard.tsx`. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8)

**Status:** Persistent — `GradeBook.tsx:40` flagged for the **7th consecutive audit** (since 2026-04-17) with no remediation. Additional items unchanged.

#### `GradeBook.tsx:40` — Physical `scrollBy.left` (Recurring — 7th audit)

```tsx
// components/GradeBook.tsx:40
scrollContainerRef.current.scrollBy({ left: direction === 'left' ? 400 : -400, behavior: 'smooth' });
```

`ScrollByOptions.left` is a physical CSS axis. In a `dir="rtl"` document, clicking the "right" arrow scrolls visually left (wrong direction for Hebrew users). Unfixed through 7 audits.

Suggested fix (unchanged from prior audits):
```tsx
const isRtl = document.documentElement.dir === 'rtl';
const delta = direction === 'right' ? 400 : -400;
scrollContainerRef.current.scrollBy({ left: isRtl ? -delta : delta, behavior: 'smooth' });
```

#### `StudentAssignments.tsx:134` — Hardcoded `text-left` (Recurring from 2026-05-21)

```tsx
// components/StudentAssignments.tsx:134
<div className="text-left">
  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">תאריך הגשה</p>
```

Physical LTR alignment inside a `dir="rtl"` parent. Replace with `text-end`.

#### Physical `borderRight`/`paddingRight` (Recurring from 2026-04-30)

```tsx
// components/StudentAssignments.tsx:176
style={{ borderRight: '3px solid #FF9800', paddingRight: '8px' }}

// components/AssignmentManager.tsx:263
style={{ borderRight: '3px solid #FF9800', paddingRight: '8px', marginBottom: '4px' }}

// components/AssignmentManager.tsx:417
style={{ borderRight: '3px solid #FF9800', paddingRight: '8px' }}
```

Replace physical `borderRight`/`paddingRight` with logical `borderInlineEnd`/`paddingInlineEnd`.

---

### MEDIUM-2 — Prompt Version Drift (Check #9)

**Status:** Persistent (flagged in 2026-05-07, 2026-05-14, and 2026-05-21 audits — 4th consecutive)

`lib/constants.js:1` exports `PROMPT_VERSION = 'v1.2.0'`. No `prompt-v1.2.0` git tag exists. `package.json` remains at `"version": "1.1.0"`. No prompt template changes in `lib/llm/` since the last audit.

Recommended actions (unchanged from prior audits):
1. `git tag prompt-v1.2.0 8dad476` — retroactively tag the bump commit
2. Align `package.json` to `"version": "1.2.0"` if the prompt change was semantically significant
3. Future prompt template changes must bump `PROMPT_VERSION` in the same commit

---

### MEDIUM-3 — Dead Code / Orphaned Files (Check #10)

**Status:** Persistent (flagged in 2026-05-07, 2026-05-14, and 2026-05-21 audits — 4th consecutive)

The `ForExample/` directory contains 6 unreferenced example files not imported from any code path, `package.json` scripts, `api/index.js`, `App.tsx`, or `vercel.json`:

```
ForExample/custominstr.EXMP.txt
ForExample/mastersolutionEXMP.txt
ForExample/questionEXMP.txt
ForExample/rubricEXMP.txt
ForExample/student1codeEXMP.txt
ForExample/student2codeEXMP.txt
```

`server_reference.js` confirmed absent from the repository. Audit template placeholders `[full_path_of_file_1]`/`[full_path_of_file_2]` remain unfilled — no additional orphaned files identified beyond `ForExample/`.

Recommended actions (unchanged from prior audits):
- Move to `docs/examples/` for clear intent, or
- Add to `.gitignore` if only used for local manual testing

---

## Checks With No Findings

| Check | Result |
|-------|--------|
| 1 — Unprotected LLM call sites | ✓ Clean — `POST /evaluate` uses `buildSafePrompt()` + `LLMOrchestrator.evaluateWithFallback()` (`api/index.js:792–803`); `POST /chat` uses `buildSafePrompt()`/`buildSafeChatPrompt()` (`api/index.js:733–749`); `POST /student/chat` uses `buildSafeChatPrompt()` (`api/index.js:606`); `semanticAssessment.js:85–94` uses `buildSafePrompt()` + orchestrator. No direct provider SDK calls found outside `lib/llm/providers/`. |
| 4 — Secrets in tracked files | ✓ Clean — `.env.example` contains only template placeholders. No API keys, MongoDB URIs, OAuth secrets, or session secrets found in any tracked `.js`, `.ts`, `.tsx`, `.md`, or test fixture file. `api/index.js:300` fallback session secret is `'dev-secret-not-for-production'` — protected by the production guard at line 296 that throws on missing `SESSION_SECRET`. |

---

## Summary of Open Items (All Audits)

| Finding | First Raised | Status |
|---------|-------------|--------|
| CRITICAL-1 (this audit): Missing rate limit on `POST /student/join-course` | 2026-05-28 | **Open** |
| CRITICAL-2 (this audit): IDOR on 9 enrollment/course-access routes | 2026-05-28 | **Open** |
| MEDIUM: `GradeBook.tsx:40` RTL `scrollBy.left` | 2026-04-17 | **Unresolved — 7 audits** |
| MEDIUM: `borderRight`/`paddingRight` in 2 files | 2026-04-30 | **Unresolved — 4 audits** |
| MEDIUM: `StudentAssignments.tsx:134` `text-left` | 2026-05-21 | **Unresolved — 2 audits** |
| MEDIUM: Prompt version tag missing | 2026-05-07 | **Unresolved — 4 audits** |
| MEDIUM: `ForExample/` dead files | 2026-05-07 | **Unresolved — 4 audits** |

---

## Resolved Since Last Audit

| Finding | Resolution |
|---------|------------|
| CRITICAL-1 (2026-05-21): `POST /grades/save` missing rate limit | ✅ Resolved — `uploadRateLimit` added (`api/index.js:691`) |
| CRITICAL-2 (2026-05-21): IDOR on 9 assignment/material routes | ✅ Resolved — ownership checks added to all 9 routes |

---

## Recommendations (Priority Order)

1. **[IMMEDIATE]** Fix IDOR on enrollment and course-access routes (CRITICAL-2). Apply `Course.findOne({ _id, lecturerId: req.user.googleId })` guard to all 9 affected routes. The highest-risk mutations are `approve`/`reject`/`remove-student`/`extension` — a lecturer manipulating another class's enrollment corrupts academic records.
2. **[IMMEDIATE]** Add rate limit to `POST /student/join-course` (CRITICAL-1). One-line fix: `router.post('/student/join-course', submitRateLimit, ...)`.
3. **[RECURRING — ACTION OVERDUE]** Fix `GradeBook.tsx:40` RTL `scrollBy.left` — seventh consecutive audit. One-line fix.
4. **[SHORT-TERM]** Fix `StudentAssignments.tsx:134` `text-left` → `text-end`.
5. **[SHORT-TERM]** Replace physical `borderRight`/`paddingRight` with `borderInlineEnd`/`paddingInlineEnd` in `StudentAssignments.tsx:176` and `AssignmentManager.tsx:263,417`.
6. **[CLEANUP]** Create git tag `prompt-v1.2.0 8dad476`. Align `package.json` to `1.2.0`.
7. **[OPTIONAL]** Move `ForExample/` to `docs/examples/`.
