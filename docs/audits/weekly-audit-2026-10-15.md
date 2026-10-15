# CHAM Agent — Weekly Security & Architecture Audit (2026-10-15)

**Auditor:** Claude (automated)  
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `vite.config.ts`  
**Prior audit:** `docs/audits/weekly-audit-2026-07-09.md` (6 CRITICAL open; 5 fixed in commit `ed1dafc` on 2026-07-14)  
**Date:** 2026-10-15  
**Last code-fixing commit:** `ed1dafc` — 2026-07-14 (3 months ago; no code changes since)

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Secrets in code | Atlas credentials remain in git history — `settings.local.json` was `git rm --cached` but not scrubbed | **Open** · Issue #41 |
| 2 | CRITICAL | Missing rate limiting | `POST /lecturer/courses/:id/approve`, `reject`, `remove-student`, `POST /lecturer/submissions/:id/extension` — no rate limit | **Open** · Issues #48, #60 |
| 3 | CRITICAL | Session/RBAC | `GET /api/users/all` (`api/index.js:396`) — any authenticated user (any role) returns full user roster | **Open** · Issue #49 |
| 4 | CRITICAL | Session/RBAC | `GET /student/course-contacts/:courseId` (`api/index.js:479`) — IDOR: no enrollment check; any student gets full member list of any course | **Open** · Issue #52 |
| 5 | CRITICAL | Session/RBAC | `PUT /lecturer/courses/:id` (`api/index.js:1106`) — `req.body` passed directly to `findOneAndUpdate`; `enrolledStudentIds`/`pendingStudentIds`/`code` injectable | **Open** · Issue #54 |
| 6 | CRITICAL | Session/RBAC | `POST /lecturer/materials` (`api/index.js:1371`) — `courseId` from body never verified to belong to the authenticated lecturer | **Open** · Issue #56 |
| 7 | CRITICAL | Missing rate limiting | `POST /lecturer/assignments/:id/release-feedback` and 3 others — no rate limit (may overlap with #2 above) | **Open** · Issue #60 |
| 8 | CRITICAL | Session/RBAC | `PUT /lecturer/assignments/:id` (`api/index.js:868`) — `req.body` passed directly; `courseId` injectable, moves assignment cross-course | **Open** · Issue #63 |
| 9 | CRITICAL | Session/RBAC | `GET /student/materials/:id/content` (`api/index.js:563`) — IDOR: `lecturer_shared` materials served without enrollment check | **Open** · Issue #67 |
| 10 | HIGH | Unsafe JSON parsing | `safeParseLLMResponse()` is the sole parse path | ✓ Clean |
| 11 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 12 | HIGH | `alert()` in UI | No raw `alert()`/`confirm()`/`prompt()` calls | ✓ Clean |
| 13 | MEDIUM | Hebrew/RTL consistency | `ReviewQueue.tsx:253,418` — `borderRight` physical property (3rd consecutive audit without fix) | Report only |
| 14 | MEDIUM | Prompt version drift | No `prompt-v1.2.0` git tag visible in this clone; AUDIT_TRACKING says done 2026-07-13 — verify tag was pushed | Report only |
| 15 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 fixture files, 8th consecutive audit without action) | Report only |

**CRITICAL open:** 9  
**HIGH open:** 0  
**No new GitHub issues opened** — all findings are already tracked in open issues.

---

## Prior Audit Resolution Verification (since 2026-07-09)

| Prior Finding | Fix Commit | Verified in Code |
|---------------|------------|------------------|
| C-1: vite.config.ts bakes API_KEY into client bundle | ed1dafc (2026-07-14) | ✅ Removed — `vite.config.ts` contains no `define` block |
| C-3: No rate limit on `POST /student/join-course` | ed1dafc (2026-07-14) | ✅ Fixed — `submitRateLimit` at `api/index.js:456` |
| C-4: IDOR — lecturer reads any course (4 routes) | ed1dafc (2026-07-14) | ✅ Fixed — `Course.findOne({_id, lecturerId})` at lines 851, 1124, 1139, 1365 |
| C-5: IDOR — student reads any course without enrollment (2 routes) | ed1dafc (2026-07-14) | ✅ Fixed — `enrolledCourseIds.includes()` at lines 1009, 553 |
| C-6: Mass assignment in `POST /lecturer/archive` | ed1dafc (2026-07-14) | ✅ Fixed — `...req.body` before `lecturerId` at line 436-439 |
| C-1 (partial): Atlas credentials in `settings.local.json` | ed1dafc (2026-07-14) | ⚠️ File untracked + in `.gitignore`; **credentials NOT in git history of this clone**. AUDIT_TRACKING says scrub still required — owner must verify remote history with `git log --all -- .claude/settings.local.json` |
| RTL: GradeBook.tsx scrollBy | ff569e3 (2026-07-13) | ✅ Fixed — RTL-aware `isRtl ? -delta : delta` at `GradeBook.tsx:42` |
| RTL: StudentAssignments.tsx text-left | ff569e3 (2026-07-13) | ✅ Fixed — no `text-left` on Hebrew text (verified by grep) |
| RTL: borderRight/paddingRight in StudentAssignments + AssignmentManager | ff569e3 (2026-07-13) | ✅ Fixed — `borderInlineEnd`/`paddingInlineEnd` at `StudentAssignments.tsx:176`, `AssignmentManager.tsx:263,417` |

---

## CRITICAL Findings Detail

---

### C-1 (CARRIED) — Atlas Credentials in Git History · Issue #41

**Severity:** Critical — Check #4  
**First raised:** 2026-07-09  
**Status:** Partially mitigated. `settings.local.json` is untracked and in `.gitignore`. File is not present on disk in this clone. No evidence of the file in this clone's git history. **Owner action required:** run `git log --all --diff-filter=A --name-only -- .claude/settings.local.json` on the authoritative remote. If commits exist containing credentials, rotate both Atlas passwords immediately and scrub history with `git filter-repo --path .claude/settings.local.json --invert-paths`. Close Issue #41 only after history scrub confirmed.

---

### C-2 (CARRIED) — Missing Rate Limits on Admin Mutation Routes · Issues #48, #60

**Severity:** Critical — Check #2  
**Status:** Open — no fix committed since issues were opened.

| Route | File | Line | Unrate-limited |
|-------|------|------|----------------|
| `POST /lecturer/courses/:id/approve` | `api/index.js` | 1310 | ✗ |
| `POST /lecturer/courses/:id/reject` | `api/index.js` | 1330 | ✗ |
| `POST /lecturer/courses/:id/remove-student` | `api/index.js` | 1349 | ✗ |
| `POST /lecturer/submissions/:id/extension` | `api/index.js` | 903 | ✗ |
| `POST /lecturer/assignments/:id/release-feedback` | `api/index.js` | 915 | ✗ |

All five endpoints accept user-controlled body parameters and write to the database with no throttle. Rapid approve/reject cycles could spam student notification increments; rapid extension writes could pollute submission records.

**Fix:** Apply `submitRateLimit` (20/15min) to all five routes as the first middleware argument.

---

### C-3 (CARRIED) — `GET /api/users/all` Exposes Full User Roster Without Role Check · Issue #49

**Severity:** Critical — Check #3  
**File:** `api/index.js:396–401`

```js
router.get('/users/all', async (req, res) => {
  if (!req.user) return res.status(401).send(); // ← auth only, no role check
  const users = await User.find({ googleId: { $ne: req.user.googleId } });
  res.json(users.map(u => ({ id: u.googleId, name: u.name, picture: u.picture })));
});
```

Any authenticated user — including a student who has not yet been enrolled in any course — can enumerate the names, Google IDs, and profile pictures of every user in the system.

**Fix:** Add `req.user.role !== 'lecturer'` check, or scope the query to users sharing a course with the requester.

---

### C-4 (CARRIED) — IDOR: `GET /student/course-contacts/:courseId` · Issue #52

**Severity:** Critical — Check #3  
**File:** `api/index.js:479–492`

```js
router.get('/student/course-contacts/:courseId', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  const course = await Course.findById(req.params.courseId); // ← no enrollment check
  ...
  res.json({ lecturer: {...}, students: students.map(u => ({ id, name, picture })) });
});
```

A student enrolled in one course can request any other course's `courseId` (6-char alphanumeric code, guessable) and receive the lecturer's profile plus the full enrolled-student roster with names, profile pictures, and Google IDs.

**Impact:** Mass PII disclosure of student identities across all courses.

**Fix:**
```js
if (!req.user.enrolledCourseIds?.includes(req.params.courseId)) {
  return res.status(403).json({ message: 'Not enrolled in this course' });
}
```

---

### C-5 (CARRIED) — Mass Assignment in `PUT /lecturer/courses/:id` · Issue #54

**Severity:** Critical — Check #3  
**File:** `api/index.js:1106–1110`

```js
router.put('/lecturer/courses/:id', uploadRateLimit, async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  const course = await Course.findOneAndUpdate(
    { _id: req.params.id, lecturerId: req.user.googleId },
    req.body,  // ← direct pass — all schema fields injectable
    { new: true }
  );
```

`req.body` is passed verbatim to `findOneAndUpdate`. A lecturer can inject `enrolledStudentIds: []` to bulk-remove all students, `pendingStudentIds: ["any-id"]` to add arbitrary waitlist entries, or `code: "XXXXXX"` to change the join code.

**Fix:** Whitelist allowed fields:
```js
const { name, description } = req.body;
const course = await Course.findOneAndUpdate(
  { _id: req.params.id, lecturerId: req.user.googleId },
  { name, description },
  { new: true }
);
```

---

### C-6 (CARRIED) — `POST /lecturer/materials` Accepts Any `courseId` · Issue #56

**Severity:** Critical — Check #3  
**File:** `api/index.js:1371–1380`

```js
router.post('/lecturer/materials', uploadRateLimit, async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  const { courseId, title, content, fileName, fileType, fileSize, folder, isVisible } = req.body;
  const material = await Material.create({
    courseId, // ← never verified to belong to req.user
    ...
    ownerId: req.user.googleId,
  });
```

A lecturer can inject materials — including arbitrary content — into any course's material list by supplying a `courseId` they don't own. Students enrolled in that course will see the material in their listing.

**Fix:**
```js
const course = await Course.findOne({ _id: courseId, lecturerId: req.user.googleId });
if (!course) return res.status(403).json({ message: 'Forbidden' });
```

---

### C-7 (CARRIED) — Mass Assignment in `PUT /lecturer/assignments/:id` · Issue #63

**Severity:** Critical — Check #3  
**File:** `api/index.js:868`

```js
const updatedAssignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
```

While the route verifies that the assignment belongs to the lecturer's course before updating, it then passes `req.body` verbatim to `findByIdAndUpdate`. A lecturer can inject `courseId: "<other-course-id>"` to re-parent the assignment to a course they do not own, or inject `unit_tests`, `masterSolution`, or any other schema field arbitrarily.

**Fix:** Whitelist allowed update fields explicitly:
```js
const { title, question, rubric, masterSolution, customInstructions, maxScore, openDate, dueDate,
        language, question_type, requires_human_review, unit_tests } = req.body;
const updatedAssignment = await Assignment.findByIdAndUpdate(req.params.id,
  { title, question, rubric, masterSolution, customInstructions, maxScore, openDate, dueDate,
    language, question_type, requires_human_review, unit_tests },
  { new: true }
);
```

---

### C-8 (CARRIED) — IDOR: `GET /student/materials/:id/content` No Enrollment Check · Issue #67

**Severity:** Critical — Check #3  
**File:** `api/index.js:563–569`

```js
router.get('/student/materials/:id/content', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  const material = await Material.findById(req.params.id).select('content fileType type ownerId courseId');
  if (!material) return res.status(404).json({ message: 'Material not found' });
  if (material.type === 'student_private' && material.ownerId !== req.user.googleId) return res.status(403).send();
  // ← lecturer_shared materials served to ANY authenticated student
  res.json({ content: material.content, fileType: material.fileType });
});
```

For `lecturer_shared` materials, the route only checks that the user is a student — no check that they are enrolled in the material's course. Any student who knows or can guess a Material `_id` can retrieve the full file content (which may include PDFs, slides, or course notes for courses they have no access to).

**Fix:**
```js
if (material.type === 'lecturer_shared') {
  if (!req.user.enrolledCourseIds?.includes(material.courseId?.toString())) {
    return res.status(403).send();
  }
}
```

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| 5 — Unsafe JSON parsing | ✓ Clean | `safeParseLLMResponse()` used in all three providers (`gemini.js`, `groq.js`, `openai.js`); `validateLLMOutput()` in `promptGuard.js` imports it. No bare `JSON.parse(llmResponse)` anywhere outside `safeParse.js` itself. |
| 6 — Missing output validation | ✓ Clean | `validateLLMOutput()` called at `api/index.js:813` (POST /evaluate) and `services/semanticAssessment.js:105` (Layer 2). Both paths block malformed output before returning to client. |
| 7 — `alert()` in UI | ✓ Clean | No live `alert()`, `confirm()`, or `prompt()` calls in any `.tsx` component. Inline modal patterns used throughout (verified by grep). |

---

## LLM Call Site Safety (Check #1)

**Clean.** All four LLM-calling paths use both `evaluateWithFallback()` AND `buildSafePrompt()`/`buildSafeChatPrompt()`:

| Route / Service | orchestrator call | prompt guard |
|-----------------|-------------------|--------------|
| `POST /api/evaluate` (`api/index.js:805`) | `evaluateWithFallback` | `buildSafePrompt` |
| `POST /api/chat` (`api/index.js:756`) | `evaluateWithFallback` | `buildSafePrompt` / `buildSafeChatPrompt` |
| `POST /student/chat` (`api/index.js:616`) | `evaluateWithFallback` | `buildSafeChatPrompt` |
| `analyzeCodeQuality` (`services/semanticAssessment.js:97`) | `evaluateWithFallback` | `buildSafePrompt` |

No direct SDK calls (Groq/Gemini/OpenAI) exist outside their respective provider files.

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8)

**Status:** Persistent — `ReviewQueue.tsx` RTL issue still unresolved on 3rd consecutive audit.

| Location | Issue |
|----------|---------|
| `ReviewQueue.tsx:253` | `borderRight: '4px solid #FF9800'` — physical property, wrong side in RTL |
| `ReviewQueue.tsx:418` | `borderRight: \`4px solid ${getPriorityColor(...)}\`` — same issue |

**Fix:** Replace both occurrences with `borderInlineEnd`:
```tsx
// line 253
style={{ borderInlineEnd: '4px solid #FF9800', paddingInlineEnd: '8px' }}
// line 418
style={{ borderInlineEnd: `4px solid ${getPriorityColor(item.priority)}`, paddingInlineEnd: '8px' }}
```

All other RTL issues from prior audits are confirmed fixed: `GradeBook.tsx:42` (RTL-aware scrollBy), `StudentAssignments.tsx:176` (`borderInlineEnd`), `AssignmentManager.tsx:263,417` (`borderInlineEnd`).

---

### MEDIUM-2 — Prompt Version Tag (Check #9)

**Status:** Unverifiable from this clone. `PROMPT_VERSION = 'v1.2.0'` (`lib/constants.js:1`). AUDIT_TRACKING says tag `prompt-v1.2.0` was created on 2026-07-13 pointing to commit `8dad476`, but `git tag` returns no results in this clone — likely the tag was created but never pushed to remote. **Action:** run `git push origin prompt-v1.2.0` to publish the tag.

---

### MEDIUM-3 — Dead Code / Orphaned Files (Check #10)

**Status:** Persistent — `ForExample/` directory untouched for 8 consecutive audits.

```
ForExample/custominstr.EXMP.txt
ForExample/mastersolutionEXMP.txt
ForExample/questionEXMP.txt
ForExample/rubricEXMP.txt
ForExample/student1codeEXMP.txt
ForExample/student2codeEXMP.txt
```

Not referenced from any code path. `server_reference.js` is absent from the working tree (confirmed deleted). Recommend `git rm -r ForExample/` or move to `docs/examples/`.

---

## Stale GitHub Issues Likely Superseded by Fixes

The following open `security` issues appear to be fixed in the current working tree. Recommend closing with `completed` reason:

| Issue | Route | Verdict |
|-------|-------|---------|
| #34 | `POST /student/join-course` — no rate limit | ✅ Fixed: `submitRateLimit` at `api/index.js:456` |
| #25 | Same as #34 (earlier report) | ✅ Duplicate — close |
| #26 | IDOR on 9 lecturer routes | ✅ Fixed in ed1dafc (C-4 + C-5) + prior fix commits |
| #33 | MongoDB credentials in tracked file | ✅ Superseded by #41 (more specific); file untracked and in `.gitignore` |

Issues #17, #29, #30, #35, #36 cover routes that were progressively fixed in audits through June 2026. Recommend spot-verifying each against the current code before closing.

---

## Cumulative Open Items

| # | Item | First Raised | GitHub Issue | Consecutive Audits Open |
|---|------|-------------|-------------|------------------------|
| 20 | Atlas credentials in git history | 2026-07-09 | #41 | 2 |
| 21 | Rate limits on 5 admin mutation routes | 2026-10-01 (est.) | #48, #60 | — |
| 22 | `/users/all` no role check — full user roster exposed | 2026-10-01 (est.) | #49 | — |
| 23 | IDOR: `/student/course-contacts/:courseId` | 2026-10-01 (est.) | #52 | — |
| 24 | Mass assignment: `PUT /lecturer/courses/:id` | 2026-10-01 (est.) | #54 | — |
| 25 | `POST /lecturer/materials` courseId unchecked | 2026-10-01 (est.) | #56 | — |
| 26 | Mass assignment: `PUT /lecturer/assignments/:id` | 2026-10-01 (est.) | #63 | — |
| 27 | IDOR: `/student/materials/:id/content` no enrollment | 2026-10-01 (est.) | #67 | — |
| 28 | RTL: `ReviewQueue.tsx:253,418` physical `borderRight` | 2026-07-02 | (medium) | 3 |
| 19 | `ForExample/` dead fixture files | 2026-05-07 | (medium) | 8 |

---

## Priority Recommendations

1. **[IMMEDIATE]** Verify Atlas credentials in remote git history — run `git log --all -- .claude/settings.local.json` on the production remote. If present, rotate credentials and scrub history. (Issue #41)
2. **[THIS WEEK]** Fix IDOR in `/student/course-contacts/:courseId` — add enrollment check at `api/index.js:480`. (Issue #52)
3. **[THIS WEEK]** Fix IDOR in `/student/materials/:id/content` — add enrollment check at `api/index.js:567`. (Issue #67)
4. **[THIS WEEK]** Fix `POST /lecturer/materials` courseId ownership check at `api/index.js:1375`. (Issue #56)
5. **[THIS WEEK]** Fix mass assignment in `PUT /lecturer/courses/:id` — whitelist fields at `api/index.js:1109`. (Issue #54)
6. **[THIS WEEK]** Fix mass assignment in `PUT /lecturer/assignments/:id` — whitelist fields at `api/index.js:868`. (Issue #63)
7. **[THIS WEEK]** Add rate limits to 5 admin mutation routes at `api/index.js:903,915,1310,1330,1349`. (Issues #48, #60)
8. **[THIS WEEK]** Add role/scope restriction to `GET /api/users/all` at `api/index.js:396`. (Issue #49)
9. **[SHORT-TERM]** Push `prompt-v1.2.0` tag to remote: `git push origin prompt-v1.2.0`.
10. **[SHORT-TERM]** Fix `ReviewQueue.tsx:253,418` — `borderRight` → `borderInlineEnd` (3rd audit without fix).
11. **[OPTIONAL]** Close stale/fixed GitHub issues: #34, #25, #26, #33. Verify and close #17, #29, #30, #35, #36.
