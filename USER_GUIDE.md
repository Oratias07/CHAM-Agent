# 📖 Instructor User Guide

Welcome to the AI Code Grader! This guide will help you navigate the system and maximize your grading efficiency.

## 1. Getting Started
1.  **Login**: Click "Continue with Google" on the home screen. You must use your authorized faculty email.
2.  **Session Security**: For security, your session expires after **2 hours** of inactivity. You will be asked to re-authenticate if this limit is reached.

<div align="center">
  <img src="screenshots/login.png" alt="Login Screen" width="600" style="border-radius: 8px; border: 1px solid #ddd; margin: 15px 0;">
</div>

## 2. Setting Up an Exercise
Before grading, you must define the "Gold Standard" for the assignment:
- **Question**: Paste the exact instructions given to students.
- **Master Solution**: Provide a perfect implementation of the code.
- **Rubric**: Define the points allocation and specific things to look for.
- **Custom Instructions**: (Optional) Add specific bans like "No use of pointers" or "Must use do-while".

<div align="center">
  <img src="screenshots/exercise_setup.png" alt="Exercise Setup" width="600" style="border-radius: 8px; border: 1px solid #ddd; margin: 15px 0;">
</div>

## 3. The Grading Workflow
1.  **Select Student**: Choose the student name from the dropdown.
2.  **Paste Code**: Go to the **Student Code** tab and paste the submission.
3.  **Evaluate**: Click the ✨ **Evaluate & Save** button.
4.  **Review**: Check the Hebrew feedback and score. The system automatically saves this to the database and selects the next student in the list for you.

<div align="center">
  <img src="screenshots/grader_view.png" alt="Grader Interface" width="600" style="border-radius: 8px; border: 1px solid #ddd; margin: 15px 0;">
</div>

## 4. Class Management & History
- **Library Zone**: Central repository for course materials. Upload PDFs or Text files from your PC to share with students.
- **Snapshot Zone**: Archive of all historical student submissions and AI-generated feedback. Review past performance at any time.
- **Sheets View**: A collaborative-style grid for managing entire classrooms, featuring real-time editing and auto-save.
- **Gradebook Snapshots**: Save the current state of your gradebook as a "Snapshot" to restore or compare later.
- **Exporting**: Click **Download CSV** to get an Excel-ready file with correct Hebrew encoding.

<div align="center">
  <img src="screenshots/sheets_view.png" alt="Sheets Gradebook" width="600" style="border-radius: 8px; border: 1px solid #ddd; margin: 15px 0;">
</div>

## 5. Student Portal Features
Students have access to a specialized portal:
- **Materials**: Access lecturer-shared documents and maintain a **Private Research Vault** for personal study materials.
- **AI Assistant**: A course-grounded chatbot that helps students understand concepts, debug code, and prepare for assignments.
- **Evaluation Library**: Students can review all their past evaluations, scores, and feedback in one place.
- **Direct Messaging**: Instant communication channel with the lecturer.

## 6. Using the AI Assistant
If you are struggling to write a rubric or want to know why a student's code is failing, click the blue floating chat icon in the bottom right. The **Grading Assistant** knows the context of your current session and can help you troubleshoot.

<div align="center">
  <img src="screenshots/chatbot.png" alt="AI Chatbot Assistant" width="300" style="border-radius: 8px; border: 1px solid #ddd; margin: 15px 0;">
</div>

---
*For technical support, contact your IT administrator.*