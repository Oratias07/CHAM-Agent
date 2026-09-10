# CHAM Agent — Weekly Security & Architecture Audit (2026-09-10)

**Auditor:** Claude (automated)
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `.env.example`, `vite.config.ts`, `.gitignore`
**Prior audit:** `docs/audits/weekly-audit-2026-07-09.md` (6 CRITICAL open, all resolved in `ed1dafc`)
**Date:** 2026-09-10

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Secrets in code | MongoDB Atlas credentials persist in git history — `settings.local.json` was untracked but `git filter-repo` scrub never ran (issue #41) | **Carried — unresolved** |
| 2 | CRITICAL | Missing rate limiting | `POST /lecturer/courses/:id/approve`, `/reject`, `/remove-student`, `POST /lecturer/submissions/:id/extension` — no rate limit (issues #48, #60) | **Carried — unresolved** |
| 3 | CRITICAL | Session/RBAC | `GET /api/users/all` — no role assertion; any authenticated user enumerates full user directory (issue #49) | **Carried — unresolved** |
| 4 | CRITICAL | Session/RBAC | `GET /student/course-contacts/:courseId` — no enrollment check; any student retrieves full roster of any course (issue #52) | **Carried — unresolved** |
| 5 | CRITICAL | Session/RBAC | `PUT /lecturer/courses/:id` passes `req.body` directly — `enrolledStudentIds`/`pendingStudentIds` injectable (issue #54) | **Carried — unresolved** |
| 6 | CRITICAL | Session/RBAC | `POST /lecturer/materials` — no `courseId` ownership check; any lecturer uploads to any course (issue #56) | **Carried — unresolved** |
| 7 | CRITICAL | Session/RBAC + mass assignment | `PUT /lecturer/assignments/:id` passes `req.body` to `findByIdAndUpdate` — `courseId` injectable across course boundaries (issue #63) | **New — this audit** |
| 8 | HIGH | Unsafe JSON parsing | All LLM response parsing uses `safeParseLLMResponse` | ✓ Clean |
| 9 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 10 | HIGH | `alert()` in UI | No raw `alert()`/`confirm()`/`prompt()` in any component | ✓ Clean |
| 11 | MEDIUM | Hebrew/RTL consistency | `ReviewQueue.tsx:253,418` — `borderRight` physical property | **Carried — 3rd audit** |
| 12 | MEDIUM | Prompt version drift | No `prompt-v1.2.0` git tag; `package.json` still at `1.1.0` | **Carried — 7th audit** |
| 13 | MEDIUM | Dead code / orphaned files | `ForExample/` — 6 example text files, unreferenced | **Carried — 7th audit** |

**CRITICAL open:** 7 (6 carried + 1 new)  
**HIGH open:** 0  
**GitHub issue opened this run:** #63

---

## Resolution Status for Issues Raised Since 2026-07-09

The code has not changed since commit `ed1dafc` (2026-07-14, the last merged security fix). All issues opened by audit runs between 2026-07-16 and 2026-09-03 remain unresolved in the codebase.

| Issue | Title | Opened | Still Present |
|-------|-------|--------|---------------|
| #41 | MongoDB credentials in git history | 2026-07-09 | ⚠ Partial — file untracked, history NOT scrubbed |
| #48 | Missing rate limits on admin mutation routes | 2026-07-16 | ❌ Unresolved |
| #49 | `GET /users/all` no role check | 2026-07-16 | ❌ Unresolved |
| #52 | IDOR: `/student/course-contacts/:courseId` | 2026-07-30 | ❌ Unresolved |
| #54 | `PUT /lecturer/courses/:id` req.body injection | 2026-08-06 | ❌ Unresolved |
| #56 | `POST /lecturer/materials` no ownership check | 2026-08-13 | ❌ Unresolved |
| #60 | Missing rate limits on admin routes (dup of #48) | 2026-09-03 | ❌ Unresolved |

The 2026-07-09 audit CRITICAL findings (C-1 through C-6) **were** fully resolved except for the git-history scrub on C-1:

| 2026-07-09 Finding | Status |
|---------------------|--------|
| C-2: `vite.config.ts` bakes API_KEY into bundle | ✓ Resolved (`define` block removed) |
| C-3: Missing rate limit on `POST /student/join-course` | ✓ Resolved (`submitRateLimit` added at line 456) |
| C-4: IDOR — lecturer reads any course | ✓ Resolved (ownership checks at lines 851, 1124, 1139, 1365) |
| C-5: IDOR — student reads any course | ✓ Resolved (enrollment checks at lines 553, 1009) |
| C-6: Mass assignment in `POST /lecturer/archive` | ✓ Resolved (server fields moved after spread, line 437) |
| C-1: MongoDB credentials in `settings.local.json` | ⚠ Partial — file untracked, `git filter-repo` scrub not run |

---

## CRITICAL Findings

---

### CRITICAL-1 (Carried) — MongoDB Atlas Credentials in Git History

**Issue:** #41  
**Status:** Partial fix only  
**First raised:** 2026-07-09  
**Urgency:** Immediate — credentials extractable from any historical clone

Fix commit `ed1dafc` explicitly noted: *"NOT fully resolved — Atlas passwords still in git history and must be rotated + scrubbed (git filter-repo)."* No subsequent commit has run the scrub.

#### Required actions (still outstanding)

1. Rotate the MongoDB Atlas credentials that appeared in `.claude/settings.local.json` — assume compromised.
2. Run `git filter-repo --path .claude/settings.local.json --invert-paths` and force-push.
3. Notify all collaborators to re-clone.

---

### CRITICAL-2 (Carried) — Missing Rate Limits on Enrollment Mutation Routes

**Issues:** #48, #60  
**Status:** Unresolved  
**First raised:** 2026-07-16

| Route | File | Line |
|-------|------|------|
| `POST /lecturer/courses/:id/approve` | `api/index.js` | 1310 |
| `POST /lecturer/courses/:id/reject` | `api/index.js` | 1330 |
| `POST /lecturer/courses/:id/remove-student` | `api/index.js` | 1349 |
| `POST /lecturer/submissions/:id/extension` | `api/index.js` | 903 |

**Fix:** Add `submitRateLimit` to each route as the second argument.

---

### CRITICAL-3 (Carried) — `GET /users/all` No Role Assertion

**Issue:** #49  
**Status:** Unresolved  
**First raised:** 2026-07-16

```js
// api/index.js:396-401
router.get('/users/all', async (req, res) => {
  if (!req.user) return res.status(401).send();  // auth only — no role check
  const users = await User.find({ googleId: { $ne: req.user.googleId } });
  res.json(users.map(u => ({ id: u.googleId, name: u.name, picture: u.picture })));
});
```

Any authenticated user enumerates all user names, Google IDs, and profile pictures.

**Fix:** Assert `req.user.role` or scope the query to users in the caller's enrolled courses.

---

### CRITICAL-4 (Carried) — IDOR on `GET /student/course-contacts/:courseId`

**Issue:** #52  
**Status:** Unresolved  
**First raised:** 2026-07-30

```js
// api/index.js:479-491
router.get('/student/course-contacts/:courseId', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  const course = await Course.findById(req.params.courseId);  // ← no enrollment check
  // Returns full roster (lecturer + all enrolled students)
  ...
});
```

**Fix:** Add `if (!req.user.enrolledCourseIds.includes(req.params.courseId)) return res.status(403).send();` before the lookup.

---

### CRITICAL-5 (Carried) — `PUT /lecturer/courses/:id` Mass Assignment

**Issue:** #54  
**Status:** Unresolved  
**First raised:** 2026-08-06

```js
// api/index.js:1109
const course = await Course.findOneAndUpdate(
  { _id: req.params.id, lecturerId: req.user.googleId },
  req.body,   // ← all body fields written, incl. enrolledStudentIds/pendingStudentIds
  { new: true }
);
```

**Fix:** Whitelist updatable fields (e.g. `{ name, description }`).

---

### CRITICAL-6 (Carried) — `POST /lecturer/materials` No Course Ownership Check

**Issue:** #56  
**Status:** Unresolved  
**First raised:** 2026-08-13

```js
// api/index.js:1371-1380
router.post('/lecturer/materials', uploadRateLimit, async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  const { courseId, ... } = req.body;
  const material = await Material.create({ courseId, ..., ownerId: req.user.googleId, type: 'lecturer_shared' });
  ...
});
```

No check that `courseId` belongs to the authenticated lecturer.

**Fix:** `const course = await Course.findOne({ _id: courseId, lecturerId: req.user.googleId }); if (!course) return res.status(403).json({ message: 'Forbidden' });`

---

### CRITICAL-7 (New) — `PUT /lecturer/assignments/:id` Mass Assignment — `courseId` Injectable Across Courses

**Issue:** #63 (opened this run)  
**Status:** New finding  
**First raised:** 2026-09-10

```js
// api/index.js:857-869
router.put('/lecturer/assignments/:id', uploadRateLimit, async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).send();

  // Ownership check uses the CURRENT courseId — not the one being written
  const course = await Course.findOne({ _id: assignment.courseId, lecturerId: req.user.googleId });
  if (!course) return res.status(403).json({ message: 'Forbidden' });

  // req.body passed through unfiltered — caller controls all fields incl. courseId
  const updatedAssignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updatedAssignment);
});
```

#### Exploit

1. Lecturer A owns `assignment-X` in `course-A`. Lecturer B owns `course-B`.
2. Lecturer A sends `PUT /lecturer/assignments/assignment-X` with `{ "courseId": "<course-B-id>", ... }`.
3. Ownership check passes (assignment still lives in course-A at check time).
4. `findByIdAndUpdate` writes the new `courseId`, moving assignment-X into course-B.
5. Students enrolled in course-B now see Lecturer A's assignment (rubric, master solution, unit tests) via `GET /student/courses/course-B/assignments`.
6. Lecturer B's submission queue and gradebook are polluted.

#### Fix

```js
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
```

Also apply a field whitelist to `POST /lecturer/assignments` (line 844, `Assignment.create(req.body)`) to prevent `_id` injection on creation.

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| 5 — Unsafe JSON parsing | ✓ Clean | All three provider classes call `safeParseLLMResponse(content)`. No bare `JSON.parse(llmResponse)` outside `lib/llm/safeParse.js`. |
| 6 — Missing output validation | ✓ Clean | `validateLLMOutput()` at `api/index.js:813` and `services/semanticAssessment.js:105`. |
| 7 — `alert()` in UI | ✓ Clean | No live `alert()`, `confirm()`, or `prompt()` calls in any component. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8) — 3rd Audit

All prior RTL issues were resolved in commit `ff569e3`. Two locations remain:

| Location | Issue | Audit count |
|----------|-------|-------------|
| `ReviewQueue.tsx:253` | `borderRight: '4px solid #FF9800'` | 3rd consecutive |
| `ReviewQueue.tsx:418` | `borderRight: \`4px solid ${getPriorityColor(...)}\`` | 3rd consecutive |

**Fix:** Replace with `borderInlineEnd` in both locations.

---

### MEDIUM-2 — Prompt Version Drift (Check #9) — 7th Audit

`lib/constants.js:1`: `PROMPT_VERSION = 'v1.2.0'`. No `prompt-v1.2.0` git tag. `package.json` at `1.1.0`.

**Fix:** `git tag prompt-v1.2.0 <commit>` + bump `package.json` to `1.2.0`.

---

### MEDIUM-3 — Dead Code / Orphaned Files (Check #10) — 7th Audit

`ForExample/` contains 6 unreferenced example text files. `server_reference.js` is absent.

**Fix:** Move `ForExample/` to `docs/examples/` or add to `.gitignore`.

---

## Checks With No New Findings

| Check | Result |
|-------|--------|
| 1 — Unprotected LLM call sites | ✓ Clean — All LLM call sites use both `buildSafePrompt()`/`buildSafeChatPrompt()` and `evaluateWithFallback()`. No direct SDK calls outside provider classes. |
| 3 (partial) — `/auth/dev` production guard | ✓ Clean — Returns 403 in production (`api/index.js:367`). |
| Provider key loading | ✓ Clean — All providers read keys from environment variables only. |
| `.env.example` | ✓ Clean — Placeholder values only. |
| `vite.config.ts` | ✓ Clean — `define` block removed. |

---

## Cumulative Open Items

| Finding | First Raised | Audits Unresolved | GitHub Issue |
|---------|-------------|-------------------|--------------|
| CRITICAL: MongoDB credentials in git history | 2026-07-09 | 9 | #41 |
| CRITICAL: Missing rate limits on admin mutation routes | 2026-07-16 | 8 | #48, #60 |
| CRITICAL: `GET /users/all` no role assertion | 2026-07-16 | 8 | #49 |
| CRITICAL: IDOR `/student/course-contacts/:courseId` | 2026-07-30 | 7 | #52 |
| CRITICAL: `PUT /lecturer/courses/:id` mass assignment | 2026-08-06 | 6 | #54 |
| CRITICAL: `POST /lecturer/materials` no ownership check | 2026-08-13 | 4 | #56 |
| CRITICAL: `PUT /lecturer/assignments/:id` mass assignment | 2026-09-10 | 1 (new) | #63 |
| MEDIUM: `ReviewQueue.tsx:253,418` physical `borderRight` | 2026-07-02 | 3 | — |
| MEDIUM: Prompt version tag missing | 2026-05-07 | 7 | — |
| MEDIUM: `ForExample/` dead files | 2026-05-07 | 7 | — |

---

## Priority Recommendations

1. **[IMMEDIATE]** Rotate MongoDB Atlas credentials (#41). Run `git filter-repo` and force-push.
2. **[HIGH PRIORITY]** Fix `PUT /lecturer/assignments/:id` (line 868) — whitelist fields (#63, new this week).
3. **[HIGH PRIORITY]** Fix `POST /lecturer/materials` — add courseId ownership check (line 1371, #56).
4. **[HIGH PRIORITY]** Fix `PUT /lecturer/courses/:id` — whitelist fields (line 1109, #54).
5. **[HIGH PRIORITY]** Fix `GET /student/course-contacts/:courseId` — add enrollment check (line 479, #52).
6. **[THIS SPRINT]** Fix `GET /users/all` — add role check or scope to caller's courses (#49).
7. **[THIS SPRINT]** Add rate limits to 4 admin mutation routes (#48, #60).
8. **[CLEANUP]** Fix `ReviewQueue.tsx:253,418` `borderRight` → `borderInlineEnd`.
9. **[CLEANUP]** `git tag prompt-v1.2.0`. Align `package.json` to `1.2.0`.
10. **[OPTIONAL]** Move `ForExample/` to `docs/examples/`.
