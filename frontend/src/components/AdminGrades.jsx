import React, { useState, useEffect } from 'react';
import { Award, ExternalLink, Send, CheckCircle2, Filter, FolderGit, FileText, Check, AlertCircle, Calendar } from 'lucide-react';

export default function AdminGrades({ API_URL, token }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'graded'
  const [gradeInput, setGradeInput] = useState({});
  const [feedbackInput, setFeedbackInput] = useState({});
  const [grading, setGrading] = useState({});

  // Projects states
  const [submissionsType, setSubmissionsType] = useState('worksheets'); // 'worksheets', 'projects'
  const [projectSubmissions, setProjectSubmissions] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectSub, setSelectedProjectSub] = useState(null);
  const [overrideMarks, setOverrideMarks] = useState({});
  const [overrideFeedback, setOverrideFeedback] = useState({});

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/submissions/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSubmissions(data);
      
      const grades = {};
      const feedbacks = {};
      data.forEach(sub => {
        grades[sub.id] = sub.obtained_marks !== null ? sub.obtained_marks.toString() : '';
        feedbacks[sub.id] = sub.feedback || '';
      });
      setGradeInput(grades);
      setFeedbackInput(feedbacks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSubmissions = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch(`${API_URL}/admin/project-submissions/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProjectSubmissions(data);
      
      const marks = {};
      const feedbacks = {};
      data.forEach(sub => {
        marks[sub.id] = sub.obtained_marks !== null ? sub.obtained_marks.toString() : '';
        feedbacks[sub.id] = sub.admin_feedback || '';
      });
      setOverrideMarks(marks);
      setOverrideFeedback(feedbacks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    if (submissionsType === 'worksheets') {
      fetchSubmissions();
    } else {
      fetchProjectSubmissions();
    }
  }, [submissionsType]);

  const handleProjectAction = async (submissionId, actionType, extraData = {}) => {
    setGrading(prev => ({ ...prev, [submissionId]: true }));
    try {
      const body = { submissionId, action: actionType, ...extraData };
      const res = await fetch(`${API_URL}/admin/grade-project-submission/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchProjectSubmissions();
      alert(data.status || 'Operation successful!');
      if (selectedProjectSub && selectedProjectSub.id === submissionId) {
        setSelectedProjectSub(data.submission);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setGrading(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleAction = async (submissionId, actionType, extraData = {}) => {
    setGrading(prev => ({ ...prev, [submissionId]: true }));
    try {
      const body = { submissionId, action: actionType, ...extraData };
      const res = await fetch(`${API_URL}/admin/grade-submission/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchSubmissions();
      alert(data.status || 'Operation successful!');
    } catch (err) {
      alert(err.message);
    } finally {
      setGrading(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: 24 }}>Loading student submissions...</div>;

  const filteredSubmissions = submissions.filter(sub => {
    if (filter === 'pending') return !sub.grade;
    if (filter === 'graded') return !!sub.grade;
    return true;
  });

  const pendingCount = submissions.filter(s => !s.grade).length;
  const gradedCount = submissions.filter(s => !!s.grade).length;

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>
        <Award size={28} style={{ color: 'var(--primary)' }} /> Grade Student Submissions
      </h2>
      <p style={styles.subheader}>
        Review student task uploads, verify GitHub repositories, award grades, and provide feedback.
      </p>

      {/* Submissions Type Toggle Switcher */}
      <div style={styles.toggleContainer}>
        <button 
          style={submissionsType === 'worksheets' ? styles.toggleBtnActive : styles.toggleBtn}
          onClick={() => setSubmissionsType('worksheets')}
        >
          Worksheet Submissions
        </button>
        <button 
          style={submissionsType === 'projects' ? styles.toggleBtnActivePurple : styles.toggleBtn}
          onClick={() => setSubmissionsType('projects')}
        >
          Project Submissions
        </button>
      </div>

      {submissionsType === 'worksheets' ? (
        <>
          {/* Filter Tabs */}
          <div style={styles.tabRow}>
            <button 
              style={filter === 'all' ? styles.tabActive : styles.tab}
              onClick={() => setFilter('all')}
            >
              All Submissions ({submissions.length})
            </button>
            <button 
              style={filter === 'pending' ? styles.tabActiveYellow : styles.tab}
              onClick={() => setFilter('pending')}
            >
              Pending Review ({pendingCount})
            </button>
            <button 
              style={filter === 'graded' ? styles.tabActiveGreen : styles.tab}
              onClick={() => setFilter('graded')}
            >
              Graded ({gradedCount})
            </button>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="glass-card" style={{ padding: 36, textAlign: 'center', marginTop: 20 }}>
              <h3>No submissions in this category</h3>
              <p style={{ color: '#9ca3af', marginTop: 8 }}>
                {filter === 'pending' ? 'All student submissions have been reviewed and graded!' : 'No student uploads recorded yet.'}
              </p>
            </div>
          ) : (
            <div style={styles.grid}>
              {filteredSubmissions.map(sub => (
                <div key={sub.id} className="glass-card" style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.taskTitle}>{sub.task_title}</h3>
                      <span style={styles.studentName}>
                        {sub.student_name || 'Student'} ({sub.student_roll || 'No Roll'})
                      </span>
                    </div>
                    <div>
                      {sub.evaluation_status === 'grading' ? (
                        <span className="badge badge-warning">Auto Grading...</span>
                      ) : sub.evaluation_status === 'completed' || sub.grade ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} /> Graded ({sub.grade})
                        </span>
                      ) : (
                        <span className="badge badge-warning">Pending Review</span>
                      )}
                    </div>
                  </div>

                  <div style={styles.bodyRow}>
                    {(!sub.submission_type || sub.submission_type === 'github') && sub.github_url ? (
                      <a href={sub.github_url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                        View GitHub Code <ExternalLink size={14} />
                      </a>
                    ) : sub.submission_type === 'written' ? (
                      <div style={{ fontSize: 13, width: '100%' }}>
                        <strong>Written Answer:</strong>
                        <div style={{ maxHeight: 100, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6, marginTop: 4, whiteSpace: 'pre-wrap', fontStyle: 'italic', color: '#cbd5e1' }}>
                          {sub.written_answer}
                        </div>
                      </div>
                    ) : sub.submission_type === 'document' ? (
                      <div style={{ fontSize: 13, width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <strong>Document Uploaded:</strong>
                          <a href={API_URL.replace('/api', '') + sub.uploaded_document} target="_blank" rel="noopener noreferrer" style={styles.link}>
                            Open Document <ExternalLink size={12} />
                          </a>
                        </div>
                        {sub.extracted_text && (
                          <div>
                            <strong style={{ fontSize: 11, color: '#9ca3af' }}>Extracted Content Preview:</strong>
                            <div style={{ maxHeight: 100, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6, marginTop: 4, whiteSpace: 'pre-wrap', fontStyle: 'italic', fontSize: 12, color: '#cbd5e1' }}>
                              {sub.extracted_text}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, display: 'block', width: '100%', textAlign: 'right' }}>
                      Uploaded: {new Date(sub.submitted_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', margin: '12px 0', fontSize: 13, background: 'rgba(0,0,0,0.15)', padding: 12, borderRadius: 8 }}>
                    <div>Max Marks: <strong style={{ color: '#ffffff' }}>{sub.task_max_marks || 10}</strong></div>
                    <div>Obtained Marks: <strong style={{ color: '#ffffff' }}>{sub.obtained_marks !== null ? sub.obtained_marks : 'N/A'}</strong></div>
                    <div>Quality Score: <strong style={{ color: '#60a5fa' }}>{sub.quality_score !== null ? `${sub.quality_score}%` : 'N/A'}</strong></div>
                    <div>Evaluation Status: 
                      <strong style={{ marginLeft: 6, color: sub.evaluation_status === 'completed' ? '#10b981' : '#f59e0b' }}>
                        {sub.evaluation_status ? sub.evaluation_status.toUpperCase() : 'PENDING'}
                      </strong>
                    </div>
                    {sub.is_approved && (
                      <div style={{ gridColumn: '1 / -1', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <CheckCircle2 size={12} /> Marks Approved
                      </div>
                    )}
                  </div>

                  <div style={styles.gradingSection}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      <button 
                        className="btn-secondary" 
                        onClick={() => handleAction(sub.id, 'approve')}
                        disabled={sub.is_approved || grading[sub.id] || sub.evaluation_status !== 'completed'}
                        style={{ flex: 1, fontSize: 12, padding: '8px 4px', justifyContent: 'center' }}
                      >
                        Approve Marks
                      </button>
                      <button 
                        className="btn-secondary" 
                        onClick={() => handleAction(sub.id, 'reevaluate')}
                        disabled={grading[sub.id]}
                        style={{ flex: 1, fontSize: 12, padding: '8px 4px', justifyContent: 'center' }}
                      >
                        Re-evaluate
                      </button>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                      <label style={styles.label}>Override Marks (Out of {sub.task_max_marks || 10})</label>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                        <input 
                          type="number" 
                          className="custom-input" 
                          placeholder="e.g. 8"
                          value={gradeInput[sub.id] || ''}
                          onChange={e => setGradeInput(prev => ({ ...prev, [sub.id]: e.target.value }))}
                          style={{ width: 80 }}
                        />
                        <span style={{ color: '#9ca3af', fontSize: 14 }}>/ {sub.task_max_marks || 10}</span>
                      </div>
                    </div>

                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>Feedback Comments</label>
                      <textarea 
                        className="custom-input" 
                        placeholder="Provide evaluation notes..."
                        value={feedbackInput[sub.id] || ''}
                        onChange={e => setFeedbackInput(prev => ({ ...prev, [sub.id]: e.target.value }))}
                        style={{ minHeight: 60, resize: 'vertical' }}
                      />
                    </div>

                    <button 
                      className="btn-primary" 
                      onClick={() => handleAction(sub.id, 'override', { obtainedMarks: gradeInput[sub.id], feedback: feedbackInput[sub.id] })}
                      disabled={grading[sub.id]}
                      style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                    >
                      <Send size={14} /> {grading[sub.id] ? 'Saving...' : 'Override Marks'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {loadingProjects ? (
            <div style={{ color: '#fff', padding: 24 }}>Loading project submissions...</div>
          ) : projectSubmissions.length === 0 ? (
            <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
              <h3>No project submissions</h3>
              <p style={{ color: '#9ca3af', marginTop: 8 }}>
                No students have submitted project code yet.
              </p>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 24, overflowX: 'auto', borderRadius: '20px' }}>
              <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Project</th>
                    <th>GitHub / Deployment</th>
                    <th>Submitted At</th>
                    <th>Match %</th>
                    <th>Quality %</th>
                    <th>Marks</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projectSubmissions.map(ps => {
                    const statusBadge = 
                      ps.status === 'grading' ? 'badge-warning' :
                      ps.status === 'review_required' ? 'badge-warning' :
                      ps.status.includes('approved') ? 'badge-success' : 'badge-warning';
                    
                    return (
                      <tr key={ps.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: '600' }}>{ps.student_name}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{ps.student_roll || 'No Roll'}</div>
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: '500' }}>{ps.project_title}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <a href={ps.github_url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                              GitHub <ExternalLink size={11} />
                            </a>
                            {ps.deployment_url ? (
                              <a href={ps.deployment_url} target="_blank" rel="noopener noreferrer" style={{ ...styles.link, color: '#10b981' }}>
                                Deploy <ExternalLink size={11} />
                              </a>
                            ) : (
                              <span style={{ fontSize: 11, color: '#9ca3af' }}>No Deploy Link</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: 12, color: '#9ca3af' }}>
                          {new Date(ps.submitted_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: ps.project_match_score >= 80 ? '#10b981' : '#f59e0b' }}>
                          {ps.project_match_score !== null ? `${ps.project_match_score}%` : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: '#60a5fa' }}>
                          {ps.quality_score !== null ? `${ps.quality_score}%` : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700' }}>
                          {ps.obtained_marks !== null ? `${ps.obtained_marks}/${ps.project_max_marks}` : `N/A`}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className={`badge ${statusBadge}`}>
                            {ps.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <button 
                            className="btn-secondary"
                            onClick={() => setSelectedProjectSub(ps)}
                            style={{ padding: '6px 12px', fontSize: 12, justifyContent: 'center' }}
                          >
                            View Evaluation
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Project Evaluation Modal */}
          {selectedProjectSub && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
              padding: 24,
            }}>
              <div className="glass-card" style={{
                width: '100%',
                maxWidth: 680,
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: 32,
                position: 'relative',
                borderRadius: '24px'
              }}>
                <button 
                  onClick={() => setSelectedProjectSub(null)}
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    fontSize: 20,
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
                <h3 style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 }}>
                  Project Evaluation: {selectedProjectSub.project_title}
                </h3>
                <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>
                  Submitted by: <strong>{selectedProjectSub.student_name}</strong> ({selectedProjectSub.student_roll || 'No Roll'})
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, fontSize: 13, marginBottom: 20 }}>
                  <div>Project Match Score: <strong style={{ color: selectedProjectSub.project_match_score >= 80 ? '#10b981' : '#f59e0b' }}>{selectedProjectSub.project_match_score}%</strong></div>
                  <div>Quality Score: <strong style={{ color: '#3b82f6' }}>{selectedProjectSub.quality_score}%</strong></div>
                  <div>Obtained Marks: <strong style={{ color: '#fff' }}>{selectedProjectSub.obtained_marks} / {selectedProjectSub.project_max_marks}</strong></div>
                  <div>Status: <strong style={{ textTransform: 'uppercase', color: selectedProjectSub.status.includes('approved') ? '#10b981' : '#f59e0b' }}>{selectedProjectSub.status}</strong></div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 8 }}>Evaluation Report</h4>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: 16,
                    borderRadius: 8,
                    maxHeight: 250,
                    overflowY: 'auto',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    {selectedProjectSub.evaluation_report}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 12 }}>Grade Override & Feedback</h4>
                  
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Override Marks (0 - {selectedProjectSub.project_max_marks})</label>
                      <input 
                        type="number" 
                        step="0.1"
                        className="custom-input" 
                        placeholder="e.g. 45"
                        value={overrideMarks[selectedProjectSub.id] || ''}
                        onChange={e => setOverrideMarks(prev => ({ ...prev, [selectedProjectSub.id]: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Instructor Feedback Comments</label>
                    <textarea 
                      className="custom-input" 
                      placeholder="Provide feedback on the project codebase, missing features..."
                      value={overrideFeedback[selectedProjectSub.id] || ''}
                      onChange={e => setOverrideFeedback(prev => ({ ...prev, [selectedProjectSub.id]: e.target.value }))}
                      style={{ minHeight: 60, resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button 
                      className="btn-primary"
                      onClick={() => handleProjectAction(selectedProjectSub.id, 'override', { 
                        obtainedMarks: overrideMarks[selectedProjectSub.id],
                        feedback: overrideFeedback[selectedProjectSub.id]
                      })}
                      disabled={grading[selectedProjectSub.id]}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Override Marks
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={() => handleProjectAction(selectedProjectSub.id, 'approve')}
                      disabled={selectedProjectSub.status === 'admin-approved' || grading[selectedProjectSub.id]}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Approve Marks
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={() => handleProjectAction(selectedProjectSub.id, 'reevaluate')}
                      disabled={grading[selectedProjectSub.id]}
                      style={{ flex: 1, justifyContent: 'center', color: '#f59e0b' }}
                    >
                      Re-evaluate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
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
  subheader: {
    fontSize: 14,
    color: '#9ca3af',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 24,
    marginTop: -8,
  },
  tabRow: {
    display: 'flex',
    gap: 10,
    background: 'rgba(3, 7, 18, 0.45)',
    padding: 6,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  tab: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    padding: '10px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-header)',
    fontWeight: '600',
    fontSize: 13,
    transition: 'all 0.2s',
  },
  tabActive: {
    flex: 1,
    background: 'rgba(59, 130, 246, 0.08)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    color: 'var(--primary)',
    padding: '10px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-header)',
    fontWeight: '700',
    fontSize: 13,
  },
  tabActiveYellow: {
    flex: 1,
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    color: '#fbbf24',
    padding: '10px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-header)',
    fontWeight: '700',
    fontSize: 13,
  },
  tabActiveGreen: {
    flex: 1,
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    padding: '10px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-header)',
    fontWeight: '700',
    fontSize: 13,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 24,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: 24,
    borderRadius: '20px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskTitle: {
    fontSize: 17,
    fontFamily: 'var(--font-header)',
    fontWeight: '700',
    color: '#ffffff',
  },
  studentName: {
    fontSize: 13,
    color: '#9ca3af',
    display: 'block',
    marginTop: 3,
  },
  bodyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    alignItems: 'center',
    background: 'rgba(3, 7, 18, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    padding: 12,
    borderRadius: 10,
  },
  link: {
    color: '#60a5fa',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontWeight: '700',
  },
  date: {
    color: '#9ca3af',
    fontSize: 12,
  },
  gradingSection: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  toggleContainer: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
    background: 'rgba(3, 7, 18, 0.45)',
    padding: 6,
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  toggleBtn: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-header)',
    fontWeight: '600',
    fontSize: 13,
    transition: 'all 0.2s',
  },
  toggleBtnActive: {
    flex: 1,
    background: 'rgba(59, 130, 246, 0.08)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    color: 'var(--primary)',
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-header)',
    fontWeight: '600',
    fontSize: 13,
    transition: 'all 0.2s',
  },
  toggleBtnActivePurple: {
    flex: 1,
    background: 'rgba(168, 85, 247, 0.08)',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    color: '#a855f7',
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-header)',
    fontWeight: '600',
    fontSize: 13,
    transition: 'all 0.2s',
  },
};
