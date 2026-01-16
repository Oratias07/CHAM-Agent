# 🤖 AI Code Grader Enterprise (v1.2.0)

![Version](https://img.shields.io/badge/version-1.2.0-indigo.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/Platform-Vercel-black)
![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-emerald)
![AI](https://img.shields.io/badge/AI-Gemini%203%20Flash-blue)

> **A professional-grade SaaS platform for automated code evaluation. Empowering educators with high-precision grading, Hebrew-localized feedback, and real-time class management.**

---

## 🏗️ Technical Architecture

This application is built as a **Full-Stack SaaS** using a decoupled architecture optimized for scalability and security:

*   **Frontend**: React 19 (Vite) with Tailwind CSS for a high-performance, responsive UI.
*   **Backend**: Node.js / Express.js deployed as **Vercel Serverless Functions**.
*   **Persistence**: MongoDB Atlas (Cloud) for user data and grade book history.
*   **Intelligence**: Google Gemini API (`gemini-3-flash-preview`) for sub-second code analysis.
*   **Security**: 
    *   **OAuth 2.0**: Google Identity Services for secure teacher authentication.
    *   **Session Management**: Encrypted sessions stored in MongoDB with a **strict 2-hour sliding expiration policy**.
    *   **Environment Isolation**: Sensitive keys (API_KEY, Client Secrets) are stored exclusively in Vercel's encrypted environment layer.

---

## ✨ Key Features

*   **⚡ Ultra-Low Latency Grading**: Optimized prompt engineering using the Gemini 3 Flash model for near-instant results.
*   **📊 Dynamic Gradebook (Sheets View)**: A collaborative-style grid for managing entire classrooms, featuring real-time editing and auto-save.
*   **🇮🇱 Hebrew Feedback Engine**: Proprietary system instructions ensuring professional, pedagogically sound feedback in Hebrew.
*   **📥 Smart Export**: Advanced CSV generation with BOM encoding for seamless integration with Microsoft Excel and Google Sheets.
*   **⚙️ Custom Constraints**: Ability to define forbidden logic (e.g., "No 'break' statements") which the AI enforces during evaluation.
*   **🤖 Integrated AI Assistant**: A real-time chat bot to help instructors refine rubrics or debug complex student submissions.

---

## 🚀 Documentation Links
- [User Guide](./USER_GUIDE.md) - How to use the platform.
- [Architecture Details](./ARCHITECTURE.md) - Deep dive into DevOps and Flow.

---

<div align="center">
  <sub>Built with Excellence for Educators by the AI Code Grader Team</sub>
</div>