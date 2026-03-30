# APP_FEATURES.md — ST System Feature Registry

> Status legend: ✅ Working · 🚧 In Progress · 📋 Planned

---

## Module 1 — Authentication & Identity

| Feature | Status | Notes |
|---|---|---|
| Google OAuth 2.0 login | ✅ | Via Passport.js; creates user on first login |
| Session persistence in MongoDB | ✅ | `connect-mongo`; 7-day sliding expiry |
| Developer bypass login (no password) | ✅ | Single-click role selection; `POST /auth/dev`; disabled in production |
| Role selection on first login | ✅ | `RoleSelector` component; persisted to DB |
| Session-aware API guards | ✅ | All routes check `req.user`; role-based for lecturer routes |
| Logout | ✅ | Destroys session and redirects to `/` |

---

## Module 2 — Course Management

| Feature | Status | Notes |
|---|---|---|
| Create course with unique code | ✅ | 6-character code used by students to join |
| Edit course name and code | ✅ | `PUT /lecturer/courses/:id` |
| Delete course | ✅ | Also removes associated materials |
| Course list on dashboard load | ✅ | Fetched on mount via `GET /lecturer/dashboard-init` |
| Student waitlist (pending enrollments) | ✅ | `GET /lecturer/courses/:id/waitlist` |
| Approve student from waitlist | ✅ | Moves from `pendingStudentIds` to `enrolledStudentIds` |
| Reject student from waitlist | ✅ | Removes from `pendingStudentIds`; logs to history |
| Remove enrolled student | ✅ | `POST /lecturer/courses/:id/remove-student` |
| Enrollment decision history | ✅ | `WaitlistHistory` model; enriched with student name/picture |
| Student join via course code | ✅ | `POST /student/join-course`; adds to pending list |
| Student switch active course | ✅ | `POST /student/switch-course`; persists `activeCourseId` |
| Multi-course enrollment for students | ✅ | `enrolledCourseIds` array on User model |
| Student enrollment history view | ✅ | `GET /student/waitlist-history` |

---

## Module 3 — AI Grading Engine

| Feature | Status | Notes |
|---|---|---|
| AI code evaluation (question + rubric + code) | ✅ | `POST /evaluate`; multi-provider LLM (Groq → Gemini → OpenAI) |
| Multi-provider LLM fallback | ✅ | `LLMOrchestrator` with automatic failover; each provider has internal model fallback on 429 |
| Prompt injection protection | ✅ | `buildSafePrompt()` with 30+ regex patterns, XML tag fencing, code truncation |
| LLM output validation | ✅ | `validateLLMOutput()` with score range enforcement and weighted cross-check |
| Safe JSON parsing | ✅ | `safeParseLLMResponse()` handles raw JSON, markdown fences, embedded JSON |
| Rate limiting on evaluation | ✅ | 100 requests/hour per IP via `express-rate-limit` |
| Master solution reference in prompt | ✅ | Injected into prompt when provided |
| Custom AI constraints | ✅ | Freeform instructions field; enforced by AI |
| Hebrew pedagogical feedback | ✅ | Prompt instructs LLM to respond in Hebrew |
| Score from 0.0 to 10.0 | ✅ | JSON response `{ score, feedback }` |
| Prompt version tracking | ✅ | `PROMPT_VERSION = 'v1.1.0'` for audit trail |
| Auto-advance to next student | ✅ | Toggle in `InputSection`; advances dropdown on save |
| Load example templates | ✅ | Pre-fills question/solution/rubric with a sample linked-list problem |
| Save result to gradebook | ✅ | `POST /grades/save` after evaluation |
| Line count display in editor | ✅ | Live count in status bar |
| Textarea with scroll sync | ✅ | Gutter scroll synced to textarea scroll |

---

## Module 4 — Assignment Manager

| Feature | Status | Notes |
|---|---|---|
| Create assignment with title, question, rubric | ✅ | `POST /lecturer/assignments` |
| Set open date and due date | ✅ | Stored as ISO date strings |
| Edit assignment | ✅ | `PUT /lecturer/assignments/:id` |
| Delete assignment | ✅ | `DELETE /lecturer/assignments/:id` |
| View all submissions per assignment | ✅ | `GET /lecturer/assignments/:id/submissions` |
| Grant per-student deadline extension | ✅ | `POST /lecturer/submissions/:id/extension` |
| Student assignment list with lock status | ✅ | Open/closed based on current date vs. openDate/dueDate |
| Student code submission | ✅ | `POST /student/assignments/:id/submit`; triggers AI evaluation |
| Inline submission result (score + feedback) | ✅ | Shown immediately after submit without page reload |
| Re-submission (update existing) | ✅ | Same endpoint; overwrites previous submission |
| Extension-aware due date for student | ✅ | Uses `extensionUntil` if set; otherwise uses `dueDate` |

---

## Module 5 — Gradebook (Sheets View)

| Feature | Status | Notes |
|---|---|---|
| Spreadsheet-style grid (exercises × students) | ✅ | Sticky row/column headers |
| Editable student names | ✅ | Inline input in column header |
| Editable max score per exercise | ✅ | Inline number input |
| Color-coded score cells | ✅ | Green ≥ 90%, Blue ≥ 70%, Amber ≥ 50%, Red < 50% |
| Editable feedback textarea per cell | ✅ | Hebrew RTL textarea |
| Add exercise | ✅ | Floating action button |
| Add student column | ✅ | Button in header row |
| Horizontal scroll navigation | ✅ | Chevron buttons scroll 400px per click |
| Export to CSV | ✅ | UTF-8 BOM encoded; Hebrew column headers |
| Clear all (reset gradebook) | ✅ | Confirmation required; `isResetting` loading state |
| Hebrew empty state | ✅ | Shown when no exercises exist |

---

## Module 6 — Archive Zone

| Feature | Status | Notes |
|---|---|---|
| Save gradebook snapshot | ✅ | `POST /lecturer/archive`; stores session name, data, stats |
| View all archived sessions | ✅ | Listed in `ArchiveViewer` component |
| Restore snapshot | ✅ | Callback to parent restores gradebook state |
| Session statistics (avg score, distribution) | ✅ | High/mid/low distribution shown per archive card |
| Hebrew labels and empty state | ✅ | All text in Hebrew |

---

## Module 7 — Library Zone (Materials)

| Feature | Status | Notes |
|---|---|---|
| Lecturer upload course materials | ✅ | Text file upload via `POST /lecturer/materials` |
| Edit material title/content/visibility | ✅ | `PUT /lecturer/materials/:id` |
| Delete material | ✅ | `DELETE /lecturer/materials/:id` |
| Student view lecturer-shared materials | ✅ | `GET /student/courses/:courseId/materials` |
| Mark material as viewed | ✅ | `POST /student/materials/:id/view` |
| Student Private Research Vault | ✅ | Upload personal files; stored separately from lecturer materials |
| Private materials used as AI context (RAG) | ✅ | Injected into student chat prompt |
| Material reader modal | ✅ | Full-screen overlay with scrollable content |

---

## Module 8 — Real-Time Messaging

| Feature | Status | Notes |
|---|---|---|
| Direct message between any two users | ✅ | `GET/POST /messages/:otherId` |
| Reply to a message | ✅ | `replyToId` + `replyText` stored and displayed |
| Edit own message | ✅ | `PUT /messages/:id` |
| Delete for me | ✅ | `DELETE /messages/:id?forEveryone=false` |
| Delete for everyone | ✅ | `DELETE /messages/:id?forEveryone=true` |
| 3-second polling for new messages | ✅ | `setInterval` in `DirectChat` component |
| Unread message badge | ✅ | Count shown on Inbox nav item |
| New message toast alert | ✅ | Appears in top-right corner; click to open chat |
| Lecturer sync polling (5s) | ✅ | `GET /lecturer/sync` |
| Student sync polling (5s) | ✅ | `GET /student/sync` |
| Contact list (lecturer + enrolled students) | ✅ | `GET /student/course-contacts/:courseId` |

---

## Module 9 — AI Chatbot Assistant

| Feature | Status | Notes |
|---|---|---|
| Lecturer grading assistant | ✅ | `POST /chat`; context-aware of active exercise; rate limited 100/hr |
| Student RAG study assistant | ✅ | `POST /student/chat`; grounded in course + private materials; rate limited 100/hr |
| Message role separation | ✅ | System/model/user turns prevent prompt injection in chat |
| Animated typing indicator | ✅ | 3-dot bounce animation while waiting for response |
| Hebrew greeting and UI | ✅ | All chatbot text in Hebrew |
| Markdown rendering in responses | ✅ | Via `react-markdown` |
| Floating button (open/close) | ✅ | Fixed bottom-right; shown on all views |

---

## Module 10 — Notifications

| Feature | Status | Notes |
|---|---|---|
| Unseen approval badge on student nav | ✅ | `unseenApprovals` counter on User model |
| Clear notifications on view | ✅ | `POST /student/clear-notifications` |
| New message alert toast | ✅ | Shown when new message arrives via sync poll |
| Pending enrollment count for lecturer | ✅ | Shown in lecturer sidebar badge |

---

## Module 11 — UI / UX

| Feature | Status | Notes |
|---|---|---|
| Hebrew RTL interface throughout | ✅ | `dir="rtl"` on all Hebrew text elements |
| Dark mode | ✅ | Toggled via sidebar button; persisted in `localStorage` |
| Responsive design (mobile + desktop) | ✅ | `sm:` breakpoints throughout all components |
| Loading spinners on all async actions | ✅ | SVG spinner component in each relevant component |
| Inline error messages (no `alert()`) | ✅ | `InlineError` pattern with Hebrew messages |
| Hebrew empty states with emoji | ✅ | All list views show helpful Hebrew message when empty |
| Date formatting in Hebrew locale | ✅ | `toLocaleDateString('he-IL')` throughout |

---

## Module 12 — Security & Infrastructure

| Feature | Status | Notes |
|---|---|---|
| Prompt injection detection | ✅ | 30+ regex patterns in `promptGuard.js`; XML tag fencing |
| Prompt injection escalation | ✅ | Detected → confidence capped at 50%, flagged for human review |
| LLM output validation | ✅ | Score range enforcement (0-100), weighted cross-check |
| Safe JSON parsing | ✅ | Handles raw JSON, markdown fences, embedded JSON; never crashes |
| Rate limiting (LLM endpoints) | ✅ | 100 req/hr per IP on `/evaluate`, `/chat`, `/student/chat` |
| Rate limiting (submissions) | ✅ | 20 req/15min per IP on assignment submission |
| Multi-provider LLM orchestration | ✅ | Groq → Gemini → OpenAI with per-provider model fallback |
| Dev login production lockdown | ✅ | `POST /auth/dev` returns 403 when `NODE_ENV=production` |
| Admin endpoint RBAC | ✅ | `/admin/db` requires `req.user.role === 'lecturer'` |
| Code execution sandbox | ✅ | Judge0 with network disabled, 5s CPU, 256MB RAM limits |
| Pre-execution code filter | ✅ | Blocks network imports, filesystem writes, process execution |
| Prompt version tracking | ✅ | `PROMPT_VERSION = 'v1.1.0'` for reproducibility |

---

## Planned Features

| Feature | Status | Notes |
|---|---|---|
| Async task queue (BullMQ + Redis) | 📋 | Background evaluation to avoid Vercel 10s timeout |
| Response caching | 📋 | SHA-256 keyed cache with 1-hour TTL |
| Dedicated audit trail collection | 📋 | Legal compliance for Israeli Privacy Act + GDPR |
| Appeal mechanism | 📋 | "Request Human Review" button on graded submissions |
| Bias monitoring dashboard | 📋 | Track score patterns by code length, comment density, language |
| Bulk CSV import of student names | 📋 | For populating Gradebook without Google accounts |
| Assignment file attachments | 📋 | Images and PDFs alongside code submissions |
| WebSocket-based real-time messaging | 📋 | Replace polling for lower latency |
| Plagiarism detection | 📋 | Code similarity via embeddings + perplexity analysis |
| Learning analytics dashboard | 📋 | Class average trends, submission rate over time |
| Multi-language feedback | 📋 | Arabic and English in addition to Hebrew |
| LTI 1.3 integration | 📋 | Moodle/Canvas/Blackboard integration |
