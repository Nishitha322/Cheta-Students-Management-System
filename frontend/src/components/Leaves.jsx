import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Send, ExternalLink } from 'lucide-react';

export default function Leaves({ API_URL, token }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaveType, setLeaveType] = useState('full');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_URL}/student/leaves/?_cb=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLeaves(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !reason) return alert('Date and reason are required');
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/student/leaves/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ leave_type: leaveType, date, reason, pdf_url: pdfUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Leave application submitted!');
      setDate('');
      setReason('');
      setPdfUrl('');
      fetchLeaves();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ color: '#fff' }}>Loading leave applications...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Leave Application Portal</h2>
      
      <div style={styles.mainLayout}>
        {/* Left column - Form */}
        <div className="glass-card" style={styles.leftCol}>
          <h3 style={styles.sectionHeader}>Apply for Leave</h3>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputWrapper}>
              <label style={styles.label}>Leave Type</label>
              <select className="custom-input" value={leaveType} onChange={e => setLeaveType(e.target.value)}>
                <option value="full">Full Day</option>
                <option value="half">Half Day</option>
              </select>
            </div>

            <div style={styles.inputWrapper}>
              <label style={styles.label}>Date of Leave</label>
              <input 
                type="date" 
                className="custom-input" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                required
              />
            </div>

            <div style={styles.inputWrapper}>
              <label style={styles.label}>Reason for Leave</label>
              <textarea 
                className="custom-input" 
                placeholder="I have to go to temple..." 
                value={reason} 
                onChange={e => setReason(e.target.value)}
                style={{ minHeight: 120, resize: 'vertical' }}
                required
              />
            </div>

            <div style={styles.inputWrapper}>
              <label style={styles.label}>Attached PDF Letter URL (Optional)</label>
              <input 
                type="url" 
                className="custom-input" 
                placeholder="https://drive.google.com/..." 
                value={pdfUrl} 
                onChange={e => setPdfUrl(e.target.value)} 
              />
            </div>

            <button type="submit" className="btn-primary" disabled={submitting} style={{ justifyContent: 'center' }}>
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>

        {/* Right column - Leave History */}
        <div className="glass-card" style={styles.rightCol}>
          <h3 style={styles.sectionHeader}>My Leave History</h3>
          <div style={styles.historyList}>
            {leaves.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14 }}>No leave requests submitted yet.</p>
            ) : (
              leaves.map(req => (
                <div key={req.id} style={styles.historyItem}>
                  <div style={styles.itemHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={16} style={{ color: '#3b82f6' }} />
                      <strong style={{ fontSize: 15 }}>{req.date}</strong>
                      <span className="badge" style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)' }}>
                        {req.leave_type === 'full' ? 'Full Day' : 'Half Day'}
                      </span>
                    </div>
                    <div>
                      {req.status === 'approved' ? (
                        <span className="badge badge-success">Approved</span>
                      ) : req.status === 'rejected' ? (
                        <span className="badge badge-danger">Rejected</span>
                      ) : (
                        <span className="badge badge-warning">Pending</span>
                      )}
                    </div>
                  </div>

                  <p style={styles.reasonText}>Reason: "{req.reason}"</p>
                  
                  {req.pdf_url && (
                    <a href={req.pdf_url} target="_blank" rel="noopener noreferrer" style={styles.pdfLink}>
                      View Attached PDF Letter <ExternalLink size={12} />
                    </a>
                  )}

                  {req.admin_response && (
                    <div style={styles.adminResp}>
                      <strong>Response:</strong> {req.admin_response}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
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
    color: '#ffffff',
    fontFamily: 'var(--font-header)',
    fontSize: 26,
    fontWeight: 600,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 24,
  },
  mainLayout: {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap',
  },
  leftCol: {
    flex: 2,
    minWidth: 320,
    borderRadius: '20px',
  },
  rightCol: {
    flex: 3,
    minWidth: 320,
    borderRadius: '20px',
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 20,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    maxHeight: 520,
    overflowY: 'auto',
  },
  historyItem: {
    background: 'rgba(3, 7, 18, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reasonText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
  pdfLink: {
    fontSize: 12,
    color: '#60a5fa',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontWeight: '600',
  },
  adminResp: {
    background: 'rgba(3, 7, 18, 0.45)',
    padding: 12,
    borderRadius: 8,
    fontSize: 12,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    color: '#9ca3af',
    lineHeight: 1.5,
  }
};
