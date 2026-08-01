import React from 'react';
import { Clock, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

export default function PendingApproval({ enrollment, onRefresh }) {
  const batchName = enrollment?.batch_name || enrollment?.batch?.name || "Selected Batch";

  return (
    <div className="glass-card" style={{
      maxWidth: 700,
      margin: '60px auto',
      padding: '48px 40px',
      borderRadius: '24px',
      color: '#f8fafc',
      textAlign: 'center',
      position: 'relative',
      zIndex: 2,
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 24,
        background: 'rgba(249, 115, 22, 0.08)',
        color: 'var(--warning)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px auto',
        border: '1px solid rgba(249, 115, 22, 0.2)'
      }}>
        <Clock size={36} />
      </div>

      <span style={{
        background: 'rgba(249, 115, 22, 0.08)',
        color: '#fb923c',
        padding: '6px 16px',
        borderRadius: 20,
        fontSize: '0.8rem',
        fontWeight: 700,
        border: '1px solid rgba(249, 115, 22, 0.2)',
        letterSpacing: '0.5px'
      }}>
        ENROLLMENT PENDING APPROVAL
      </span>

      <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-header)', fontWeight: 600, margin: '20px 0 12px 0' }}>
        Request Submitted for {batchName}
      </h2>

      <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 28, maxWidth: 520, margin: '0 auto 28px auto' }}>
        Your request has been sent to the administrator for approval. Please wait until it is approved to access batch tasks, chat, and study materials.
      </p>

      <div style={{
        background: 'rgba(3, 7, 18, 0.35)',
        border: '1px dashed rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        textAlign: 'left'
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Requested Batch</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc', fontFamily: 'var(--font-header)', marginTop: 2 }}>{batchName}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fb923c', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fb923c', display: 'inline-block', boxShadow: '0 0 8px #fb923c' }}></span>
            Awaiting Admin Action
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
        <button
          onClick={onRefresh}
          className="btn-primary"
          style={{
            borderRadius: 12,
            padding: '12px 24px',
          }}
        >
          <RefreshCw size={16} />
          Check Approval Status
        </button>
      </div>
    </div>
  );
}
