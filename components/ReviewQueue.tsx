import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import type { ReviewQueueItem } from '../types';
import CodeBlockWithLineNumbers from './CodeBlockWithLineNumbers';

export default function ReviewQueue() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [stats, setStats] = useState<{ pending: number; reviewed: number; total: number; review_rate: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewScore, setReviewScore] = useState<number>(0);
  const [reviewComments, setReviewComments] = useState('');
  const [overrideScore, setOverrideScore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    setLoading(true);
    try {
      const [q, s] = await Promise.all([
        apiService.getReviewQueue(),
        apiService.getReviewQueueStats(),
      ]);
      setQueue(q);
      setStats(s);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function openReview(item: ReviewQueueItem) {
    try {
      const detail = await apiService.getReviewDetail(item.submission_id);
      setSelectedItem(detail);
      setReviewScore(Math.round(item.auto_score));
      setReviewComments('');
      setOverrideScore(false);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSubmitReview() {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await apiService.submitReview({
        submission_id: selectedItem.submission.id,
        human_score: reviewScore,
        comments: reviewComments,
        override_auto_score: overrideScore,
      });
      setSelectedItem(null);
      loadQueue();
    } catch (err: any) {
      setError(err.message);
    }
    setSubmitting(false);
  }

  function getTriggerLabel(trigger: any): string {
    const labels: Record<string, string> = {
      low_confidence: '🔍 ביטחון נמוך',
      border_zone: '⚖️ אזור גבול',
      question_type: '📝 סוג שאלה',
      student_history: '📊 חריגה מהיסטוריה',
      security: '🔒 ניסיון הזרקה',
      analysis_failure: '❌ כשל ניתוח',
    };
    return labels[trigger.type] || trigger.type;
  }

  function getPriorityColor(priority: number): string {
    if (priority >= 50) return '#ef4444';
    if (priority >= 30) return '#f97316';
    if (priority >= 20) return '#eab308';
    return '#6b7280';
  }

  // ── Review Detail View ──
  if (selectedItem) {
    const { submission, assignment, assessment, student } = selectedItem;
    return (
      <div dir="rtl" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <button onClick={() => setSelectedItem(null)} style={{
          background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer',
          fontSize: '14px', marginBottom: '16px', padding: 0,
        }}>
          ← חזרה לתור
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left: Student code + info */}
          <div>
            <div style={{
              background: '#1e1e2e', borderRadius: '12px', padding: '20px', marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                {student?.picture && (
                  <img src={student.picture} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                )}
                <div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{student?.name || 'Unknown'}</div>
                  <div style={{ color: '#94a3b8', fontSize: '13px' }}>{assignment?.title}</div>
                </div>
              </div>

              <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>שאלה:</div>
              <div style={{
                background: '#0f0f1a', borderRadius: '8px', padding: '12px', color: '#e2e8f0',
                fontSize: '14px', marginBottom: '16px', whiteSpace: 'pre-wrap',
              }}>
                {assignment?.question}
              </div>

              <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>קוד התלמיד:</div>
              <CodeBlockWithLineNumbers code={submission?.studentCode || ''} />
            </div>
          </div>

          {/* Right: Assessment layers + review form */}
          <div>
            {/* Layer 1 Results */}
            {assessment?.layer1 && (
              <div style={{
                background: '#1e1e2e', borderRadius: '12px', padding: '20px', marginBottom: '16px',
              }}>
                <h3 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '16px' }}>
                  שכבה 1: בדיקות אוטומטיות
                </h3>
                {assessment.layer1.security_blocked ? (
                  <div style={{ color: '#ef4444', fontWeight: 600 }}>
                    🔒 הקוד נחסם ע"י מסנן אבטחה
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '28px', fontWeight: 700,
                        color: (assessment.layer1.score ?? 0) >= 70 ? '#22c55e' : (assessment.layer1.score ?? 0) >= 40 ? '#eab308' : '#ef4444',
                      }}>
                        {assessment.layer1.score ?? 'N/A'}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '12px' }}>ציון</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: 700, color: '#6366f1' }}>
                        {assessment.layer1.passed}/{assessment.layer1.total_tests}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '12px' }}>בדיקות עברו</div>
                    </div>
                  </div>
                )}
                {assessment.layer1.test_results?.map((t: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: '1px solid #2d2d3f',
                  }}>
                    <span style={{ color: '#e2e8f0', fontSize: '13px' }}>{t.description}</span>
                    <span style={{
                      color: t.passed ? '#22c55e' : '#ef4444',
                      fontSize: '13px', fontWeight: 600,
                    }}>
                      {t.passed ? '✓' : '✗'} {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Layer 2 Results */}
            {assessment?.layer2 && (
              <div style={{
                background: '#1e1e2e', borderRadius: '12px', padding: '20px', marginBottom: '16px',
              }}>
                <h3 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '16px' }}>
                  שכבה 2: ניתוח סמנטי
                </h3>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#6366f1' }}>
                      {assessment.layer2.score ?? 'N/A'}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>ציון כללי</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '28px', fontWeight: 700,
                      color: (assessment.layer2.confidence ?? 0) >= 70 ? '#22c55e' : '#eab308',
                    }}>
                      {assessment.layer2.confidence ?? 'N/A'}%
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>ביטחון</div>
                  </div>
                </div>

                {assessment.layer2.criteria_breakdown && (
                  <div>
                    {Object.entries(assessment.layer2.criteria_breakdown).map(([key, val]: [string, any]) => {
                      const labels: Record<string, string> = {
                        code_quality: 'איכות קוד',
                        documentation: 'תיעוד',
                        complexity: 'מורכבות',
                        error_handling: 'טיפול בשגיאות',
                        best_practices: 'שיטות עבודה',
                      };
                      return (
                        <div key={key} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#e2e8f0', fontSize: '13px' }}>{labels[key] || key}</span>
                            <span style={{ color: '#6366f1', fontSize: '13px', fontWeight: 600 }}>{val?.score}/100</span>
                          </div>
                          <div style={{
                            height: '6px', background: '#2d2d3f', borderRadius: '3px', overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', width: `${val?.score || 0}%`,
                              background: (val?.score ?? 0) >= 70 ? '#22c55e' : (val?.score ?? 0) >= 40 ? '#eab308' : '#ef4444',
                              borderRadius: '3px', transition: 'width 0.3s',
                            }} />
                          </div>
                          {val?.feedback && (
                            <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>{val.feedback}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {assessment.layer2.injection_detected && (
                  <div style={{
                    background: '#7f1d1d', borderRadius: '8px', padding: '10px',
                    color: '#fca5a5', fontSize: '13px', marginTop: '12px',
                  }}>
                    ⚠️ זוהה ניסיון הזרקת פרומפט בקוד התלמיד
                  </div>
                )}

                {/* Deductions panel */}
                {assessment.layer2.deductions && assessment.layer2.deductions.length > 0 && (
                  <div style={{ marginTop: '16px' }} dir="rtl">
                    <h4 style={{ color: '#FF9800', margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700 }}>
                      ניכויים ({assessment.layer2.deductions.length})
                    </h4>
                    {assessment.layer2.deductions.map((d: any, i: number) => (
                      <div key={i} style={{
                        borderRight: '4px solid #FF9800',
                        background: '#1a1a2e',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '8px',
                      }}>
                        <div style={{ color: '#e2e8f0', fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>
                          {d.requirement}
                        </div>
                        <div style={{
                          background: '#0f0f1a', borderRadius: '6px', padding: '8px 12px',
                          fontFamily: 'Consolas, Monaco, monospace', fontSize: '12px',
                          color: '#a5f3fc', direction: 'ltr', textAlign: 'left',
                          whiteSpace: 'pre-wrap', marginBottom: '6px',
                        }}>
                          {d.codeQuote}
                        </div>
                        <div style={{ color: '#FF9800', fontSize: '12px', fontWeight: 700 }}>
                          -{d.pointsLost} נקודות
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Routing triggers */}
            <div style={{
              background: '#1e1e2e', borderRadius: '12px', padding: '20px', marginBottom: '16px',
            }}>
              <h3 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '16px' }}>
                סיבות להפניה לסקירה
              </h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedItem.queueItem?.triggers?.map((t: any, i: number) => (
                  <span key={i} style={{
                    background: '#2d2d3f', color: '#e2e8f0', borderRadius: '20px',
                    padding: '4px 12px', fontSize: '13px',
                  }}>
                    {getTriggerLabel(t)}
                  </span>
                ))}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '12px' }}>
                ציון אוטומטי: <strong style={{ color: '#6366f1' }}>{selectedItem.queueItem?.auto_score}</strong>
              </div>
            </div>

            {/* Review Form */}
            <div style={{
              background: '#1e1e2e', borderRadius: '12px', padding: '20px',
            }}>
              <h3 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: '16px' }}>
                סקירה אנושית
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                  ציון (0-100):
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={reviewScore}
                  onChange={e => setReviewScore(Number(e.target.value))}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #3f3f5a',
                    background: '#0f0f1a', color: '#fff', fontSize: '16px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                  הערות:
                </label>
                <textarea
                  value={reviewComments}
                  onChange={e => setReviewComments(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #3f3f5a',
                    background: '#0f0f1a', color: '#fff', fontSize: '14px', resize: 'vertical',
                  }}
                  placeholder="הוסף הערות לתלמיד..."
                />
              </div>

              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                color: '#e2e8f0', fontSize: '13px', marginBottom: '16px', cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={overrideScore}
                  onChange={e => setOverrideScore(e.target.checked)}
                />
                דרוס ציון אוטומטי (השתמש בציון שלי בלבד)
              </label>

              {error && (
                <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>
              )}

              <button
                onClick={handleSubmitReview}
                disabled={submitting}
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                  background: submitting ? '#4b5563' : '#6366f1', color: '#fff',
                  fontWeight: 600, fontSize: '15px', cursor: submitting ? 'default' : 'pointer',
                }}
              >
                {submitting ? 'שומר...' : 'שלח סקירה'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Queue List View ──
  return (
    <div dir="rtl" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: '22px' }}>תור סקירה אנושית</h2>
        {stats && (
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{
              background: '#1e1e2e', borderRadius: '10px', padding: '10px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#f97316' }}>{stats.pending}</div>
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>ממתינים</div>
            </div>
            <div style={{
              background: '#1e1e2e', borderRadius: '10px', padding: '10px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>{stats.reviewed}</div>
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>נסקרו</div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>טוען...</div>
      ) : queue.length === 0 ? (
        <div style={{
          background: '#1e1e2e', borderRadius: '12px', padding: '40px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
          <div style={{ color: '#22c55e', fontSize: '18px', fontWeight: 600 }}>אין הגשות ממתינות לסקירה</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {queue.map((item) => (
            <div
              key={item.id}
              onClick={() => openReview(item)}
              style={{
                background: '#1e1e2e', borderRadius: '12px', padding: '16px',
                cursor: 'pointer', transition: 'transform 0.1s',
                borderRight: `4px solid ${getPriorityColor(item.priority)}`,
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateX(-4px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {item.student?.picture && (
                    <img src={item.student.picture} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                  )}
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600 }}>{item.student?.name || 'Unknown'}</div>
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>{item.assignment?.title}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#6366f1', fontWeight: 700, fontSize: '18px' }}>
                    {Math.round(item.auto_score)}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>ציון אוטומטי</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                {item.triggers?.map((t, i) => (
                  <span key={i} style={{
                    background: '#2d2d3f', color: '#e2e8f0', borderRadius: '12px',
                    padding: '2px 10px', fontSize: '11px',
                  }}>
                    {getTriggerLabel(t)}
                  </span>
                ))}
              </div>

              <div style={{ color: '#64748b', fontSize: '11px', marginTop: '8px' }}>
                {new Date(item.added_at).toLocaleString('he-IL')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
