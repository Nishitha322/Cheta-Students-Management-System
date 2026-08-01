import React, { useState, useEffect } from 'react';
import { UserCheck, CheckCircle2, XCircle, Clock, Search, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminPendingRequests({ API_URL, token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/pending-requests/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch pending batch requests");
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionId(id);
    setActionMsg(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/approve/${id}/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve request");

      setActionMsg(`Approved successfully! Student allocated to batch.`);
      setRequests(requests.filter(r => r.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id) => {
    setActionId(id);
    setActionMsg(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/reject/${id}/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject request");

      setActionMsg(`Batch request rejected.`);
      setRequests(requests.filter(r => r.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const filteredRequests = requests.filter(r => {
    const term = searchTerm.toLowerCase();
    const name = (r.student_name || '').toLowerCase();
    const email = (r.student_email || '').toLowerCase();
    const roll = (r.student_roll || '').toLowerCase();
    const batch = (r.batch_name || '').toLowerCase();
    return name.includes(term) || email.includes(term) || roll.includes(term) || batch.includes(term);
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', color: '#f8fafc', position: 'relative', zIndex: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-header)', fontWeight: 600, margin: 0, background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
            Pending Batch Requests
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '4px 0 0 0' }}>
            Review, approve, or reject new student requests for training batch allocation.
          </p>
        </div>

        <button
          onClick={fetchPendingRequests}
          className="btn-secondary"
          style={{
            borderRadius: 10,
            padding: '10px 18px',
          }}
        >
          <RefreshCw size={16} />
          Refresh List
        </button>
      </div>

      {actionMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '12px 18px', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} />
          <span style={{ fontWeight: 500 }}>{actionMsg}</span>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '12px 18px', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={18} />
          <span style={{ fontWeight: 500 }}>{error}</span>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={18} color="#4b5563" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          className="custom-input"
          placeholder="Search by student name, email, roll number, or requested batch..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            paddingLeft: 46,
            fontSize: '0.95rem',
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <h3 style={{ fontFamily: 'var(--font-header)', fontWeight: 600 }}>Loading pending batch requests...</h3>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="glass-card" style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <Clock size={40} color="#475569" style={{ marginBottom: 12 }} />
          <h3 style={{ fontFamily: 'var(--font-header)', fontWeight: 700, color: '#ffffff' }}>No Pending Batch Requests</h3>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.95rem' }}>
            All student batch requests have been processed.
          </p>
        </div>
      ) : (
        <div className="table-container" style={{ margin: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Email</th>
                <th>Roll Number</th>
                <th>Requested Batch</th>
                <th>Requested Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => {
                const isProcessing = actionId === req.id;
                const reqDate = req.requested_at || req.joined_at;
                const formattedDate = reqDate ? new Date(reqDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

                return (
                  <tr key={req.id}>
                    <td style={{ fontWeight: '700', color: '#f8fafc' }}>
                      {req.student_name || 'N/A'}
                    </td>
                    <td>
                      {req.student_email || 'N/A'}
                    </td>
                    <td style={{ color: 'var(--primary)', fontWeight: '700', fontFamily: 'var(--font-primary)' }}>
                      {req.student_roll || 'N/A'}
                    </td>
                    <td>
                      <span className="badge" style={{ 
                        background: 'rgba(59, 130, 246, 0.08)', 
                        color: 'var(--primary)', 
                        borderColor: 'rgba(59, 130, 246, 0.2)',
                        fontWeight: '700', 
                      }}>
                        {req.batch_name || 'N/A'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      {formattedDate}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleApprove(req.id)}
                          className="btn-primary"
                          style={{
                            padding: '8px 14px',
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            borderRadius: 10,
                          }}
                        >
                          <CheckCircle2 size={14} />
                          Approve
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleReject(req.id)}
                          className="btn-secondary"
                          style={{
                            padding: '8px 14px',
                            borderColor: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            borderRadius: 10,
                          }}
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
