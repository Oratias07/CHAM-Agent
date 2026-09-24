# CHAM Agent — Weekly Security & Architecture Audit (2026-09-24)

**Auditor:** Claude (automated)  
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `vite.config.ts`  
**Prior audit:** `docs/audits/weekly-audit-2026-07-09.md` (6 CRITICAL open)  
**Date:** 2026-09-24

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Unprotected LLM call sites | All LLM paths go through `evaluateWithFallback()` + `buildSafePrompt()` | ✓ Clean |
| 2 | CRITICAL | Missing rate limiting | All POST/PUT routes with user-controlled input are rate-limited | ✓ Clean |
| 3 | CRITICAL | Session/RBAC regressions | All lecturer/student routes assert correct role; no IDOR found | ✓ Clean |
| 4 | CRITICAL | Secrets in code | No hardcoded secrets, keys, or URIs in tracked files | ✓ Clean |
| 5 | HIGH | Unsafe JSON parsing | All LLM response parsing uses `safeParseLLMResponse` | ✓ Clean |
| 6 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 7 | HIGH | `alert()` in UI | No `alert()`/`confirm()`/`prompt()` in production components | ✓ Clean |
| 8 | MEDIUM | Hebrew/RTL consistency | `ReviewQueue.tsx:253,418` physical `borderRight`; `CodeBlockWithLineNumbers.tsx:33` (new) | Report only |
| 9 | MEDIUM | Prompt version drift | `PROMPT_VERSION = 'v1.2.0'` with no `prompt-v1.2.0` git tag | Report only |
| 10 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 files, 7th consecutive audit) | Report only |

**CRITICAL open:** 0  
**HIGH open:** 0  
**MEDIUM open:** 3

---

## Prior Audit Resolution Status (2026-07-09)

All 6 CRITICAL findings from the 2026-07-09 audit have been resolved in commits `ed1dafc` and `ff569e3`.

| Previous Finding | Resolution |
|-----------------|------------|
| CRITICAL-1: Live MongoDB credentials in `settings.local.json` (git-tracked) | ✅ Fixed — file added to `.gitignore`, untracked from git |
| CRITICAL-2: `vite.config.ts` bakes `API_KEY` into client bundle | ✅ Fixed — `define` block removed from `vite.config.ts` |
| CRITICAL-3: Missing rate limit on `POST /student/join-course` | ✅ Fixed — `submitRateLimit` applied at `api/index.js:456` |
| CRITICAL-4: IDOR — lecturer reads any course (4 routes) | ✅ Fixed — `lecturerId` ownership check added to all 4 routes |
| CRITICAL-5: IDOR — student reads any course without enrollment | ✅ Fixed — enrollment check added at `api/index.js:550,1009` |
| CRITICAL-6: Mass assignment in `POST /lecturer/archive` | ✅ Fixed — server fields now placed after `...req.body` spread |

Previously open MEDIUM RTL findings partially resolved:

| Previous Finding | Resolution |
|-----------------|------------|
| MEDIUM: `GradeBook.tsx:40` `scrollBy({ left: ... })` (9 consecutive) | ✅ Fixed — RTL-aware delta logic at `GradeBook.tsx:42` |
| MEDIUM: `StudentAssignments.tsx:134` `text-left` (4 consecutive) | ✅ Fixed — removed from current tree |
| MEDIUM: `StudentAssignments.tsx:176` / `AssignmentManager.tsx:263,417` `borderRight`/`paddingRight` (7 consecutive) | ✅ Fixed — removed from current tree |
| MEDIUM: `ReviewQueue.tsx:253,418` physical `borderRight` (2 consecutive) | ❌ Unresolved |
| MEDIUM: Prompt version drift (6 consecutive) | ❌ Unresolved |
| MEDIUM: `ForExample/` dead files (6 consecutive) | ❌ Unresolved |

---

## CRITICAL Findings

**None.** All ten CRITICAL-severity checks pass.

### Detailed Check Results

**Check 1 — Unprotected LLM Call Sites:** ✓ Clean  
All four LLM-calling sites use both `buildSafePrompt()`/`buildSafeChatPrompt()` AND `evaluateWithFallback()`:
- `POST /evaluate` — `api/index.js:796,806`
- `POST /chat` — `api/index.js:731,757`
- `POST /student/chat` — `api/index.js:609,617`
- `services/semanticAssessment.js:85,97` — Layer 2 semantic path

No direct provider SDK calls (`new GoogleGenerativeAI`, `new Groq`, `new OpenAI`) exist outside `lib/llm/providers/*.js`.

**Check 2 — Missing Rate Limiting:** ✓ Clean  
All POST/PUT routes accepting code, text, or file content are protected:
- `/api/evaluate`: `llmRateLimit` (100/hr)
- `/api/student/assignments/:id/submit`: `submitRateLimit` (20/15min)
- `/api/student/join-course`: `submitRateLimit` (fixed from last audit, `api/index.js:456`)
- `/api/student/chat`, `/api/chat`: `llmRateLimit`
- `/api/messages`, `PUT /api/messages/:id`: `messagesRateLimit`
- Material upload routes: `uploadRateLimit`
- Course/assignment CRUD: `uploadRateLimit`

Low-volume administrative mutations (approve/reject student, extension grants) without LLM involvement and no file/code payloads are exempt per project convention.

**Check 3 — Session/RBAC Regressions:** ✓ Clean  
- `POST /auth/dev` disabled in production (`api/index.js:367`)
- All routes under `/lecturer/*` and `/teacher/*` assert `req.user.role !== 'lecturer'`
- All routes under `/student/*` assert `req.user.role !== 'student'`
- All resource-fetching lecturer routes verified with `lecturerId` ownership filter (IDOR fixes confirmed)
- All resource-fetching student routes verified with `enrolledCourseIds` check

**Check 4 — Secrets in Code:** ✓ Clean  
- `.env.example`: template only, no real values
- `vite.config.ts`: no `define` block, no `process.env.*` keys
- `.claude/settings.local.json`: gitignored (`.gitignore:7`), not tracked by git
- Provider files read keys exclusively from `process.env`
- Skill documentation files (`nano-banana-pro/SKILL.md`) contain illustrative placeholder references only, not real keys

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| 5 — Unsafe JSON parsing | ✓ Clean | All `JSON.parse` calls within LLM paths are inside `safeParseLLMResponse()` in `lib/llm/safeParse.js`. No bare `JSON.parse(llmResponse)` outside the wrapper in `api/`, `services/`, or `lib/`. |
| 6 — Missing output validation | ✓ Clean | `validateLLMOutput()` called at `api/index.js:813` (POST /evaluate) and `services/semanticAssessment.js:105` (Layer 2). Both paths block malformed output before returning to the client. |
| 7 — `alert()` in UI | ✓ Clean | Grep across all `components/*.tsx` finds only Audit #7 comment annotations confirming prior replacements. No live `alert()`, `confirm()`, or `window.prompt()` calls. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — Hebrew/RTL Consistency (Check #8)

**Status:** Partially resolved. Two persistent `borderRight` instances remain in `ReviewQueue.tsx`. One new finding in `CodeBlockWithLineNumbers.tsx`.

| Location | Issue | Audit count |
|----------|-------|-------------|
| `ReviewQueue.tsx:253` | `borderRight: '4px solid #FF9800'` — physical axis property | 3rd consecutive |
| `ReviewQueue.tsx:418` | `borderRight: '4px solid ${getPriorityColor(...)}'` — physical axis property | 3rd consecutive |
| `CodeBlockWithLineNumbers.tsx:33` | `borderRight: '1px solid #1e293b'` — line number separator, physical axis | **New** |

The `CodeBlockWithLineNumbers.tsx` case warrants lower urgency since code blocks are conventionally rendered LTR regardless of page direction. However, it should use `borderInlineEnd` for correctness.

**Recommended fixes:**

```tsx
// ReviewQueue.tsx:253 — replace:
borderRight: '4px solid #FF9800',
// with:
borderInlineEnd: '4px solid #FF9800',

// ReviewQueue.tsx:418 — replace:
borderRight: `4px solid ${getPriorityColor(item.priority)}`,
// with:
borderInlineEnd: `4px solid ${getPriorityColor(item.priority)}`,

// CodeBlockWithLineNumbers.tsx:33 — replace:
borderRight: '1px solid #1e293b',
// with:
borderInlineEnd: '1px solid #1e293b',
```

---

### MEDIUM-2 — Prompt Version Drift (Check #9)

**Status:** Persistent — 7th consecutive audit.

`lib/constants.js:1` exports `PROMPT_VERSION = 'v1.2.0'`. No `prompt-v1.2.0` git tag exists in the repository. `package.json` is still at `"version": "1.1.0"`.

Recommended actions (unchanged from prior audits):
1. `git tag prompt-v1.2.0 <commit-of-prompt-bump>`
2. Align `package.json` version to `"1.2.0"`
3. Future prompt changes must bump `PROMPT_VERSION` in the same commit as the template change

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

Not imported from any code path. Not referenced in `package.json`, `api/index.js`, `App.tsx`, or `vercel.json`. `server_reference.js` is not present in the current tree.

Recommended action: move to `docs/examples/` or add an explicit comment in `README.md` documenting their purpose if intentionally kept.

---

## Cumulative Open Items

| Finding | First Raised | Status |
|---------|-------------|--------|
| MEDIUM: `ReviewQueue.tsx:253,418` physical `borderRight` | 2026-07-02 | **Unresolved — 3 audits** |
| MEDIUM: `CodeBlockWithLineNumbers.tsx:33` physical `borderRight` | 2026-09-24 | **New** |
| MEDIUM: Prompt version tag missing (`prompt-v1.2.0`) | 2026-05-07 | **Unresolved — 7 audits** |
| MEDIUM: `ForExample/` dead files | 2026-05-07 | **Unresolved — 7 audits** |

---

## Recommendations (Priority Order)

1. **[SHORT-TERM]** Fix `ReviewQueue.tsx:253,418` — replace `borderRight` with `borderInlineEnd`. Two lines of CSS. 3rd consecutive audit without action.
2. **[SHORT-TERM]** Fix `CodeBlockWithLineNumbers.tsx:33` — same one-line change.
3. **[CLEANUP]** `git tag prompt-v1.2.0`. Align `package.json` to `1.2.0`. 7th consecutive audit.
4. **[OPTIONAL]** Move `ForExample/` to `docs/examples/` or document purpose in README.
