import React, { useState, useEffect } from 'react';
import { FolderGit, ExternalLink, Send, Check, AlertCircle, Calendar, FileText, Award } from 'lucide-react';

export default function Projects({ API_URL, token }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [githubUrl, setGithubUrl] = useState({});
  const [deploymentUrl, setDeploymentUrl] = useState({});
  const [submitting, setSubmitting] = useState({});

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/student/projects/?_cb=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Polling for grading status updates
  useEffect(() => {
    if (!projects || !Array.isArray(projects)) return;
    const hasPendingOrGrading = projects.some(proj => 
      proj.submission && 
      (proj.submission.status === 'pending' || proj.submission.status === 'grading')
    );

    if (hasPendingOrGrading) {
      const timer = setTimeout(() => {
        fetchProjects();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [projects]);

  const handleSubmit = async (projectId) => {
    const gitUrl = githubUrl[projectId];
    const deployUrl = deploymentUrl[projectId] || '';
    if (!gitUrl) return alert('Please enter a GitHub Repository URL');

    setSubmitting(prev => ({ ...prev, [projectId]: true }));
    try {
      const res = await fetch(`${API_URL}/student/projects/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ projectId, githubUrl: gitUrl, deploymentUrl: deployUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Project submitted successfully!');
      fetchProjects();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(prev => ({ ...prev, [projectId]: false }));
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: 24 }}>Loading projects...</div>;

  const getMediaUrl = (path) => {
    if (!path) return '';
    const base = API_URL.replace('/api', '');
    return `${base}${path}`;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>
        <FolderGit size={28} style={{ color: 'var(--primary)' }} /> Assigned Code Projects
      </h2>
      
      {projects.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <h3>No assigned projects</h3>
          <p style={{ color: '#9ca3af', marginTop: 8 }}>
            No projects have been assigned to your batch yet. Check back later!
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {projects.map(proj => {
            const hasSub = !!proj.submission;
            const subStatus = hasSub ? proj.submission.status : null;
            const isGraded = hasSub && ['auto-graded', 'admin-approved', 'admin-overridden'].includes(subStatus);
            
            return (
              <div key={proj.id} className="glass-card" style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.title}>{proj.title}</h3>
                  <span className="badge badge-warning" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                    Max Marks: {proj.maximum_marks}
                  </span>
                </div>

                <div style={styles.specBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <FileText size={16} style={{ color: '#60a5fa' }} />
                    <span style={{ fontWeight: '600', fontSize: 13, color: '#e5e7eb' }}>Project Specification</span>
                  </div>
                  {proj.specification_filename ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#9ca3af', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                        {proj.specification_filename}
                      </span>
                      <a 
                        href={getMediaUrl(proj.specification_file)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                      >
                        View / Download
                      </a>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: '#ef4444' }}>No specification document uploaded.</span>
                  )}
                </div>

                {proj.additional_instructions && (
                  <div style={styles.instructions}>
                    <strong>Instructions:</strong>
                    <p style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5 }}>{proj.additional_instructions}</p>
                  </div>
                )}

                <div style={styles.dateRow}>
                  <span><Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Start: {proj.start_date}</span>
                  <span style={{ marginLeft: 16 }}><Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Deadline: {proj.deadline}</span>
                </div>

                {hasSub ? (
                  <div style={styles.subStatus}>
                    <div style={styles.statusRow}>
                      <span>Status:</span>
                      {subStatus === 'grading' ? (
                        <span className="badge badge-warning">Auto Grading...</span>
                      ) : subStatus === 'review_required' ? (
                        <span className="badge badge-warning" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                          Requires Review
                        </span>
                      ) : isGraded ? (
                        <span className="badge badge-success">
                          {subStatus === 'admin-approved' ? 'Approved' : subStatus === 'admin-overridden' ? 'Overridden' : 'Auto-Graded'}
                        </span>
                      ) : (
                        <span className="badge badge-warning">Submitted / Pending Evaluation</span>
                      )}
                    </div>

                    {isGraded && (
                      <div style={styles.scoreSummary}>
                        <div style={styles.scoreItem}>
                          <span>Match Score:</span>
                          <strong style={{ color: proj.submission.project_match_score >= 80 ? '#10b981' : '#f59e0b' }}>
                            {proj.submission.project_match_score}%
                          </strong>
                        </div>
                        <div style={styles.scoreItem}>
                          <span>Quality Score:</span>
                          <strong>{proj.submission.quality_score}%</strong>
                        </div>
                        <div style={styles.scoreItem}>
                          <span>Obtained Marks:</span>
                          <strong style={{ color: '#60a5fa' }}>{proj.submission.obtained_marks} / {proj.maximum_marks}</strong>
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: 13, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ color: '#9ca3af' }}>GitHub: </span>
                        <a href={proj.submission.github_url} target="_blank" rel="noopener noreferrer" style={styles.extLink}>
                          {proj.submission.github_url} <ExternalLink size={12} />
                        </a>
                      </div>
                      {proj.submission.deployment_url && (
                        <div>
                          <span style={{ color: '#9ca3af' }}>Deployment: </span>
                          <a href={proj.submission.deployment_url} target="_blank" rel="noopener noreferrer" style={styles.extLink}>
                            {proj.submission.deployment_url} <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                    </div>

                    {proj.submission.evaluation_report && (
                      <div style={styles.feedbackBox}>
                        <strong>Evaluation Report:</strong>
                        <div style={{ whiteSpace: 'pre-wrap', marginTop: 8, maxHeight: 180, overflowY: 'auto', fontSize: 12, lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 6 }}>
                          {proj.submission.evaluation_report}
                        </div>
                      </div>
                    )}

                    {proj.submission.admin_feedback && (
                      <div style={styles.adminFeedbackBox}>
                        <strong style={{ color: '#10b981' }}>Instructor Feedback:</strong>
                        <p style={{ marginTop: 4, fontSize: 12, color: '#e5e7eb' }}>{proj.submission.admin_feedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={styles.submitSection}>
                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>GitHub Repository URL <span style={{ color: '#ef4444' }}>*</span></label>
                      <input 
                        type="url" 
                        className="custom-input" 
                        placeholder="https://github.com/username/project"
                        value={githubUrl[proj.id] || ''}
                        onChange={e => setGithubUrl(prev => ({ ...prev, [proj.id]: e.target.value }))}
                      />
                    </div>
                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>Deployment Link (Optional)</label>
                      <input 
                        type="url" 
                        className="custom-input" 
                        placeholder="https://project.vercel.app"
                        value={deploymentUrl[proj.id] || ''}
                        onChange={e => setDeploymentUrl(prev => ({ ...prev, [proj.id]: e.target.value }))}
                      />
                    </div>
                    <button 
                      className="btn-primary" 
                      onClick={() => handleSubmit(proj.id)}
                      disabled={submitting[proj.id]}
                      style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                    >
                      {submitting[proj.id] ? 'Submitting Repository...' : 'Submit Project Code'}
                      <Send size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
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
  specBox: {
    padding: 12,
    background: 'rgba(59, 130, 246, 0.05)',
    border: '1px solid rgba(59, 130, 246, 0.15)',
    borderRadius: 12,
    marginBottom: 16,
  },
  instructions: {
    fontSize: 13,
    color: '#9ca3af',
    background: 'rgba(0,0,0,0.15)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dateRow: {
    display: 'flex',
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 16,
  },
  submitSection: {
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
    color: '#e5e7eb',
    fontWeight: '600',
  },
  subStatus: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
  },
  scoreSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    background: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  scoreItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  extLink: {
    color: '#60a5fa',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    fontWeight: '600',
  },
  feedbackBox: {
    marginTop: 8,
    fontSize: 13,
  },
  adminFeedbackBox: {
    marginTop: 8,
    fontSize: 13,
    borderLeft: '3px solid #10b981',
    paddingLeft: 8,
  }
};
