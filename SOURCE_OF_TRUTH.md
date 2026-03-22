# SOURCE_OF_TRUTH.md — ST System Project Reference

> This document is the authoritative single source of truth for the ST System codebase. It defines the project's structure, conventions, and rules. All contributors must follow these guidelines.

---

## 1. Project Identity

| Property | Value |
|---|---|
| **Name** | ST System — AI Code Grader |
| **Version** | 2.1.0 |
| **Live URL** | https://stsystem.vercel.app |
| **Repository** | GitHub → `main` branch auto-deploys to Vercel |
| **UI Language** | Hebrew (RTL) throughout |
| **License** | MIT |

---

## 2. Core Architecture

| Layer | Technology | Location |
|---|---|---|
| Frontend | React 19 + TypeScript | Project root (`*.tsx`, `*.ts`) |
| Styling | Tailwind CSS (CDN) | `index.html` CDN link — no config file |
| Backend | Express.js | `api/index.js` (Vercel Serverless Function) |
| Database | MongoDB Atlas + Mongoose | Models defined in `api/index.js` |
| AI Model | Google Gemini 2.0 Flash | Via `@google/genai` SDK — server-side only |
| Auth | Google OAuth 2.0 + Passport.js | Sessions via `express-session` + `connect-mongo` |
| Real-time | HTTP Polling | 5s sync, 3s direct messages — no WebSockets |
| Deployment | Vercel | Frontend on Edge CDN; backend as serverless function |
| Build | Vite | `npm run dev` → port 5173; proxies `/api/*` to 3000 |
| Local dev | `server.js` | Express on port 3000; used for local development only |

---

## 3. File Map

```
st-system/
├── api/
│   └── index.js              ← ENTIRE backend: all routes, models, AI, auth
├── components/
│   ├── Login.tsx             ← Login screen (Google OAuth + dev bypass)
│   ├── RoleSelector.tsx      ← First-login role selection
│   ├── LecturerDashboard.tsx ← Lecturer shell + navigation
│   ├── StudentPortal.tsx     ← Student shell + navigation
│   ├── InputSection.tsx      ← Code editor + exercise tabs (lecturer)
│   ├── ResultSection.tsx     ← AI evaluation result display
│   ├── GradeBook.tsx         ← Spreadsheet-style gradebook
│   ├── CourseManager.tsx     ← Course CRUD + Library Zone
│   ├── AssignmentManager.tsx ← Assignment CRUD + submissions
│   ├── StudentManagement.tsx ← Waitlist approve/reject + history
│   ├── StudentAssignments.tsx← Student assignment list + submission form
│   ├── ArchiveViewer.tsx     ← Gradebook snapshot list + restore
│   ├── ChatBot.tsx           ← Floating AI assistant
│   └── DirectChat.tsx        ← Direct messaging thread
├── services/
│   └── apiService.ts         ← All frontend API calls (fetch wrappers)
├── App.tsx                   ← Root component; auth routing
├── LecturerDashboard.tsx     ← Lecturer view router (tab switching)
├── types.ts                  ← TypeScript interfaces for all entities
├── constants.ts              ← App-wide constants (TabOption enum)
├── index.html                ← Entry HTML; loads Tailwind from CDN
├── vite.config.ts            ← Vite config + /api proxy to :3000
├── vercel.json               ← Routes /api/* → api/index.js
├── server.js                 ← Local dev Express server (not used in production)
├── .env                      ← Local env vars (gitignored — never commit)
└── .env.example              ← Template for env vars
```

---

## 4. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `GOOGLE_CLIENT_ID` | Yes | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth 2.0 Client Secret |
| `GOOGLE_CALLBACK_URL` | Local only | Full URL for local dev: `http://localhost:3000/api/auth/google/callback` |
| `SESSION_SECRET` | Yes | Random string for signing session cookies |
| `GEMINI_API_KEY` | Yes | Gemini API key from Google AI Studio |

**Rules:**
- `.env` is always gitignored — never commit it
- Never read `GEMINI_API_KEY` on the frontend
- In production, omit `GOOGLE_CALLBACK_URL` — the relative path is used automatically

---

## 5. Database Models

All Mongoose models are defined in `api/index.js`.

| Model | Key Fields |
|---|---|
| `User` | `googleId`, `name`, `email`, `role`, `activeCourseId`, `enrolledCourseIds`, `pendingCourseIds`, `unseenApprovals` |
| `Course` | `name`, `code` (unique 6-char), `lecturerId`, `enrolledStudentIds`, `pendingStudentIds` |
| `Assignment` | `courseId`, `title`, `question`, `rubric`, `openDate`, `dueDate` |
| `Submission` | `assignmentId`, `courseId`, `studentId`, `code`, `score`, `feedback`, `status`, `extensionUntil` |
| `Material` | `courseId`, `title`, `content`, `type` (`lecturer_shared`/`student_private`), `ownerId`, `isVisible` |
| `DirectMessage` | `senderId`, `receiverId`, `text`, `replyToId`, `isRead`, `isEdited`, `deletedFor` |
| `Grade` | `userId`, `studentId`, `exerciseId`, `score`, `feedback` |
| `Archive` | `sessionName`, `courseId`, `lecturerId`, `data` (full snapshot), `stats` |
| `WaitlistHistory` | `studentId`, `courseId`, `courseName`, `status` (`approved`/`rejected`) |

---

## 6. API Surface

All routes are prefixed with `/api`. Full reference is in `README.md`.

### Key ID Convention
- Student identifiers in all API calls and database fields use `googleId` (not MongoDB `_id`)
- Waitlist endpoints return `{ id: googleId, name, picture }` — never raw Mongoose documents
- The `id` field on user objects is always the Google OAuth `googleId`

### Route Security Pattern
```
GET  /auth/me            → public (no auth required)
POST /grades/save        → any authenticated user (req.user check)
POST /lecturer/courses   → lecturer only (req.user.role === 'lecturer')
POST /student/join-course → student only (req.user.role === 'student')
```

### Dev Login (Development Only)
```http
POST /api/auth/dev
Content-Type: application/json

{ "role": "lecturer" }
```
or `{ "role": "student" }`. No passcode — role is the only required field.

---

## 7. AI Integration

- **Model:** `gemini-2.0-flash`
- **SDK:** `@google/genai` — `ai.models.generateContent()`
- **Response format:** `responseMimeType: 'application/json'` — always returns `{ score, feedback }`
- **Score range:** 0.0 – 10.0
- **Feedback language:** Hebrew (instructed in system prompt)
- **RAG (Student Chat):** Course materials + private vault content injected into prompt before the student's question

---

## 8. Frontend Conventions

### State Management
No external state library. All state is `useState` + `useEffect` at the component level.

### Data Fetching
All API calls go through `services/apiService.ts`. Never call `fetch()` directly in components.

### Routing
No client-side router. Navigation is controlled by a `viewMode` state string in `LecturerDashboard.tsx` and `StudentPortal.tsx`.

### Styling
- Tailwind CSS via CDN — no `tailwind.config.js`
- Dark mode: add/remove `dark` class on `document.documentElement`
- RTL: `dir="rtl"` on Hebrew text elements; `space-x-reverse` for RTL flex rows

### Error Handling
- **No `alert()` or `confirm()` anywhere** — all errors shown inline via component state
- Error messages are in Hebrew
- Confirmation dialogs replaced with inline confirmation UI (e.g., `removingId` state pattern)

---

## 9. Development Rules

1. **Never remove existing features** unless explicitly requested by the user.
2. **Extend and enhance** — do not rewrite working logic from scratch.
3. **Hebrew UI is required** — all user-facing labels, error messages, empty states, and AI feedback must be in Hebrew.
4. **No `alert()` or `confirm()`** — use inline state for all error and confirmation flows.
5. **API keys are server-side only** — `GEMINI_API_KEY` never touches the frontend.
6. **Session-based auth** — all protected routes check `req.user`; lecturer routes additionally check `req.user.role === 'lecturer'`.
7. **Use `googleId` as the user identifier** — not MongoDB `_id` — in all cross-collection references.
8. **Tailwind from CDN** — do not install or configure Tailwind as a build dependency.
9. **`api/index.js` is the only backend file deployed to Vercel** — `server.js` is for local development only.

---

## 10. Deployment

```
GitHub main branch
      │
      │ push / merge
      ▼
Vercel CI/CD
      ├── vite build → dist/ → Vercel Edge CDN
      └── api/index.js → Vercel Serverless Function
```

**Local development:**
```bash
npm run dev      # Vite on :5173
node server.js   # Express on :3000
# vite.config.ts proxies /api/* → :3000
```

**Environment config per environment:**

| Variable | Local | Production |
|---|---|---|
| `GOOGLE_CALLBACK_URL` | `http://localhost:3000/api/auth/google/callback` | Not set (relative path used) |
| `NODE_ENV` | not set / development | `production` (set by Vercel) |
| All other env vars | In `.env` file | In Vercel Environment Variables settings |
