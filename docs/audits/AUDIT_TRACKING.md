# CHAM Agent — Audit Item Tracking

Consolidated, deduplicated tracker for actionable items from the weekly security & architecture audits.
Purpose: let future audit runs skip items already resolved, and record deliberate won't-fix decisions.

**Last reconciled:** 2026-07-14 (verified against working tree of `main`, commit `f93db71`).
**Audits covered in this reconciliation:** `weekly-audit-2026-05-07`, `-05-14`, `-05-21`, `-06-04`, `-07-02`, `-07-09`.

Status legend: ✅ Done · ❌ Open · ⚠️ Won't fix (with rationale)

> ⚠️ **6 CRITICAL items OPEN as of 2026-07-09 audit** (items 20–25 below). All verified against source on 2026-07-14. Item 20 (live DB creds in git) is not remediable by a doc/code edit alone — it needs credential rotation + history scrub.

## Security (CRITICAL) — OPEN (2026-07-09 audit, verified from source 2026-07-14)

| # | Item | Source audit | Status | Evidence (current code, verified) |
|---|------|--------------|--------|-----------------------------------|
| 20 | Live MongoDB Atlas creds in git-tracked `.claude/settings.local.json` | 2026-07-09 | ❌ Open (partial) | Mitigated 2026-07-14: file `git rm --cached` + added to `.gitignore`. **STILL OPEN — creds remain in git history and on disk; rotate both Atlas passwords + `git filter-repo` history scrub still required.** Issue #41 |
| 21 | `API_KEY` baked into client JS bundle | 2026-07-09 | ✅ Fixed (working tree) | `define` block removed from `vite.config.ts` 2026-07-14; grep confirms no `process.env.API_KEY` reference in any TSX/TS. Uncommitted/undeployed — verify after redeploy. Issue #42 |
| 22 | No rate limit on `POST /student/join-course` | 2026-07-02 (carried, 2 audits) | ✅ Fixed (working tree) | `submitRateLimit` added at `api/index.js:456` 2026-07-14. Uncommitted. Issue #43 |
| 23 | IDOR — lecturer reads any course (4 read-routes, ownership unchecked) | 2026-07-09 | ✅ Fixed (working tree) | `Course.findOne({ _id, lecturerId })` → 403 added at `api/index.js:851` assignments, `:1124` waitlist, `:1139` waitlist-history, `:1365` materials, 2026-07-14. Uncommitted. Issue #44 |
| 24 | IDOR — student reads any course without enrollment (2 read-routes) | 2026-07-09 | ✅ Fixed (working tree) | `enrolledCourseIds.includes()` → 403 added at `api/index.js:1009` assignments, `:553` materials, 2026-07-14. Uncommitted. Issue #45 |
| 25 | Mass assignment in `POST /lecturer/archive` — `lecturerId` overridable | 2026-07-09 | ✅ Fixed (working tree) | `...req.body` moved before server fields at `api/index.js:436-440` 2026-07-14. Uncommitted. Issue #46 |

Full detail: `docs/audits/weekly-audit-2026-07-09.md`. HIGH checks (JSON parsing, output validation, `alert()` in UI) all clean.
**Fix status note (2026-07-14):** Items 21–25 code-fixed in working tree, syntax-checked, NOT yet committed or deployed — do not close until committed + runtime-verified. Item 20 only partially mitigated (see row).

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
| 14 | `GradeBook.tsx` RTL `scrollBy.left` | 2026-04-17 → 06-04 (7 audits) | ✅ Done | `components/GradeBook.tsx:38-43` RTL-aware `scrollBy` (fixed 2026-07-13) |
| 15 | `StudentAssignments.tsx` `text-left` → `text-end` | 2026-05-21 | ✅ Done | `components/StudentAssignments.tsx:134` (fixed 2026-07-13) |
| 16 | Physical `borderRight`/`paddingRight` → logical props | 2026-04-30 → 06-04 (5 audits) | ✅ Done | `StudentAssignments.tsx:176`, `AssignmentManager.tsx:263,417` → `borderInlineEnd`/`paddingInlineEnd` (fixed 2026-07-13) |
| 17 | Create git tag `prompt-v1.2.0` | 2026-05-07 → 06-04 (4 audits) | ✅ Done | tag `prompt-v1.2.0` → `8dad476` (created 2026-07-13) |
| 18 | Align `package.json` to `PROMPT_VERSION` | 2026-05-07 → 06-04 | ⚠️ Won't fix | App version (`package.json` `2.1.1`) and prompt-template version (`PROMPT_VERSION v1.2.0`) version different artifacts and are intentionally decoupled. Only the missing tag (#17) was valid. **Drop this recommendation from future audits.** |
| 19 | `ForExample/` dead fixture files | 2026-05-07 → 06-04 (4 audits) | ❌ Open | 6 `.txt` files, referenced nowhere outside `docs/audits`. Deletion (`git rm -r ForExample/`) proposed but not yet approved. |

## Notes for future audit runs

- **Items 20–25 are OPEN CRITICAL (2026-07-09 audit), verified from source 2026-07-14.** Priority order: 20 → 21 → 23 → 24 → 25 → 22. Re-verify each against the cited lines before re-flagging or closing.
- Item 20 (live DB creds) is only truly closed once passwords are rotated in Atlas AND git history is scrubbed — deleting the file from the working tree is not sufficient.
- Items 1–17 are settled; do not re-flag unless the referenced code regresses.
- Item 18 is a deliberate won't-fix — stop recommending `package.json` ↔ `PROMPT_VERSION` alignment.
- Item 19 (`ForExample/` dead files) remains open, cosmetic only, not security.
