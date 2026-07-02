# CHAM Agent — Weekly Security & Architecture Audit (2026-07-02)

**Auditor:** Claude (automated)  
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`  
**Prior audit:** `docs/audits/weekly-audit-2026-06-04.md` (3 CRITICAL open)  
**Date:** 2026-07-02

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Missing rate limiting | `POST /student/join-course` (`api/index.js:456`) has no rate limit | **Open (new)** |
| 2 | CRITICAL | Unprotected LLM call sites | All call sites use `buildSafePrompt()` / `buildSafeChatPrompt()` + orchestrator | ✓ Clean |
| 3 | CRITICAL | Session/RBAC regressions | All `/lecturer/*`, `/student/*`, `/teacher/*` routes enforce role; `/auth/dev` disabled in production | ✓ Clean |
| 4 | CRITICAL | Secrets in tracked files | No hardcoded secrets found | ✓ Clean |
| 5 | HIGH | Unsafe JSON parsing | All LLM response parsing uses `safeParseLLMResponse` | ✓ Clean |
| 6 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 7 | HIGH | `alert()` in UI | No raw `alert()`/`confirm()`/`prompt()` calls in production components | ✓ Clean |
| 8 | MEDIUM | Hebrew/RTL consistency | `GradeBook.tsx:40` scrollBy.left (8th audit); `StudentAssignments.tsx:134` text-left (3rd); `borderRight`/`paddingRight` in 4 files including **new**: `ReviewQueue.tsx:253,418` | Report only |
| 9 | MEDIUM | Prompt version drift | `PROMPT_VERSION = 'v1.2.0'` still has no `prompt-v1.2.0` git tag; `package.json` at `1.1.0` | Report only |
| 10 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 files, 5th consecutive audit) | Report only |

**CRITICAL open:** 1  
**HIGH open:** 0

---

## Prior Audit Resolution Status (2026-06-04)

| Previous Finding | Resolution |
|-----------------|------------|
| CRITICAL-1 (2026-06-04): Missing rate limit on `POST /grades/save` | ✅ Resolved — `uploadRateLimit` added (`api/index.js:691`) in commit `9d3d875` |
| CRITICAL-2 (2026-06-04): IDOR on teacher review routes (`GET /teacher/review/:submissionId`, `POST /teacher/submit-review`) | ✅ Resolved — ownership check `Course.findOne({ _id: submission.courseId, lecturerId: req.user.googleId })` added to both routes (lines 1219–1221, 1251–1252) in commit `9d3d875` |
| CRITICAL-3 (2026-06-04): IDOR on course enrollment action routes (approve, reject, remove-student, extension, all-submissions) | ✅ Resolved — `lecturerId` filter added to all five routes (lines 1305–1307, 1325–1326, 1344–1345, 902–905, 1149–1151) in commit `9d3d875` |

---

## CRITICAL Findings

---

### CRITICAL-1 — Missing Rate Limit on `POST /student/join-course` (Check #2, New)

**Severity:** Critical  
**Check:** Missing rate limiting (Check #2)  
**Status:** Open — new finding  
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
  await connectDB();
  const { code } = req.body;                       // ← user-controlled text
  const course = await Course.findOne({ code });    // DB read on every request
  if (!course) return res.status(404).json({ message: 'Course not found' });

  if (course.enrolledStudentIds.includes(req.user.googleId)) {
    return res.status(400).json({ message: 'Already enrolled' });
  }

  await Course.updateOne(                           // DB write
    { _id: course._id },
    { $addToSet: { pendingStudentIds: req.user.googleId } }
  );
  await WaitlistHistory.create({ ... });            // DB write
  res.json({ message: 'Request sent to lecturer' });
});
```

Comparable routes that DO have protection: `POST /student/private-materials` (line 569, `uploadRateLimit`), `POST /messages` (line 647, `messagesRateLimit`), `POST /student/chat` (line 581, `llmRateLimit`).

#### Impact

An authenticated student (or compromised student session) can:

1. **Enumerate valid course codes** — course codes are 6-char uppercase alphanumeric (`Math.random().toString(36).substring(2,8).toUpperCase()`, api/index.js:1093), giving ~2.2B combinations. With no rate limit, an attacker can issue thousands of guesses per second over the Vercel CDN.
2. **Flood the pending waitlist** — each successful match inserts a `pendingStudentIds` entry in `Course` and a `WaitlistHistory` document. A student added to hundreds of waitlists will generate spurious lecturer notifications (`/lecturer/sync` includes pending counts).
3. **DB write exhaustion** — `WaitlistHistory.create` fires on every valid code match, enabling unbounded Atlas write consumption by a single authenticated account.

No existing global rate limit applies; Vercel adds no built-in IP throttling.

#### Required Fix

One line — add an existing limiter (or a new one) before the handler:

```js
// Option A: reuse submitRateLimit (20/15min) — appropriate severity
router.post('/student/join-course', submitRateLimit, async (req, res) => {

// Option B: dedicated limit (e.g. 10 requests per hour)
const joinCourseLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'יותר מדי בקשות הצטרפות. נסה שוב מאוחר יותר.' },
});
router.post('/student/join-course', joinCourseLimit, async (req, res) => {
```

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| 5 — Unsafe JSON parsing | ✓ Clean | All `JSON.parse` in the codebase is inside `safeParseLLMResponse()` (`lib/llm/safeParse.js:6–28`). No bare `JSON.parse(llmResponse)` found in `api/`, `services/`, or `lib/`. Grep across all `.js`/`.ts`/`.tsx` confirms zero matches outside the safe wrapper. |
| 6 — Missing output validation | ✓ Clean | `validateLLMOutput()` called at `api/index.js:810` (POST /evaluate) and `services/semanticAssessment.js:105` (Layer 2). Both paths block invalid output before returning to callers. |
| 7 — `alert()` in UI | ✓ Clean | All matches for "alert", "confirm", "prompt" in TSX/TSX files are React state variable names or audit comments — no browser API calls. Verified by pattern grep across all production component files. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8)

**Status:** Persistent + new location.

#### `GradeBook.tsx:40` — Physical `scrollBy.left` (Recurring — **8th consecutive audit**)

```tsx
// components/GradeBook.tsx:40
scrollContainerRef.current.scrollBy({ left: direction === 'left' ? 400 : -400, behavior: 'smooth' });
```

`ScrollByOptions.left` is a physical axis. In RTL the grade-table scroll arrows move in the wrong direction for Hebrew users. Flagged every audit since 2026-04-17 with no remediation.

```tsx
// Fix (unchanged from prior audits):
const isRtl = document.documentElement.dir === 'rtl';
const delta = direction === 'right' ? 400 : -400;
scrollContainerRef.current.scrollBy({ left: isRtl ? -delta : delta, behavior: 'smooth' });
```

#### `StudentAssignments.tsx:134` — `text-left` (Recurring — 3rd audit)

```tsx
// components/StudentAssignments.tsx:134
<div className="text-left">
  <p ...>תאריך הגשה</p>
```

Hebrew due-date text inside a `dir="rtl"` parent uses physical `text-left`. Replace with `text-end`.

#### `StudentAssignments.tsx:176`, `AssignmentManager.tsx:263,417` — Physical `borderRight`/`paddingRight` (Recurring — 6th audit)

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

#### `ReviewQueue.tsx:253,418` — Physical `borderRight` **(NEW — first occurrence)**

```tsx
// components/ReviewQueue.tsx:253
borderRight: '4px solid #FF9800',

// components/ReviewQueue.tsx:418
borderRight: `4px solid ${getPriorityColor(item.priority)}`,
```

Priority highlight strips use physical `borderRight`. In RTL these should be on the leading (right) edge visually, but `borderRight` is the physical right which is the trailing edge in RTL. Replace with:

```tsx
borderInlineEnd: '4px solid #FF9800',         // line 253
borderInlineEnd: `4px solid ${getPriorityColor(item.priority)}`,  // line 418
```

---

### MEDIUM-2 — Prompt Version Drift (Check #9)

**Status:** Persistent — flagged in 2026-05-07, 2026-05-14, 2026-05-21, 2026-06-04 audits (**5th consecutive**).

`lib/constants.js:1` exports `PROMPT_VERSION = 'v1.2.0'`. No `prompt-v1.2.0` git tag exists (`git tag --list` returns empty). `package.json` is still at `"version": "1.1.0"`.

Recommended actions (unchanged from prior audits):
1. `git tag prompt-v1.2.0 <commit-hash-of-prompt-bump>` — likely commit `8dad476` per 2026-05-07 audit
2. Align `package.json` to `"version": "1.2.0"` to match the constants file
3. Future prompt template changes must bump `PROMPT_VERSION` in the same commit as the template change

---

### MEDIUM-3 — Dead Code / Orphaned Files (Check #10)

**Status:** Persistent — flagged in 2026-05-07, 2026-05-14, 2026-05-21, 2026-06-04 audits (**5th consecutive**).

```
ForExample/custominstr.EXMP.txt
ForExample/mastersolutionEXMP.txt
ForExample/questionEXMP.txt
ForExample/rubricEXMP.txt
ForExample/student1codeEXMP.txt
ForExample/student2codeEXMP.txt
```

Not imported from any code path. Contain no secrets. Five consecutive audits without action.

`server_reference.js` — **not present** in current working tree. No finding.

Recommended: Move to `docs/examples/` or add to `.gitignore`.

---

## Checks With No New Findings

| Check | Result |
|-------|--------|
| 1 — Unprotected LLM call sites | ✓ Clean — `POST /evaluate` (line 768): `buildSafePrompt()` + `evaluateWithFallback()`; `POST /chat` (lines 733–749): `buildSafePrompt()` or `buildSafeChatPrompt()` + `evaluateWithFallback()`; `POST /student/chat` (line 581): `buildSafeChatPrompt()` + `evaluateWithFallback()`; `services/semanticAssessment.js:85`: `buildSafePrompt()` + `evaluateWithFallback()`. SDK calls are encapsulated in provider classes called exclusively through `LLMOrchestrator.evaluateWithFallback()`. `services/smartRouting.js` makes no LLM calls. `services/codeFilter.js` is pure static analysis with no external calls. |
| 3 — Session/RBAC regressions | ✓ Clean — Every `/lecturer/*` route asserts `req.user.role !== 'lecturer'`. Every `/student/*` route asserts `req.user.role !== 'student'`. `/teacher/*` routes (review queue) assert lecturer role. `POST /auth/dev` (line 365) returns 403 in production. No regressions from prior fixes. |
| 4 — Secrets in tracked files | ✓ Clean — All provider credentials use `process.env.*`. Skill docs contain only `YOUR_GEMINI_API_KEY`-style placeholders. Session fallback `'dev-secret-not-for-production'` is dev-only, guarded by startup throw at line 296. `.env.example` has no real values. |

---

## Cumulative Open Items (All Audits)

| Finding | First Raised | Status |
|---------|-------------|--------|
| CRITICAL: Missing rate limit on `POST /student/join-course` | 2026-07-02 | **Open (new)** |
| MEDIUM: `GradeBook.tsx:40` RTL `scrollBy.left` | 2026-04-17 | **Unresolved — 8 audits** |
| MEDIUM: `borderRight`/`paddingRight` in `StudentAssignments.tsx:176`, `AssignmentManager.tsx:263,417` | 2026-04-30 | **Unresolved — 6 audits** |
| MEDIUM: `StudentAssignments.tsx:134` `text-left` | 2026-05-21 | **Unresolved — 3 audits** |
| MEDIUM: Prompt version tag missing | 2026-05-07 | **Unresolved — 5 audits** |
| MEDIUM: `ForExample/` dead files | 2026-05-07 | **Unresolved — 5 audits** |
| MEDIUM: `ReviewQueue.tsx:253,418` physical `borderRight` | 2026-07-02 | **New** |

---

## Recommendations (Priority Order)

1. **[IMMEDIATE]** Add rate limit to `POST /student/join-course` (CRITICAL-1). One-line fix; `submitRateLimit` is the simplest choice.
2. **[SHORT-TERM]** Fix `GradeBook.tsx:40` RTL `scrollBy.left` — **eighth** consecutive audit without resolution.
3. **[SHORT-TERM]** Fix `ReviewQueue.tsx:253,418` `borderRight` — new this audit, same pattern as existing carry-forwards.
4. **[SHORT-TERM]** Fix `StudentAssignments.tsx:176`, `AssignmentManager.tsx:263,417` physical `borderRight`/`paddingRight` — six audits without action.
5. **[SHORT-TERM]** Fix `StudentAssignments.tsx:134` `text-left` — three audits without action.
6. **[CLEANUP]** `git tag prompt-v1.2.0`. Align `package.json` to `1.2.0`.
7. **[OPTIONAL]** Move `ForExample/` to `docs/examples/`.
