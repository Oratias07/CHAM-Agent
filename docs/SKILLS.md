---
name: cham-agent-api
description: "Use this skill whenever you need to interact with, build on, or automate the CHAM Agent (AI Code Grader). Triggers include: managing academic courses, enrolling students, evaluating code submissions, querying gradebooks, grading sessions, or facilitating lecturer-student communication. Also use when scripting bulk grading, migrating course materials, or integrating the AI evaluation engine into external workflows."
license: Internal use only
---

# CHAM Agent — API Skill Reference

## Overview

CHAM Agent is a full-stack academic SaaS platform for automated code evaluation and course management. It provides a REST API covering the full course lifecycle: enrollment, material sharing, assignment management, AI grading, gradebook management, and real-time messaging.

- **Base URL:** `/api`
- **Auth:** Session-based via `express-session`. Requires Google OAuth 2.0 authentication (or dev bypass in development).
- **Content-Type:** `application/json` for all request bodies
- **Session cookie** must be included in all authenticated requests

---

## Quick Reference

| Goal | Endpoint |
|---|---|
| Evaluate student code (AI) | `POST /api/evaluate` |
| Join a course (student) | `POST /api/student/join-course` |
| Approve student enrollment | `POST /api/lecturer/courses/:id/approve` |
| Save a grade entry | `POST /api/grades/save` |
| Send a direct message | `POST /api/messages` |
| Get conversation thread | `GET /api/messages/:otherId` |
| Fetch course materials | `GET /api/lecturer/courses/:id/materials` |
| Upload private material | `POST /api/student/private-materials` |
| Get student submission history | `GET /api/student/submissions` |
| Save gradebook snapshot | `POST /api/lecturer/archive` |

---

## Authentication

### Google OAuth 2.0 (Production)
```
GET /api/auth/google         → Redirect to Google consent screen
GET /api/auth/google/callback → OAuth callback; sets session cookie
GET /api/auth/logout          → Destroy session; redirect to /
```

### Developer Bypass (Development Only)
```bash
curl -X POST /api/auth/dev \
  -H "Content-Type: application/json" \
  -d '{"role": "lecturer"}'
```
Valid roles: `"lecturer"` | `"student"`. Passcode configurable via `DEV_PASSCODE` env var. **Returns 403 when `NODE_ENV=production`.**

### Get Current User
```bash
GET /api/auth/me
# Returns the current authenticated user object, or null if not logged in
```

---

## AI Evaluation Engine

### Run AI Code Evaluation
```bash
POST /api/evaluate

{
  "question": "Implement a binary search algorithm that returns the index of target, or -1 if not found.",
  "masterSolution": "function binarySearch(arr, target) { ... }",
  "rubric": "1. Correctness (50%)\n2. Time complexity O(log n) (30%)\n3. Code clarity (20%)",
  "studentCode": "function binarySearch(arr, t) { ... }",
  "customInstructions": "Penalize use of linear search fallbacks."
}

# Response:
{
  "score": 8.5,
  "feedback": "הפתרון נכון ויעיל. המורכבות הזמן היא O(log n)..."
}
```

Notes:
- `masterSolution` and `customInstructions` are optional
- Score range: 0.0 – 10.0
- Feedback is always in Hebrew
- Requires an active session
- **Rate limited:** 100 requests/hour per IP
- **Security:** Input is processed by `buildSafePrompt()` for prompt injection detection; output is validated by `validateLLMOutput()` for score range enforcement
- **Provider:** Uses `LLMOrchestrator` with automatic fallback across Groq → Gemini → OpenAI

### Lecturer AI Assistant Chat
```bash
POST /api/chat

{
  "message": "How should I structure a rubric for a linked list exercise?",
  "context": "active exercise context string (optional)"
}

# Response: { "text": "..." }
```

### Student RAG Chat
```bash
POST /api/student/chat

{
  "message": "מה ההבדל בין מחסנית לתור?",
  "courseId": "course_object_id"
}

# Response: { "text": "..." }
# The response is grounded in course materials and the student's private vault
```

---

## Course Management (Lecturer)

### Create a Course
```bash
POST /api/lecturer/courses
{ "name": "Data Structures 2026", "code": "DS2026" }
```

### Update a Course
```bash
PUT /api/lecturer/courses/:id
{ "name": "Updated Name", "code": "NEW001" }
```

### Delete a Course
```bash
DELETE /api/lecturer/courses/:id
# Also deletes all associated materials
```

### Get Waitlist
```bash
GET /api/lecturer/courses/:id/waitlist

# Response:
{
  "pending": [{ "id": "googleId", "name": "...", "picture": "..." }],
  "enrolled": [{ "id": "googleId", "name": "...", "picture": "..." }]
}
```

### Approve a Student
```bash
POST /api/lecturer/courses/:id/approve
{ "studentId": "student_google_id" }
```

### Reject a Student
```bash
POST /api/lecturer/courses/:id/reject
{ "studentId": "student_google_id" }
```

### Remove an Enrolled Student
```bash
POST /api/lecturer/courses/:id/remove-student
{ "studentId": "student_google_id" }
```

### Get Enrollment History
```bash
GET /api/lecturer/courses/:id/waitlist-history
```

---

## Assignment Management (Lecturer)

### Create an Assignment
```bash
POST /api/lecturer/assignments
{
  "courseId": "course_id",
  "title": "Assignment 3 — Linked Lists",
  "question": "Implement a doubly linked list with insert, delete, and search.",
  "rubric": "1. Insert (30%)\n2. Delete (30%)\n3. Search (20%)\n4. Code quality (20%)",
  "openDate": "2026-03-01T00:00:00.000Z",
  "dueDate": "2026-03-15T23:59:00.000Z"
}
```

### List Assignments for a Course
```bash
GET /api/lecturer/courses/:courseId/assignments
```

### Update an Assignment
```bash
PUT /api/lecturer/assignments/:id
{ "title": "...", "question": "...", "rubric": "...", "openDate": "...", "dueDate": "..." }
```

### Delete an Assignment
```bash
DELETE /api/lecturer/assignments/:id
```

### Get All Submissions for an Assignment
```bash
GET /api/lecturer/assignments/:id/submissions
```

### Grant a Deadline Extension
```bash
POST /api/lecturer/submissions/:id/extension
{ "extensionUntil": "2026-03-20T23:59:00.000Z" }
```

---

## Gradebook (Lecturer)

### Save a Grade Entry
```bash
POST /api/grades/save
{
  "exerciseId": "ex-linked-list-1",
  "studentId": "student_google_id",
  "score": 8.5,
  "feedback": "פתרון יעיל. שים לב לטיפול במקרי קצה."
}
```

### Get All Grade Entries
```bash
GET /api/grades
# Returns all grades saved by the current user (lecturer)
```

### Save a Gradebook Snapshot (Archive)
```bash
POST /api/lecturer/archive
{
  "sessionName": "Midterm Exam 2026",
  "courseId": "course_id",
  "data": { ... },
  "stats": {
    "avgScore": 7.8,
    "distribution": { "high": 12, "mid": 8, "low": 3 }
  }
}
```

---

## Materials (Lecturer)

### List Course Materials
```bash
GET /api/lecturer/courses/:id/materials
```

### Upload a Material
```bash
POST /api/lecturer/materials
{
  "courseId": "course_id",
  "title": "Week 3 — Sorting Algorithms",
  "content": "full text content...",
  "isVisible": true
}
```

### Update a Material
```bash
PUT /api/lecturer/materials/:id
{ "title": "...", "content": "...", "isVisible": false }
```

### Delete a Material
```bash
DELETE /api/lecturer/materials/:id
```

---

## Student Endpoints

### Join a Course
```bash
POST /api/student/join-course
{ "code": "DS2026" }
```

### Switch Active Course
```bash
POST /api/student/switch-course
{ "courseId": "course_id" }
```

### Get Assignments for Active Course
```bash
GET /api/student/courses/:courseId/assignments
# Returns assignments with personal submission status and lock state
```

### Submit Code for an Assignment
```bash
POST /api/student/assignments/:id/submit
{ "code": "function myLinkedList() { ... }" }

# Response:
{
  "score": 7.5,
  "feedback": "הפתרון הוא נכון ברובו. חסרה בדיקת null..."
}
```

### Get Personal Submission History
```bash
GET /api/student/submissions
```

### Get Course Materials
```bash
GET /api/student/courses/:courseId/materials
# Returns both lecturer-shared and student's own private materials
```

### Upload a Private Material
```bash
POST /api/student/private-materials
{
  "courseId": "course_id",
  "title": "My Study Notes",
  "content": "...",
  "fileName": "notes.txt",
  "fileType": "text/plain",
  "fileSize": 2048
}
```

### Mark a Material as Viewed
```bash
POST /api/student/materials/:id/view
```

### Get Course Contacts
```bash
GET /api/student/course-contacts/:courseId
# Returns: { lecturer: {...}, students: [...] }
```

### Get Enrollment History
```bash
GET /api/student/waitlist-history
```

---

## Messaging

### Get Conversation Thread
```bash
GET /api/messages/:otherId
# otherId = googleId of the other user
```

### Send a Message
```bash
POST /api/messages
{
  "receiverId": "recipient_google_id",
  "text": "Hello, I have a question.",
  "replyToId": "message_id",     # optional
  "replyText": "Original text"   # optional preview
}
```

### Edit a Message
```bash
PUT /api/messages/:id
{ "text": "Corrected message text." }
```

### Delete a Message
```bash
DELETE /api/messages/:id?forEveryone=false
# forEveryone=true removes for all participants
# forEveryone=false removes only for the requesting user
```

---

## Sync & Notifications

### Lecturer Sync (poll every 5s)
```bash
GET /api/lecturer/sync
# Returns: { unreadMessages: number, pendingCount: number }
```

### Student Sync (poll every 5s)
```bash
GET /api/student/sync
# Returns: { unreadMessages: number, alert: string | null }
```

### Clear Student Notifications
```bash
POST /api/student/clear-notifications
```

---

## Data Model Reference

### User
```json
{
  "googleId": "google_123",
  "name": "Dr. Sarah Cohen",
  "email": "sarah@university.edu",
  "picture": "https://...",
  "role": "lecturer",
  "activeCourseId": "course_abc",
  "enrolledCourseIds": ["course_abc"],
  "pendingCourseIds": [],
  "unseenApprovals": 0
}
```

### Course
```json
{
  "id": "course_abc",
  "name": "Data Structures 2026",
  "code": "DS2026",
  "lecturerId": "google_456",
  "lecturerName": "Dr. Sarah Cohen",
  "enrolledStudentIds": ["google_123"],
  "pendingStudentIds": []
}
```

### Submission
```json
{
  "assignmentId": "assign_xyz",
  "courseId": "course_abc",
  "studentId": "google_123",
  "code": "...",
  "score": 8.5,
  "feedback": "פתרון מצוין...",
  "status": "evaluated",
  "timestamp": "2026-03-15T10:30:00.000Z",
  "extensionUntil": null
}
```

---

## Error Reference

| Status | Meaning | Action |
|---|---|---|
| `401` | Not authenticated | Redirect to login |
| `403` | Wrong role | Verify user role (`lecturer` vs `student`) |
| `404` | Resource not found | Check course ID or assignment ID |
| `400` | Invalid request body | Check required fields and format |
| `429` | Rate limit exceeded | Wait for the rate limit window to reset (1 hour for LLM, 15 min for submissions) |
| `500` | Server error | Check LLM API quotas (Groq/Gemini/OpenAI) or MongoDB connectivity |

---

## Common Workflows

### Full Grading Session (Lecturer)
```javascript
// 1. Set up an exercise
const evalResult = await fetch('/api/evaluate', {
  method: 'POST',
  body: JSON.stringify({ question, rubric, masterSolution, studentCode })
});
const { score, feedback } = await evalResult.json();

// 2. Save to gradebook
await fetch('/api/grades/save', {
  method: 'POST',
  body: JSON.stringify({ exerciseId: 'ex-1', studentId, score, feedback })
});

// 3. Archive the session
await fetch('/api/lecturer/archive', {
  method: 'POST',
  body: JSON.stringify({ sessionName: 'Midterm 2026', courseId, data: gradebookState, stats })
});
```

### Student Assignment Submission
```javascript
// Submit code — AI evaluation runs automatically
const result = await fetch(`/api/student/assignments/${assignmentId}/submit`, {
  method: 'POST',
  body: JSON.stringify({ code: studentCode })
});
const { score, feedback } = await result.json();
// feedback is in Hebrew; score is 0.0–10.0
```

---

## Critical Rules

- **All LLM API keys are server-side only** — never expose `GEMINI_API_KEY`, `GROQ_API_KEY`, or `OPENAI_API_KEY` to the frontend
- **Use `googleId` as student identifier** — not MongoDB `_id` — in all API calls
- **Rubric is required** for AI evaluation — the model needs grading criteria to produce objective scores
- **Role isolation** — students cannot access any `/api/lecturer/*` routes
- **Hebrew is the required feedback language** — all AI-generated feedback must be in Hebrew
- **Dev bypass sends `{ role }` only** — passcode via `DEV_PASSCODE` env var; valid values are `"lecturer"` and `"student"`. **Disabled in production.**
- **Rate limits** — `/evaluate`, `/chat`, `/student/chat`: 100/hr; `/student/assignments/:id/submit`: 20/15min
- **Prompt injection protection** — all evaluation endpoints use `buildSafePrompt()` + `validateLLMOutput()`
