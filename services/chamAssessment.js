/**
 * CHAM Orchestrator — Contextual Hybrid Assessment Model
 * Wires Layer 1 (sandbox), Layer 2 (semantic), and routing together.
 * Called from the submission endpoint in api/index.js.
 */

import { executeTests } from './codeSandbox.js';
import { analyzeCodeQuality } from './semanticAssessment.js';
import { evaluateRoutingDecision } from './smartRouting.js';

/**
 * Run the full CHAM pipeline on a submission.
 *
 * @param {object} params
 * @param {object} params.submission     - Mongoose submission document
 * @param {object} params.assignment     - Mongoose assignment document (populated)
 * @param {object} params.models         - { Submission, AssessmentLayer, HumanReviewQueue } Mongoose models
 * @returns {object} { status, final_score?, routing?, assessment }
 */
export async function assessSubmission({ submission, assignment, models }) {
  const { Submission, AssessmentLayer, HumanReviewQueue } = models;
  const submissionId = submission._id;

  console.log(`[CHAM] Starting assessment for ${submissionId}`);

  // ── Update status: testing ──
  await Submission.updateOne(
    { _id: submissionId },
    { assessment_status: 'testing' }
  );

  // ── Layer 1: Execute tests ──
  let layer1Result = null;
  const hasTests = assignment.unit_tests && assignment.unit_tests.length > 0;

  if (hasTests) {
    console.log(`[CHAM] Layer 1: running ${assignment.unit_tests.length} tests`);
    try {
      layer1Result = await executeTests({
        code: submission.studentCode,
        language: assignment.language || 'python',
        tests: assignment.unit_tests,
      });
      console.log(`[CHAM] Layer 1 score: ${layer1Result.score}`);
    } catch (err) {
      console.error(`[CHAM] Layer 1 error:`, err.message);
      layer1Result = {
        score: null,
        total_tests: assignment.unit_tests.length,
        passed: 0,
        execution_errors: [err.message],
        security_blocked: false,
      };
    }
  } else {
    console.log(`[CHAM] Layer 1: skipped (no unit tests defined)`);
  }

  // ── Update status: semantic_analysis ──
  await Submission.updateOne(
    { _id: submissionId },
    { assessment_status: 'semantic_analysis' }
  );

  // ── Layer 2: Semantic analysis ──
  console.log(`[CHAM] Layer 2: semantic analysis`);
  let layer2Result;
  try {
    layer2Result = await analyzeCodeQuality(
      submission.studentCode,
      assignment.language || 'python',
      assignment.question,
      assignment.masterSolution,
      assignment.rubric,
    );
    console.log(`[CHAM] Layer 2 score: ${layer2Result.overall_score}, confidence: ${layer2Result.confidence}`);
  } catch (err) {
    console.error(`[CHAM] Layer 2 error:`, err.message);
    layer2Result = {
      score: null,
      overall_score: null,
      confidence: 0,
      feedback: 'Semantic analysis failed.',
      flags_for_human_review: ['llm_analysis_failed'],
      error: err.message,
    };
  }

  // ── Save assessment layers ──
  const assessmentDoc = await AssessmentLayer.create({
    submission_id: submissionId,
    layer1: layer1Result ? {
      score: layer1Result.score,
      test_results: layer1Result.test_results || [],
      total_tests: layer1Result.total_tests,
      passed: layer1Result.passed,
      execution_time: layer1Result.test_results?.reduce((s, t) => s + (parseFloat(t.execution_time) || 0), 0),
      errors: layer1Result.execution_errors || [],
      security_blocked: layer1Result.security_blocked,
      filter_violations: layer1Result.filter_violations,
    } : null,
    layer2: {
      score: layer2Result.overall_score,
      criteria_breakdown: layer2Result.criteria_breakdown,
      confidence: layer2Result.confidence,
      feedback: layer2Result.feedback,
      flags_for_human_review: layer2Result.flags_for_human_review,
      model_used: layer2Result.model_used || 'gemini-2.0-flash',
      injection_detected: layer2Result.injection_detected,
    },
    created_at: new Date(),
  });

  // ── Smart Routing ──
  console.log(`[CHAM] Evaluating routing decision`);
  const routing = await evaluateRoutingDecision({
    submission,
    question: assignment,
    semanticResult: layer2Result,
    layer1Score: layer1Result?.score ?? null,
    Submission,
  });

  if (routing.requires_human_review) {
    // ── Route to human review ──
    await HumanReviewQueue.create({
      submission_id: submissionId,
      student_id: submission.studentId,
      question_id: submission.assignmentId,
      course_id: submission.courseId,
      added_at: new Date(),
      priority: routing.priority,
      auto_score: routing.auto_score,
      triggers: routing.triggers,
      reviewed: false,
    });

    await Submission.updateOne(
      { _id: submissionId },
      {
        assessment_status: 'awaiting_review',
        routing_decision: {
          requires_human: true,
          triggers: routing.triggers,
          decided_at: routing.decided_at,
        },
      }
    );

    // Store the auto-computed score on the assessment doc even when routing to human
    await AssessmentLayer.updateOne(
      { _id: assessmentDoc._id },
      {
        'layer3.required': true,
        'layer3.triggers': routing.triggers,
        auto_score: routing.auto_score,
        score_calculation: {
          formula: routing.score_formula,
          weights: { layer1: 0.6, layer2: 0.4 },
        },
      }
    );

    console.log(`[CHAM] ${submissionId} → human review (${routing.triggers.length} triggers, priority ${routing.priority})`);

    return {
      status: 'awaiting_review',
      auto_score: routing.auto_score,
      routing,
      assessment: assessmentDoc,
      layer1: layer1Result,
      layer2: layer2Result,
    };

  } else {
    // ── Auto-grade ──
    const finalScore = routing.auto_score;

    await AssessmentLayer.updateOne(
      { _id: assessmentDoc._id },
      {
        'layer3.required': false,
        final_score: finalScore,
        score_calculation: {
          formula: routing.score_formula,
          weights: { layer1: 0.6, layer2: 0.4 },
        },
      }
    );

    await Submission.updateOne(
      { _id: submissionId },
      {
        assessment_status: 'graded',
        score: finalScore,
        feedback: layer2Result.feedback,
        final_score: finalScore,
        routing_decision: {
          requires_human: false,
          triggers: [],
          decided_at: routing.decided_at,
        },
      }
    );

    console.log(`[CHAM] ${submissionId} → auto-graded: ${finalScore}`);

    return {
      status: 'graded',
      final_score: finalScore,
      feedback: layer2Result.feedback,
      assessment: assessmentDoc,
      layer1: layer1Result,
      layer2: layer2Result,
    };
  }
}
