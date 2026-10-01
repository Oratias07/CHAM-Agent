# CHAM Agent — Weekly Security & Architecture Audit (2026-10-01)

**Auditor:** Claude (automated)  
**Scope:** Full codebase — `api/index.js`, `lib/llm/`, `services/`, `components/`, `App.tsx`, `vite.config.ts`  
**Prior audit:** `docs/audits/weekly-audit-2026-07-09.md` (6 CRITICAL open)  
**Date:** 2026-10-01

---

## Summary Table

| # | Severity | Check | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | CRITICAL | Session/RBAC regressions | IDOR: `GET /student/materials/:id/content` fetches lecturer-shared material content without enrollment check | **Open (new)** |
| 2 | HIGH | Unsafe JSON parsing | All LLM response parsing uses `safeParseLLMResponse` | ✓ Clean |
| 3 | HIGH | Missing output validation | `validateLLMOutput()` called on all evaluation paths | ✓ Clean |
| 4 | HIGH | `alert()` in UI | No raw `alert()`/`confirm()`/`prompt()` calls found | ✓ Clean |
| 5 | MEDIUM | Hebrew/RTL consistency | `ReviewQueue.tsx:253,418` — physical `borderRight` | Report only |
| 6 | MEDIUM | Hebrew/RTL consistency | `CodeBlockWithLineNumbers.tsx:33` — physical `borderRight` in line-number gutter | Report only (new) |
| 7 | MEDIUM | Prompt version drift | `PROMPT_VERSION = 'v1.2.0'` — no `prompt-v1.2.0` git tag; `package.json` still at `1.1.0` | Report only |
| 8 | MEDIUM | Dead code / orphaned files | `ForExample/` (6 files, 7th consecutive audit) | Report only |

**CRITICAL open:** 1  
**HIGH open:** 0

---

## Prior Audit Resolution Status (2026-07-09)

All 6 CRITICAL findings from the 2026-07-09 audit were addressed in commits `ed1dafc` and `ff569e3`:

| Previous Finding | Resolution |
|-----------------|------------|
| CRITICAL-1: `.claude/settings.local.json` credentials in git | ✅ **Fully resolved** — `git log --all -- .claude/settings.local.json` returns empty: file was never committed. It has been removed from the working tree, gitignored, and is absent from all history. |
| CRITICAL-2: `vite.config.ts` bakes `API_KEY` into client bundle | ✅ **Resolved** — `define` block removed. `vite.config.ts` now contains only the React plugin and dev-server proxy config. No `process.env.*` references remain in frontend files. |
| CRITICAL-3: No rate limit on `POST /student/join-course` | ✅ **Resolved** — `submitRateLimit` added (`api/index.js:456`). |
| CRITICAL-4: IDOR on 4 lecturer read-routes | ✅ **Resolved** — `Course.findOne({ _id, lecturerId })` ownership check (403) added to all 4 routes: assignments (`api/index.js:851`), waitlist (`api/index.js:1124`), waitlist-history (`api/index.js:1139`), materials (`api/index.js:1365`). |
| CRITICAL-5: IDOR on 2 student read-routes | ✅ **Partially resolved** — enrollment check added to `GET /student/courses/:courseId/assignments` (line 1009) and `GET /student/courses/:courseId/materials` (line 553). However, the companion content endpoint `GET /student/materials/:id/content` is missing an equivalent check → **becomes new CRITICAL-1 this audit**. |
| CRITICAL-6: Mass assignment in `POST /lecturer/archive` | ✅ **Resolved** — `...req.body` spread now precedes `lecturerId` and `timestamp` server fields (`api/index.js:436–440`). Server values override any client-supplied fields. |

**RTL fixes (commit `ff569e3`):**

| Component | Issue | Resolution |
|-----------|-------|------------|
| `GradeBook.tsx:40` | `scrollBy({ left: delta })` — wrong direction in RTL | ✅ Fixed — `scrollBy({ left: isRtl ? -delta : delta })` |
| `StudentAssignments.tsx:134` | `text-left` on Hebrew text | ✅ Fixed — `text-end` |
| `StudentAssignments.tsx:176` | `borderRight` / `paddingRight` | ✅ Fixed — `borderInlineEnd` / `paddingInlineEnd` |
| `AssignmentManager.tsx:263,417` | `borderRight` / `paddingRight` | ✅ Fixed — `borderInlineEnd` / `paddingInlineEnd` |

---

## CRITICAL Findings

---

### CRITICAL-1 — IDOR: Material Content Accessible Without Enrollment Check (Check #3, New)

**Severity:** Critical  
**Check:** Session/RBAC regressions (Check #3)  
**Status:** Open — new finding  
**First raised:** 2026-10-01  
**GitHub Issue:** [#67](https://github.com/Oratias07/CHAM-Agent/issues/67)

#### Affected route

| Route | File | Lines |
|-------|------|-------|
| `GET /student/materials/:id/content` | `api/index.js` | 563–570 |

#### Evidence

```js
// api/index.js:563–570
router.get('/student/materials/:id/content', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  await connectDB();
  const material = await Material.findById(req.params.id).select('content fileType type ownerId courseId');
  if (!material) return res.status(404).json({ message: 'Material not found' });
  if (material.type === 'student_private' && material.ownerId !== req.user.googleId) return res.status(403).send();
  // ↑ No check for 'lecturer_shared' materials — any authenticated student can fetch content
  res.json({ content: material.content, fileType: material.fileType });
});
```

Compare with the fixed listing endpoint added in commit `ed1dafc`:

```js
// api/index.js:553–558 (CRITICAL-5 fix, now correct)
router.get('/student/courses/:courseId/materials', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  if (!req.user.enrolledCourseIds.includes(req.params.courseId)) {
    return res.status(403).json({ message: 'Not enrolled in this course' });
  }
  // … fetches listing without `content` field
```

The listing endpoint now requires enrollment and deliberately excludes `.content` (`.select('-content')`), referring students to the content endpoint for lazy-loading. The content endpoint lacks the matching enrollment gate.

#### Attack scenario

1. Attacker is enrolled in Course A and calls `GET /student/courses/A/materials`, obtaining material IDs.
2. Attacker is later unenrolled from Course A (lecturer removes them, or they were only a trial user).
3. Using retained IDs, attacker calls `GET /student/materials/<id>/content` directly and receives full file content — PDFs, slides, or code solutions — from the course they no longer have access to.

Material IDs are 24-character hex MongoDB ObjectIds and cannot be brute-forced; exploitation requires prior access to the listing. However, post-unenrollment access constitutes a meaningful RBAC bypass: the intent of CRITICAL-5's fix was to gate material access to enrolled students, and this endpoint was missed.

Additionally, if a student has access to a material ID by other means (e.g., from a link shared in a message), they can access the content without any course membership.

#### Impact

Full content of any `lecturer_shared` material (course notes, slides, problem sets, reference solutions) is readable by any student who holds a material ID, regardless of their current enrollment status.

#### Required Fix

Add enrollment check for `lecturer_shared` materials:

```js
router.get('/student/materials/:id/content', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  await connectDB();
  const material = await Material.findById(req.params.id).select('content fileType type ownerId courseId');
  if (!material) return res.status(404).json({ message: 'Material not found' });

  if (material.type === 'student_private') {
    if (material.ownerId !== req.user.googleId) return res.status(403).send();
  } else {
    // lecturer_shared: require enrollment in the material's course
    if (!req.user.enrolledCourseIds?.includes(material.courseId?.toString())) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }
  }

  res.json({ content: material.content, fileType: material.fileType });
});
```

---

## HIGH Findings

**None.** All three HIGH-severity checks pass.

| Check | Status | Evidence |
|-------|--------|----------|
| 5 — Unsafe JSON parsing | ✓ Clean | `safeParseLLMResponse()` is the sole parse path for all LLM output in `lib/llm/providers/`, `services/semanticAssessment.js`, and `services/promptGuard.js`. Only `JSON.parse()` calls in test files. |
| 6 — Missing output validation | ✓ Clean | `validateLLMOutput()` called at `api/index.js:813` (`POST /evaluate`) and `services/semanticAssessment.js:105` (Layer 2). Both block malformed or out-of-range output before returning. |
| 7 — `alert()` in UI | ✓ Clean | Grep for `^\s*(alert|confirm|prompt)\s*\(` in `components/` returns no matches. All prior replacements (Audit #7 tags) are confirmed inline state. |

---

## Checks With No Findings (CRITICAL / HIGH)

| Check | Result |
|-------|--------|
| 1 — Unprotected LLM call sites | ✓ Clean — All LLM-calling sites (`POST /evaluate`, `POST /chat`, `POST /student/chat`, `services/semanticAssessment.js`) route through both `buildSafePrompt()`/`buildSafeChatPrompt()` AND `evaluateWithFallback()`. No direct SDK calls outside the provider classes in `lib/llm/providers/`. |
| 2 — Missing rate limiting | ✓ Clean — All POST/PUT routes accepting code, text, or file content are covered: `llmRateLimit` on LLM endpoints, `submitRateLimit` on submission and join-course, `uploadRateLimit` on materials and course CRUD, `messagesRateLimit` on direct messages. |
| 3 (partial) — `/auth/dev` production guard | ✓ Clean — `POST /auth/dev` returns 403 in production (`api/index.js:367`). |
| 4 — Secrets in code | ✓ Clean — No hardcoded API keys, MongoDB URIs, OAuth secrets, or session secrets in tracked files. `settings.local.json` is untracked and gitignored. Audit doc references to `Vercel-Admin-st-system-db` use redacted passwords and are documentation only. |

---

## MEDIUM Findings (Weekly Report Only)

---

### MEDIUM-1 — RTL: `ReviewQueue.tsx:253,418` Physical `borderRight` (Check #8)

**Status:** Persistent — 3rd consecutive audit.

```tsx
// ReviewQueue.tsx:253
borderRight: '4px solid #FF9800',

// ReviewQueue.tsx:418
borderRight: `4px solid ${getPriorityColor(item.priority)}`,
```

**Fix:** Replace with `borderInlineEnd` (same as the fix applied to `AssignmentManager.tsx` and `StudentAssignments.tsx` in commit `ff569e3`).

---

### MEDIUM-2 — RTL: `CodeBlockWithLineNumbers.tsx:33` Physical `borderRight` in Line-Number Gutter (Check #8, New)

**Status:** New finding.

```tsx
// CodeBlockWithLineNumbers.tsx:33
borderRight: '1px solid #1e293b',
```

This property separates the line-number column from the code area. In an RTL layout (Hebrew UI), the gutter would appear on the right side of the screen with `borderRight` placing the separator on the wrong (outer) edge.

**Fix:** Replace with `borderInlineEnd: '1px solid #1e293b'` for RTL-agnostic gutter separator.

---

### MEDIUM-3 — Prompt Version Drift (Check #9)

**Status:** Persistent — 7th consecutive audit.

`lib/constants.js:1` exports `PROMPT_VERSION = 'v1.2.0'`. No `prompt-v1.2.0` git tag exists. `package.json` is at `"version": "1.1.0"`.

Recommended actions (unchanged):
1. `git tag prompt-v1.2.0 <commit-of-prompt-bump>`
2. Align `package.json` to `"version": "1.2.0"`
3. Future prompt changes must bump `PROMPT_VERSION` in the same commit.

---

### MEDIUM-4 — Dead Code / Orphaned Files (Check #10)

**Status:** Persistent — 7th consecutive audit.

```
ForExample/custominstr.EXMP.txt
ForExample/mastersolutionEXMP.txt
ForExample/questionEXMP.txt
ForExample/rubricEXMP.txt
ForExample/student1codeEXMP.txt
ForExample/student2codeEXMP.txt
```

Not imported from any code path. `server_reference.js` confirmed absent from current tree (not in `git ls-files`). Move `ForExample/` to `docs/examples/` or add to `.gitignore`.

---

## Cumulative Open Items (All Audits)

| Finding | First Raised | Status |
|---------|-------------|--------|
| CRITICAL: IDOR — `GET /student/materials/:id/content` missing enrollment check | 2026-10-01 | **New** |
| MEDIUM: `ReviewQueue.tsx:253,418` physical `borderRight` | 2026-07-02 | **Unresolved — 3 audits** |
| MEDIUM: `CodeBlockWithLineNumbers.tsx:33` physical `borderRight` | 2026-10-01 | **New** |
| MEDIUM: Prompt version tag missing | 2026-05-07 | **Unresolved — 7 audits** |
| MEDIUM: `ForExample/` dead files | 2026-05-07 | **Unresolved — 7 audits** |

---

## Recommendations (Priority Order)

1. **[THIS WEEK]** Fix `GET /student/materials/:id/content` — add enrollment check for `lecturer_shared` materials. One-function fix at `api/index.js:563`. (CRITICAL-1)
2. **[SHORT-TERM]** Fix `ReviewQueue.tsx:253,418` physical `borderRight` → `borderInlineEnd` (3rd consecutive audit without action). (MEDIUM-1)
3. **[SHORT-TERM]** Fix `CodeBlockWithLineNumbers.tsx:33` gutter separator to `borderInlineEnd`. (MEDIUM-2)
4. **[CLEANUP]** `git tag prompt-v1.2.0`. Align `package.json` to `1.2.0`. (MEDIUM-3)
5. **[OPTIONAL]** Move `ForExample/` to `docs/examples/`. (MEDIUM-4)
