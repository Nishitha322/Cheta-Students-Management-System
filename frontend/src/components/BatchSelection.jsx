import React, { useState, useEffect } from 'react';
import { BookOpen, UserCheck, Layers, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BatchSelection({ API_URL, token, onEnrollmentRequested }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/batches/?_cb=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to fetch available batches");
      const data = await res.json();
      setBatches(data);
    } catch (err) {
      setError(err.message || "Error loading batches");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinBatch = async (batchId) => {
    setSubmittingId(batchId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_URL}/batch/request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ batch_id: batchId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit batch request");
      }
      setSuccessMsg("Your request has been sent to the administrator for approval.");
      if (onEnrollmentRequested) {
        setTimeout(() => {
          onEnrollmentRequested();
        }, 1500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '60px auto', padding: '0 24px', color: '#f8fafc', position: 'relative', zIndex: 2 }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <span style={{ 
          background: 'rgba(59, 130, 246, 0.08)', 
          color: 'var(--primary)', 
          padding: '6px 16px', 
          borderRadius: 20, 
          fontSize: '0.8rem', 
          fontWeight: 700,
          border: '1px solid rgba(59, 130, 246, 0.2)',
          letterSpacing: '1px'
        }}>
          STUDENT ONBOARDING
        </span>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontFamily: 'var(--font-header)',
          fontWeight: 600, 
          margin: '16px 0 12px 0', 
          background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em'
        }}>
          Select Your Training Batch
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: 650, margin: '0 auto', lineHeight: 1.6 }}>
          Welcome to CSMS! Choose your specialized training batch below to request enrollment. Once approved by an administrator, you will get access to all batch tasks, notes, and dashboards.
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '14px 18px', borderRadius: 12, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
          <AlertCircle size={20} />
          <span style={{ fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '14px 18px', borderRadius: 12, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
          <CheckCircle2 size={20} />
          <span style={{ fontWeight: 500 }}>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <h3 style={{ fontFamily: 'var(--font-header)', fontWeight: 600 }}>Loading available batches...</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {batches.map((b) => {
            const seatsAvailable = Math.max(0, (b.max_seats || 60) - (b.enrolled_count || 0));
            const isSubmitting = submittingId === b.id;

            return (
              <div key={b.id} className="glass-card" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 28,
                borderRadius: '24px',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s',
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div style={{ 
                      width: 44, 
                      height: 44, 
                      borderRadius: 12, 
                      background: 'rgba(59, 130, 246, 0.08)', 
                      color: 'var(--primary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid rgba(59, 130, 246, 0.15)'
                    }}>
                      <BookOpen size={22} />
                    </div>
                    <span style={{ 
                      background: 'rgba(3, 7, 18, 0.45)', 
                      border: '1px solid rgba(255, 255, 255, 0.05)', 
                      color: seatsAvailable > 0 ? '#34d399' : '#f87171', 
                      fontSize: '0.78rem', 
                      padding: '4px 12px', 
                      borderRadius: 20,
                      fontWeight: '700'
                    }}>
                      {seatsAvailable > 0 ? `${seatsAvailable} Seats Left` : 'Full'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-header)', fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
                    {b.name}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
                    {b.description || "Comprehensive training program tailored for campus placements."}
                  </p>
                </div>

                <div>
                  <div style={{ 
                    borderTop: '1px solid rgba(255,255,255,0.06)', 
                    paddingTop: 18, 
                    marginBottom: 20, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 8,
                    fontSize: '0.85rem',
                    color: '#cbd5e1'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Layers size={16} color="var(--primary)" />
                      <span style={{ fontWeight: '500' }}>Capacity: {b.enrolled_count || 0} / {b.max_seats || 60} Enrolled</span>
                    </div>
                  </div>

                  <button
                    disabled={isSubmitting || seatsAvailable <= 0}
                    onClick={() => handleJoinBatch(b.id)}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      borderRadius: 12,
                    }}
                  >
                    {isSubmitting ? "Sending Request..." : "Join Batch"}
                    {!isSubmitting && <ArrowRight size={16} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
