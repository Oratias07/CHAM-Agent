# CHAM Agent — Weekly Security & Architecture Audit (2026-09-17)

**Auditor:** Claude (automated)  
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `vite.config.ts`, `.claude/`  
**Prior audit:** `docs/audits/weekly-audit-2026-07-09.md` (6 CRITICAL open; last code-change commit `ed1dafc` on 2026-07-14)  
**Date:** 2026-09-17

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Secrets in code | MongoDB Atlas credentials still in git history; passwords not rotated | **Open (carried from 2026-07-09, Issue #41)** |
| 2 | CRITICAL | Session/RBAC regressions | `PUT /lecturer/assignments/:id` — `req.body` passed unfiltered to `findByIdAndUpdate`, allowing courseId cross-course injection | **Open (Issue #63, filed 2026-09-10)** |
| 3 | HIGH | Unsafe JSON parsing | All LLM parsing uses `safeParseLLMResponse()` | ✓ Clean |
| 4 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 5 | HIGH | `alert()` in UI | No live `alert()`/`confirm()`/`prompt()` browser calls in production components | ✓ Clean |
| 6 | MEDIUM | Hebrew/RTL consistency | `ReviewQueue.tsx:253,418` physical `borderRight` | Report only |
| 7 | MEDIUM | Prompt version drift | `PROMPT_VERSION = 'v1.2.0'` — tag `prompt-v1.2.0` exists and matches | ✓ Resolved |
| 8 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 files, 7th consecutive audit) | Report only |

**CRITICAL open:** 2  
**HIGH open:** 0

---

## Prior Audit Resolution Status (2026-07-09)

| Previous Finding | Resolution |
|-----------------|------------|
| CRITICAL-1 (2026-07-09): Live MongoDB credentials in git-tracked `settings.local.json` | ⚠️ Partial — file untracked (`git rm --cached`), added to `.gitignore` (`ff569e3`). Credentials **still in git history**; passwords **not confirmed rotated**. Issue #41 remains open. |
| CRITICAL-2 (2026-07-09): `vite.config.ts` bakes `API_KEY` into client bundle | ✅ Fixed — `define` block removed in `ed1dafc`. `vite.config.ts` now clean. |
| CRITICAL-3 (2026-07-09): No rate limit on `POST /student/join-course` | ✅ Fixed — `submitRateLimit` applied at `api/index.js:456` in `ed1dafc`. |
| CRITICAL-4 (2026-07-09): IDOR — lecturer reads any course (4 routes) | ✅ Fixed — `Course.findOne({ _id, lecturerId })` → 403 added at lines 851, 1124, 1139, 1365 in `ed1dafc`. |
| CRITICAL-5 (2026-07-09): IDOR — student reads any course without enrollment (2 routes) | ✅ Fixed — `enrolledCourseIds.includes()` → 403 added at lines 553, 1009 in `ed1dafc`. |
| CRITICAL-6 (2026-07-09): Mass assignment in `POST /lecturer/archive` | ✅ Fixed — `...req.body` moved before server fields at line 437 in `ed1dafc`. |
| MEDIUM: `GradeBook.tsx:40` physical `scrollBy.left` | ✅ Fixed — `scrollBy({ left: isRtl ? -delta : delta })` at line 42 in `ff569e3`. |
| MEDIUM: `StudentAssignments.tsx`, `AssignmentManager.tsx` physical `borderRight`/`paddingRight` | ✅ Fixed — `borderInlineEnd`/`paddingInlineEnd` applied in `ff569e3`. |
| MEDIUM: `StudentAssignments.tsx:134` `text-left` | ✅ Fixed in `ff569e3`. |
| MEDIUM: `ReviewQueue.tsx:253,418` physical `borderRight` | ❌ Not fixed — still present, 3rd consecutive audit. |
| MEDIUM: Prompt version tag missing | ✅ Fixed — tag `prompt-v1.2.0` created 2026-07-13 per AUDIT_TRACKING.md. |

---

## CRITICAL Findings

---

### CRITICAL-1 — MongoDB Atlas Credentials Remain in Git History (Check #4, Carried)

**Severity:** Critical  
**Check:** Secrets in code (Check #4)  
**Status:** Open — partially mitigated 2026-07-14, root cause unresolved  
**First raised:** 2026-07-09  
**GitHub Issue:** [#41](https://github.com/Oratias07/CHAM-Agent/issues/41)

#### Current State

| Mitigation applied (2026-07-14) | Status |
|--------------------------------|--------|
| `git rm --cached .claude/settings.local.json` | ✅ Done — file no longer in working tree |
| Added `.claude/settings.local.json` to `.gitignore` | ✅ Done |
| Rotate both MongoDB Atlas passwords | ❌ **Not done** |
| `git filter-repo` / BFG to scrub git history | ❌ **Not done** |

#### Impact

The credentials committed in the git history are recoverable by any person with read access to the repository via `git log -p .claude/settings.local.json`. Until the passwords are rotated and history scrubbed, the credentials remain effective — any past clone may retain them indefinitely.

#### Required Fix (Unchanged)

1. **Immediately:** Rotate both MongoDB Atlas passwords (`Vercel-Admin-st-system-db`). Do not wait for history scrub — the new passwords are safe the moment they are changed.
2. Run `git filter-repo --path .claude/settings.local.json --invert-paths` and force-push. Notify all collaborators to re-clone.
3. Verify `.gitignore` still contains `.claude/settings.local.json` after the history scrub.

---

### CRITICAL-2 — Mass Assignment on `PUT /lecturer/assignments/:id` — courseId Injectable Across Courses (Check #3)

**Severity:** Critical  
**Check:** Session/RBAC regressions (Check #3)  
**Status:** Open — filed as Issue #63 on 2026-09-10, **not fixed**  
**First raised:** 2026-09-10  
**GitHub Issue:** [#63](https://github.com/Oratias07/CHAM-Agent/issues/63)

#### Affected Route

| Route | File | Line |
|-------|------|------|
| `PUT /lecturer/assignments/:id` | `api/index.js` | 868 |

#### Evidence

```js
// api/index.js:857-869 — current code, confirmed unpatched
router.put('/lecturer/assignments/:id', uploadRateLimit, async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();

  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

  // Ownership check uses the CURRENT courseId — not the one being written
  const course = await Course.findOne({ _id: assignment.courseId, lecturerId: req.user.googleId });
  if (!course) return res.status(403).json({ message: 'Forbidden' });

  // req.body passed unfiltered — caller controls every field, including courseId
  const updatedAssignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updatedAssignment);
});
```

The ownership check (line 865) verifies the *current* `assignment.courseId` belongs to the authenticated lecturer. It does not prevent the body from containing a different `courseId`. Once the check passes, `req.body` (which may include `{ courseId: "victim-course-id" }`) is applied verbatim by Mongoose.

#### Exploit Scenario

1. Lecturer A owns `assignment-X` in `course-A` (their course).
2. They obtain `course-B`'s ObjectId (visible from student-side network traffic, since `/student/courses/:courseId/assignments` returns courseId in the response).
3. `PUT /lecturer/assignments/assignment-X` with body `{ courseId: "course-B-id", question: "..." }`.
4. Assignment-X is now attributed to `course-B` — its questions, rubric, and master solution are exposed to Course B's students and Course B's lecturer.

Additionally, any other field in the `Assignment` schema can be overwritten: `requires_human_review`, `masterSolution`, `openDate`, `dueDate`, etc.

#### Impact

- Cross-course exfiltration of questions, rubrics, and master solutions
- A lecturer can disable required human review (`requires_human_review: false`) for any of their assignments
- Assignment metadata corruption

#### Required Fix

Whitelist the fields that can be updated:

```js
router.put('/lecturer/assignments/:id', uploadRateLimit, async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();

  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

  const course = await Course.findOne({ _id: assignment.courseId, lecturerId: req.user.googleId });
  if (!course) return res.status(403).json({ message: 'Forbidden' });

  // Whitelist — courseId is NOT included (cannot be reassigned)
  const { title, question, masterSolution, rubric, customInstructions,
          maxScore, openDate, dueDate, language, question_type,
          requires_human_review, unit_tests } = req.body;

  const updatedAssignment = await Assignment.findByIdAndUpdate(
    req.params.id,
    { title, question, masterSolution, rubric, customInstructions,
      maxScore, openDate, dueDate, language, question_type,
      requires_human_review, unit_tests },
    { new: true }
  );
  res.json(updatedAssignment);
});
```

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| 5 — Unsafe JSON parsing | ✓ Clean | All `JSON.parse` of LLM responses is inside `safeParseLLMResponse()` (`lib/llm/safeParse.js:6–28`). No bare `JSON.parse(llmResponse)` in `api/`, `services/`, or `lib/`. |
| 6 — Missing output validation | ✓ Clean | `validateLLMOutput()` called at `api/index.js:810` (`POST /evaluate`) and `services/semanticAssessment.js:105` (Layer 2). Both paths block invalid output before returning. |
| 7 — `alert()` in UI | ✓ Clean | All references to `alert`/`confirm`/`prompt` in TSX files are comments documenting prior replacements (Audit #7 tags). No live browser dialog calls in any component. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8)

**Status:** Partially resolved — 1 location still open.

| Location | Issue | Audit count | Status |
|----------|-------|-------------|--------|
| `ReviewQueue.tsx:253` | `borderRight: '4px solid #FF9800'` — physical property | 3rd consecutive | ❌ Open |
| `ReviewQueue.tsx:418` | `borderRight: \`4px solid ${getPriorityColor(...)}\`` — physical property | 3rd consecutive | ❌ Open |
| `GradeBook.tsx:42` | `scrollBy.left` | Resolved in `ff569e3` | ✅ Fixed |
| `StudentAssignments.tsx`, `AssignmentManager.tsx` | `borderRight`/`paddingRight` | Resolved in `ff569e3` | ✅ Fixed |

**Fix for ReviewQueue.tsx:** Replace `borderRight` with `borderInlineEnd` (logical CSS property, RTL-aware):

```tsx
// line 253:
borderInlineEnd: '4px solid #FF9800',

// line 418:
borderInlineEnd: `4px solid ${getPriorityColor(item.priority)}`,
```

---

### MEDIUM-2 — Prompt Version Drift (Check #9)

**Status:** ✅ Resolved.

`lib/constants.js:1` exports `PROMPT_VERSION = 'v1.2.0'`. Git tag `prompt-v1.2.0` was created on 2026-07-13 (commit `8dad476`) per `docs/audits/AUDIT_TRACKING.md`. `package.json` (`2.1.1`) and prompt version are intentionally decoupled — drop this check from future audits per tracking doc note #18.

---

### MEDIUM-3 — Dead Code / Orphaned Files (Check #10)

**Status:** Persistent — 7th consecutive audit.

```
ForExample/custominstr.EXMP.txt
ForExample/mastersolutionEXMP.txt
ForExample/questionEXMP.txt
ForExample/rubricEXMP.txt
ForExample/student1codeEXMP.txt
ForExample/student2codeEXMP.txt
```

Not imported from any code path (`package.json`, `api/index.js`, `App.tsx`, `vercel.json`). Move to `docs/examples/` or add to `.gitignore`. `server_reference.js` is absent from the working tree.

---

## Checks With No New Findings

| Check | Result |
|-------|--------|
| 1 — Unprotected LLM call sites | ✓ Clean — All 4 LLM call sites (`POST /evaluate`, `POST /chat`, `POST /student/chat`, `services/semanticAssessment.js`) use `buildSafePrompt()`/`buildSafeChatPrompt()` + `evaluateWithFallback()`. All provider SDK calls encapsulated in `lib/llm/providers/`. No direct Groq/Gemini/OpenAI SDK usage outside those classes. |
| 2 — Missing rate limiting | ✓ Clean — `POST /student/join-course` now has `submitRateLimit`. All POST/PUT routes with user-controlled text content are protected by one of the four defined rate limiters (`llmRateLimit`, `submitRateLimit`, `messagesRateLimit`, `uploadRateLimit`). |
| 3 (partial) — `/api/auth/dev` production gate | ✓ Clean — `api/index.js:367` returns 403 when `NODE_ENV === 'production'`. Session secret enforcement at lines 296–298 also confirmed. |
| 4 (partial) — `vite.config.ts` | ✓ Clean — No `define` block; `process.env.API_KEY` is not embedded in the client bundle. |

---

## Cumulative Open Items

| Finding | First Raised | Issue | Status |
|---------|-------------|-------|--------|
| CRITICAL: MongoDB credentials in git history; passwords not rotated | 2026-07-09 | #41 | **Open — 2nd audit cycle** |
| CRITICAL: `PUT /lecturer/assignments/:id` mass assignment — courseId injectable | 2026-09-10 | #63 | **Open — 2nd audit cycle** |
| MEDIUM: `ReviewQueue.tsx:253,418` physical `borderRight` | 2026-07-02 | — | **Open — 3rd audit** |
| MEDIUM: `ForExample/` dead fixture files | 2026-05-07 | — | **Open — 7th audit** |

---

## Recommendations (Priority Order)

1. **[IMMEDIATE]** Rotate MongoDB Atlas passwords for `Vercel-Admin-st-system-db`. This takes 2 minutes and eliminates the active credential exposure regardless of git history state. (CRITICAL-1, Issue #41)
2. **[THIS WEEK]** Fix `PUT /lecturer/assignments/:id` — whitelist body fields, exclude `courseId`. One-line patch at `api/index.js:868`. (CRITICAL-2, Issue #63)
3. **[THIS WEEK]** Run `git filter-repo` / BFG to scrub `.claude/settings.local.json` from history. Coordinate re-clones with all collaborators. (CRITICAL-1, Issue #41)
4. **[SHORT-TERM]** Fix `ReviewQueue.tsx:253,418` — replace `borderRight` with `borderInlineEnd`. (MEDIUM-1, 3rd audit)
5. **[CLEANUP]** `git rm -r ForExample/` or move to `docs/examples/`. (MEDIUM-3, 7th audit)
