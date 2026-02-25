---
name: st-system-api
description: "Use this skill whenever the user wants to interact with, build on, or automate the AI Code Grader (ST System). Triggers include: managing academic courses, enrolling students via codes, evaluating code submissions using the AI core, querying gradebooks, or facilitating communication between lecturers and students. Also use when building scripts for bulk grading, migrating course materials, or integrating the evaluation engine into external workflows."
license: Internal use only
---

# ST System – Skill Reference

## Overview

The ST System (AI Code Grader) is a full-stack platform for automated academic evaluation. It provides a REST API for managing the lifecycle of a course, from student enrollment to AI-powered pedagogical feedback.

Base URL: `/api`
Auth: Session-based via `express-session`. Requires Google OAuth 2.0 authentication.

---

## Quick Reference

| Goal | Approach |
|------|----------|
| Evaluate student code | `POST /api/evaluate` with rubric/solution |
| Join a course (Student) | `POST /api/student/join-course` with `{ "code": "..." }` |
| Approve student (Lecturer) | `POST /api/lecturer/courses/:id/approve` |
| Save a grade | `POST /api/grades/save` |
| Send direct message | `POST /api/messages` |
| Fetch course materials | `GET /api/lecturer/courses/:id/materials` |

---

## Authentication
```bash
# Authentication is handled via Google OAuth 2.0
# For development, use the dev login bypass:
curl -X POST /api/auth/dev \
  -d '{"passcode": "1234"}' \
  -H "Content-Type: application/json"
```

The session cookie must be included in subsequent requests.

---

## Core Endpoints

### Evaluation Engine
```bash
# Execute AI Grading
POST /api/evaluate
{
  "question": "Implement a binary search...",
  "masterSolution": "function binarySearch()...",
  "rubric": "1. Correctness (50%)...",
  "studentCode": "...",
  "customInstructions": "Focus on time complexity."
}

# Save Result to Gradebook
POST /api/grades/save
{
  "exerciseId": "ex-1",
  "studentId": "google-id-123",
  "score": 8.5,
  "feedback": "Excellent logic, but check edge cases."
}
```

### Course Management
```bash
# Create Course (Lecturer)
POST /api/lecturer/courses
{ "name": "Data Structures 101", "code": "DS2026" }

# Get Waitlist
GET /api/lecturer/courses/:id/waitlist

# Approve Student
POST /api/lecturer/courses/:id/approve
{ "studentId": "google-id-xyz" }
```

### Communication
```bash
# Send Message
POST /api/messages
{
  "receiverId": "target-google-id",
  "text": "Hello, I have a question about the last exercise."
}

# Get Conversation
GET /api/messages/:otherId
```

---

## Data Models

### User Object
```json
{
  "id": "google_123",
  "name": "John Doe",
  "email": "john@university.edu",
  "role": "lecturer | student",
  "enrolledCourseIds": ["string"],
  "activeCourseId": "string"
}
```

### Course Object
```json
{
  "id": "course_abc",
  "name": "string",
  "code": "string",
  "lecturerName": "string",
  "enrolledStudents": ["google_id"]
}
```

---

## Error Handling

| Code | Meaning | Action |
|------|---------|--------|
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | Check user role (Lecturer vs Student) |
| 404 | Not found | Verify Course Code or ID |
| 422 | Validation error | Check required fields (e.g., missing rubric) |
| 500 | AI Engine Error | Check Gemini API quota or connectivity |

---

## Common Workflows

### Switch Active Course (Student)
```javascript
// Switch context to a different enrolled course
const response = await fetch('/api/student/switch-course', {
  method: 'POST',
  body: JSON.stringify({ courseId: 'new_course_id' })
});
```

### Archive a Grading Session
```javascript
// Save current gradebook state to the library
await fetch('/api/lecturer/archive', {
  method: 'POST',
  body: JSON.stringify({ 
    sessionName: "Midterm 2026",
    data: gradebookState,
    stats: { avgScore: 8.2 }
  })
});
```

---

## Critical Rules

- **Never expose the Gemini API Key** — always use `process.env.GEMINI_API_KEY` on the server
- **Rubrics are mandatory** — the AI engine requires a rubric to provide objective feedback
- **Session Persistence** — ensure `connect-mongo` is active for multi-user stability
- **Hebrew Support** — the system defaults to Hebrew for pedagogical feedback; ensure RTL rendering in UI
- **Role Isolation** — Students must never access `/api/lecturer/*` endpoints

---

## Dependencies

- Backend: `express`, `mongoose`, `passport`, `@google/genai`
- Frontend: `apiService.ts` for all network interactions
- Environment: `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
