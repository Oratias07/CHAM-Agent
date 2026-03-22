# USER_GUIDE.md — ST System User Guide

> **Note on the interface:** The ST System UI is in **Hebrew (עברית)** and uses right-to-left (RTL) layout throughout. All buttons, labels, error messages, and AI feedback are displayed in Hebrew. This guide uses the Hebrew label names where relevant so you can find them on screen.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Lecturer Guide](#lecturer-guide)
- [Student Guide](#student-guide)

---

## Getting Started

### Accessing the System

Open [https://stsystem.vercel.app](https://stsystem.vercel.app) in your browser. You will see the ST System login screen.

### Login Options

**Option 1 — Google Login (Production)**
1. Click **"המשך עם Google"** (Continue with Google)
2. Sign in with your Google account
3. If this is your first login, you will be asked to select your role (Lecturer or Student)

**Option 2 — Developer Bypass (Development / Testing)**
1. Click **"Developer Bypass"**
2. Click either **"מרצה"** (Lecturer) or **"סטודנט"** (Student)
3. You are logged in immediately — no password required

### Role Selection (First Login Only)

On your first Google login, the system asks you to choose your role:
- **מרצה** — Lecturer: full system access, course creation, grading
- **סטודנט** — Student: course enrollment, assignment submission, AI assistant

This choice is saved permanently to your account.

---

## Lecturer Guide

### Overview

After logging in as a lecturer, you land on the **Lecturer Dashboard**. The left sidebar contains navigation tabs:

| Hebrew Label | Section |
|---|---|
| קורסים | Courses |
| סטודנטים | Students (Waitlist) |
| משימות | Assignments |
| ציונים | Gradebook |
| ארכיב | Archive |

---

### 1. Creating a Course

1. Click **"קורסים"** in the sidebar
2. In the **"צור קורס חדש"** (Create New Course) form, enter:
   - **שם קורס** — Course name (e.g. "מבני נתונים 2026")
   - **קוד קורס** — A unique 6-character code students will use to join (e.g. "DS2026")
3. Click **"צור קורס"** (Create Course)
4. The course appears in the list on the left

**Editing a course:** Click the edit icon next to any course name to update its name or code.

**Deleting a course:** Click the delete icon. This also removes all associated materials.

---

### 2. Sharing Course Materials

1. With a course selected, click **"קורסים"** → select the course → scroll to **Library Zone**
2. Fill in a **כותרת** (Title) and paste the **תוכן** (Content)
3. Click **"הוסף חומר"** (Add Material)
4. Students enrolled in the course will see the material in their portal

**Editing materials:** Click the edit (✏️) icon on any material card.

**Hiding a material:** Toggle **גלוי לסטודנטים** (Visible to students) off — the material remains in your library but is hidden from students.

---

### 3. Managing Student Enrollment

1. Click **"סטודנטים"** in the sidebar
2. Select a course from the dropdown

**Pending Students (ממתינים לאישור):**
- Students who requested to join appear here
- Click ✅ to approve — the student is enrolled and notified
- Click ❌ to reject — the request is declined

**Enrolled Students (סטודנטים רשומים):**
- Hover over any student row and click ❌ to remove them from the course

**History (היסטוריית רשימת המתנה):**
- All past approval and rejection decisions are logged here with timestamps

---

### 4. Creating Assignments

1. Click **"משימות"** in the sidebar
2. Select a course
3. Click **"משימה חדשה"** (New Assignment) and fill in:
   - **כותרת** — Assignment title
   - **שאלה** — Full question text given to students
   - **רובריקה** — Grading rubric (criteria and point weights)
   - **תאריך פתיחה** — Open date (when students can start submitting)
   - **תאריך סגירה** — Due date
4. Click **"צור משימה"** (Create Assignment)

**Extending a deadline:** Click on an assignment → view its submissions → find the student → click **"הארך מועד"** to set a new personal deadline.

---

### 5. AI Code Grading (Manual Evaluation)

The grading engine allows you to evaluate any student code submission manually.

1. In the top section of the dashboard, select an **exercise** from the dropdown (or click **"תרגיל חדש"** to add one)
2. Use the tabs to fill in each piece of context:
   - **שאלה** — Paste the exercise question
   - **פתרון** — Paste a model (master) solution
   - **רובריקה** — Define grading criteria in plain text or Markdown
   - **הגשה** — Paste the student's code
   - **מתקדם** — Optional: add custom constraints (e.g. "הענש על שימוש במשתנים גלובליים")
3. Select the student from the **student dropdown**
4. Click **"הפעל הערכה"** (Execute Evaluation)
5. The AI result appears on the right: a **score (0–10)** and detailed **Hebrew feedback**

**Auto-Advance:** Toggle **"מעבר אוטומטי"** to automatically move to the next student after each evaluation.

**Load Example:** Click **"טען דוגמה"** to pre-fill the active tab with a sample linked-list exercise.

**Save to Gradebook:** After reviewing the result, click **"שמור לגרדבוק"** to record the score.

---

### 6. Gradebook (Sheets View)

1. Click **"ציונים"** in the sidebar
2. The gradebook displays a **exercises × students grid**

**Adding content:**
- Click **"הוסף תרגיל"** (floating button, bottom center) to add a new exercise row
- Click **"+ הוסף סטודנט"** in the header to add a student column
- Edit student names directly in the column headers

**Entering scores:**
- Click any score cell and type a number
- Color coding: 🟢 ≥ 90%, 🔵 ≥ 70%, 🟡 ≥ 50%, 🔴 < 50%

**Entering feedback:**
- Each student/exercise combination has a **משוב** (feedback) textarea below the score
- Type Hebrew feedback directly; it auto-saves

**Exporting:**
- Click **"ייצא CSV"** to download an Excel-compatible file with Hebrew column headers
- The file uses UTF-8 BOM encoding to ensure Hebrew renders correctly in Excel

**Clearing:**
- Click **"נקה הכל"** (Clear All) to reset the entire gradebook

---

### 7. Archiving a Grading Session

1. Click **"ארכיב"** in the sidebar
2. Enter a **session name** (e.g. "מבחן אמצע 2026")
3. Click **"שמור ארכיב"** — the current gradebook state is saved as a snapshot

**Viewing and restoring archives:**
- All past snapshots appear as cards showing: date, class average, and score distribution
- Click **"שחזר סשן"** on any card to restore that gradebook state

---

### 8. AI Grading Assistant (Chatbot)

A floating blue **💬** button appears in the bottom-right corner of every view.

1. Click it to open the **עוזר הערכה** (Grading Assistant)
2. Ask questions in Hebrew or English — the assistant knows the context of your currently active exercise
3. Example questions:
   - "למה הסטודנט קיבל ציון נמוך?"
   - "כיצד לנסח רובריקה לשאלה זו?"
   - "מהי הגישה הנכונה לפתרון?"

---

### 9. Direct Chat with Students

1. Click the **💬** messages icon in the sidebar
2. A list of enrolled students appears — click any name to open a chat thread
3. Type a message and press **Enter** or click the send button

**Message options:** Hover over any message to see options (reply, edit, copy, delete).

---

## Student Guide

### Overview

After logging in as a student and enrolling in a course, you land on the **Student Portal**. The left sidebar contains:

| Hebrew Label | Section |
|---|---|
| מסמכים | Course Materials |
| משימות | Assignments |
| עוזר AI | AI Study Assistant |
| הודעות | Messages (Inbox) |
| ספרייה | Evaluation Library |

---

### 1. Joining a Course

1. Click **"+ הצטרף לקורס נוסף"** at the bottom of the sidebar (or you'll see it prominently if you have no courses yet)
2. Enter the **6-character course code** provided by your lecturer
3. Click **"שלח בקשה"** (Send Request)
4. Your request is sent to the lecturer for approval. You will be notified when approved.

---

### 2. Switching Between Courses

If enrolled in multiple courses, a **dropdown** appears at the top of the sidebar.
- Select any course to switch your active context — all views update to show that course's materials, assignments, and contacts.

---

### 3. Viewing Course Materials

1. Click **"מסמכים"** in the sidebar
2. **חומרי מרצה** (Lecturer Materials) — documents shared by your lecturer
3. **חומרים פרטיים** (Private Materials) — your own uploaded files
4. Click any card → **"צפה במסמך"** to open the full-screen reader

**Uploading private materials:**
1. Click **"העלה קובץ"** in the top right of the Materials view
2. Select a text file from your computer
3. The file is saved to your Private Research Vault and is used as context by the AI assistant

---

### 4. Submitting an Assignment

1. Click **"משימות"** in the sidebar
2. You will see all assignments for your active course, each showing:
   - Title and due date
   - Status badge: **"ממתין להגשה"** (pending) or **"הוגש"** (submitted)
   - Lock badge if the assignment is closed: **"טרם נפתח"** or **"הגשה נסגרה"**
3. Click **"התחל הגשה"** on an open assignment
4. The right panel shows the **task description**
5. Paste your code into the **"הפתרון שלך"** (Your Solution) textarea
6. Click **"הגש להערכה"** (Submit for Evaluation)
7. The AI evaluates your code immediately and shows:
   - A **score** (percentage)
   - Detailed **Hebrew feedback** explaining strengths and weaknesses

**Re-submitting:** If the assignment is still open, you can click **"עדכן הגשה"** to submit new code.

---

### 5. AI Study Assistant

1. Click **"עוזר AI"** in the sidebar (or use the floating **💬** button)
2. The assistant is grounded in:
   - All materials your lecturer shared for the course
   - Your own private materials from the Research Vault
3. Type any question — the assistant can only answer based on course materials (it does not have access to the internet or general knowledge)
4. Example questions:
   - "הסבר לי את הרעיון של רשימה מקושרת"
   - "מה ההבדל בין מחסנית לתור?"
   - "עזור לי להבין את הקוד הבא..."

---

### 6. Evaluation Library

1. Click **"ספרייה"** in the sidebar
2. All your past evaluated submissions appear as cards showing:
   - Assignment ID
   - Evaluation date
   - **ציון סופי** (Final Score)
   - Full Hebrew feedback from the AI

---

### 7. Direct Chat

1. Click **"הודעות"** in the sidebar
2. You will see:
   - **מרצה הקורס** — your lecturer
   - Other enrolled students
3. Click any contact to open a chat thread
4. Type a message and press **Enter** or click send

**Message options:** Hover over any message to see: **השב** (Reply), **העתק** (Copy), **ערוך** (Edit), **מחק** (Delete).

---

### 8. Notifications

- A **red badge** on the **"הודעות"** tab shows how many unread messages you have
- When you receive a new message, a **toast notification** appears in the top-right corner — click **"פתח שיחה"** to go directly to the conversation
- When a lecturer approves your enrollment request, a notification badge appears and clears when you visit the portal

---

## Tips and Notes

- **Hebrew feedback is intentional** — all AI-generated evaluation feedback is in Hebrew to provide pedagogically appropriate academic language
- **Sessions** — if you are inactive for an extended period, you may need to log in again
- **Private materials are private** — your uploaded files are only visible to you and used only to ground your personal AI assistant; lecturers cannot see them
- **Assignments lock automatically** — once the due date passes, you cannot submit new code (unless the lecturer grants you an extension)
