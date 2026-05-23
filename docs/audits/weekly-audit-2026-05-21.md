# CHAM Agent — Weekly Security & Architecture Audit (2026-05-21)

**Auditor:** Claude (automated)
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `LecturerDashboard.tsx`
**Prior audit:** `docs/audits/weekly-audit-2026-05-14.md` (1 CRITICAL — resolved in commit `9ca5014`)
**Date:** 2026-05-21

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Unprotected LLM call sites | All call sites use `buildSafePrompt()` / `buildSafeChatPrompt()` + orchestrator | ✓ Clean |
| 2 | CRITICAL | Missing rate limiting | `POST /grades/save` (`api/index.js:691`) accepts `feedback` text with no rate limit | **Open** |
| 3 | CRITICAL | Session/RBAC regressions | IDOR on 9 assignment & material routes — any lecturer can modify/delete any other lecturer's assignments, materials, and release feedback for any course | **Open** |
| 4 | CRITICAL | Secrets in tracked files | No hardcoded secrets found | ✓ Clean |
| 5 | HIGH | Unsafe JSON parsing | All LLM response parsing uses `safeParseLLMResponse` | ✓ Clean |
| 6 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 7 | HIGH | `alert()` in UI | No raw `alert()`/`confirm()`/`prompt()` calls found | ✓ Clean |
| 8 | MEDIUM | Hebrew/RTL consistency | `GradeBook.tsx:40` physical `scrollBy.left` (6th consecutive audit); `StudentAssignments.tsx:134` hardcoded `text-left`; physical `borderRight`/`paddingRight` in three locations | Report only |
| 9 | MEDIUM | Prompt version drift | `PROMPT_VERSION = 'v1.2.0'` with no `prompt-v1.2.0` git tag; `package.json` still at `1.1.0` | Report only |
| 10 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 files, 3rd consecutive audit) | Report only |

**CRITICAL open:** 2
**HIGH open:** 0

---

## Prior Audit Resolution Status (2026-05-14)

Commit `9ca5014` ("fix: resolve CRITICAL-1 from 2026-05-14 audit — use buildSafePrompt in chat routes") addressed:

| Previous Finding | Resolution |
|-----------------|------------|
| CRITICAL-1: Chat routes bypass `buildSafePrompt()` | ✅ Fully resolved — `POST /chat` now uses `buildSafePrompt()` when `context.studentCode` is present (lines 733–739) and `buildSafeChatPrompt()` when no code context (lines 744–749); `POST /student/chat` now uses `buildSafeChatPrompt()` (line 606) |

---

## CRITICAL Findings

---

### CRITICAL-1 — Missing Rate Limit on `POST /grades/save` (Check #2)

**Severity:** Critical
**Check:** Missing rate limiting (Check #2)
**Status:** Open — new finding
**GitHub Issue:** To be opened with label `security`

#### Affected route

| Route | File | Lines |
|-------|------|-------|
| `POST /grades/save` | `api/index.js` | 691–710 |

#### Description

`POST /grades/save` accepts a `feedback` field (free-form text content) and a `score` with no `express-rate-limit` middleware. Every other route in `api/index.js` that accepts text, code, or file content from the request body is protected by one of the four defined rate limiters (`llmRateLimit`, `submitRateLimit`, `messagesRateLimit`, `uploadRateLimit`). This route is the only POST route with text content that has no rate limit.

#### Evidence

```js
// api/index.js:691 — no rate limit middleware
router.post('/grades/save', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(403).json({ error: 'Forbidden' });
  await connectDB();
  const { exerciseId, studentId, score, feedback } = req.body;
  // ...
  await Grade.findOneAndUpdate(..., { score, feedback, ... }, { upsert: true });
  await Submission.findOneAndUpdate(..., { score, feedback, status: 'evaluated' });
  res.json({ success: true });
});
```

Comparable routes that DO have protection:
- `POST /messages` (line 647): `messagesRateLimit`
- `PUT /messages/:id` (line 661): `messagesRateLimit`
- `POST /lecturer/materials` (line 1290): `uploadRateLimit`
- `PUT /lecturer/materials/:id` (line 1302): `uploadRateLimit`

#### Impact

An authenticated lecturer can flood the database with arbitrary grade/feedback entries at high frequency. Because `Submission.findOneAndUpdate` uses `{ assignmentId, studentId }` as the filter, repeated POSTs can also cause contention on submission records that are concurrently being processed by the CHAM pipeline.

#### Required Fix

Add `uploadRateLimit` to the route definition:

```js
router.post('/grades/save', uploadRateLimit, async (req, res) => {
```

---

### CRITICAL-2 — IDOR on Lecturer Assignment and Material Routes (Check #3)

**Severity:** Critical
**Check:** Session/RBAC regressions (Check #3)
**Status:** Open — new finding
**GitHub Issue:** To be opened with label `security`

#### Affected routes

| Route | File | Lines | Impact |
|-------|------|-------|--------|
| `POST /lecturer/assignments` | `api/index.js` | 832–836 | Creates assignment in any `courseId` without verifying the lecturer owns that course |
| `PUT /lecturer/assignments/:id` | `api/index.js` | 846–851 | Updates any assignment by ID, no ownership check |
| `DELETE /lecturer/assignments/:id` | `api/index.js` | 853–859 | Deletes any assignment + all submissions, no ownership check |
| `GET /lecturer/assignments/:id/submissions` | `api/index.js` | 861–866 | Lists student submissions for any assignment |
| `POST /lecturer/assignments/:id/release-feedback` | `api/index.js` | 875–885 | Releases feedback for any assignment |
| `GET /lecturer/assignments/:id/feedback-status` | `api/index.js` | 887–896 | Reads feedback status for any assignment |
| `POST /lecturer/assignments/:id/submit-manual` | `api/index.js` | 898–947 | Runs full CHAM pipeline (LLM calls, DB writes) against any assignment |
| `PUT /lecturer/materials/:id` | `api/index.js` | 1302–1312 | Updates any material document regardless of `ownerId` |
| `DELETE /lecturer/materials/:id` | `api/index.js` | 1314–1319 | Deletes any material regardless of `ownerId` |

#### Description

All nine routes above verify that the caller has the `lecturer` role but do **not** verify that the requested resource belongs to the caller's courses. This is an Insecure Direct Object Reference (IDOR) vulnerability — any authenticated lecturer with a valid MongoDB ObjectID can perform privileged operations on another lecturer's resources.

The inconsistency is highlighted by the course management routes, which DO enforce ownership via `lecturerId`:

```js
// api/index.js:1050 — CORRECT: ownership enforced
router.put('/lecturer/courses/:id', uploadRateLimit, async (req, res) => {
  const course = await Course.findOneAndUpdate(
    { _id: req.params.id, lecturerId: req.user.googleId }, // ← ownership check
    req.body,
    { new: true }
  );
```

But the assignment routes do not:

```js
// api/index.js:849 — VULNERABLE: no ownership check
router.put('/lecturer/assignments/:id', uploadRateLimit, async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  // ← no check that assignment.courseId belongs to req.user's courses
```

And the `POST /lecturer/assignments` creation route trusts the client-supplied `courseId` without verification:

```js
// api/index.js:832-836 — VULNERABLE: courseId not validated against lecturer's courses
router.post('/lecturer/assignments', uploadRateLimit, async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const assignment = await Assignment.create(req.body); // ← req.body.courseId unverified
```

#### Impact

A malicious authenticated lecturer can:
1. **Modify or delete** another lecturer's assignment definitions, rubrics, and master solutions
2. **Read all student submissions** for any assignment across any course
3. **Release or withhold feedback** for students in courses they do not teach
4. **Inject arbitrary assignments** into another lecturer's course by specifying a foreign `courseId`
5. **Trigger unbounded LLM calls** (`submit-manual`) against any assignment, consuming API quota
6. **Modify or delete** any course material regardless of which course uploaded it

The risk is elevated for `POST /lecturer/assignments/:id/submit-manual` because it invokes `assessSubmission()` → `analyzeCodeQuality()` → `orchestrator.evaluateWithFallback()`, creating real LLM API charges and database records.

#### Required Fix

For modification routes, verify the assignment belongs to a course owned by the requesting lecturer. The Assignment model stores `courseId`; the Course model stores `lecturerId`. Apply a two-step ownership check:

```js
// Pattern for PUT/DELETE/action routes on assignments
const assignment = await Assignment.findById(req.params.id);
if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

const course = await Course.findOne({ _id: assignment.courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
```

For `POST /lecturer/assignments` (creation), verify that the supplied `courseId` belongs to the lecturer:

```js
const course = await Course.findOne({ _id: req.body.courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
```

For material routes, the Material model stores `ownerId`. Verify:

```js
const material = await Material.findOne({ _id: req.params.id, ownerId: req.user.googleId });
if (!material) return res.status(403).json({ message: 'Forbidden' });
```

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| 5 — Unsafe JSON parsing | ✓ Clean | The only `JSON.parse` calls in `lib/llm/safeParse.js` are inside `safeParseLLMResponse()` itself. No bare `JSON.parse(llmResponse)` found outside the safe wrapper in `api/`, `services/`, or `lib/`. |
| 6 — Missing output validation | ✓ Clean | `validateLLMOutput()` called at `api/index.js:809` (for `POST /evaluate`) and `semanticAssessment.js:105` (for Layer 2 semantic analysis). Both structured evaluation paths validated before returning to callers. |
| 7 — `alert()` in UI | ✓ Clean | All references to "alert" in components are React state variables (`messageAlert`, `sync.alert`) or comments noting prior replacements. No `alert(`, `confirm(`, or `prompt(` browser API calls found. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8)

**Status:** Mixed — `GradeBook.tsx:40` flagged for the **6th consecutive audit** (since 2026-04-17) with no remediation. Two additional items present.

#### `GradeBook.tsx:40` — Physical `scrollBy.left` (Recurring — 6th audit)

```tsx
// components/GradeBook.tsx:40
scrollContainerRef.current.scrollBy({ left: direction === 'left' ? 400 : -400, behavior: 'smooth' });
```

`ScrollByOptions.left` is a physical CSS axis. In an RTL document (`dir="rtl"`), this inverts the scroll direction of the grade table: clicking the "right" arrow scrolls toward the visual left (the wrong direction for Hebrew users). This has appeared without fix in every audit since 2026-04-17.

Suggested fix (unchanged from prior audits):
```tsx
const isRtl = document.documentElement.dir === 'rtl';
const delta = direction === 'right' ? 400 : -400;
scrollContainerRef.current.scrollBy({ left: isRtl ? -delta : delta, behavior: 'smooth' });
```

#### `StudentAssignments.tsx:134` — Hardcoded `text-left` class (NEW)

```tsx
// components/StudentAssignments.tsx:134
<div className="text-left">
  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">תאריך הגשה</p>
  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
    {new Date(submission?.extensionUntil || a.dueDate).toLocaleDateString('he-IL')}
  </p>
</div>
```

This element renders the submission due date using `text-left` (physical LTR alignment) inside a `dir="rtl"` parent. In RTL layout, the date should align to the logical end (physical right). Replace with `text-end` (Tailwind logical equivalent of `text-right` in RTL).

#### Recurring `borderRight`/`paddingRight` items

```tsx
// components/StudentAssignments.tsx:176
style={{ borderRight: '3px solid #FF9800', paddingRight: '8px' }}

// components/AssignmentManager.tsx:263
style={{ borderRight: '3px solid #FF9800', paddingRight: '8px', marginBottom: '4px' }}

// components/AssignmentManager.tsx:417
style={{ borderRight: '3px solid #FF9800', paddingRight: '8px' }}
```

These deduction accent indicators use physical `borderRight`/`paddingRight`. In RTL layout the inline-end is the left side. Replace with:
```tsx
style={{ borderInlineEnd: '3px solid #FF9800', paddingInlineEnd: '8px' }}
```

---

### MEDIUM-2 — Prompt Version Drift (Check #9)

**Status:** Persistent (flagged in 2026-05-07 and 2026-05-14 audits)

`lib/constants.js:1` exports `PROMPT_VERSION = 'v1.2.0'`. The audit baseline is `v1.1.0`. The version was bumped in commit `8dad476` without a corresponding git tag, making it impossible to identify which deployed version uses which prompt templates.

`package.json` remains at `"version": "1.1.0"`, creating a discrepancy between the application version and the prompt version. No prompt template changes have occurred since `8dad476`.

Recommended actions (unchanged from prior audits):
1. `git tag prompt-v1.2.0 8dad476` — retroactively tag the bump commit
2. Align `package.json` to `"version": "1.2.0"` if the prompt change was semantically significant
3. Future prompt template changes must bump `PROMPT_VERSION` in the same commit as the template change

---

### MEDIUM-3 — Dead Code / Orphaned Files (Check #10)

**Status:** Persistent (flagged in 2026-05-07 and 2026-05-14 audits)

The `ForExample/` directory contains 6 unreferenced example files:

```
ForExample/custominstr.EXMP.txt
ForExample/mastersolutionEXMP.txt
ForExample/questionEXMP.txt
ForExample/rubricEXMP.txt
ForExample/student1codeEXMP.txt
ForExample/student2codeEXMP.txt
```

These files are not imported from any code path, `package.json` scripts, `api/index.js`, `App.tsx`, or `vercel.json`. They contain no secrets (plain-text assignment descriptions and sample code). These have been flagged for three consecutive audits without action.

Recommended actions (unchanged from prior audits):
- Move to `docs/examples/` for clear intent, or
- Add to `.gitignore` if only used for local manual testing

**Cleared from prior audit:**
- `chatService.ts` dead export: ✓ Resolved in commit `76012e9`
- Audit spec placeholders `[full_path_of_file_1]`/`[full_path_of_file_2]`: remain unfilled in the audit template; `server_reference.js` confirmed absent from repository

---

## Checks With No Findings

| Check | Result |
|-------|--------|
| 1 — Unprotected LLM call sites | ✓ Clean — CRITICAL-1 from 2026-05-14 resolved by `9ca5014`: `POST /chat` uses `buildSafePrompt()` (lines 733–739) or `buildSafeChatPrompt()` (lines 744–749); `POST /student/chat` uses `buildSafeChatPrompt()` (line 606); `POST /evaluate` uses `buildSafePrompt()` (line 792); `semanticAssessment.js` uses `buildSafePrompt()` (line 85). All four LLM call sites pass through the orchestrator via `evaluateWithFallback()`. |
| 4 — Secrets in tracked files | ✓ Clean — `README.md` contains only obvious placeholder patterns (`XXXX`); `.env.example` contains no real values; `api/index.js:300` fallback session secret is dev-only with production guard at line 296. Skill docs contain template URIs. |
| 5 — Unsafe JSON parsing | ✓ Clean |
| 6 — Missing output validation | ✓ Clean |
| 7 — `alert()` in UI | ✓ Clean |

---

## Summary of Open Items (All Audits)

| Finding | First Raised | Status |
|---------|-------------|--------|
| CRITICAL-2 (this audit): IDOR on assignment/material routes | 2026-05-21 | **Open** |
| CRITICAL-1 (this audit): Missing rate limit on `/grades/save` | 2026-05-21 | **Open** |
| MEDIUM: `GradeBook.tsx:40` RTL `scrollBy.left` | 2026-04-17 | **Unresolved — 6 audits** |
| MEDIUM: `borderRight`/`paddingRight` in 3 files | 2026-04-30 | **Unresolved — 4 audits** |
| MEDIUM: `StudentAssignments.tsx:134` `text-left` | 2026-05-21 | **New** |
| MEDIUM: Prompt version tag missing | 2026-05-07 | **Unresolved — 3 audits** |
| MEDIUM: `ForExample/` dead files | 2026-05-07 | **Unresolved — 3 audits** |

---

## Recommendations (Priority Order)

1. **[IMMEDIATE]** Fix IDOR on assignment and material routes (CRITICAL-2). Add ownership checks to 9 routes — see "Required Fix" section above. This is the highest-severity finding: cross-lecturer data modification, LLM quota abuse, and submission leakage.
2. **[IMMEDIATE]** Add `uploadRateLimit` to `POST /grades/save` (CRITICAL-1). One-line fix.
3. **[SHORT-TERM]** Fix `GradeBook.tsx:40` RTL `scrollBy.left` — sixth consecutive audit without resolution. One-line fix.
4. **[SHORT-TERM]** Fix `StudentAssignments.tsx:134` `text-left` (new). Replace with `text-end`.
5. **[SHORT-TERM]** Replace physical `borderRight`/`paddingRight` with `borderInlineEnd`/`paddingInlineEnd` in three locations.
6. **[CLEANUP]** Create git tag `prompt-v1.2.0 8dad476`. Align `package.json` to `1.2.0`.
7. **[OPTIONAL]** Move `ForExample/` to `docs/examples/`.
