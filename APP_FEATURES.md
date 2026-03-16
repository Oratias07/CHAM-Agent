# 📖 Source of Truth - AI Code Grader SaaS (v1.3.0)

## 🚀 Project Overview
A high-end SaaS platform for academic code grading and course management. It features a decoupled architecture with a React frontend and an Express/MongoDB backend.

## 🛠️ Core Architecture
- **Frontend**: React 19, Vite, Tailwind CSS.
- **Backend**: Express.js (api/index.js), Mongoose (MongoDB Atlas).
- **AI**: Google Gemini 3 Flash (via @google/genai) with **RAG** capabilities.
- **Auth**: Google OAuth 2.0 (Passport.js).
- **Real-time**: 5s Polling for messaging and notifications.

## 📂 Key Features & Components

### 1. Authentication & Roles
- **Lecturer**: Can create courses, manage materials (Library Zone), grade submissions (Core), view history (Snapshot Zone), and manage class grids (Sheets).
- **Student**: Can join courses, view shared materials, maintain a **Private Research Vault**, submit assignments, and chat with a course-grounded AI assistant.

### 2. Course Management
- **Nodes (Courses)**: Unique 6-character codes for joining.
- **Waitlist**: Decisions tracked as "Agreed" or "Not Agreed".
- **Library Zone**: Central repository for course materials with PC upload support.

### 3. Grading Engine (The "Core")
- **AI Evaluation**: Gemini 3 Flash analyzes student code against a question, master solution, and rubric.
- **Hebrew Feedback**: Professional pedagogical feedback in Hebrew.
- **Editor**: 10-line default view with automatic line wrapping.
- **Auto-Advance**: Seamlessly move to the next student in the queue.

### 4. Communication
- **Direct Messaging**: Real-time polling for chat between users.
- **Notifications**: Unread message badges and instant alerts.

### 5. Data Persistence & History
- **MongoDB**: Stores users, courses, grades, submissions, materials, and messages.
- **Snapshot Zone**: Archive of all historical student submissions and feedback.
- **Gradebook Snapshots**: Save and restore full states of the gradebook.

## 📜 Development Rules
1. **Never remove existing features** unless explicitly requested.
2. **Extend and enhance** existing logic.
3. **Maintain Hebrew UI** for student feedback and core academic interactions.
4. **Security First**: API keys must remain server-side.
5. **Real-time feel**: Use polling for chat and sync endpoints.

## 🗺️ File Map
- `/api/index.js`: Main backend logic.
- `/src/App.tsx`: Main entry point & Auth routing.
- `/src/LecturerDashboard.tsx`: Lecturer-facing UI.
- `/src/components/StudentPortal.tsx`: Student-facing UI.
- `/src/services/apiService.ts`: Frontend API client.
- `/src/types.ts`: TypeScript interfaces.
- `/SOURCE_OF_TRUTH.md`: Master source of truth.
