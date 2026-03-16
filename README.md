# 🤖 AI Code Grader Enterprise (v1.3.0)

![Version](https://img.shields.io/badge/version-1.3.0-indigo.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/Platform-Vercel-black)
![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-emerald)
![AI](https://img.shields.io/badge/AI-Gemini%203%20Flash-blue)

<div align="center">
  <img src="screenshots/hero.png" alt="AI Code Grader Hero" width="800" style="border-radius: 10px; margin: 20px 0; border: 1px solid #e2e8f0 shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
  <p><em>The ultimate professional-grade SaaS platform for automated code evaluation.</em></p>
</div>

> **Empowering educators with high-precision grading, Hebrew-localized feedback, and real-time class management.**

---

## 🏗️ Technical Architecture

This application is built as a **Full-Stack SaaS** using a decoupled architecture optimized for scalability and security:

*   **Frontend**: React 19 (Vite) with Tailwind CSS for a high-performance, responsive UI.
*   **Backend**: Node.js / Express.js deployed as **Vercel Serverless Functions**.
*   **Persistence**: MongoDB Atlas (Cloud) for user data, grade book history, and real-time messaging.
*   **Intelligence**: Google Gemini API (`gemini-3-flash-preview`) with **RAG** for course-grounded assistance.
*   **Security**: 
    *   **OAuth 2.0**: Google Identity Services for secure teacher authentication.
    *   **Session Management**: Encrypted sessions stored in MongoDB with a **strict 2-hour sliding expiration policy**.
    *   **Environment Isolation**: Sensitive keys (API_KEY, Client Secrets) are stored exclusively in Vercel's encrypted environment layer.

---

## ✨ Key Features

*   **⚡ Ultra-Low Latency Grading**: Optimized prompt engineering using the Gemini 3 Flash model for near-instant results.
*   **📊 Dynamic Gradebook (Sheets View)**: A collaborative-style grid for managing entire classrooms, featuring real-time editing and auto-save.
*   **📚 Library & Snapshot Zones**: Centralized material management and historical evaluation archives for lecturers.
*   **🛡️ Private Research Vault**: Secure student-only storage for personal study materials used as AI context.
*   **💬 Real-Time Messaging**: Integrated direct chat between lecturers and students with instant notifications.
*   **🇮🇱 Hebrew Feedback Engine**: Proprietary system instructions ensuring professional, pedagogically sound feedback in Hebrew.
*   **⚙️ Custom Constraints**: Ability to define forbidden logic (e.g., "No 'break' statements") which the AI enforces during evaluation.
*   **🤖 RAG-Powered AI Assistant**: A real-time chat bot grounded in course materials to help students and instructors.

---

## 🚀 Documentation Links
- [User Guide](./USER_GUIDE.md) - How to use the platform.
- [Architecture Details](./ARCHITECTURE.md) - Deep dive into DevOps and Flow.

---

<div align="center">
  <sub>Built with Excellence for Educators by the AI Code Grader Team</sub>
</div>