import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('../../services/codeSandbox.js', () => ({
  executeTests: vi.fn(),
}));
vi.mock('../../services/semanticAssessment.js', () => ({
  analyzeCodeQuality: vi.fn(),
}));
vi.mock('../../services/smartRouting.js', () => ({
  evaluateRoutingDecision: vi.fn(),
}));

import { assessSubmission } from '../../services/chamAssessment.js';
import { executeTests } from '../../services/codeSandbox.js';
import { analyzeCodeQuality } from '../../services/semanticAssessment.js';
import { evaluateRoutingDecision } from '../../services/smartRouting.js';

describe('chamAssessment orchestrator', () => {
  let mockModels;

  beforeEach(() => {
    vi.clearAllMocks();

    mockModels = {
      Submission: {
        updateOne: vi.fn().mockResolvedValue({}),
      },
      AssessmentLayer: {
        create: vi.fn().mockResolvedValue({ _id: 'assessment-1' }),
        updateOne: vi.fn().mockResolvedValue({}),
      },
      HumanReviewQueue: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
  });

  const baseSubmission = {
    _id: 'sub-1',
    studentCode: 'print("hello")',
    studentId: 'stu-1',
    assignmentId: 'assign-1',
    courseId: 'course-1',
  };

  const baseAssignment = {
    language: 'python',
    question: 'Print hello',
    masterSolution: 'print("hello")',
    rubric: 'Must print hello',
    unit_tests: [
      { input: '', expected_output: 'hello', test_type: 'equality' },
    ],
  };

  // ── Auto-grade path ──
  describe('auto-grade path', () => {
    it('auto-grades when no triggers fire', async () => {
      executeTests.mockResolvedValue({
        score: 100, total_tests: 1, passed: 1,
        test_results: [{ passed: true, execution_time: '0.01' }],
        execution_errors: [], security_blocked: false,
      });

      analyzeCodeQuality.mockResolvedValue({
        overall_score: 90, confidence: 95,
        feedback: 'Good code', criteria_breakdown: {},
        flags_for_human_review: [],
      });

      evaluateRoutingDecision.mockResolvedValue({
        requires_human_review: false,
        triggers: [],
        auto_score: 96, // 100*0.6 + 90*0.4
        score_formula: 'layer1 * 0.6 + layer2 * 0.4',
        priority: 0,
        decided_at: new Date(),
      });

      const result = await assessSubmission({
        submission: baseSubmission,
        assignment: baseAssignment,
        models: mockModels,
      });

      expect(result.status).toBe('graded');
      expect(result.final_score).toBe(96);
      expect(result.feedback).toBe('Good code');

      // Verify status transitions
      const statusCalls = mockModels.Submission.updateOne.mock.calls;
      expect(statusCalls[0][1]).toEqual({ assessment_status: 'testing' });
      expect(statusCalls[1][1]).toEqual({ assessment_status: 'semantic_analysis' });
      expect(statusCalls[2][1].assessment_status).toBe('graded');
      expect(statusCalls[2][1].final_score).toBe(96);
    });
  });

  // ── Human review path ──
  describe('human review path', () => {
    it('routes to human review when triggers fire', async () => {
      executeTests.mockResolvedValue({
        score: 50, total_tests: 2, passed: 1,
        test_results: [], execution_errors: [], security_blocked: false,
      });

      analyzeCodeQuality.mockResolvedValue({
        overall_score: 55, confidence: 40,
        feedback: 'Mediocre', criteria_breakdown: {},
        flags_for_human_review: ['unusual approach'],
      });

      evaluateRoutingDecision.mockResolvedValue({
        requires_human_review: true,
        triggers: [
          { type: 'low_confidence', reason: 'low_confidence', value: 40 },
          { type: 'border_zone', reason: 'border_zone', score: 52 },
        ],
        auto_score: 52,
        score_formula: 'layer1 * 0.6 + layer2 * 0.4',
        priority: 20,
        decided_at: new Date(),
      });

      const result = await assessSubmission({
        submission: baseSubmission,
        assignment: baseAssignment,
        models: mockModels,
      });

      expect(result.status).toBe('awaiting_review');
      expect(result.auto_score).toBe(52);

      // Verify human review queue entry created
      expect(mockModels.HumanReviewQueue.create).toHaveBeenCalledOnce();
      const queueEntry = mockModels.HumanReviewQueue.create.mock.calls[0][0];
      expect(queueEntry.submission_id).toBe('sub-1');
      expect(queueEntry.priority).toBe(20);
      expect(queueEntry.reviewed).toBe(false);

      // Verify submission status updated to awaiting_review
      const lastUpdate = mockModels.Submission.updateOne.mock.calls[2][1];
      expect(lastUpdate.assessment_status).toBe('awaiting_review');
      expect(lastUpdate.routing_decision.requires_human).toBe(true);
    });
  });

  // ── Skipping Layer 1 ──
  describe('layer 1 skip', () => {
    it('skips layer 1 when no unit tests defined', async () => {
      analyzeCodeQuality.mockResolvedValue({
        overall_score: 85, confidence: 90,
        feedback: 'Looks good', criteria_breakdown: {},
        flags_for_human_review: [],
      });

      evaluateRoutingDecision.mockResolvedValue({
        requires_human_review: false,
        triggers: [],
        auto_score: 85,
        score_formula: 'layer2 only',
        priority: 0,
        decided_at: new Date(),
      });

      const result = await assessSubmission({
        submission: baseSubmission,
        assignment: { ...baseAssignment, unit_tests: [] },
        models: mockModels,
      });

      expect(executeTests).not.toHaveBeenCalled();
      expect(result.status).toBe('graded');
      expect(result.layer1).toBeNull();
    });

    it('skips layer 1 when unit_tests is undefined', async () => {
      analyzeCodeQuality.mockResolvedValue({
        overall_score: 70, confidence: 80,
        feedback: 'ok', criteria_breakdown: {},
        flags_for_human_review: [],
      });

      evaluateRoutingDecision.mockResolvedValue({
        requires_human_review: false, triggers: [],
        auto_score: 70, score_formula: 'layer2 only',
        priority: 0, decided_at: new Date(),
      });

      const { unit_tests, ...assignmentNoTests } = baseAssignment;
      await assessSubmission({
        submission: baseSubmission,
        assignment: assignmentNoTests,
        models: mockModels,
      });

      expect(executeTests).not.toHaveBeenCalled();
    });
  });

  // ── Error handling ──
  describe('error handling', () => {
    it('handles layer 1 error gracefully', async () => {
      executeTests.mockRejectedValue(new Error('Judge0 down'));

      analyzeCodeQuality.mockResolvedValue({
        overall_score: 75, confidence: 85,
        feedback: 'fine', criteria_breakdown: {},
        flags_for_human_review: [],
      });

      evaluateRoutingDecision.mockResolvedValue({
        requires_human_review: false, triggers: [],
        auto_score: 75, score_formula: 'layer2 only',
        priority: 0, decided_at: new Date(),
      });

      const result = await assessSubmission({
        submission: baseSubmission,
        assignment: baseAssignment,
        models: mockModels,
      });

      // Should still complete — layer1 error is caught
      expect(result.layer1.score).toBeNull();
      expect(result.layer1.execution_errors).toContain('Judge0 down');
    });

    it('handles layer 2 error gracefully', async () => {
      executeTests.mockResolvedValue({
        score: 100, total_tests: 1, passed: 1,
        test_results: [], execution_errors: [], security_blocked: false,
      });

      analyzeCodeQuality.mockRejectedValue(new Error('Gemini quota exceeded'));

      evaluateRoutingDecision.mockResolvedValue({
        requires_human_review: true,
        triggers: [{ type: 'analysis_failure', reason: 'semantic_analysis_failed' }],
        auto_score: 0, score_formula: 'layer2 only',
        priority: 40, decided_at: new Date(),
      });

      const result = await assessSubmission({
        submission: baseSubmission,
        assignment: baseAssignment,
        models: mockModels,
      });

      // Layer 2 failure → degraded result, still continues
      expect(result.layer2.flags_for_human_review).toContain('llm_analysis_failed');
    });
  });

  // ── Assessment layer persistence ──
  describe('persistence', () => {
    it('creates AssessmentLayer document', async () => {
      executeTests.mockResolvedValue({
        score: 80, total_tests: 2, passed: 2,
        test_results: [{ execution_time: '0.02' }, { execution_time: '0.03' }],
        execution_errors: [], security_blocked: false,
      });

      analyzeCodeQuality.mockResolvedValue({
        overall_score: 75, confidence: 88,
        feedback: 'decent', criteria_breakdown: { code_quality: { score: 80 } },
        flags_for_human_review: [], model_used: 'gemini-2.0-flash',
      });

      evaluateRoutingDecision.mockResolvedValue({
        requires_human_review: false, triggers: [],
        auto_score: 78, score_formula: 'layer1 * 0.6 + layer2 * 0.4',
        priority: 0, decided_at: new Date(),
      });

      await assessSubmission({
        submission: baseSubmission,
        assignment: baseAssignment,
        models: mockModels,
      });

      expect(mockModels.AssessmentLayer.create).toHaveBeenCalledOnce();
      const doc = mockModels.AssessmentLayer.create.mock.calls[0][0];
      expect(doc.submission_id).toBe('sub-1');
      expect(doc.layer1.score).toBe(80);
      expect(doc.layer2.score).toBe(75);
      expect(doc.layer2.confidence).toBe(88);
    });

    it('updates AssessmentLayer with final score on auto-grade', async () => {
      executeTests.mockResolvedValue({
        score: 90, total_tests: 1, passed: 1,
        test_results: [], execution_errors: [], security_blocked: false,
      });

      analyzeCodeQuality.mockResolvedValue({
        overall_score: 85, confidence: 92,
        feedback: 'good', criteria_breakdown: {},
        flags_for_human_review: [],
      });

      evaluateRoutingDecision.mockResolvedValue({
        requires_human_review: false, triggers: [],
        auto_score: 88, score_formula: 'layer1 * 0.6 + layer2 * 0.4',
        priority: 0, decided_at: new Date(),
      });

      await assessSubmission({
        submission: baseSubmission,
        assignment: baseAssignment,
        models: mockModels,
      });

      const updateCall = mockModels.AssessmentLayer.updateOne.mock.calls[0][1];
      expect(updateCall.final_score).toBe(88);
      expect(updateCall['layer3.required']).toBe(false);
    });
  });
});
