# 🤖 AI Code Grader

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/react-19.0-blue)
![Gemini](https://img.shields.io/badge/AI-Gemini%203%20Pro-purple)

> **An automated evaluation tool for student code submissions, providing scores and professional feedback in Hebrew using Google's Gemini 3 Pro model with advanced reasoning.**

---

## 📸 Application Preview

| **Setup & Configuration** | **Evaluation & Feedback** |
|:---:|:---:|
| <img src="./screenshots/setup.png" alt="Setup Screen" width="400"/> | <img src="./screenshots/result.png" alt="Evaluation Result" width="400"/> |
| *Define Question, Solution, and Rubric* | *Receive Instant AI Score & Feedback* |

| **Class Gradebook** | **Example: C Programming** |
|:---:|:---:|
| <img src="./screenshots/gradebook.png" alt="Gradebook View" width="400"/> | <img src="./screenshots/c_example.png" alt="C Code Example" width="400"/> |
| *Track progress and export to Excel* | *Detects logical errors (e.g., duplicated logic)* |

---

## 📖 Table of Contents
- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [How to Use](#-how-to-use)
- [Deployment (Free)](#-deployment-free)
- [FAQ](#-faq)

---

## 🧐 About the Project

The **AI Code Grader** is designed to streamline the grading process for programming instructors. Instead of manually debugging every line of student code, this tool uses advanced AI to analyze submissions against a master solution and a defined rubric.

It generates a **numerical score (0-10)** and detailed, constructive **feedback in Hebrew**, allowing teachers to focus on teaching rather than grading mechanics.

---

## ✨ Key Features

*   **🤖 Advanced AI Reasoning**: Uses **Gemini 3 Pro** with Thinking Mode to deeply analyze code logic, syntax, and style.
*   **💬 AI Chat Assistant**: Integrated chatbot to answer questions about grading or code.
*   **🇮🇱 Hebrew Feedback**: Generates professional, culturally appropriate feedback automatically.
*   **⚡ Rapid Grading Workflow**: Auto-saves results and immediately advances to the next student.
*   **📊 Integrated Gradebook**: A "Sheets-like" view to manage the entire class progress.
*   **💾 Smart Export**: Download grades to CSV with full Hebrew support (Excel/Google Sheets compatible).
*   **📝 Customizable Rubrics**: Define exactly how you want the AI to grade.

---

## 🚀 How to Use

Follow this step-by-step guide to grade your class efficiently.

### Step 1: Define the Assessment
In the **Single Grader** view, fill out the first three tabs on the left panel. This provides the context for the AI.
1.  **Question**: Paste the assignment description.
2.  **Master Solution**: Provide the correct code implementation.
3.  **Rubric**: Define the scoring criteria.

### Step 2: Select a Student & Paste Code
1.  Select a student from the dropdown menu at the top.
2.  Switch to the **Student Code** tab.
3.  Paste the student's submission.

### Step 3: Evaluate
Click the **✨ Evaluate & Save** button.
The system will:
*   Send the code to the AI.
*   Generate a score and feedback.
*   **Auto-save** the result to the Gradebook.
*   **Auto-advance** to the next student in the list.

### Step 4: Class Management (Sheets View)
Switch to **Sheets View** to see the big picture.
*   **Rename Students**: Click on any name to edit it.
*   **Edit Grades**: Manually override scores or feedback if needed.
*   **Add Exercises**: Click "Complete & Start Next Exercise" when finished with the current one.

### Step 5: Export Data
Click the green **Download CSV** button in the Gradebook header.
*   The file uses a special encoding (BOM) to ensure Hebrew text appears correctly in Excel.

---

## ☁️ Deployment (Free)

You can upload this system to the cloud to use it on any computer without paying. The recommended method is **Vercel** or **Netlify**.

### Prerequisites
1.  A free [GitHub](https://github.com/) account.
2.  Your Google Gemini API Key.

### Steps to Deploy on Vercel
1.  **Push to GitHub**: Upload your project code to a new repository on GitHub.
2.  **Sign up for Vercel**: Go to [vercel.com](https://vercel.com) and sign up using your GitHub account.
3.  **Add New Project**: Click "Add New..." > "Project" and select your repository.
4.  **Configure Environment Variables**:
    *   In the project settings during setup, look for "Environment Variables".
    *   Add Name: `API_KEY`
    *   Add Value: `your-google-gemini-api-key-here`
5.  **Deploy**: Click "Deploy".
6.  **Done!** Vercel will give you a domain (e.g., `ai-grader.vercel.app`). You can now open this link on **any computer** or tablet to grade students.

---

## ❓ FAQ

**Q: How do I open the CSV in Google Sheets?**
A: Open Google Sheets → File → Import → Upload. The file is formatted to work perfectly with Hebrew text.

**Q: Can I grade Python/Java/C++?**
A: Yes! The AI understands almost all major programming languages. Just paste the code.

**Q: Where is the data saved?**
A: Currently, data is held in your browser's memory. If you refresh the page, data resets (unless you are using the persistence version). **Always download your CSV before closing the tab!**

---

<div align="center">
  <sub>Built with ❤️ by the AI Code Grader Team</sub>
</div>