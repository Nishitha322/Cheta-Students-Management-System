import React from 'react';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function RejectedBatch({ enrollment, onChooseNewBatch }) {
  const batchName = enrollment?.batch_name || enrollment?.batch?.name || "the requested batch";

  return (
    <div className="glass-card" style={{
      maxWidth: 650,
      margin: '60px auto',
      padding: '48px 40px',
      borderRadius: '24px',
      color: '#f8fafc',
      textAlign: 'center',
      border: '1px solid rgba(239, 68, 68, 0.25)',
      boxShadow: '0 10px 30px rgba(239, 68, 68, 0.05)',
      position: 'relative',
      zIndex: 2,
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 24,
        background: 'rgba(239, 68, 68, 0.08)',
        color: 'var(--danger)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px auto',
        border: '1px solid rgba(239, 68, 68, 0.2)'
      }}>
        <XCircle size={36} />
      </div>

      <span style={{
        background: 'rgba(239, 68, 68, 0.08)',
        color: '#f87171',
        padding: '6px 16px',
        borderRadius: 20,
        fontSize: '0.8rem',
        fontWeight: 700,
        border: '1px solid rgba(239, 68, 68, 0.2)',
        letterSpacing: '0.5px'
      }}>
        REQUEST REJECTED
      </span>

      <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-header)', fontWeight: 600, margin: '20px 0 12px 0' }}>
        Batch Request Rejected
      </h2>

      <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 24 }}>
        Your request to join <strong>{batchName}</strong> has been rejected. Please contact the administrator for assistance or choose a different training batch.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 32 }}>
        <button
          onClick={onChooseNewBatch}
          className="btn-primary"
          style={{
            borderRadius: 12,
            padding: '12px 24px',
            background: 'var(--danger-glow)',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
          }}
        >
          <ArrowLeft size={16} />
          Choose Another Batch
        </button>
      </div>
    </div>
  );
}
