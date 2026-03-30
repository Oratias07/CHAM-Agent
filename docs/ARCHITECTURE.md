# ST-System Architecture

## Overview

ST-System is an EdTech SaaS platform for automated code assessment. It runs as a Vercel Serverless Function (Express.js) with a React 19 frontend, MongoDB Atlas for persistence, and multiple LLM providers for AI evaluation.

## System Architecture

```
Browser (React 19 + TypeScript + Tailwind CDN)
         | HTTPS /api/*
         v
Vercel Serverless Function (api/index.js - Express.js)
    +-- Google OAuth 2.0 (Passport.js)
    +-- Rate Limiting (express-rate-limit)
    +-- Prompt Injection Guard (services/promptGuard.js)
    +-- MongoDB Atlas (Mongoose ODM)
    +-- LLM Orchestrator (lib/llm/orchestrator.js)
    |       +-- Groq (llama-3.3-70b, free tier)
    |       +-- Google Gemini (2.0-flash, 2.0-flash-lite)
    |       +-- OpenAI (gpt-4o-mini, fallback)
    +-- Judge0 Sandbox (services/codeSandbox.js)
```

## CHAM: Contextual Hybrid Assessment Model

The core evaluation pipeline runs 3 layers sequentially:

### Layer 1: Dynamic Code Execution (codeSandbox.js)

- Executes student code against unit tests in Judge0 sandbox
- Network disabled, CPU 5s limit, 256MB RAM limit
- Pre-execution security filter (`codeFilter.js`) blocks dangerous patterns
- Supports: Python, JavaScript, Java, C, C++
- Test types: equality, contains, range, regex, exception
- Score: `(passed / total) * 100`

### Layer 2: Semantic-Static Analysis (semanticAssessment.js)

- LLM evaluates code quality across 5 criteria:
  - Code quality (25%), Documentation (20%), Complexity (25%), Error handling (15%), Best practices (15%)
- Uses `buildSafePrompt()` for injection protection
- Multi-provider fallback via `LLMOrchestrator`
- Returns confidence score (0-100) and human review flags
- Validates output with `validateLLMOutput()` (schema + score range checks)

### Layer 3: Smart Routing (smartRouting.js)

Decides auto-grade vs. human review based on 4 triggers:

1. **Low Confidence** - LLM confidence < 70% or LLM flagged issues
2. **Border Zone** - Score within +/-10 of pass threshold (56)
3. **Question Type** - Creative/open-ended questions always route to human
4. **Student History Anomaly** - Score deviates > 2 standard deviations from student's history

Additional automatic triggers:
- Prompt injection detected -> human review + priority boost
- Semantic analysis failed -> human review

**Score Formula:**
- With tests: `finalScore = layer1 * 0.6 + layer2 * 0.4`
- Without tests: `finalScore = layer2 only`

**Human Review Blend:** When instructor reviews, final = `human * 0.7 + auto * 0.3`

## LLM Provider Fallback Chain

```
lib/llm/
  orchestrator.js    -- Multi-provider fallback with audit logging
  safeParse.js       -- Markdown-fence-stripping JSON parser
  providers/
    groq.js          -- Groq (llama-3.3-70b-versatile, llama-3.1-8b-instant)
    gemini.js        -- Google Gemini (2.0-flash, 2.0-flash-lite)
    openai.js        -- OpenAI (gpt-4o-mini, gpt-3.5-turbo)
```

**Default order:** Groq -> Gemini -> OpenAI (configurable via `LLM_PROVIDER_ORDER` env var)

Each provider tries its models in order. On failure (429/quota/network), the orchestrator falls through to the next provider. Every attempt is logged with provider name, model, success/failure, and latency.

## Security Architecture

### Prompt Injection Protection (services/promptGuard.js)

- 30+ regex patterns detect injection attempts in student code
- Student code wrapped in `<student_code>` tags with explicit ignore-instructions directive
- Code sanitized: XML tags escaped, truncated to 15,000 chars
- Injection detected -> confidence capped at 50, flagged for human review
- Chat endpoints use message role separation (system/model/user)

### Rate Limiting

- LLM endpoints (`/evaluate`, `/chat`, `/student/chat`): 100 req/hour/IP
- Submission endpoint (`/student/assignments/:id/submit`): 20 req/15min/IP

### Auth & Access Control

- Google OAuth 2.0 via Passport.js
- Role-based access: `lecturer` and `student`
- Admin endpoints require `role === 'lecturer'`
- Dev login disabled in production (`NODE_ENV=production`)

## Data Model

Key Mongoose schemas (all in `api/index.js`):

- **User** - Google OAuth profile + role + enrolled courses
- **Course** - Lecturer-owned, enrollment via join codes
- **Assignment** - Question + rubric + unit tests + language + type
- **Submission** - Student code + CHAM assessment status + scores
- **AssessmentLayer** - Full Layer 1/2/3 results per submission
- **HumanReviewQueue** - Submissions awaiting instructor review
- **Material** - Course documents (used for RAG student chat)
- **DirectMessage** - Lecturer-student messaging

## Prompt Versioning

All evaluations include `PROMPT_VERSION` (currently `v1.1.0`) in their response metadata. This enables tracking which prompt version produced which scores, supporting rollback analysis.
