# Skills Developed & Technologies Mastered

This document outlines the professional skills and technical competencies demonstrated and developed through the creation of the **AI Code Grader (ST System)**.

## 1. Full-Stack Web Development
- **Frontend Mastery**: Building highly responsive, accessible, and "crafted" user interfaces using **React 19** and **TypeScript**.
- **Backend Architecture**: Designing robust server-side logic with **Node.js** and **Express**, including RESTful API design and middleware integration.
- **Database Management**: Implementing scalable data models and complex queries using **MongoDB** and **Mongoose**.
- **State Management**: Handling complex application states across multiple roles (Lecturer/Student) using React hooks and context patterns.

## 2. Artificial Intelligence & LLM Integration
- **Gemini API Implementation**: Advanced integration of **Google Gemini 3.0 Flash** (and Flash 2.5) for automated code analysis, grading, and pedagogical feedback.
- **Advanced Prompt Engineering**: Crafting sophisticated system instructions with specific JSON output schemas to ensure AI outputs are accurate, professional, and culturally relevant (Hebrew language support).
- **Automated Evaluation**: Developing logic to compare student submissions against master solutions and rubrics using AI reasoning.

## 3. Workflow Automation & UX Design
- **Intelligent Workflows**: Implementing "Auto-Advance" logic that streamlines the grading process by automatically transitioning to the next student after evaluation.
- **Real-time Status Tracking**: Designing visual indicators for "Saved" states and "Evaluating" progress to provide immediate feedback to the user.
- **Modern CSS**: Expert-level usage of **Tailwind CSS** for utility-first styling, including custom theme extensions, dark mode support, and complex animations (shimmer effects, logo orbits).
- **Design Systems**: Implementing a cohesive visual language with a focus on typography (Assistant, Inter), spacing, and interactive feedback.

## 4. Security & Authentication
- **OAuth 2.0 Integration**: Implementing secure "Sign in with Google" flows using **Passport.js**.
- **Session Management**: Handling secure user sessions with `express-session` and `connect-mongo` for persistent server-side state.
- **Role-Based Access Control (RBAC)**: Designing a system that strictly enforces permissions between different user types (Lecturers vs. Students).

## 5. Software Engineering Patterns
- **Service-Oriented Architecture**: Separating concerns by abstracting API calls and AI logic into dedicated service modules (`apiService.ts`, `geminiService.ts`).
- **Type Safety**: Leveraging **TypeScript** across the entire stack to catch errors at compile-time and improve developer productivity.
- **Component-Driven Development**: Building a library of reusable UI components (Buttons, Inputs, Modals) for maintainability.

## 6. DevOps & Tooling
- **Build Systems**: Configuring and optimizing **Vite** for fast development and production-ready builds.
- **Deployment**: Managing environment variables and deployment configurations for platforms like **Vercel**.
- **Quality Assurance**: Implementing custom linting and type-checking scripts (`npm run lint`) to maintain code health.

## 7. Specialized Domain Knowledge
- **EdTech Logic**: Understanding the unique requirements of educational software, including gradebooks, course enrollment codes, and academic integrity monitoring.
- **Localization**: Implementing right-to-left (RTL) friendly designs and multi-language support (Hebrew feedback).
