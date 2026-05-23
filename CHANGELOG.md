# Changelog

All notable changes to CHAM Agent are documented in this file. Format based on [Keep a Changelog](https://keepachangelog.com/).

---

## [2.1.1] — 2026-05-23

### Security (CRITICAL)

- **CRITICAL-1**: Added `uploadRateLimit` middleware to `POST /grades/save` to prevent database flooding via feedback submission abuse
- **CRITICAL-2**: Enforced RBAC ownership checks on 9 assignment and material routes:
  - `POST /lecturer/assignments` — verify `courseId` belongs to lecturer
  - `PUT /lecturer/assignments/:id` — verify assignment ownership via course relationship
  - `DELETE /lecturer/assignments/:id` — verify assignment ownership
  - `GET /lecturer/assignments/:id/submissions` — verify assignment ownership
  - `POST /lecturer/assignments/:id/release-feedback` — verify assignment ownership
  - `GET /lecturer/assignments/:id/feedback-status` — verify assignment ownership
  - `POST /lecturer/assignments/:id/submit-manual` — verify assignment ownership + prevent LLM quota abuse
  - `PUT /lecturer/materials/:id` — verify material `ownerId` matches caller
  - `DELETE /lecturer/materials/:id` — verify material `ownerId` matches caller
  - **Impact**: Prevents cross-lecturer data modification, student submission leakage, and unbounded LLM API calls

### Testing

- Added comprehensive test suite `tests/security-audit-2026-05-21.test.js` covering:
  - Rate limit middleware application
  - Ownership verification for all protected routes
  - Cross-lecturer attack prevention scenarios
  - All 377 tests pass

### Documentation

- Updated `README.md` with Security section documenting all hardening measures
- Updated version badge to 2.1.1
- Added reference to full audit in `docs/audits/weekly-audit-2026-05-21.md`

### References

- Audit: [docs/audits/weekly-audit-2026-05-21.md](docs/audits/weekly-audit-2026-05-21.md)
- Commit: `7582047` ("fix: resolve CRITICAL-1 and CRITICAL-2 from 2026-05-21 audit")

---

## [2.1.0] — 2026-05-14

### Fixed

- Resolved CRITICAL-1 from 2026-05-14 audit: Chat routes now use `buildSafePrompt()` for prompt injection protection
  - `POST /chat` uses `buildSafePrompt()` when student code context present (lines 733–739)
  - `POST /chat` uses `buildSafeChatPrompt()` when no code context (lines 744–749)
  - `POST /student/chat` uses `buildSafeChatPrompt()` (line 606)

### References

- Audit: [docs/audits/weekly-audit-2026-05-14.md](docs/audits/weekly-audit-2026-05-14.md)
- Commit: `9ca5014` ("fix: resolve CRITICAL-1 from 2026-05-14 audit")

---

## [2.0.0] — 2026-05-07

### Major Features

- Full CHAM (Contextual Hybrid Assessment Model) pipeline implementation
- Three-layer assessment architecture: Judge0 sandbox → semantic analysis → smart routing
- Multi-provider LLM fallback (Groq → Gemini → OpenAI)
- Hebrew pedagogical feedback with RTL UI support
- Course management, assignment lifecycle, gradebook with export
- Real-time messaging between lecturers and students
- Student Private Vault for research materials

### Security

- Prompt injection defense (30+ pattern detection)
- Rate limiting on all POST/PUT routes
- Safe JSON parsing for LLM responses
- Role-based access control (lecturer/student)
- Google OAuth 2.0 integration with passport.js

---

## Format

### Sections

- **Added** — New features
- **Changed** — Changes to existing functionality
- **Deprecated** — Features soon to be removed
- **Removed** — Features removed
- **Fixed** — Security and bug fixes
- **Security** — Vulnerability patches
- **Testing** — Test coverage updates
- **Documentation** — Doc updates
- **References** — Links to audits, PRs, commits
