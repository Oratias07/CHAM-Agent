/**
 * Smart Routing Mechanism
 * Decides whether a submission needs human review based on 4 triggers.
 */

// ── Configurable thresholds ──
const THRESHOLDS = {
  CONFIDENCE_MIN: 70,      // Trigger 1: LLM confidence below this → human review
  PASS_SCORE: 52,          // Trigger 2: passing grade boundary
  BORDER_RANGE: 10,        // Trigger 2: ±10 points around pass score
  ANOMALY_STD_FACTOR: 2,   // Trigger 4: score deviates > 2σ from student's history
};

// ── Trigger 1: Low LLM Confidence ──
export function checkConfidenceTrigger(semanticResult) {
  if (!semanticResult || semanticResult.confidence == null) {
    return { triggered: true, reason: 'no_confidence_score', value: 0 };
  }
  if (semanticResult.confidence < THRESHOLDS.CONFIDENCE_MIN) {
    return { triggered: true, reason: 'low_confidence', value: semanticResult.confidence };
  }
  // Also trigger if LLM flagged items for human review
  if (semanticResult.flags_for_human_review?.length > 0) {
    return { triggered: true, reason: 'llm_flagged', flags: semanticResult.flags_for_human_review };
  }
  return { triggered: false };
}

// ── Trigger 2: Border Zone (score near pass/fail boundary) ──
export function checkBorderZoneTrigger(finalScore) {
  const distance = Math.abs(finalScore - THRESHOLDS.PASS_SCORE);
  if (distance <= THRESHOLDS.BORDER_RANGE) {
    return { triggered: true, reason: 'border_zone', score: finalScore, distance };
  }
  return { triggered: false };
}

// ── Trigger 3: Question Type ──
export function checkQuestionTypeTrigger(question) {
  const typeRequiresReview = ['creative', 'open-ended'].includes(question.question_type);
  const explicitFlag = question.requires_human_review === true;

  if (typeRequiresReview || explicitFlag) {
    return {
      triggered: true,
      reason: typeRequiresReview ? 'question_type_requires_review' : 'manually_flagged',
      question_type: question.question_type,
    };
  }
  return { triggered: false };
}

// ── Trigger 4: Student History Anomaly ──
export async function checkStudentHistoryTrigger(Submission, studentId, currentScore) {
  const previousSubmissions = await Submission.find({
    studentId,
    assessment_status: 'graded',
  }).sort({ timestamp: -1 }).limit(10);

  // First submission ever → flag for baseline establishment
  if (previousSubmissions.length === 0) {
    return { triggered: true, reason: 'first_submission' };
  }

  const scores = previousSubmissions.map(s => s.final_score).filter(s => s != null);
  if (scores.length < 2) {
    return { triggered: false }; // Not enough data for statistical analysis
  }

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const std = Math.sqrt(
    scores.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / scores.length
  );

  // Avoid false triggers when student is very consistent (std ≈ 0)
  const effectiveStd = Math.max(std, 5);
  const deviation = Math.abs(currentScore - avg);

  if (deviation > THRESHOLDS.ANOMALY_STD_FACTOR * effectiveStd) {
    return {
      triggered: true,
      reason: 'anomalous_deviation',
      deviation: Math.round(deviation * 10) / 10,
      avg: Math.round(avg * 10) / 10,
      std: Math.round(effectiveStd * 10) / 10,
      direction: currentScore > avg ? 'above' : 'below',
    };
  }

  return { triggered: false };
}

// ── Combined Routing Decision ──
export async function evaluateRoutingDecision({
  submission,
  question,
  semanticResult,
  layer1Score,
  Submission, // Mongoose model, passed in to avoid circular imports
}) {
  const triggers = [];

  // Trigger 1: Confidence
  const t1 = checkConfidenceTrigger(semanticResult);
  if (t1.triggered) {
    triggers.push({ type: 'low_confidence', ...t1 });
  }

  // Trigger 2: Border zone
  const hasLayer1 = layer1Score != null;
  const combinedScore = hasLayer1
    ? (layer1Score * 0.6) + (semanticResult.overall_score * 0.4)
    : semanticResult.overall_score;

  const t2 = checkBorderZoneTrigger(combinedScore);
  if (t2.triggered) {
    triggers.push({ type: 'border_zone', ...t2 });
  }

  // Trigger 3: Question type
  if (question.question_type) {
    const t3 = checkQuestionTypeTrigger(question);
    if (t3.triggered) {
      triggers.push({ type: 'question_type', ...t3 });
    }
  }

  // Trigger 4: Student history
  const t4 = await checkStudentHistoryTrigger(
    Submission,
    submission.studentId,
    combinedScore
  );
  if (t4.triggered) {
    triggers.push({ type: 'student_history', ...t4 });
  }

  // Prompt injection detection is an automatic trigger
  if (semanticResult.injection_detected) {
    triggers.push({ type: 'security', reason: 'prompt_injection_detected' });
  }

  // Semantic analysis failure is an automatic trigger
  if (semanticResult.score == null) {
    triggers.push({ type: 'analysis_failure', reason: 'semantic_analysis_failed' });
  }

  // Calculate priority: more triggers = higher priority
  const priority = triggers.length * 10 +
    (triggers.some(t => t.type === 'security') ? 50 : 0) +
    (triggers.some(t => t.type === 'analysis_failure') ? 40 : 0);

  return {
    requires_human_review: triggers.length > 0,
    triggers,
    auto_score: Math.round(combinedScore * 10) / 10,
    score_formula: hasLayer1 ? 'layer1 * 0.6 + layer2 * 0.4' : 'layer2 only',
    priority,
    decided_at: new Date(),
  };
}
