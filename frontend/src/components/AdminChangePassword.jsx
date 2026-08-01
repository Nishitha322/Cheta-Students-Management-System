import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Check, X, Key } from 'lucide-react';

export default function AdminChangePassword({ API_URL, token, handleLogout }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Client-side real-time validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg('New password cannot be the same as the current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setErrorMsg('New password does not meet complexity requirements.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/change-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setSuccessMsg('Password changed successfully. Logging out in 3 seconds...');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        handleLogout();
      }, 3000);

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>🔐 Admin Change Password</h2>

      <div style={styles.formLayout}>
        <div className="glass-card" style={styles.sectionCard}>
          <h3 style={styles.sectionHeader}>
            <Shield size={18} style={{ color: '#ef4444' }} /> Security settings
          </h3>

          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Current Password */}
            <div style={styles.inputWrapper}>
              <label style={styles.label}>Current Password</label>
              <div style={styles.passwordContainer}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="custom-input"
                  style={{ width: '100%', paddingRight: 40 }}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={styles.eyeButton}
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div style={styles.inputWrapper}>
              <label style={styles.label}>New Password</label>
              <div style={styles.passwordContainer}>
                <input
                  type={showNew ? 'text' : 'password'}
                  className="custom-input"
                  style={{ width: '100%', paddingRight: 40 }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={styles.eyeButton}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div style={styles.inputWrapper}>
              <label style={styles.label}>Confirm New Password</label>
              <div style={styles.passwordContainer}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="custom-input"
                  style={{ width: '100%', paddingRight: 40 }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={styles.eyeButton}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="error-alert" style={styles.errorAlert}>
                <X size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="success-alert" style={styles.successAlert}>
                <Check size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Real-time complexity check */}
            <div style={styles.criteriaContainer}>
              <h4 style={styles.criteriaHeader}>Password Complexity Requirements:</h4>
              <div style={styles.criteriaGrid}>
                <div style={{ ...styles.criteriaItem, color: hasMinLength ? '#10b981' : '#f87171' }}>
                  {hasMinLength ? <Check size={14} /> : <X size={14} />}
                  <span>At least 8 characters</span>
                </div>
                <div style={{ ...styles.criteriaItem, color: hasUppercase ? '#10b981' : '#f87171' }}>
                  {hasUppercase ? <Check size={14} /> : <X size={14} />}
                  <span>One uppercase letter (A-Z)</span>
                </div>
                <div style={{ ...styles.criteriaItem, color: hasLowercase ? '#10b981' : '#f87171' }}>
                  {hasLowercase ? <Check size={14} /> : <X size={14} />}
                  <span>One lowercase letter (a-z)</span>
                </div>
                <div style={{ ...styles.criteriaItem, color: hasNumber ? '#10b981' : '#f87171' }}>
                  {hasNumber ? <Check size={14} /> : <X size={14} />}
                  <span>One number (0-9)</span>
                </div>
                <div style={{ ...styles.criteriaItem, color: hasSpecial ? '#10b981' : '#f87171' }}>
                  {hasSpecial ? <Check size={14} /> : <X size={14} />}
                  <span>One special character (e.g. @, #, $, %)</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={18} />
                <span>{loading ? 'Changing password...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
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
  formLayout: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  sectionCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: 24,
    borderRadius: '20px',
  },
  sectionHeader: {
    fontSize: 16,
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 12,
    marginBottom: 4,
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
  passwordContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#f87171',
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 14,
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 14,
  },
  criteriaContainer: {
    backgroundColor: 'rgba(3, 7, 18, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 16,
    marginTop: 10,
  },
  criteriaHeader: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '700',
    marginBottom: 10,
  },
  criteriaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  criteriaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
  }
};
