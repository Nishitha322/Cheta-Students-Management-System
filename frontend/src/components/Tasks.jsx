import React, { useState, useEffect } from 'react';
import { ClipboardList, ExternalLink, Send, Check } from 'lucide-react';

export default function Tasks({ API_URL, token }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitUrl, setSubmitUrl] = useState({});
  const [submitting, setSubmitting] = useState({});

  // Submission types/answers state
  const [submissionType, setSubmissionType] = useState({}); // taskId -> 'written' | 'document'
  const [writtenAnswer, setWrittenAnswer] = useState({}); // taskId -> text
  const [uploadedDocument, setUploadedDocument] = useState({}); // taskId -> file

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/student/tasks/?_cb=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Dynamic polling for pending/grading submissions
  useEffect(() => {
    if (!tasks || !Array.isArray(tasks)) return;
    const hasPendingOrGrading = tasks.some(task => 
      task.submission && 
      (task.submission.evaluation_status === 'pending' || task.submission.evaluation_status === 'grading')
    );

    if (hasPendingOrGrading) {
      const timer = setTimeout(() => {
        fetchTasks();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [tasks]);

  const handleSubmit = async (taskId) => {
    const type = submissionType[taskId] || 'written';
    const form = new FormData();
    form.append('taskId', taskId);
    form.append('submissionType', type);

    if (type === 'written') {
      const answer = writtenAnswer[taskId];
      if (!answer || !answer.trim()) return alert('Please enter your written answer');
      form.append('writtenAnswer', answer);
    } else {
      const file = uploadedDocument[taskId];
      if (!file) return alert('Please select a document file (PDF, DOCX, TXT)');
      form.append('uploadedDocument', file);
    }

    setSubmitting(prev => ({ ...prev, [taskId]: true }));
    try {
      const res = await fetch(`${API_URL}/student/tasks/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Task submitted successfully!');
      fetchTasks();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(prev => ({ ...prev, [taskId]: false }));
    }
  };

  if (loading) return <div style={{ color: '#fff' }}>Loading tasks...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>
        <ClipboardList size={28} style={{ color: 'var(--primary)' }} /> My Assigned Tasks
      </h2>
      <div style={styles.grid}>
        {tasks.map(task => (
          <div key={task.id} className="glass-card" style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.title}>{task.title}</h3>
              <span className="badge badge-warning" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                {task.batch_name || 'Batch Task'}
              </span>
            </div>
            
            <div style={styles.desc}>
              <div style={{ whiteSpace: 'pre-line' }}>{task.description}</div>
            </div>

            <div style={styles.dueDate}>Due Date: {task.due_date}</div>

            {task.submission ? (
              <div style={styles.subStatus}>
                <div style={styles.statusRow}>
                  <span>Status: </span>
                  {task.submission.evaluation_status === 'grading' ? (
                    <span className="badge badge-warning">Auto Grading...</span>
                  ) : task.submission.evaluation_status === 'completed' || task.submission.grade ? (
                    <span className="badge badge-success">Graded ({task.submission.grade})</span>
                  ) : (
                    <span className="badge badge-warning">Awaiting Review</span>
                  )}
                </div>
                
                {task.submission.evaluation_status === 'completed' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#9ca3af', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                    {task.submission.quality_score !== null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Quality Score:</span>
                        <strong style={{ color: '#60a5fa' }}>{task.submission.quality_score}%</strong>
                      </div>
                    )}
                    {task.submission.evaluation_time && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Evaluation Date:</span>
                        <strong>{new Date(task.submission.evaluation_time).toLocaleDateString()}</strong>
                      </div>
                    )}
                  </div>
                )}

                <div style={styles.subLinkRow}>
                  {(!task.submission.submission_type || task.submission.submission_type === 'github') && task.submission.github_url && (
                    <a href={task.submission.github_url} target="_blank" rel="noopener noreferrer" style={styles.extLink}>
                      View Submitted GitHub Code <ExternalLink size={14} />
                    </a>
                  )}
                  {task.submission.submission_type === 'written' && (
                    <div style={{ fontSize: 13, width: '100%', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 10 }}>
                      <strong>Your Answer:</strong>
                      <div style={{ maxHeight: 100, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6, marginTop: 4, whiteSpace: 'pre-wrap', fontStyle: 'italic', color: '#cbd5e1' }}>
                        {task.submission.written_answer}
                      </div>
                    </div>
                  )}
                  {task.submission.submission_type === 'document' && (
                    <div style={{ fontSize: 13, width: '100%', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <strong>Submitted Document:</strong>
                        <a href={API_URL.replace('/api', '') + task.submission.uploaded_document} target="_blank" rel="noopener noreferrer" style={styles.extLink}>
                          View Document <ExternalLink size={12} />
                        </a>
                      </div>
                      {task.submission.extracted_text && (
                        <div>
                          <strong style={{ fontSize: 11, color: '#9ca3af' }}>Extracted Text Preview:</strong>
                          <div style={{ maxHeight: 100, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6, marginTop: 4, whiteSpace: 'pre-wrap', fontStyle: 'italic', fontSize: 12, color: '#cbd5e1' }}>
                            {task.submission.extracted_text}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {task.submission.feedback && (
                  <div style={styles.feedbackBox}>
                    <strong>Auto-Grading Report:</strong>
                    <div style={{ whiteSpace: 'pre-wrap', marginTop: 6, maxHeight: 150, overflowY: 'auto', fontSize: 12, lineHeight: 1.5 }}>
                      {task.submission.feedback}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.submitSection}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: (submissionType[task.id] || 'written') === 'written' ? 'rgba(59,130,246,0.1)' : 'none',
                      color: (submissionType[task.id] || 'written') === 'written' ? '#3b82f6' : '#9ca3af',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: '600'
                    }}
                    onClick={() => setSubmissionType(prev => ({ ...prev, [task.id]: 'written' }))}
                  >
                    Written Answer
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: submissionType[task.id] === 'document' ? 'rgba(59,130,246,0.1)' : 'none',
                      color: submissionType[task.id] === 'document' ? '#3b82f6' : '#9ca3af',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: '600'
                    }}
                    onClick={() => setSubmissionType(prev => ({ ...prev, [task.id]: 'document' }))}
                  >
                    Document Upload
                  </button>
                </div>

                {(submissionType[task.id] || 'written') === 'written' ? (
                  <textarea
                    className="custom-input"
                    placeholder="Type your complete answer/report here..."
                    value={writtenAnswer[task.id] || ''}
                    onChange={e => setWrittenAnswer(prev => ({ ...prev, [task.id]: e.target.value }))}
                    style={{ marginBottom: 12, minHeight: 80, resize: 'vertical' }}
                  />
                ) : (
                  <input
                    type="file"
                    className="custom-input"
                    accept=".pdf,.docx,.txt"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        setUploadedDocument(prev => ({ ...prev, [task.id]: file }));
                      }
                    }}
                    style={{ marginBottom: 12 }}
                  />
                )}

                <button 
                  className="btn-primary" 
                  onClick={() => handleSubmit(task.id)}
                  disabled={submitting[task.id]}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {submitting[task.id] ? 'Submitting...' : 'Submit Task'}
                  <Send size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
    position: 'relative',
    zIndex: 2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: '#ffffff',
    fontFamily: 'var(--font-header)',
    fontSize: 26,
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: 24,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '20px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'var(--font-header)',
    fontWeight: 600,
    color: '#ffffff',
  },
  desc: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 1.6,
    flex: 1,
    marginBottom: 20,
    padding: '16px',
    background: 'rgba(3, 7, 18, 0.35)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
  },
  dueDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 20,
  },
  submitSection: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 20,
  },
  subStatus: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
  },
  subLinkRow: {
    fontSize: 13,
  },
  extLink: {
    color: '#60a5fa',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontWeight: '600',
  },
  feedbackBox: {
    background: 'rgba(3, 7, 18, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    padding: 14,
    fontSize: 13,
    color: '#d1d5db',
  }
};
