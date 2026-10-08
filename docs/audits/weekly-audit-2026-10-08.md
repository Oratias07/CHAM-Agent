# CHAM Agent — Weekly Security & Architecture Audit (2026-10-08)

**Auditor:** Claude (automated)  
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `vite.config.ts`, `.claude/`, `docs/audits/AUDIT_TRACKING.md`  
**Prior audit:** `docs/audits/weekly-audit-2026-07-09.md` (6 CRITICAL open, 0 HIGH open)  
**Date:** 2026-10-08

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Secrets in code (C-1) | Live MongoDB credentials in `settings.local.json` git history | ✅ Resolved |
| 2 | CRITICAL | Secrets in code (C-2) | `vite.config.ts` baked `API_KEY` into client bundle | ✅ Resolved |
| 3 | CRITICAL | Missing rate limiting (C-3) | `POST /student/join-course` no rate limit | ✅ Resolved |
| 4 | CRITICAL | Session/RBAC (C-4) | IDOR — lecturer reads any course (4 read-routes) | ✅ Resolved |
| 5 | CRITICAL | Session/RBAC (C-5) | IDOR — student reads any course without enrollment | ✅ Resolved |
| 6 | CRITICAL | Session/RBAC (C-6) | Mass assignment in `POST /lecturer/archive` | ✅ Resolved |
| 7 | HIGH | Unprotected LLM call sites | All LLM calls via orchestrator + buildSafePrompt | ✅ Clean |
| 8 | HIGH | Missing rate limiting | All POST/PUT routes with user content protected | ✅ Clean |
| 9 | HIGH | Session/RBAC | All role guards and `/auth/dev` production block verified | ✅ Clean |
| 10 | HIGH | Secrets in code | No hardcoded secrets in tracked files | ✅ Clean |
| 11 | HIGH | Unsafe JSON parsing | All LLM output via `safeParseLLMResponse` | ✅ Clean |
| 12 | HIGH | Missing output validation | `validateLLMOutput()` on all evaluation paths | ✅ Clean |
| 13 | HIGH | `alert()` in UI | No raw `alert()`/`confirm()`/`prompt()` in components | ✅ Clean |
| 14 | MEDIUM | Hebrew/RTL consistency | `ReviewQueue.tsx:253,418` — physical `borderRight` | Report only |
| 15 | MEDIUM | Prompt version drift | Git tag `prompt-v1.2.0` not present on this clone | Report only |
| 16 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 files, 7th consecutive audit) | Report only |

**CRITICAL open:** 0  
**HIGH open:** 0  
**MEDIUM open:** 3 (all carried from prior audits)

---

## Prior Audit Resolution Status (2026-07-09 → 2026-10-08)

All 6 CRITICAL findings from the 2026-07-09 audit were resolved in commit `ed1dafc` (2026-07-14).

| Previous Finding | Resolution | Commit |
|-----------------|------------|--------|
| CRITICAL-1: Live MongoDB creds in `settings.local.json` | `git rm --cached` + `.gitignore` entry + `git log --all` shows zero history | `ed1dafc` |
| CRITICAL-2: `API_KEY` baked into client bundle (`vite.config.ts`) | `define` block removed entirely | `ed1dafc` |
| CRITICAL-3: No rate limit on `POST /student/join-course` | `submitRateLimit` added at `api/index.js:456` | `ed1dafc` |
| CRITICAL-4: IDOR lecturer reads any course (4 routes) | `Course.findOne({_id, lecturerId})` + 403 added at lines 851, 1124, 1139, 1365 | `ed1dafc` |
| CRITICAL-5: IDOR student reads any course without enrollment (2 routes) | `enrolledCourseIds.includes()` + 403 at lines 553, 1009 | `ed1dafc` |
| CRITICAL-6: Mass assignment `lecturerId` override in `POST /lecturer/archive` | `...req.body` moved before server fields | `ed1dafc` |

RTL findings from 2026-07-09 (items 14, 16 in AUDIT_TRACKING.md) were fixed in commit `ff569e3` (2026-07-13) for `GradeBook.tsx`, `StudentAssignments.tsx`, and `AssignmentManager.tsx`. `ReviewQueue.tsx` was NOT included in that fix.

---

## CRITICAL Findings

**None.** All 10 CRITICAL-severity checks pass. Zero findings to open GitHub issues for.

| Check | Verified evidence |
|-------|------------------|
| 1 — Unprotected LLM call sites | All 4 LLM-calling paths use `buildSafePrompt()`/`buildSafeChatPrompt()` AND `evaluateWithFallback()`. No direct SDK calls outside provider classes in `lib/llm/providers/`. Paths: `api/index.js:806` (`/evaluate`), `api/index.js:757` (`/chat`), `api/index.js:617` (`/student/chat`), `services/semanticAssessment.js:97`. |
| 2 — Missing rate limiting | Rate limiters verified on all POST/PUT routes carrying user content: `llmRateLimit` on `/evaluate`, `/chat`, `/student/chat`, `/lecturer/assignments/:id/submit-manual`; `submitRateLimit` on `/student/assignments/:id/submit`, `/student/join-course` (fixed C-3), `/teacher/submit-review`; `messagesRateLimit` on `POST/PUT /messages`; `uploadRateLimit` on all creation/update routes. |
| 3 — Session/RBAC | All `/api/lecturer/*` routes assert `req.user.role !== 'lecturer'` (verified all 30+ routes). All `/api/student/*` routes assert `req.user.role !== 'student'`. `/api/teacher/*` routes assert lecturer role. `POST /api/auth/dev` returns 403 in production (`api/index.js:367-369`). |
| 4 — Secrets in code | No hardcoded API keys, MongoDB URIs, OAuth secrets, or session secrets in any tracked file. `.claude/settings.local.json` removed from git index (`git ls-files` confirms NOT_TRACKED) and excluded in `.gitignore:7`. `git log --all -- .claude/settings.local.json` returns no commits. `vite.config.ts` has no `define` block. `.env.example` contains only placeholder values. |

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| 5 — Unsafe JSON parsing | ✅ Clean | All `JSON.parse` calls for LLM output are inside `safeParseLLMResponse()` in `lib/llm/safeParse.js:10,15,21`. `grep JSON.parse` across `api/`, `services/`, `lib/` shows zero bare calls outside this wrapper. Test files use `JSON.parse` for fixture data only. |
| 6 — Missing output validation | ✅ Clean | `validateLLMOutput()` called at `api/index.js:813` (`POST /evaluate`) and `services/semanticAssessment.js:105` (Layer 2). Both paths reject malformed output before returning to client. |
| 7 — `alert()` in UI | ✅ Clean | No live `alert()`, `confirm()`, or `prompt()` calls in any component. All audit comments reference prior replacements with inline state (Audit #7 tags in `CourseManager.tsx`, `AssignmentManager.tsx`, `ResultSection.tsx`, `LecturerDashboard.tsx`). |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — `ReviewQueue.tsx` Physical `borderRight` (Check #8)

**Status:** Open — 3rd consecutive audit (not addressed in `ff569e3` RTL fix).

| Location | Issue |
|----------|-------|
| `components/ReviewQueue.tsx:253` | `borderRight: '4px solid #FF9800'` — physical axis |
| `components/ReviewQueue.tsx:418` | `borderRight: \`4px solid ${getPriorityColor(item.priority)}\`` — physical axis |

The `ff569e3` fix (2026-07-13) patched `GradeBook.tsx`, `StudentAssignments.tsx`, and `AssignmentManager.tsx` but missed `ReviewQueue.tsx`. The fix pattern is identical to what was applied to other components: replace `borderRight` with `borderInlineEnd`.

**Fix:**
```tsx
// ReviewQueue.tsx:253 — change:
borderRight: '4px solid #FF9800'
// to:
borderInlineEnd: '4px solid #FF9800'

// ReviewQueue.tsx:418 — change:
borderRight: `4px solid ${getPriorityColor(item.priority)}`
// to:
borderInlineEnd: `4px solid ${getPriorityColor(item.priority)}`
```

---

### MEDIUM-2 — Prompt Version Git Tag Missing (Check #9)

**Status:** Ambiguous — AUDIT_TRACKING.md marks as done (`tag prompt-v1.2.0 → 8dad476, created 2026-07-13`) but `git tag -l` on this clone returns no tags. The tag may exist on the remote but was not fetched, or may not have been pushed.

`lib/constants.js:1` still exports `PROMPT_VERSION = 'v1.2.0'`. No prompt template files in `lib/llm/` were modified since the last audit — no version bump required.

**Recommended action:** Run `git fetch --tags origin` to verify the tag exists remotely. If absent, re-create: `git tag prompt-v1.2.0 8dad476 && git push origin prompt-v1.2.0`.

---

### MEDIUM-3 — Dead Code / Orphaned Files (Check #10)

**Status:** Open — 7th consecutive audit. `ForExample/` directory contains 6 `.txt` sample files not referenced from any import path.

```
ForExample/custominstr.EXMP.txt
ForExample/mastersolutionEXMP.txt
ForExample/questionEXMP.txt
ForExample/rubricEXMP.txt
ForExample/student1codeEXMP.txt
ForExample/student2codeEXMP.txt
```

`server_reference.js` is not present in the current working tree (resolved in prior audit).

**Recommended action:** `git rm -r ForExample/` or move to `docs/examples/`. Non-blocking.

---

## Checks With No New Findings

| Check | Result |
|-------|--------|
| 1 — Unprotected LLM call sites | ✅ Clean — 4 call sites verified; all use orchestrator + promptGuard |
| 2 — Missing rate limiting (new routes) | ✅ Clean — no new routes added since 2026-07-14; all existing routes verified |
| 3 — Session/RBAC | ✅ Clean — role guards and production guard verified across all routes |
| 4 — Secrets in code | ✅ Clean — no secrets in tracked files; `settings.local.json` removed from index |
| 5 — Unsafe JSON parsing | ✅ Clean |
| 6 — Missing output validation | ✅ Clean |
| 7 — `alert()` in UI | ✅ Clean |

---

## Cumulative Open Items

| Finding | First Raised | Consecutive Audits | Status |
|---------|-------------|-------------------|--------|
| MEDIUM: `ReviewQueue.tsx:253,418` physical `borderRight` | 2026-07-02 | 3 | Open |
| MEDIUM: Prompt version tag `prompt-v1.2.0` (remote presence unverified) | 2026-05-07 | 8 | Ambiguous |
| MEDIUM: `ForExample/` dead fixture files | 2026-05-07 | 7 | Open |

All CRITICAL and HIGH items are resolved. The three remaining MEDIUM items are cosmetic/housekeeping and do not affect security or correctness.
