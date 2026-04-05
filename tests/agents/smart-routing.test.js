import { describe, it, expect, vi } from 'vitest';
import {
  checkConfidenceTrigger,
  checkBorderZoneTrigger,
  checkQuestionTypeTrigger,
  checkStudentHistoryTrigger,
  evaluateRoutingDecision,
} from '../../services/smartRouting.js';

// ── Trigger 1: Confidence ──
describe('checkConfidenceTrigger', () => {
  it('triggers on null semanticResult', () => {
    expect(checkConfidenceTrigger(null).triggered).toBe(true);
  });

  it('triggers on missing confidence', () => {
    expect(checkConfidenceTrigger({}).triggered).toBe(true);
    expect(checkConfidenceTrigger({ confidence: null }).triggered).toBe(true);
  });

  it('triggers on low confidence (below 70)', () => {
    const r = checkConfidenceTrigger({ confidence: 50 });
    expect(r.triggered).toBe(true);
    expect(r.reason).toBe('low_confidence');
    expect(r.value).toBe(50);
  });

  it('triggers at exactly 69', () => {
    expect(checkConfidenceTrigger({ confidence: 69 }).triggered).toBe(true);
  });

  it('does not trigger at exactly 70', () => {
    expect(checkConfidenceTrigger({ confidence: 70 }).triggered).toBe(false);
  });

  it('does not trigger on high confidence', () => {
    expect(checkConfidenceTrigger({ confidence: 95 }).triggered).toBe(false);
  });

  it('triggers when LLM flags items for review', () => {
    const r = checkConfidenceTrigger({
      confidence: 85,
      flags_for_human_review: ['possible plagiarism'],
    });
    expect(r.triggered).toBe(true);
    expect(r.reason).toBe('llm_flagged');
  });

  it('does not trigger on empty flags array with good confidence', () => {
    expect(checkConfidenceTrigger({ confidence: 85, flags_for_human_review: [] }).triggered).toBe(false);
  });
});

// ── Trigger 2: Border Zone ──
describe('checkBorderZoneTrigger', () => {
  it('triggers at pass boundary (52)', () => {
    const r = checkBorderZoneTrigger(52);
    expect(r.triggered).toBe(true);
    expect(r.distance).toBe(0);
  });

  it('triggers at lower bound (42)', () => {
    expect(checkBorderZoneTrigger(42).triggered).toBe(true);
  });

  it('triggers at upper bound (62)', () => {
    expect(checkBorderZoneTrigger(62).triggered).toBe(true);
  });

  it('does not trigger well above (80)', () => {
    expect(checkBorderZoneTrigger(80).triggered).toBe(false);
  });

  it('does not trigger well below (30)', () => {
    expect(checkBorderZoneTrigger(30).triggered).toBe(false);
  });

  it('does not trigger at 63 (distance = 11)', () => {
    expect(checkBorderZoneTrigger(63).triggered).toBe(false);
  });

  it('does not trigger at 41 (distance = 11)', () => {
    expect(checkBorderZoneTrigger(41).triggered).toBe(false);
  });
});

// ── Trigger 3: Question Type ──
describe('checkQuestionTypeTrigger', () => {
  it('triggers on creative question', () => {
    const r = checkQuestionTypeTrigger({ question_type: 'creative' });
    expect(r.triggered).toBe(true);
    expect(r.reason).toBe('question_type_requires_review');
  });

  it('triggers on open-ended question', () => {
    expect(checkQuestionTypeTrigger({ question_type: 'open-ended' }).triggered).toBe(true);
  });

  it('triggers on manually flagged question', () => {
    const r = checkQuestionTypeTrigger({
      question_type: 'coding',
      requires_human_review: true,
    });
    expect(r.triggered).toBe(true);
    expect(r.reason).toBe('manually_flagged');
  });

  it('does not trigger on standard coding question', () => {
    expect(checkQuestionTypeTrigger({ question_type: 'coding' }).triggered).toBe(false);
  });

  it('does not trigger on missing question_type', () => {
    expect(checkQuestionTypeTrigger({}).triggered).toBe(false);
  });
});

// ── Trigger 4: Student History ──
describe('checkStudentHistoryTrigger', () => {
  function mockSubmissionModel(scores) {
    return {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(
            scores.map(s => ({ final_score: s }))
          ),
        }),
      }),
    };
  }

  it('triggers on first submission (no history)', async () => {
    const model = mockSubmissionModel([]);
    const r = await checkStudentHistoryTrigger(model, 'student1', 80);
    expect(r.triggered).toBe(true);
    expect(r.reason).toBe('first_submission');
  });

  it('does not trigger with only 1 previous score', async () => {
    const model = mockSubmissionModel([75]);
    const r = await checkStudentHistoryTrigger(model, 'student1', 80);
    expect(r.triggered).toBe(false);
  });

  it('does not trigger when score is within normal range', async () => {
    // avg=70, std=~8.16, effective std=max(8.16,5)=8.16
    // 2*8.16=16.3, score=80, deviation=10, 10<16.3 → no trigger
    const model = mockSubmissionModel([60, 70, 80]);
    const r = await checkStudentHistoryTrigger(model, 'student1', 75);
    expect(r.triggered).toBe(false);
  });

  it('triggers on anomalous high score', async () => {
    // avg=50, std=0 → effective std=5, threshold=10
    // score=95, deviation=45 >> 10 → trigger
    const model = mockSubmissionModel([50, 50, 50, 50]);
    const r = await checkStudentHistoryTrigger(model, 'student1', 95);
    expect(r.triggered).toBe(true);
    expect(r.reason).toBe('anomalous_deviation');
    expect(r.direction).toBe('above');
  });

  it('triggers on anomalous low score', async () => {
    const model = mockSubmissionModel([90, 90, 90, 90]);
    const r = await checkStudentHistoryTrigger(model, 'student1', 20);
    expect(r.triggered).toBe(true);
    expect(r.direction).toBe('below');
  });

  it('uses min std of 5 for consistent students', async () => {
    // All scores 80 → std=0 → effective=5, threshold=10
    // score=89, deviation=9 < 10 → no trigger
    const model = mockSubmissionModel([80, 80, 80]);
    const r = await checkStudentHistoryTrigger(model, 'student1', 89);
    expect(r.triggered).toBe(false);
  });

  it('triggers just beyond min std threshold', async () => {
    // All scores 80, effective std=5, threshold=10
    // score=91, deviation=11 > 10 → trigger
    const model = mockSubmissionModel([80, 80, 80]);
    const r = await checkStudentHistoryTrigger(model, 'student1', 91);
    expect(r.triggered).toBe(true);
  });

  it('queries with correct studentId and filters', () => {
    const findMock = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    });
    const model = { find: findMock };
    checkStudentHistoryTrigger(model, 'stu-123', 80);
    expect(findMock).toHaveBeenCalledWith({
      studentId: 'stu-123',
      assessment_status: 'graded',
    });
  });
});

// ── Combined Routing ──
describe('evaluateRoutingDecision', () => {
  function mockSubmissionModel(scores = [70, 70, 70]) {
    return {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(
            scores.map(s => ({ final_score: s }))
          ),
        }),
      }),
    };
  }

  const baseParams = (overrides = {}) => ({
    submission: { studentId: 'stu-1' },
    question: { question_type: 'coding' },
    semanticResult: {
      overall_score: 80,
      confidence: 90,
      flags_for_human_review: [],
      injection_detected: false,
      score: 80,
    },
    layer1Score: 80,
    Submission: mockSubmissionModel(),
    ...overrides,
  });

  it('auto-grades when no triggers fire', async () => {
    const r = await evaluateRoutingDecision(baseParams());
    expect(r.requires_human_review).toBe(false);
    expect(r.triggers).toHaveLength(0);
    expect(r.auto_score).toBe(80); // 80*0.6 + 80*0.4 = 80
  });

  it('computes weighted score correctly', async () => {
    const r = await evaluateRoutingDecision(baseParams({ layer1Score: 100 }));
    // 100*0.6 + 80*0.4 = 92
    expect(r.auto_score).toBe(92);
    expect(r.score_formula).toBe('layer1 * 0.6 + layer2 * 0.4');
  });

  it('uses layer2 only when no layer1', async () => {
    const r = await evaluateRoutingDecision(baseParams({ layer1Score: null }));
    expect(r.auto_score).toBe(80);
    expect(r.score_formula).toBe('layer2 only');
  });

  it('routes to human on low confidence', async () => {
    const r = await evaluateRoutingDecision(baseParams({
      semanticResult: { overall_score: 80, confidence: 40, flags_for_human_review: [], score: 80 },
    }));
    expect(r.requires_human_review).toBe(true);
    expect(r.triggers.some(t => t.type === 'low_confidence')).toBe(true);
  });

  it('routes to human on border zone score', async () => {
    // layer1=50, layer2=60 → combined = 50*0.6+60*0.4 = 54, within ±10 of 52
    const r = await evaluateRoutingDecision(baseParams({
      layer1Score: 50,
      semanticResult: { overall_score: 60, confidence: 90, flags_for_human_review: [], score: 60 },
    }));
    expect(r.requires_human_review).toBe(true);
    expect(r.triggers.some(t => t.type === 'border_zone')).toBe(true);
  });

  it('routes to human on creative question type', async () => {
    const r = await evaluateRoutingDecision(baseParams({
      question: { question_type: 'creative' },
    }));
    expect(r.requires_human_review).toBe(true);
    expect(r.triggers.some(t => t.type === 'question_type')).toBe(true);
  });

  it('routes to human on injection detection', async () => {
    const r = await evaluateRoutingDecision(baseParams({
      semanticResult: {
        overall_score: 80, confidence: 90, flags_for_human_review: [],
        injection_detected: true, score: 80,
      },
    }));
    expect(r.requires_human_review).toBe(true);
    expect(r.triggers.some(t => t.type === 'security')).toBe(true);
  });

  it('routes to human when semantic analysis failed', async () => {
    const r = await evaluateRoutingDecision(baseParams({
      semanticResult: {
        overall_score: 0, confidence: 0, flags_for_human_review: [],
        score: null,
      },
    }));
    expect(r.requires_human_review).toBe(true);
    expect(r.triggers.some(t => t.type === 'analysis_failure')).toBe(true);
  });

  it('security trigger adds +50 to priority', async () => {
    const r = await evaluateRoutingDecision(baseParams({
      semanticResult: {
        overall_score: 80, confidence: 90, flags_for_human_review: [],
        injection_detected: true, score: 80,
      },
    }));
    expect(r.priority).toBeGreaterThanOrEqual(50);
  });

  it('more triggers = higher priority', async () => {
    const r1 = await evaluateRoutingDecision(baseParams({
      semanticResult: { overall_score: 80, confidence: 40, flags_for_human_review: [], score: 80 },
    }));
    const r2 = await evaluateRoutingDecision(baseParams({
      semanticResult: {
        overall_score: 80, confidence: 40, flags_for_human_review: [],
        injection_detected: true, score: 80,
      },
    }));
    expect(r2.priority).toBeGreaterThan(r1.priority);
  });

  it('includes decided_at timestamp', async () => {
    const r = await evaluateRoutingDecision(baseParams());
    expect(r.decided_at).toBeInstanceOf(Date);
  });
});
