# CHAM Agent — Audit Item Tracking

Consolidated, deduplicated tracker for actionable items from the weekly security & architecture audits.
Purpose: let future audit runs skip items already resolved, and record deliberate won't-fix decisions.

**Last reconciled:** 2026-07-23 (verified against `main` HEAD `ed1dafc`).
**Audits covered in this reconciliation:** `weekly-audit-2026-05-07`, `-05-14`, `-05-21`, `-06-04`, `-07-02`, `-07-09`, `-07-23`.

Status legend: ✅ Done · ❌ Open · ⚠️ Won't fix (with rationale)

> ✅ **0 CRITICAL items OPEN as of 2026-07-23 audit.** All prior CRITICALs resolved.

## Security (CRITICAL) — resolved 2026-07-23 cycle

| # | Item | Source audit | Status | Evidence (current code, verified) |
|---|------|--------------|--------|-----------------------------------|
| 20 | Live MongoDB Atlas creds in git-tracked `.claude/settings.local.json` | 2026-07-09 | ✅ Done | `git log --all --full-history --diff-filter=A -- .claude/settings.local.json` returns empty — file was never committed to git history. Prior audit's "git-tracked" finding referred to the file being untracked-but-unignored (at risk from `git add .`), not an actual committed secret. File is now gitignored (commit `ed1dafc`). Atlas credential rotation remains best practice and is strongly recommended. Issue #41 |
| 21 | `API_KEY` baked into client JS bundle | 2026-07-09 | ✅ Done | `define` block removed from `vite.config.ts` (commit `ed1dafc`); no `process.env.API_KEY` in any tracked file. Issue #42 |
| 22 | No rate limit on `POST /student/join-course` | 2026-07-02 | ✅ Done | `submitRateLimit` at `api/index.js:456` (commit `ed1dafc`). Issue #43 |
| 23 | IDOR — lecturer reads any course (4 read-routes) | 2026-07-09 | ✅ Done | `Course.findOne({ _id, lecturerId: req.user.googleId })` at `api/index.js:851,1124,1139,1365` (commit `ed1dafc`). Issue #44 |
| 24 | IDOR — student reads any course without enrollment | 2026-07-09 | ✅ Done | `enrolledCourseIds.includes()` at `api/index.js:1009,553` (commit `ed1dafc`). Issue #45 |
| 25 | Mass assignment in `POST /lecturer/archive` — `lecturerId` overridable | 2026-07-09 | ✅ Done | Server fields after `...req.body` at `api/index.js:436-440` (commit `ed1dafc`). Issue #46 |

Full detail: `docs/audits/weekly-audit-2026-07-23.md`. All CRITICAL and HIGH checks clean.

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
| 19 | `ForExample/` dead fixture files | 2026-05-07 → 06-04 (4 audits) | ❌ Open | 6 `.txt` files, referenced nowhere outside `docs/audits`. Deletion (`git rm -r ForExample/`) proposed but not yet approved. 7th consecutive audit. |
| 26 | `ReviewQueue.tsx:253,418` physical `borderRight` in RTL context | 2026-07-02 | ❌ Open | `borderRight` inside `dir="rtl"` parent; fix: replace with `borderInlineEnd`. 3rd consecutive audit. |

## Notes for future audit runs

- **As of 2026-07-23: 0 CRITICAL items open.** All checks clean at HEAD `ed1dafc`.
- Item 20: Credential rotation in Atlas is still recommended as precaution even though no git exposure confirmed. Do not re-flag as CRITICAL unless actual committed secret is found.
- Items 1–17, 21–25 are settled; do not re-flag unless the referenced code regresses.
- Item 18 is a deliberate won't-fix — stop recommending `package.json` ↔ `PROMPT_VERSION` alignment.
- Item 19 (`ForExample/` dead files) remains open, cosmetic only, not security.
- Item 26 (`ReviewQueue.tsx:253,418` physical `borderRight`) remains open MEDIUM — 3rd consecutive audit.
- Re-verify `prompt-v1.2.0` tag exists on remote: `git ls-remote --tags origin | grep prompt-v1.2.0`.
