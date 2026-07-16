# CHAM Agent — Audit Item Tracking

Consolidated, deduplicated tracker for actionable items from the weekly security & architecture audits.
Purpose: let future audit runs skip items already resolved, and record deliberate won't-fix decisions.

**Last reconciled:** 2026-07-16 (verified against working tree of `main`, commit `ed1dafc`).
**Audits covered in this reconciliation:** all audits through `weekly-audit-2026-07-16`.

Status legend: ✅ Done · ❌ Open · ⚠️ Won't fix (with rationale)

> ⚠️ **2 CRITICAL items OPEN as of 2026-07-16 audit** (items 26–27 below).

## Security (CRITICAL) — OPEN (2026-07-16 audit)

| # | Item | Source audit | Status | Evidence (current code) |
|---|------|--------------|--------|-------------------------|
| 26 | Missing rate limits on 4 enrollment mutation routes: `POST /lecturer/courses/:id/approve`, `/reject`, `/remove-student`, `/lecturer/submissions/:id/extension` | 2026-07-16 | ❌ Open | No rate limit middleware on any of these routes (`api/index.js:1310`, `1330`, `1349`, `903`). IDOR ownership checks are present. Issue opened 2026-07-16. |
| 27 | `GET /api/users/all` accessible to authenticated users with `role: null` — any new sign-up can enumerate all user profiles before choosing a role | 2026-07-16 | ❌ Open | `api/index.js:396` — only checks `req.user`, no `req.user.role` assertion. Issue opened 2026-07-16. |

## Security (CRITICAL) — all resolved through 2026-07-09 (commit `ed1dafc`)

All 6 CRITICAL items from the 2026-07-09 audit are verified closed in commit `ed1dafc` (2026-07-16 audit):

| # | Item | Source audit | Status | Evidence (current code, verified 2026-07-16) |
|---|------|--------------|--------|----------------------------------------------|
| 20 | Live MongoDB Atlas creds in `.claude/settings.local.json` | 2026-07-09 | ✅ Resolved | File not on disk, not in git index, not in any commit (`git log --all` returns empty for this path). `.gitignore` now excludes it. **Credential rotation in Atlas still recommended but unverifiable from codebase.** Issues #41, #33 → close. |
| 21 | `API_KEY` baked into client JS bundle via `vite.config.ts` | 2026-07-09 | ✅ Fixed | `vite.config.ts` has no `define` block; no `process.env.API_KEY` in any TS/TSX file. Issue #42 → close. |
| 22 | No rate limit on `POST /student/join-course` | 2026-07-02 (carried × 2) | ✅ Fixed | `submitRateLimit` at `api/index.js:456`. Issues #43, #39, #34, #25 → close. |
| 23 | IDOR — 4 lecturer read-routes, no ownership check | 2026-07-09 | ✅ Fixed | `Course.findOne({ _id, lecturerId })` at lines `:851`, `:1124`, `:1139`, `:1365`. Issues #44, #36, #26 → close. |
| 24 | IDOR — 2 student read-routes, no enrollment check | 2026-07-09 | ✅ Fixed | `enrolledCourseIds.includes()` at lines `:1009`, `:553`. Issue #45 → close. |
| 25 | Mass assignment `POST /lecturer/archive` — `lecturerId` overridable | 2026-07-09 | ✅ Fixed | `...req.body` precedes `lecturerId: req.user.googleId` at `api/index.js:436-440`. Issue #46 → close. |

## Security (CRITICAL) — historical (all resolved through 2026-06-04)

| # | Item | Source audit | Status | Evidence (current code) |
|---|------|--------------|--------|-------------------------|
| 1 | Rate limit on `POST /grades/save` | 2026-05-21, 06-04 | ✅ Done | `api/index.js:694` `uploadRateLimit`. Issue #3 → close. |
| 2 | IDOR `GET /teacher/review/:submissionId` | 2026-06-04 | ✅ Done | `api/index.js:1230-1231` course-ownership check. Issue #35, #29 → close. |
| 3 | IDOR `POST /teacher/submit-review` | 2026-06-04 | ✅ Done | `api/index.js:1260-1261`. |
| 4 | IDOR `approve`/`reject`/`remove-student` (IDOR only) | 2026-06-04 | ✅ Done | `api/index.js:1315-1316`, `1335-1336`, `1354-1355`. Issues #36, #30 → close. |
| 5 | IDOR `POST /lecturer/submissions/:id/extension` (IDOR only) | 2026-06-04 | ✅ Done | `api/index.js:908-910`. Issue #30 → close. |
| 6 | IDOR `GET /lecturer/courses/:id/all-submissions` | 2026-06-04 | ✅ Done | `api/index.js:1158-1160`. |
| 7 | IDOR on 9 assignment/material routes | 2026-05-21 | ✅ Done | `api/index.js:833-895`, `910-954`, `1371-1398`. Issue #26 → close. |
| 8 | Chat routes must use `buildSafePrompt`/`buildSafeChatPrompt` | 2026-05-07, 05-14 | ✅ Done | `api/index.js:609`, `733`, `744`, `796`. Issue #17 → close. |
| 9 | Remove premature Gemini-key check in `semanticAssessment.js` | 2026-05-07 | ✅ Done | Guard removed; reaches orchestrator. |
| 10 | Rate limits on update-role / courses POST+PUT / submit-review | 2026-05-07 | ✅ Done | `api/index.js:384`, `1098`, `1106`, `1247`. Issue #17 → close. |
| 11 | `POST /evaluate` lecturer-only | 2026-05-07 | ✅ Done | `api/index.js:771` role check. |
| 12 | `POST /user/update-role` block re-assignment | 2026-05-07 | ✅ Done | `api/index.js:387` enum + `390` role-set guard. |
| 13 | Missing rate limit on `POST /lecturer/assignments/:id/submit-manual` | 2026-04-17 | ✅ Done | `api/index.js:950` `llmRateLimit`. Issue #2 → close. |
| 14 | Direct LLM SDK calls in `server_reference.js` | 2026-04-17 | ✅ Done | `server_reference.js` deleted from repo. Issue #1 → close. |

## MEDIUM / housekeeping

| # | Item | Source audit | Status | Evidence / notes |
|---|------|--------------|--------|------------------|
| 15 | `evaluateSubmission` dead export removed | 2026-05-07 | ✅ Done | Absent from `services/chatService.ts`. |
| 16 | `GradeBook.tsx` RTL `scrollBy.left` | 2026-04-17 → 06-04 | ✅ Done | `components/GradeBook.tsx:38-43` RTL-aware `scrollBy` (fixed 2026-07-13). |
| 17 | `StudentAssignments.tsx` `text-left` → `text-end` | 2026-05-21 | ✅ Done | `components/StudentAssignments.tsx:134` (fixed 2026-07-13). |
| 18 | Physical `borderRight`/`paddingRight` → logical props | 2026-04-30 → 06-04 | ✅ Done | `StudentAssignments.tsx:176`, `AssignmentManager.tsx:263,417` → `borderInlineEnd`/`paddingInlineEnd` (fixed 2026-07-13). |
| 19 | Create git tag `prompt-v1.2.0` | 2026-05-07 → 06-04 | ✅ Done | Tag `prompt-v1.2.0` → `8dad476` (created 2026-07-13). |
| 20 | Align `package.json` to `PROMPT_VERSION` | 2026-05-07 → 06-04 | ⚠️ Won't fix | App version (`2.1.1`) and prompt-template version (`v1.2.0`) are intentionally decoupled. **Drop from future audits.** |
| 21 | `ForExample/` dead fixture files | 2026-05-07 → present (8 audits) | ❌ Open | 6 `.txt` files, not referenced from entry points. Deletion awaits approval. |
| 22 | `ReviewQueue.tsx:253` — `borderRight` should be `borderInlineEnd` | 2026-07-16 | ❌ Open | Inline style on deductions panel. One-line fix: `borderInlineEnd: '4px solid #FF9800'`. |

## Notes for future audit runs

- **Items 26–27 are OPEN CRITICAL (2026-07-16 audit).** Item 26 = add `uploadRateLimit` to approve/reject/remove-student/extension. Item 27 = add `!req.user.role` guard to `GET /api/users/all`.
- Items 1–25 are settled; do not re-flag unless the referenced code regresses.
- Item 20 is a deliberate won't-fix — stop recommending `package.json` ↔ `PROMPT_VERSION` alignment.
- Item 21 (`ForExample/` dead files) remains open, cosmetic only, not security.
- Item 22 (`ReviewQueue.tsx:253` borderRight) is a one-line RTL fix.
- **GitHub issue backlog:** Issues #1–#46 are all verified fixed. They should be closed on GitHub. See `weekly-audit-2026-07-16.md` §GitHub Issue Backlog for the full list.
