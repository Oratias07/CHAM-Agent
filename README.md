# ST System — AI Code Grader

![Version](https://img.shields.io/badge/version-2.1.0-6366f1.svg)
![License](https://img.shields.io/badge/license-MIT-22c55e.svg)
![Platform](https://img.shields.io/badge/platform-Vercel-000000.svg)
![Database](https://img.shields.io/badge/database-MongoDB%20Atlas-47A248.svg)
![AI](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-4285F4.svg)
![Language](https://img.shields.io/badge/UI%20language-Hebrew%20%2F%20RTL-blue.svg)

> A full-stack academic SaaS platform for automated code evaluation, course management, and student-lecturer communication — powered by Google Gemini AI with Hebrew pedagogical feedback.

**Live Demo → [https://stsystem.vercel.app](https://stsystem.vercel.app)**

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Screenshots](#screenshots)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

ST System is a production-grade academic platform built for higher education institutions. Lecturers define exercises with rubrics and master solutions; students submit code; the Gemini 2.0 Flash AI model evaluates submissions and returns detailed pedagogical feedback in Hebrew — instantly.

The system handles the full lifecycle of a course: enrollment, material sharing, assignment management, AI grading, gradebook management, real-time messaging, and historical archiving.

---

## Features

### 👨‍🏫 Lecturer

- 📚 **Course Management** — Create courses with unique join codes; edit or delete courses
- 👥 **Student Enrollment** — Approve or reject students from a waitlist; remove enrolled students
- 📄 **Library Zone** — Upload and manage course materials (text/PDF); control visibility per student
- 🤖 **AI Grading Engine** — Paste a question, master solution, rubric, and student code; receive a score (0–10) and detailed Hebrew feedback from Gemini 2.0 Flash in under 3 seconds
- ⚙️ **Custom AI Constraints** — Add freeform instructions enforced during evaluation (e.g. "Penalize use of global variables")
- 📋 **Assignment Manager** — Create timed assignments with open/due dates; grant per-student deadline extensions
- 📊 **Gradebook (Sheets View)** — Spreadsheet-style grid for managing scores and feedback across the entire class; export to Hebrew-encoded CSV
- 🗄️ **Archive Zone** — Save and restore full gradebook snapshots with class statistics
- 💬 **Direct Chat** — Real-time messaging with any student; reply, edit, and delete messages
- 🔔 **Notifications** — Unread message badges; new message alerts via 5-second polling
- 🧠 **AI Grading Assistant** — Floating chatbot aware of the current active exercise context

### 🧑‍🎓 Student

- 🔗 **Course Enrollment** — Request to join any course via its 6-character code
- 📖 **Course Materials** — View all lecturer-shared documents; mark materials as read
- 🔒 **Private Research Vault** — Upload personal study files used as context by the AI assistant
- 📝 **Assignment Submission** — Submit code for open assignments; receive instant AI evaluation with score and Hebrew feedback
- 📂 **Evaluation Library** — Review all past submissions, scores, and feedback
- 🤖 **AI Study Assistant** — Course-grounded chatbot (RAG) that answers questions using course materials and the student's private vault
- 💬 **Direct Chat** — Message the lecturer or fellow enrolled students
- 🔄 **Multi-Course Support** — Enroll in multiple courses and switch between them

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | React 19 + TypeScript | Vite build tool; component files at project root |
| **Styling** | Tailwind CSS | Loaded from CDN via `index.html` |
| **Backend** | Express.js | Deployed as a single Vercel Serverless Function (`api/index.js`) |
| **Database** | MongoDB Atlas + Mongoose | All models defined in `api/index.js` |
| **AI** | Google Gemini 2.0 Flash | Via `@google/genai` SDK; server-side only |
| **Auth** | Google OAuth 2.0 + Passport.js | Sessions via `express-session` + `connect-mongo` |
| **Real-time** | HTTP Polling (5s) | No WebSockets; compatible with serverless |
| **Deployment** | Vercel | Frontend on Edge CDN; backend as serverless function |

---

## Architecture

```mermaid
graph TD
    subgraph Client ["Browser (React SPA)"]
        UI[UI Components]
        API_SVC[apiService.ts]
    end

    subgraph Vercel ["Vercel Edge"]
        STATIC[Static Frontend\nCDN Edge]
        FN[api/index.js\nServerless Function]
    end

    subgraph External ["External Services"]
        GOOGLE_OAUTH[Google OAuth 2.0]
        GEMINI[Gemini 2.0 Flash API]
        MONGO[(MongoDB Atlas)]
    end

    UI --> API_SVC
    API_SVC -->|/api/*| FN
    FN -->|Session auth| GOOGLE_OAUTH
    FN -->|generateContent| GEMINI
    FN -->|Mongoose| MONGO
    STATIC --> UI
```

**Request flow for an AI evaluation:**
1. Lecturer submits question + rubric + student code from `InputSection`
2. `apiService.ts` posts to `POST /api/evaluate`
3. `api/index.js` validates the session, reads `GEMINI_API_KEY` from env
4. Builds a structured prompt and calls `ai.models.generateContent()`
5. Parses the JSON response `{ score, feedback }`
6. Returns result to frontend; `ResultSection` renders the score and Hebrew feedback

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥ 18.x | LTS recommended |
| npm | ≥ 9.x | Comes with Node.js |
| MongoDB Atlas | Any | Free M0 tier is sufficient for development |
| Google Cloud Project | — | For OAuth 2.0 credentials |
| Gemini API Key | — | Free tier supports `gemini-2.0-flash` |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-org/st-system.git
cd st-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in all values (see [Environment Variables](#environment-variables) below).

### 4. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add to **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/google/callback` (local dev)
   - `https://your-domain.vercel.app/api/auth/google/callback` (production)
4. Copy the Client ID and Client Secret into `.env`

### 5. Start the backend

```bash
node server.js
```

The Express server starts on `http://localhost:3000`.

### 6. Start the frontend

```bash
npm run dev
```

Vite starts on `http://localhost:5173`. All `/api/*` requests are proxied to port 3000.

### 7. Open the app

Navigate to `http://localhost:5173`. Use **Developer Bypass** on the login screen to sign in as Lecturer or Student without requiring Google OAuth.

---

## Environment Variables

Create a `.env` file at the project root. **Never commit this file** — it is listed in `.gitignore`.

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string. Get from Atlas → Connect → Drivers |
| `GOOGLE_CLIENT_ID` | ✅ | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | ✅ | OAuth 2.0 Client Secret from Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | ⚠️ Local only | Full callback URL for local dev: `http://localhost:3000/api/auth/google/callback`. Leave unset in production. |
| `SESSION_SECRET` | ✅ | Random string used to sign session cookies. Use a long random hex string. |
| `GEMINI_API_KEY` | ✅ | Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey). Free tier supports `gemini-2.0-flash`. |

Example `.env`:
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/st-system
GOOGLE_CLIENT_ID=990002507324-xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
SESSION_SECRET=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Screenshots

| Screen | Preview |
|---|---|
| Login Page | ![Login Page](screenshots/01_login.jpg) |
| Lecturer Dashboard | ![Lecturer Dashboard](screenshots/02_lecturer_dashboard.jpg) |
| Student Portal — Join Academy | ![Student Portal](screenshots/03_student_portal.jpg) |
| Assignment Submission | ![Assignment Submission](screenshots/04_assignment_submission.jpg) |
| AI Grading Result | ![AI Grading Result](screenshots/05_ai_grading_result.jpg) |
| Gradebook / Grid View | ![Gradebook](screenshots/06_gradebook.jpg) |

---

## API Reference

All endpoints are prefixed with `/api`. All routes except auth require a valid session cookie.

### Authentication

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/me` | None | Get current authenticated user |
| `GET` | `/auth/google` | None | Initiate Google OAuth flow |
| `GET` | `/auth/google/callback` | None | OAuth callback; redirects to `/` |
| `GET` | `/auth/logout` | None | Destroy session and redirect to `/` |
| `POST` | `/auth/dev` | None | Dev bypass login. Body: `{ role: "lecturer" \| "student" }` |

### User

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/user/update-role` | Session | Set user role after first login. Body: `{ role }` |
| `GET` | `/users/all` | Session | Get all users (used for contact lookup) |

### Lecturer — Sync & Dashboard

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/lecturer/sync` | Lecturer | Poll for unread messages and pending enrollments |
| `GET` | `/lecturer/dashboard-init` | Lecturer | Load all courses and archives on dashboard mount |

### Lecturer — Courses

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/lecturer/courses` | Lecturer | Create a course. Body: `{ name, code }` |
| `PUT` | `/lecturer/courses/:id` | Lecturer | Update course name or code |
| `DELETE` | `/lecturer/courses/:id` | Lecturer | Delete a course and its materials |
| `GET` | `/lecturer/courses/:id/waitlist` | Lecturer | Get pending and enrolled students |
| `GET` | `/lecturer/courses/:id/waitlist-history` | Lecturer | Get full enrollment decision history |
| `POST` | `/lecturer/courses/:id/approve` | Lecturer | Approve a pending student. Body: `{ studentId }` |
| `POST` | `/lecturer/courses/:id/reject` | Lecturer | Reject a pending student. Body: `{ studentId }` |
| `POST` | `/lecturer/courses/:id/remove-student` | Lecturer | Remove an enrolled student. Body: `{ studentId }` |
| `GET` | `/lecturer/courses/:id/all-submissions` | Lecturer | Get all evaluated submissions for a course |

### Lecturer — Materials

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/lecturer/courses/:id/materials` | Lecturer | List all materials for a course |
| `POST` | `/lecturer/materials` | Lecturer | Upload a new material. Body: `{ courseId, title, content, isVisible }` |
| `PUT` | `/lecturer/materials/:id` | Lecturer | Update material title, content, or visibility |
| `DELETE` | `/lecturer/materials/:id` | Lecturer | Delete a material |

### Lecturer — Assignments

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/lecturer/assignments` | Lecturer | Create assignment. Body: `{ courseId, title, question, rubric, openDate, dueDate }` |
| `GET` | `/lecturer/courses/:courseId/assignments` | Lecturer | List all assignments for a course |
| `PUT` | `/lecturer/assignments/:id` | Lecturer | Update assignment details |
| `DELETE` | `/lecturer/assignments/:id` | Lecturer | Delete an assignment |
| `GET` | `/lecturer/assignments/:id/submissions` | Lecturer | Get all student submissions for an assignment |
| `POST` | `/lecturer/submissions/:id/extension` | Lecturer | Grant a deadline extension. Body: `{ extensionUntil }` |

### Lecturer — Gradebook & Archive

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/grades/save` | Session | Save a grade entry. Body: `{ exerciseId, studentId, score, feedback }` |
| `GET` | `/grades` | Session | Get all grade entries for the current user |
| `POST` | `/lecturer/archive` | Lecturer | Save a gradebook snapshot. Body: `{ sessionName, data, stats }` |

### AI

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/evaluate` | Session | Run AI code evaluation. Body: `{ question, masterSolution, rubric, studentCode, customInstructions }`. Returns `{ score, feedback }` |
| `POST` | `/chat` | Session | Lecturer AI assistant. Body: `{ message, context }`. Returns `{ text }` |

### Student

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/student/join-course` | Student | Request to join a course. Body: `{ code }` |
| `POST` | `/student/switch-course` | Student | Switch active course. Body: `{ courseId }` |
| `GET` | `/student/sync` | Student | Poll for unread messages, notifications, and approval alerts |
| `POST` | `/student/clear-notifications` | Student | Mark approval notifications as seen |
| `GET` | `/student/course-contacts/:courseId` | Student | Get lecturer and fellow students for messaging |
| `GET` | `/student/submissions` | Student | Get all personal submission history |
| `GET` | `/student/waitlist-history` | Student | Get enrollment request history |
| `GET` | `/student/courses/:courseId/materials` | Student | Get lecturer-shared and personal materials |
| `POST` | `/student/private-materials` | Student | Upload a personal material to the Private Vault |
| `POST` | `/student/materials/:id/view` | Student | Mark a material as viewed |
| `GET` | `/student/courses/:courseId/assignments` | Student | Get assignments and personal submissions for a course |
| `POST` | `/student/assignments/:id/submit` | Student | Submit code for an assignment. Body: `{ code }`. Triggers AI evaluation. Returns `{ score, feedback }` |
| `POST` | `/student/chat` | Student | RAG-powered AI chat grounded in course materials. Body: `{ message, courseId }`. Returns `{ text }` |

### Messages

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/messages/:otherId` | Session | Get conversation thread with a user |
| `POST` | `/messages` | Session | Send a message. Body: `{ receiverId, text, replyToId?, replyText? }` |
| `PUT` | `/messages/:id` | Session | Edit own message. Body: `{ text }` |
| `DELETE` | `/messages/:id` | Session | Delete a message. Query: `?forEveryone=true\|false` |

---

## Deployment

### Deploy to Vercel

1. Push your repository to GitHub
2. Import the project in [Vercel Dashboard](https://vercel.com/new)
3. Set all environment variables under **Settings → Environment Variables**:
   - `MONGODB_URI`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `SESSION_SECRET`
   - `GEMINI_API_KEY`
   - **Do not set** `GOOGLE_CALLBACK_URL` — the relative path is used automatically in production
4. Deploy. Vercel uses `vercel.json` to route all `/api/*` requests to `api/index.js`

### Update Google OAuth for Production

In Google Cloud Console, add your production callback URL to **Authorized redirect URIs**:
```
https://your-project.vercel.app/api/auth/google/callback
```

### MongoDB Atlas Network Access

In Atlas → Network Access, add `0.0.0.0/0` to allow connections from Vercel's dynamic IPs.

---

## Roadmap

### Known Issues
- `server.js` exists for optional local Express mode only; Vercel uses `api/index.js` in production
- Google OAuth requires authorized redirect URIs to be configured per environment
- Session duration is set to 7 days; may need tightening for institutional deployments

### Planned Features
- 📋 Bulk CSV import of student names into the Gradebook
- 📋 Assignment attachment support (images, PDFs)
- 📋 Email notifications for enrollment approvals
- 📋 Lecturer analytics dashboard (class average trends, submission rates)
- 📋 Multi-language feedback support (Arabic, English in addition to Hebrew)
- 📋 Role for teaching assistants

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request against `main`

Please follow existing conventions: TypeScript for all frontend files, Hebrew labels in UI components, inline error states instead of `alert()`, and Tailwind CSS for all styling.

---

## License

MIT © ST System Team
