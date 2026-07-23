# CHAM Agent — Weekly Security & Architecture Audit (2026-07-23)

**Auditor:** Claude (automated)  
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `vite.config.ts`  
**Prior audit:** `docs/audits/weekly-audit-2026-07-09.md` (6 CRITICAL open)  
**Date:** 2026-07-23  
**Git HEAD:** `ed1dafc` (fix(security): resolve 5 CRITICAL audit findings + untrack secrets file)

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | LLM call sites | All sites use orchestrator + buildSafePrompt | ✓ Clean |
| 2 | CRITICAL | Rate limiting | All POST/PUT user-input routes protected | ✓ Clean |
| 3 | CRITICAL | Session/RBAC | All role gates and auth/dev production guard intact | ✓ Clean |
| 4 | CRITICAL | Secrets in code | No hardcoded secrets in tracked files; settings.local.json never committed to git history | ✓ Clean (see note) |
| 5 | HIGH | Unsafe JSON parsing | `safeParseLLMResponse` is sole LLM parse path; no bare `JSON.parse` of LLM output | ✓ Clean |
| 6 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 7 | HIGH | `alert()` in UI | No live alert/confirm/prompt calls in production components | ✓ Clean |
| 8 | MEDIUM | Hebrew/RTL consistency | `ReviewQueue.tsx:253,418` physical `borderRight` in RTL context | Report only |
| 9 | MEDIUM | Prompt version drift | `PROMPT_VERSION = 'v1.2.0'`; tag not fetchable in this clone; per AUDIT_TRACKING created 2026-07-13 | Carry-forward |
| 10 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 files — 7th consecutive audit) | Report only |

**CRITICAL open:** 0  
**HIGH open:** 0

---

## Prior Audit Resolution Status (2026-07-09 → 2026-07-23)

All 5 code-fixable CRITICALs from the 2026-07-09 audit were committed in `ed1dafc`:

| Item | Finding | Resolution |
|------|---------|------------|
| 21 | `API_KEY` baked into client JS bundle (`vite.config.ts`) | ✅ Fixed — `define` block removed; grep confirms no `process.env.API_KEY` in any TSX/TS |
| 22 | No rate limit on `POST /student/join-course` | ✅ Fixed — `submitRateLimit` added at `api/index.js:456` |
| 23 | IDOR: lecturer reads any course (4 routes) | ✅ Fixed — `Course.findOne({ _id, lecturerId: req.user.googleId })` + 403 at `api/index.js:851,1124,1139,1365` |
| 24 | IDOR: student reads any course without enrollment (2 routes) | ✅ Fixed — `enrolledCourseIds.includes()` check at `api/index.js:1009,553` |
| 25 | Mass assignment in `POST /lecturer/archive` — `lecturerId` overridable | ✅ Fixed — server fields moved after `...req.body` at `api/index.js:436-440` |

**Item 20 (MongoDB credentials in git history):**  
`git log --all --full-history --diff-filter=A -- .claude/settings.local.json` returns empty — no commit ever tracked this file. The prior audit's "git-tracked" finding referred to the file being untracked-but-unignored (vulnerable to accidental `git add .`), not an actual committed secret. The file has since been added to `.gitignore` (commit `ed1dafc`). Assess as **resolved from git-exposure standpoint**. Atlas credential rotation remains best practice and is recommended regardless.

---

## CRITICAL Findings

**None.** All 10 CRITICAL checks pass against the current working tree (`HEAD: ed1dafc`).

### Evidence by check

| Check | Evidence |
|-------|---------|
| 1 — LLM call sites | Four call sites verified: `POST /evaluate` (`api/index.js:796,806`), `POST /chat` (`api/index.js:733,757`), `POST /student/chat` (`api/index.js:609,617`), `services/semanticAssessment.js:85,97` — all use `buildSafePrompt`/`buildSafeChatPrompt` AND `evaluateWithFallback()`. No `new GeminiProvider`, `new GroqProvider`, or `new OpenAIProvider` instantiations outside `lib/llm/orchestrator.js` and test files. |
| 2 — Rate limiting | All POST/PUT routes with user-controlled input verified: `llmRateLimit` on chat/evaluate, `submitRateLimit` on submissions + join-course + submit-review, `messagesRateLimit` on messages, `uploadRateLimit` on materials/archive/courses/grades/role. See full route table in Appendix A. |
| 3 — RBAC | All `/lecturer/*` routes assert `req.user.role !== 'lecturer'`; all `/student/*` routes assert `req.user.role !== 'student'`; `/api/auth/dev` returns 403 when `NODE_ENV === 'production'` (`api/index.js:367`). `/teacher/*` routes also assert lecturer role. No regressions found. |
| 4 — Secrets | `.env.example` contains only placeholders. No `sk-`, `AIza`, `gsk_`, or MongoDB Atlas URI patterns found in any tracked `.js`/`.ts`/`.tsx`/`.md` file contents. `.claude/settings.local.json` is gitignored and has no git history. |

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Evidence |
|-------|---------|
| 5 — Unsafe JSON parsing | `lib/llm/safeParse.js` is the sole consumer of `JSON.parse` for LLM output; all three attempts are inside try/catch. No bare `JSON.parse(llmResponse)` found in `api/`, `services/`, or `lib/`. Test files use `JSON.parse` only on static strings (package.json, mock fetch bodies). |
| 6 — Missing output validation | `validateLLMOutput()` called at `api/index.js:813` (`POST /evaluate`) and `services/semanticAssessment.js:105` (Layer 2). Both paths return an error response before sending to client if validation fails. |
| 7 — `alert()` in UI | Grep of all `.tsx` and `App.tsx` for `alert\(`, `confirm\(`, `window\.prompt\(` finds only audit comments (`// Audit #7: replaces...`) and test fixture strings. No live browser-dialog calls in production code. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8)

**Status:** Partial regression — 2 locations still unfixed; other prior findings resolved.

| Location | Issue | Audit count |
|----------|-------|-------------|
| `ReviewQueue.tsx:253` | `borderRight: '4px solid #FF9800'` inside `dir="rtl"` parent — accent bar appears on physical right (END) instead of logical start | 3rd consecutive |
| `ReviewQueue.tsx:418` | `borderRight: \`4px solid ${getPriorityColor(item.priority)}\`` — queue card priority indicator, same physical-axis issue | 3rd consecutive |
| `CodeBlockWithLineNumbers.tsx:33` | `borderRight: '1px solid #1e293b'` — line-number gutter separator; intentionally LTR (code is always LTR), not flagged as defect | First observation, not a finding |

**Previously resolved** (commits `ff569e3`, `ed1dafc`):  
`GradeBook.tsx:42` RTL-aware `scrollBy` (isRtl flag added), `StudentAssignments.tsx:134` `text-end`, `StudentAssignments.tsx:176` `borderInlineEnd`, `AssignmentManager.tsx:263,417` `borderInlineEnd`/`paddingInlineEnd`.

**Fix (unchanged from prior audits):**

```tsx
// ReviewQueue.tsx:253 — replace
borderRight: '4px solid #FF9800',
// with
borderInlineEnd: '4px solid #FF9800',

// ReviewQueue.tsx:418 — replace
borderRight: `4px solid ${getPriorityColor(item.priority)}`,
// with
borderInlineEnd: `4px solid ${getPriorityColor(item.priority)}`,
```

---

### MEDIUM-2 — Prompt Version Drift (Check #9)

**Status:** Carry-forward — partially resolved, verification pending.

`lib/constants.js:1` exports `PROMPT_VERSION = 'v1.2.0'`. Per `AUDIT_TRACKING.md` item 17, git tag `prompt-v1.2.0` was created on 2026-07-13 pointing to `8dad476`. Tag not present in this clone (shallow fetch likely). Verify with `git ls-remote --tags origin | grep prompt-v1.2.0`. If absent on remote, run `git push origin prompt-v1.2.0`.

`package.json` version alignment is intentionally won't-fix (item 18 in AUDIT_TRACKING).

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

Not imported from any code path. `server_reference.js` confirmed absent from working tree. `ForExample/` directory has no `package.json`, `api/index.js`, `App.tsx`, or `vercel.json` reference.

Recommended action: `git rm -r ForExample/` — moves sample content out of tracked files. If samples are useful for docs, move to `docs/examples/`.

---

## Appendix A — Rate-Limited Route Inventory

| Route | Middleware | Window / Max |
|-------|-----------|-------------|
| `POST /api/evaluate` | `llmRateLimit` | 1 hr / 100 |
| `POST /api/chat` | `llmRateLimit` | 1 hr / 100 |
| `POST /api/student/chat` | `llmRateLimit` | 1 hr / 100 |
| `POST /api/lecturer/assignments/:id/submit-manual` | `llmRateLimit` | 1 hr / 100 |
| `POST /api/student/assignments/:id/submit` | `submitRateLimit` | 15 min / 20 |
| `POST /api/student/join-course` | `submitRateLimit` | 15 min / 20 |
| `POST /api/teacher/submit-review` | `submitRateLimit` | 15 min / 20 |
| `POST /api/messages` | `messagesRateLimit` | 1 min / 60 |
| `PUT /api/messages/:id` | `messagesRateLimit` | 1 min / 60 |
| `POST /api/user/update-role` | `uploadRateLimit` | 1 hr / 20 |
| `POST /api/lecturer/courses` | `uploadRateLimit` | 1 hr / 20 |
| `PUT /api/lecturer/courses/:id` | `uploadRateLimit` | 1 hr / 20 |
| `POST /api/lecturer/archive` | `uploadRateLimit` | 1 hr / 20 |
| `POST /api/lecturer/assignments` | `uploadRateLimit` | 1 hr / 20 |
| `PUT /api/lecturer/assignments/:id` | `uploadRateLimit` | 1 hr / 20 |
| `POST /api/lecturer/materials` | `uploadRateLimit` | 1 hr / 20 |
| `PUT /api/lecturer/materials/:id` | `uploadRateLimit` | 1 hr / 20 |
| `POST /api/student/private-materials` | `uploadRateLimit` | 1 hr / 20 |
| `POST /api/grades/save` | `uploadRateLimit` | 1 hr / 20 |

---

## Cumulative Open Items (All Audits)

| Finding | First Raised | Status |
|---------|-------------|--------|
| MEDIUM: `ReviewQueue.tsx:253,418` physical `borderRight` in RTL | 2026-07-02 | ❌ Open — 3rd audit |
| MEDIUM: `ForExample/` dead files | 2026-05-07 | ❌ Open — 7th audit |
| MEDIUM: Verify `prompt-v1.2.0` tag on remote | 2026-05-07 | ⚠️ Verify |

All CRITICAL and HIGH items are closed.
