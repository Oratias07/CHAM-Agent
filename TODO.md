# CHAM Agent Roadmap

Based on academic research analysis (March 2026) and codebase audit.

## Completed (Phase 0)

- [x] Prompt injection protection on all LLM call sites
- [x] Admin endpoint role-based access control
- [x] Safe JSON parsing (validateLLMOutput) on all LLM responses
- [x] Rate limiting on evaluation and chat endpoints
- [x] Dev login disabled in production
- [x] Multi-provider LLM fallback (Groq/Gemini/OpenAI)
- [x] Prompt version tracking (v1.1.0)
- [x] .env.example with all provider configurations

## Phase 1: Foundation (1-3 months)

### Async Task Queue
- [ ] BullMQ + Upstash Redis for background evaluation jobs
- [ ] Return `{ status: 'queued', jobId }` immediately to student
- [ ] Worker service processes evaluation pipeline
- [ ] WebSocket or polling for real-time status updates
- **Why:** Current synchronous evaluation risks Vercel 10s timeout under load

### Response Caching
- [ ] Redis cache keyed by SHA-256(code + rubric + prompt_version)
- [ ] 1-hour TTL for identical submissions
- [ ] Cache hit bypasses LLM call entirely
- **Why:** Identical resubmissions cost $0.002/eval unnecessarily

### Audit Trail
- [ ] Dedicated AuditLog MongoDB collection
- [ ] Log: submissionId, studentId, provider, model, promptVersion, inputHash, score, timestamp
- [ ] Queryable by instructor for compliance/appeals
- **Why:** Legal requirement per Israeli Privacy Protection Act + GDPR

### Appeal Mechanism
- [ ] "Request Human Review" button on every graded submission
- [ ] Creates HumanReviewQueue entry even for auto-graded submissions
- [ ] AI grade becomes provisional until instructor confirms or overrides
- **Why:** Research finding: trust = transparency + appeal

### UI Disclosure
- [ ] Show "Evaluated by AI (provider/model)" on every graded submission
- [ ] Link to `/about/ai-evaluation` explaining scoring methodology
- **Why:** Ethical requirement — students must know AI evaluated them

### Bias Monitoring Dashboard (instructor-only)
- [ ] Track average scores by: code length, comment density, language
- [ ] Alert if systematic 10+ point gap detected between groups
- **Why:** Research section 4.5 — Length Bias, Language Style Bias are real

## Phase 2: Scale (3-9 months)

### WebSocket Messaging
- [ ] Replace 3-second polling with Socket.IO or Pusher
- [ ] Real-time submission status updates
- **Estimated cost:** $0-49/month (Pusher)

### Plagiarism Detection
- [ ] OpenAI embeddings for code similarity
- [ ] Flag submissions with >90% cosine similarity
- [ ] Perplexity-based AI-generated code detection
- **Estimated cost:** $5-20/month

### Learning Analytics Dashboard
- [ ] Class-level performance patterns (Recharts)
- [ ] Per-student progress tracking
- [ ] MongoDB aggregation pipelines for metrics

### Rubric Builder
- [ ] GUI for creating structured rubrics
- [ ] Drag-and-drop criteria with weight sliders
- [ ] Template library for common assignment types

### Multi-model A/B Testing
- [ ] Route % of evaluations to different providers
- [ ] Compare score distributions across models
- [ ] Use prompt versioning infrastructure for tracking

## Phase 3: Enterprise (9-18 months)

- [ ] Multi-tenancy (institution isolation)
- [ ] SSO (SAML/OIDC) for Google Workspace for Education
- [ ] LTI 1.3 integration (Moodle/Canvas/Blackboard)
- [ ] Fine-tuned model for Hebrew educational context
- [ ] GDPR + Israeli Privacy Act compliance package
- [ ] On-premise deployment option

## Architecture Principles

Per research recommendation, follow evolutionary architecture:
```
Phase 0 (now): Enhanced Serverless Monolith
Phase 1 (1-3mo): + Queue + Cache + Observability
Phase 2 (3-9mo): Service Extraction
Phase 3 (9-18mo): Full Microservices (only if needed)
```

**Explicitly rejected:** Kubernetes for MVP (research section 5.4). BullMQ + Redis is sufficient for 500+ students/day.
