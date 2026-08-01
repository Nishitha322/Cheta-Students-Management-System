import React, { useState, useEffect } from 'react';
import { Calendar, Check, X, ExternalLink } from 'lucide-react';

export default function AdminLeaves({ API_URL, token }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responseInput, setResponseInput] = useState({});
  const [processing, setProcessing] = useState({});

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/leaves/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLeaves(data);
      
      const resInputs = {};
      data.forEach(l => {
        resInputs[l.id] = l.admin_response || '';
      });
      setResponseInput(resInputs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleResolve = async (leaveId, action) => {
    const adminResponse = responseInput[leaveId];
    if (action === 'rejected' && !adminResponse) {
      return alert('Please write a short rejection comment/reason');
    }

    setProcessing(prev => ({ ...prev, [leaveId]: true }));
    try {
      const res = await fetch(`${API_URL}/admin/resolve-leave/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ leaveId, status: action, adminResponse })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`Leave request ${action} successfully!`);
      fetchLeaves();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(prev => ({ ...prev, [leaveId]: false }));
    }
  };

  if (loading) return <div style={{ color: '#fff' }}>Loading leaves requests...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>
        <Calendar size={28} style={{ color: '#3b82f6' }} /> Leave Requests Administration
      </h2>
      <p style={styles.subheader}>
        Review leave requests submitted by students, verify attached PDF letters, and approve or reject applications.
      </p>

      {leaves.length === 0 ? (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
          <h3>No leave requests found</h3>
          <p style={{ color: '#9ca3af', marginTop: 8 }}>Students have not submitted leave applications.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {leaves.map(req => (
            <div key={req.id} className="glass-card" style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.studentName}>{req.student_name}</h3>
                  <span style={styles.roll}>Roll: {req.student_roll}</span>
                </div>
                <div>
                  {req.status === 'approved' ? (
                    <span className="badge badge-success">Approved</span>
                  ) : req.status === 'rejected' ? (
                    <span className="badge badge-danger">Rejected</span>
                  ) : (
                    <span className="badge badge-warning">Pending Decision</span>
                  )}
                </div>
              </div>

              <div style={styles.bodyDetails}>
                <div style={styles.detailRow}>
                  <span>Leave Date:</span>
                  <strong>{req.date}</strong>
                </div>
                <div style={styles.detailRow}>
                  <span>Duration Style:</span>
                  <strong>{req.leave_type === 'full' ? 'Full Day' : 'Half Day'}</strong>
                </div>
                <div style={styles.reasonBox}>
                  <strong>Student Reason:</strong>
                  <p style={{ color: '#d1d5db', marginTop: 4 }}>"{req.reason}"</p>
                </div>
                {req.pdf_url && (
                  <a href={req.pdf_url} target="_blank" rel="noopener noreferrer" style={styles.pdfLink}>
                    View Attached PDF Letter <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {req.status === 'pending' ? (
                <div style={styles.actionBlock}>
                  <div style={styles.inputWrapper}>
                    <label style={styles.label}>Admin Response Comment</label>
                    <input 
                      type="text" 
                      className="custom-input" 
                      placeholder="Comment e.g. Approved. Stay safe."
                      value={responseInput[req.id] || ''}
                      onChange={e => setResponseInput(prev => ({ ...prev, [req.id]: e.target.value }))}
                      style={{ padding: '8px 12px' }}
                    />
                  </div>
                  <div style={styles.btnRow}>
                    <button 
                      className="btn-primary" 
                      style={{ flex: 1, justifyContent: 'center', background: '#10b981' }}
                      onClick={() => handleResolve(req.id, 'approved')}
                      disabled={processing[req.id]}
                    >
                      <Check size={16} /> Approve
                    </button>
                    <button 
                      className="btn-secondary" 
                      style={{ flex: 1, justifyContent: 'center', borderColor: '#ef4444', color: '#ef4444' }}
                      onClick={() => handleResolve(req.id, 'rejected')}
                      disabled={processing[req.id]}
                    >
                      <X size={16} /> Reject
                    </button>
                  </div>
                </div>
              ) : (
                req.admin_response && (
                  <div style={styles.adminResp}>
                    <strong>Admin Response:</strong> {req.admin_response}
                  </div>
                )
              )}
            </div>
          ))}
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
  subheader: {
    fontSize: 14,
    color: '#9ca3af',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 24,
    marginTop: -8,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
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
  studentName: {
    fontSize: 18,
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    color: '#ffffff',
  },
  roll: {
    fontSize: 12,
    color: '#9ca3af',
    display: 'block',
    marginTop: 2,
  },
  bodyDetails: {
    background: 'rgba(3, 7, 18, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    padding: 18,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: '#9ca3af',
  },
  reasonBox: {
    borderTop: '1px solid rgba(255,255,255,0.05)',
    paddingTop: 10,
    fontSize: 13,
  },
  pdfLink: {
    color: '#60a5fa',
    textDecoration: 'none',
    fontSize: 12,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontWeight: '700',
    marginTop: 4,
  },
  actionBlock: {
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
  btnRow: {
    display: 'flex',
    gap: 10,
  },
  adminResp: {
    background: 'rgba(3, 7, 18, 0.45)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 1.5,
  }
};
