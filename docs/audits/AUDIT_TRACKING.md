# CHAM Agent — Audit Item Tracking

Consolidated, deduplicated tracker for actionable items from the weekly security & architecture audits.
Purpose: let future audit runs skip items already resolved, and record deliberate won't-fix decisions.

**Last reconciled:** 2026-10-15 (verified against working tree of `main`, commit `ed1dafc` — last code-fix commit 2026-07-14; no code changes since).
**Audits covered in this reconciliation:** `weekly-audit-2026-05-07`, `-05-14`, `-05-21`, `-06-04`, `-07-02`, `-07-09`, `-10-15`.

Status legend: ✅ Done · ❌ Open · ⚠️ Won't fix (with rationale)

> ⚠️ **9 CRITICAL items OPEN as of 2026-10-15 audit.** Items 20–25 from the 2026-07-09 audit: 20 remains partially open; 21–25 confirmed fixed in code (committed `ed1dafc` 2026-07-14). Items 26–33 are new GitHub issues opened between 2026-07-14 and 2026-10-15, all verified still unresolved in the working tree.

## Security (CRITICAL) — OPEN (verified from source 2026-10-15)

| # | Item | Source audit | Status | Evidence (current code, verified 2026-10-15) |
|---|------|--------------|--------|----------------------------------------------|
| 20 | Live MongoDB Atlas creds — git history scrub | 2026-07-09 | ❌ Open (status unclear) | File untracked, not on disk, not in this clone's git history. AUDIT_TRACKING from 2026-07-14 says scrub still required. **Owner must verify remote history with `git log --all -- .claude/settings.local.json`; rotate credentials if found.** Issue #41 |
| 26 | Missing rate limits on `POST /lecturer/courses/:id/approve`, `reject`, `remove-student`, `POST /lecturer/submissions/:id/extension`, `POST /lecturer/assignments/:id/release-feedback` | 2026-10-01 (est.) | ❌ Open | No rate-limit middleware on any of these 5 routes at `api/index.js:903,915,1310,1330,1349`. Issues #48, #60 |
| 27 | `GET /api/users/all` — any authenticated user enumerates full user roster | 2026-10-01 (est.) | ❌ Open | `api/index.js:396` — only `if (!req.user)` check; no role restriction. Issue #49 |
| 28 | IDOR: `GET /student/course-contacts/:courseId` — no enrollment check | 2026-10-01 (est.) | ❌ Open | `api/index.js:479` — no `enrolledCourseIds.includes()`. Returns lecturer + all enrolled students for any courseId. Issue #52 |
| 29 | Mass assignment: `PUT /lecturer/courses/:id` passes `req.body` directly | 2026-10-01 (est.) | ❌ Open | `api/index.js:1109` — `req.body` verbatim to `findOneAndUpdate`; `enrolledStudentIds`, `pendingStudentIds`, `code` injectable. Issue #54 |
| 30 | `POST /lecturer/materials` — `courseId` not verified to belong to lecturer | 2026-10-01 (est.) | ❌ Open | `api/index.js:1371–1380` — no `Course.findOne({ _id: courseId, lecturerId })` guard. Issue #56 |
| 31 | Mass assignment: `PUT /lecturer/assignments/:id` passes `req.body` directly | 2026-10-01 (est.) | ❌ Open | `api/index.js:868` — `req.body` verbatim to `findByIdAndUpdate`; `courseId` injectable cross-course. Issue #63 |
| 32 | IDOR: `GET /student/materials/:id/content` — no enrollment check for `lecturer_shared` | 2026-10-01 (est.) | ❌ Open | `api/index.js:563` — only `student_private` check; any authenticated student retrieves any `lecturer_shared` material. Issue #67 |

Full detail: `docs/audits/weekly-audit-2026-10-15.md`. HIGH checks (JSON parsing, output validation, `alert()` in UI) all clean.

## Security (CRITICAL) — FIXED (2026-07-09 audit items, committed ed1dafc 2026-07-14)

| # | Item | Source audit | Status | Evidence (verified 2026-10-15) |
|---|------|--------------|--------|--------------------------------|
| 21 | `API_KEY` baked into client JS bundle via `vite.config.ts` | 2026-07-09 | ✅ Fixed | No `define` block in `vite.config.ts`; no `process.env.API_KEY` in TSX/TS. Issue #42 |
| 22 | No rate limit on `POST /student/join-course` | 2026-07-02 | ✅ Fixed | `submitRateLimit` at `api/index.js:456`. Issues #34, #43 |
| 23 | IDOR — lecturer reads any course (4 routes) | 2026-07-09 | ✅ Fixed | `Course.findOne({_id, lecturerId})` at lines 851, 1124, 1139, 1365. Issue #44 |
| 24 | IDOR — student reads any course without enrollment (2 routes) | 2026-07-09 | ✅ Fixed | `enrolledCourseIds.includes()` at lines 1009, 553. Issue #45 |
| 25 | Mass assignment in `POST /lecturer/archive` — `lecturerId` overridable | 2026-07-09 | ✅ Fixed | `...req.body` before server fields at `api/index.js:436-439`. Issue #46 |

## Security (CRITICAL) — historical (all resolved through 2026-06-04)

| # | Item | Source audit | Status | Evidence (current code) |
|---|------|--------------|--------|-------------------------|
| 1 | Rate limit on `POST /grades/save` | 2026-05-21, 06-04 | ✅ Done | `api/index.js:691` `uploadRateLimit` |
| 2 | IDOR `GET /teacher/review/:submissionId` | 2026-06-04 | ✅ Done | `api/index.js:1219-1221` course-ownership check |
| 3 | IDOR `POST /teacher/submit-review` | 2026-06-04 | ✅ Done | `api/index.js:1250-1252` |
| 4 | IDOR `approve`/`reject`/`remove-student` | 2026-06-04 | ✅ Done | `api/index.js:1305-1306`, `1325-1326`, `1344-1345` |
| 5 | IDOR `POST /lecturer/submissions/:id/extension` | 2026-06-04 | ✅ Done | `api/index.js:898-905` |
| 6 | IDOR `GET /lecturer/courses/:id/all-submissions` | 2026-06-04 | ✅ Done | `api/index.js:1149-1150` |
| 7 | IDOR on 9 assignment/material routes | 2026-05-21 | ✅ Done | `api/index.js:833-895`, `910-954`, `1371-1398` |
| 8 | Chat routes must use `buildSafePrompt`/`buildSafeChatPrompt` | 2026-05-07, 05-14 | ✅ Done | `api/index.js:606`, `733`, `744`, `793` |
| 9 | Remove premature Gemini-key check in `semanticAssessment.js` | 2026-05-07 | ✅ Done | guard removed; reaches orchestrator |
| 10 | Rate limits on update-role / courses POST+PUT / submit-review | 2026-05-07 | ✅ Done | `api/index.js:384`, `1090`, `1098`, `1237` |
| 11 | `POST /evaluate` lecturer-only | 2026-05-07 | ✅ Done | `api/index.js:769` role check |
| 12 | `POST /user/update-role` block re-assignment | 2026-05-07 | ✅ Done | `api/index.js:387` enum + `390` role-set guard |

## MEDIUM / housekeeping

| # | Item | Source audit | Status | Evidence / notes |
|---|------|--------------|--------|------------------|
| 13 | `evaluateSubmission` dead export removed | 2026-05-07 | ✅ Done | absent from `services/chatService.ts` |
| 14 | `GradeBook.tsx` RTL `scrollBy.left` | 2026-04-17 → 06-04 (7 audits) | ✅ Done | `GradeBook.tsx:42` — RTL-aware `isRtl ? -delta : delta` (fixed 2026-07-13, verified 2026-10-15) |
| 15 | `StudentAssignments.tsx` `text-left` → `text-end` | 2026-05-21 | ✅ Done | `StudentAssignments.tsx:134` — no `text-left` found (verified 2026-10-15) |
| 16 | Physical `borderRight`/`paddingRight` → logical props | 2026-04-30 → 06-04 (5 audits) | ✅ Done | `StudentAssignments.tsx:176`, `AssignmentManager.tsx:263,417` → `borderInlineEnd`/`paddingInlineEnd` (verified 2026-10-15) |
| 17 | Create git tag `prompt-v1.2.0` | 2026-05-07 → 06-04 (4 audits) | ⚠️ Unverifiable | Tag not visible in this clone (`git tag` returns empty). AUDIT_TRACKING says created 2026-07-13. Run `git push origin prompt-v1.2.0` to publish. |
| 18 | Align `package.json` to `PROMPT_VERSION` | 2026-05-07 → 06-04 | ⚠️ Won't fix | Intentional decoupling. Do not re-raise. |
| 19 | `ForExample/` dead fixture files | 2026-05-07 → 06-04 (4 audits) | ❌ Open | 6 `.txt` files still present (8th consecutive audit, verified 2026-10-15). |
| 33 | RTL: `ReviewQueue.tsx:253,418` physical `borderRight` | 2026-07-02 | ❌ Open | `borderRight` still used at both lines (verified 2026-10-15; 3rd consecutive audit). |

## Notes for future audit runs

- **Items 26–32 are OPEN CRITICAL (verified 2026-10-15).** All have open GitHub issues (#48, #49, #52, #54, #56, #60, #63, #67). No code changes since 2026-07-14.
- **Item 20** (Atlas credentials) — only truly closed once remote git history is verified clean. File untracked and absent from this clone's history; owner must confirm on authoritative remote.
- Items 21–25 are confirmed fixed in code (commit `ed1dafc`). Close corresponding GitHub issues once runtime-verified in production.
- Items 1–17 are settled; do not re-flag unless referenced code regresses.
- Item 18 is a deliberate won't-fix — stop recommending `package.json` ↔ `PROMPT_VERSION` alignment.
- Item 19 (`ForExample/` dead files) remains open, cosmetic only, not security.
- Item 33 (ReviewQueue.tsx RTL) — fix is one-line; 3rd consecutive audit without action.
- Stale/likely-fixed GitHub issues to close: #34, #25, #26, #33 (verified fixed in code). Spot-check #17, #29, #30, #35, #36 before closing.
