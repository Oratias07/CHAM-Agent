# CHAM Agent — Weekly Security & Architecture Audit (2026-07-16)

**Auditor:** Claude (automated)
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `vite.config.ts`, `.gitignore`, `tests/`
**Prior audit:** `docs/audits/weekly-audit-2026-07-09.md` (6 CRITICAL open)
**Date:** 2026-07-16

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Missing rate limiting | 4 enrollment mutation routes have no rate limit: `POST /lecturer/courses/:id/approve`, `/reject`, `/remove-student`, `/lecturer/submissions/:id/extension` | **Open (new)** |
| 2 | CRITICAL | Session/RBAC regression | `GET /api/users/all` (`api/index.js:396`) has no role assertion — any authenticated user (including `role: null`) can enumerate all user profiles | **Open (new)** |
| 3 | HIGH | Unsafe JSON parsing | All LLM response parsing uses `safeParseLLMResponse` via `validateLLMOutput` | ✓ Clean |
| 4 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths (`/evaluate:813`, `semanticAssessment.js:105`) | ✓ Clean |
| 5 | HIGH | `alert()` in UI | No raw `alert()`/`confirm()`/`prompt()` calls in production components | ✓ Clean |
| 6 | MEDIUM | Hebrew/RTL consistency | `ReviewQueue.tsx:253` — `borderRight` is a physical property; should be `borderInlineEnd` | Report only |
| 7 | MEDIUM | Prompt version drift | `PROMPT_VERSION = 'v1.2.0'`, tag `prompt-v1.2.0` present — no drift | ✓ Clean |
| 8 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 `.txt` files) — unresolved from prior audits | Report only |

**CRITICAL open:** 2 (new)
**HIGH open:** 0
**Prior audit CRITICAL items verified fixed:** 6 (see §Prior Audit section)

---

## Prior Audit Resolution Status (2026-07-09)

All 6 CRITICAL items from the 2026-07-09 audit are verified fixed in the current working tree (commit `ed1dafc`):

| Previous Item | Fix verification |
|--------------|-----------------|
| C-1 (#41): MongoDB Atlas credentials in `.claude/settings.local.json` | File not on disk, not in git index, not in any commit (`git log --all -- .claude/settings.local.json` empty). `.gitignore` now excludes it. ✅ Resolved — credentials were never committed. |
| C-2 (#42): `vite.config.ts` bakes `API_KEY` into client bundle | `vite.config.ts` contains no `define` block and no `process.env.API_KEY` reference. ✅ Fixed |
| C-3 (#43): No rate limit on `POST /student/join-course` | `api/index.js:456` — `submitRateLimit` present. ✅ Fixed |
| C-4 (#44): IDOR on 4 lecturer read-routes | All 4 routes now use `Course.findOne({ _id, lecturerId: req.user.googleId })` ownership check. ✅ Fixed |
| C-5 (#45): IDOR on 2 student read-routes | Both routes check `req.user.enrolledCourseIds.includes(courseId)`. ✅ Fixed |
| C-6 (#46): Mass assignment in `POST /lecturer/archive` | `...req.body` now precedes `lecturerId: req.user.googleId` so the server field wins. ✅ Fixed |

**GitHub issues #42–#46 and duplicates #25, #34, #39, #33, #36, #35, #30, #29, #26, #17, #3, #2, #1 are all verified fixed.** These issues remain open on GitHub and should be closed.

---

## CRITICAL Findings

---

### CRITICAL-1 — Missing Rate Limits on 4 Enrollment Mutation Routes (Check #2)

**Severity:** Critical
**Check:** Missing rate limiting (Check #2)
**Status:** Open — new finding
**First raised:** 2026-07-16
**GitHub Issue:** See newly opened issue

#### Affected Routes

| Route | File | Line | Body content |
|-------|------|------|-------------|
| `POST /lecturer/courses/:id/approve` | `api/index.js` | 1310 | `{ studentId }` |
| `POST /lecturer/courses/:id/reject` | `api/index.js` | 1330 | `{ studentId }` |
| `POST /lecturer/courses/:id/remove-student` | `api/index.js` | 1349 | `{ studentId }` |
| `POST /lecturer/submissions/:id/extension` | `api/index.js` | 903 | `{ extensionUntil }` |

#### Evidence

```js
// api/index.js:1310 — no rate limit
router.post('/lecturer/courses/:id/approve', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  // IDOR fixed: Course.findOne({ _id, lecturerId }) ✓
  // Rate limit: ❌ missing
  await Course.updateOne({ _id: req.params.id }, { $pull: { pendingStudentIds: studentId }, $addToSet: { enrolledStudentIds: studentId } });
  await User.updateOne({ googleId: studentId }, { $addToSet: { enrolledCourseIds: req.params.id }, $inc: { unseenApprovals: 1 } });
});

// api/index.js:903 — no rate limit
router.post('/lecturer/submissions/:id/extension', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  // Body: { extensionUntil } — user-controlled date string
  // Rate limit: ❌ missing
});
```

#### Historical context

Previous audits (#26, #30, #36) flagged these routes for **IDOR** (no ownership check). The IDOR was fixed in prior commits. Rate limiting was never added as part of those fixes; that gap was not separately tracked and is a new finding.

#### Impact

A compromised or malicious lecturer account can:
1. Rapidly approve/reject hundreds of enrollment requests in rapid succession — generating spurious notifications for enrolled students (`$inc: { unseenApprovals: 1 }`) and modifying course rosters at high velocity.
2. Repeatedly update extension dates for a submission in a tight loop, potentially causing conflicting state if the record is read mid-update.
3. Each request triggers at minimum 2 MongoDB writes (course + user update for approve; or course + WaitlistHistory for reject).

The ownership check (`Course.findOne({ _id, lecturerId })`) limits the blast radius to the lecturer's own courses, but does not bound the rate of legitimate writes.

#### Required Fix

Apply `uploadRateLimit` (20 req/hr) to all four routes:

```js
// api/index.js:1310
router.post('/lecturer/courses/:id/approve', uploadRateLimit, async (req, res) => {

// api/index.js:1330
router.post('/lecturer/courses/:id/reject', uploadRateLimit, async (req, res) => {

// api/index.js:1349
router.post('/lecturer/courses/:id/remove-student', uploadRateLimit, async (req, res) => {

// api/index.js:903
router.post('/lecturer/submissions/:id/extension', uploadRateLimit, async (req, res) => {
```

---

### CRITICAL-2 — `GET /api/users/all` Exposes Full User Roster Without Role Assertion (Check #3)

**Severity:** Critical
**Check:** Session/RBAC regressions (Check #3)
**Status:** Open — new finding
**First raised:** 2026-07-16
**GitHub Issue:** See newly opened issue

#### Affected Route

| Route | File | Line | Auth check |
|-------|------|------|-----------|
| `GET /api/users/all` | `api/index.js` | 396 | Auth only — no role check |

#### Evidence

```js
// api/index.js:396-401
router.get('/users/all', async (req, res) => {
  if (!req.user) return res.status(401).send();           // ← authentication only
  // ← no req.user.role check of any kind
  await connectDB();
  const users = await User.find({ googleId: { $ne: req.user.googleId } });
  res.json(users.map(u => ({ id: u.googleId, name: u.name, picture: u.picture })));
});
```

#### Impact

A user who has authenticated via Google OAuth but has not yet chosen a role (`req.user.role === null` — the state shown to new sign-ups before the `RoleSelector` screen) can call `GET /api/users/all` and receive the name, profile picture, and `googleId` of every registered user in the system.

Although the UI prevents role-less users from reaching the messaging feature (which is the intended consumer of this endpoint), the API has no such guard. A script can authenticate via the OAuth flow, skip the role assignment step, and immediately enumerate all registered users.

**Data exposed:** `googleId` (used as a stable user identifier across the entire system), full display name, profile picture URL. In an academic context, this constitutes PII disclosure — specifically, the ability to enumerate all students and lecturers registered on the platform.

#### Required Fix

Restrict access to authenticated users with an assigned role (either role is acceptable, since both lecturers and students need the contact picker):

```js
// api/index.js:396
router.get('/users/all', async (req, res) => {
  if (!req.user || !req.user.role) return res.status(401).send();
  // ...
});
```

Alternatively, restrict to enrolled students and lecturers more precisely, but `!req.user.role` is the minimal safe guard.

---

## HIGH Findings

None. All three HIGH checks are clean this cycle.

| Check | Result |
|-------|--------|
| Unsafe JSON parsing (Check #5) | All LLM responses parsed via `safeParseLLMResponse` → `validateLLMOutput`. No bare `JSON.parse(llmResponse)` in production code. |
| Missing output validation (Check #6) | `/evaluate` calls `validateLLMOutput` at line 813. CHAM Layer 2 calls it at `semanticAssessment.js:105`. Chat endpoints return free text and are exempt. |
| `alert()` in UI (Check #7) | All occurrences in component files are comments documenting what was *replaced*. No actual `alert()`, `confirm()`, or `prompt()` calls in production components. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — `ReviewQueue.tsx:253` Physical `borderRight` in RTL UI

**File:** `components/ReviewQueue.tsx`
**Line:** 253

```tsx
// ReviewQueue.tsx:253 — physical property, not RTL-aware
<div style={{
  borderRight: '4px solid #FF9800',  // ← should be borderInlineEnd
  background: '#1a1a2e',
  ...
}}>
```

**Fix:** Replace `borderRight` with `borderInlineEnd`. The component renders with `dir="rtl"` at line 247, so this is visible on the deductions panel left-hand side in RTL layout.

Note: `direction: 'ltr'` at line 265 (inside the code quote block) is intentional and correct — code is always LTR.

---

### MEDIUM-2 — `ForExample/` Directory Contains 6 Orphaned Fixture Files

**Ongoing from prior audits (items 19 in AUDIT_TRACKING.md — 7th consecutive audit).**

6 plain-text fixture files under `ForExample/` are not referenced from `api/index.js`, `App.tsx`, `package.json`, or `vercel.json`. No action required this cycle — cosmetic only, needs deletion approval.

---

### MEDIUM-3 — MongoDB Credential Rotation Status Unverifiable

**Carry-forward context only.** Issue #41/#33 (MongoDB credentials in `.claude/settings.local.json`) is resolved from a git-hygiene perspective — the file was never committed, is removed from the index, and is now in `.gitignore`. However, the credentials (`Vercel-Admin-st-system-db`) visible in the file before removal should have been rotated in MongoDB Atlas. This cannot be verified from the codebase; confirm with the Atlas console.

---

### MEDIUM-4 — Unprotected LLM Call Sites (Check #1) — CLEAN

All LLM calls flow through `LLMOrchestrator.evaluateWithFallback()`:
- `api/index.js:617`, `757`, `805` (student chat, lecturer chat, evaluate)
- `services/semanticAssessment.js:97`

All user-controlled input is wrapped through `buildSafePrompt()` or `buildSafeChatPrompt()` before reaching the orchestrator. Provider files in `lib/llm/providers/` are the intended direct callers. No violations.

---

### MEDIUM-5 — PROMPT_VERSION Drift (Check #9) — CLEAN

`lib/constants.js` exports `PROMPT_VERSION = 'v1.2.0'`. Git tag `prompt-v1.2.0` exists. No changes to prompt templates in `lib/llm/` or `services/semanticAssessment.js` since the last tagged version. No bump needed.

---

## GitHub Issue Backlog — Status Update

The following previously-opened security issues are verified fixed in commit `ed1dafc` and its predecessors, and should be closed on GitHub:

| Issue | Title | Fixed in |
|-------|-------|---------|
| #46 | Mass assignment in POST /lecturer/archive | `ed1dafc` |
| #45 | IDOR: students access any course without enrollment | `ed1dafc` |
| #44 | IDOR: 4 lecturer read-routes no ownership check | `ed1dafc` |
| #43 | Missing rate limit on POST /student/join-course | `ed1dafc` |
| #42 | vite.config.ts bakes API_KEY into client bundle | `ed1dafc` |
| #41 | MongoDB Atlas credentials in settings.local.json | File never committed; `ed1dafc` adds to .gitignore |
| #39, #34, #25 | (Duplicates of join-course rate limit) | `ed1dafc` |
| #36, #30, #26 | IDOR on enrollment mutation routes | Prior commits |
| #35, #29 | IDOR on teacher review routes | Prior commits |
| #33 | MongoDB credentials (older report) | See #41 |
| #17 | Missing rate limits on update-role/courses/submit-review | Prior commits |
| #3 | RBAC bypass on POST /grades/save | Prior commits |
| #2 | Missing rate limit on submit-manual | Prior commits |
| #1 | Direct LLM SDK calls in server_reference.js | File deleted |

---

## Audit Checklist

| Check | Result |
|-------|--------|
| 1. Unprotected LLM call sites | ✅ Clean |
| 2. Missing rate limiting | ❌ 4 routes (CRITICAL-1) |
| 3. Session/RBAC regressions | ❌ /api/users/all (CRITICAL-2) |
| 4. Secrets in code | ✅ Clean (no keys in tracked files; dev session secret fallback is non-sensitive and production-guarded) |
| 5. Unsafe JSON parsing | ✅ Clean |
| 6. Missing output validation | ✅ Clean |
| 7. alert() in UI | ✅ Clean |
| 8. Hebrew/RTL consistency | ⚠️ ReviewQueue.tsx:253 (MEDIUM) |
| 9. Prompt version drift | ✅ Clean (v1.2.0, tagged) |
| 10. Dead code / orphaned files | ⚠️ ForExample/ (MEDIUM, ongoing) |
