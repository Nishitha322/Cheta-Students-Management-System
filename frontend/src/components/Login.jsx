import React, { useState, useEffect } from 'react';
import { Mail, Lock, LogIn, ArrowRight, ShieldAlert, Key, ClipboardCheck, Sparkles } from 'lucide-react';
import FloatingTechBackground from './FloatingTechBackground';

export default function Login({ setAuth, API_URL }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password flow states
  const [authMode, setAuthMode] = useState('auth'); // 'auth', 'forgot_email', 'forgot_otp', 'forgot_reset'
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  // OTP Countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const checkPasswordStrength = (pass) => {
    return {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[^A-Za-z0-9]/.test(pass)
    };
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isRegister ? '/auth/register/' : '/auth/login/';
    
    const trimmedEmail = email.trim().toLowerCase();

    if (isRegister) {
      if (!trimmedEmail.endsWith('@mits.ac.in')) {
        setError('Only official emails ending with @mits.ac.in are allowed.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      const strength = checkPasswordStrength(password);
      if (!Object.values(strength).every(Boolean)) {
        setError('Password does not meet all security requirements.');
        setLoading(false);
        return;
      }
    }

    const bodyData = isRegister 
      ? { email: trimmedEmail, password, confirmPassword, firstName, lastName, rollNumber, phoneNumber }
      : { email: trimmedEmail, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server returned status ${res.status}. Please check server status.`);
      }
      
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      localStorage.setItem('csms_token', data.token);
      localStorage.setItem('csms_user', JSON.stringify(data.user));
      setAuth(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAuthMode('forgot_otp');
      setOtpTimer(300); // 5 minutes
      setResendCooldown(60); // 60 seconds
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAuthMode('forgot_reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const strength = checkPasswordStrength(newPassword);
    if (!Object.values(strength).every(Boolean)) {
      setError('Password does not meet all security requirements.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAuthMode('auth');
      setIsRegister(false);
      setError('');
      alert('Password reset successful! Please login with your new password.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Decorative background with crystal-clear 4K MITS campus image */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(3, 7, 18, 0.25) 0%, rgba(3, 7, 18, 0.45) 100%), url("/mits_campus.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(1.10) contrast(1.10) saturate(1.15)'
      }}>
        <FloatingTechBackground />
      </div>

      {/* Left Portion: Branding Header and Bottom Caption Info */}
      <div style={styles.leftPanel}>
        <div style={styles.topBranding}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <img src="/logo.png" alt="CSMS Logo" style={{ height: 44, width: 'auto', borderRadius: 8, objectFit: 'contain' }} />
            <div style={styles.logoTag}>CSMS Portal</div>
          </div>
          <h1 style={styles.brandTitle}>Cheta Students Management System</h1>
        </div>
        <div style={styles.bottomBranding}>
          {/* Tribute Badge requested by User */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 99,
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#60a5fa',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 14,
            boxShadow: '0 0 18px rgba(59, 130, 246, 0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <Sparkles size={14} style={{ color: '#f59e0b' }} />
            A TRIBUTE TO MITS STUDENTS FROM THEIR SENIORS
          </div>

          <p style={styles.brandDesc}>
            Bridging the gap between training and placements. Seamlessly track worksheets, log check-in attendance, and analyze mock drives in real-time.
          </p>
          <div style={styles.badgesRow}>
            <span style={styles.brandBadge}>Interactive Batches</span>
            <span style={styles.brandBadge}>Attendance Tracker</span>
            <span style={styles.brandBadge}>Mock Drive Insights</span>
          </div>
          <div style={styles.developerCredit}>
            Designed & Developed by: Chethan, Nichitha, Aftab
          </div>
        </div>
      </div>

      {/* Right Portion: Centered Login details on a semi-transparent panel */}
      <div style={styles.rightPanel}>
        <div className="glass-card" style={styles.formCard}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <img src="/logo.png" alt="CSMS Logo" style={{ height: 56, width: 'auto', borderRadius: 10, objectFit: 'contain' }} />
          </div>

          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <h2 style={styles.formHeader}>
              {authMode === 'auth' 
                ? (isRegister ? 'Create an Account' : 'Welcome Back')
                : (authMode === 'forgot_email' ? 'Forgot Password' : (authMode === 'forgot_otp' ? 'Verify OTP' : 'Reset Password'))
              }
            </h2>
            <p style={styles.formSubheader}>
              {authMode === 'auth'
                ? (isRegister ? 'Join the community today' : 'Sign in to your account')
                : (authMode === 'forgot_email' ? 'Enter email to request reset OTP' : (authMode === 'forgot_otp' ? 'Enter the code sent to your email' : 'Set your new secure password'))
              }
            </p>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          {authMode === 'auth' && (
            <form onSubmit={handleLoginSubmit} style={styles.form}>
              {isRegister && (
                <>
                  <div style={styles.nameRow}>
                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>First Name</label>
                      <input 
                        type="text" 
                        className="custom-input" 
                        placeholder="First Name" 
                        value={firstName} 
                        onChange={e => setFirstName(e.target.value)} 
                        autoComplete="off"
                        required
                      />
                    </div>
                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>Last Name</label>
                      <input 
                        type="text" 
                        className="custom-input" 
                        placeholder="Last Name" 
                        value={lastName} 
                        onChange={e => setLastName(e.target.value)} 
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>

                  <div style={styles.nameRow}>
                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>Roll Number</label>
                      <input 
                        type="text" 
                        className="custom-input" 
                        placeholder="Roll Number" 
                        value={rollNumber} 
                        onChange={e => setRollNumber(e.target.value)} 
                        autoComplete="off"
                      />
                    </div>
                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>Phone Number</label>
                      <input 
                        type="tel" 
                        className="custom-input" 
                        placeholder="Phone Number" 
                        value={phoneNumber} 
                        onChange={e => setPhoneNumber(e.target.value)} 
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Email Address</label>
                <div style={styles.inputIconContainer}>
                  <Mail size={16} style={styles.inputIcon} />
                  <input 
                    type="email" 
                    className="custom-input" 
                    placeholder="e.g. 23691A3330@mits.ac.in" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    style={{ paddingLeft: 44 }}
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputIconContainer}>
                  <Lock size={16} style={styles.inputIcon} />
                  <input 
                    type="password" 
                    className="custom-input" 
                    placeholder="Password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    style={{ paddingLeft: 44 }}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {isRegister && (
                <>
                  <div style={styles.inputWrapper}>
                    <label style={styles.label}>Confirm Password</label>
                    <div style={styles.inputIconContainer}>
                      <Lock size={16} style={styles.inputIcon} />
                      <input 
                        type="password" 
                        className="custom-input" 
                        placeholder="Confirm Password" 
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)} 
                        style={{ paddingLeft: 44 }}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: '#9ca3af', fontWeight: 600, marginBottom: 2 }}>Password Security Requirements:</div>
                    <div style={{ color: checkPasswordStrength(password).length ? '#10b981' : '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: checkPasswordStrength(password).length ? '#10b981' : '#ef4444' }} />
                      At least 8 characters
                    </div>
                    <div style={{ color: checkPasswordStrength(password).uppercase && checkPasswordStrength(password).lowercase ? '#10b981' : '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: checkPasswordStrength(password).uppercase && checkPasswordStrength(password).lowercase ? '#10b981' : '#ef4444' }} />
                      Uppercase & lowercase letters
                    </div>
                    <div style={{ color: checkPasswordStrength(password).number ? '#10b981' : '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: checkPasswordStrength(password).number ? '#10b981' : '#ef4444' }} />
                      At least one number
                    </div>
                    <div style={{ color: checkPasswordStrength(password).special ? '#10b981' : '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: checkPasswordStrength(password).special ? '#10b981' : '#ef4444' }} />
                      At least one special character
                    </div>
                  </div>
                </>
              )}

              {!isRegister && (
                <div style={{ textAlign: 'right', marginTop: -8 }}>
                  <button 
                    type="button" 
                    style={{ ...styles.toggleBtn, fontSize: 12, color: '#9ca3af', margin: 0, padding: 0 }}
                    onClick={() => {
                      setAuthMode('forgot_email');
                      setError('');
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
                {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
                <LogIn size={16} />
              </button>
            </form>
          )}

          {authMode === 'forgot_email' && (
            <form onSubmit={handleSendOtp} style={styles.form}>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Official MITS Email</label>
                <div style={styles.inputIconContainer}>
                  <Mail size={16} style={styles.inputIcon} />
                  <input 
                    type="email" 
                    className="custom-input" 
                    placeholder="e.g. 23691A3330@mits.ac.in" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    style={{ paddingLeft: 44 }}
                    autoComplete="off"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send Reset OTP'}
                <ArrowRight size={16} />
              </button>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button 
                  type="button" 
                  style={{ ...styles.toggleBtn, color: '#9ca3af', margin: 0 }} 
                  onClick={() => setAuthMode('auth')}
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {authMode === 'forgot_otp' && (
            <form onSubmit={handleVerifyOtp} style={styles.form}>
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginBottom: 8, lineHeight: 1.4 }}>
                We've sent a 6-digit OTP code to <strong style={{ color: '#fff' }}>{email}</strong>.
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Enter 6-Digit OTP</label>
                <div style={styles.inputIconContainer}>
                  <Key size={16} style={styles.inputIcon} />
                  <input 
                    type="text" 
                    className="custom-input" 
                    placeholder="OTP Code" 
                    value={otp} 
                    onChange={e => setOtp(e.target.value)} 
                    style={{ paddingLeft: 44, letterSpacing: '4px', textAlign: 'center', fontWeight: 600 }}
                    maxLength={6}
                    autoComplete="off"
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: otpTimer > 0 ? '#fca5a5' : '#9ca3af' }}>
                  {otpTimer > 0 
                    ? `Expires: ${Math.floor(otpTimer / 60)}:${String(otpTimer % 60).padStart(2, '0')}`
                    : 'OTP Expired'
                  }
                </span>
                <button 
                  type="button" 
                  disabled={resendCooldown > 0 || loading}
                  style={{ 
                    ...styles.toggleBtn, 
                    fontSize: 12, 
                    color: resendCooldown > 0 ? '#4b5563' : 'var(--primary)',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    padding: 0,
                    margin: 0
                  }}
                  onClick={handleSendOtp}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
              <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading || otpTimer <= 0}>
                {loading ? 'Verifying...' : 'Verify OTP'}
                <ArrowRight size={16} />
              </button>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button 
                  type="button" 
                  style={{ ...styles.toggleBtn, color: '#9ca3af', margin: 0 }} 
                  onClick={() => setAuthMode('auth')}
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {authMode === 'forgot_reset' && (
            <form onSubmit={handleResetPassword} style={styles.form}>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>New Password</label>
                <div style={styles.inputIconContainer}>
                  <Lock size={16} style={styles.inputIcon} />
                  <input 
                    type="password" 
                    className="custom-input" 
                    placeholder="New Password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    style={{ paddingLeft: 44 }}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Confirm New Password</label>
                <div style={styles.inputIconContainer}>
                  <Lock size={16} style={styles.inputIcon} />
                  <input 
                    type="password" 
                    className="custom-input" 
                    placeholder="Confirm New Password" 
                    value={confirmNewPassword} 
                    onChange={e => setConfirmNewPassword(e.target.value)} 
                    style={{ paddingLeft: 44 }}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              
              <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: '#9ca3af', fontWeight: 600, marginBottom: 2 }}>Password Security Requirements:</div>
                <div style={{ color: checkPasswordStrength(newPassword).length ? '#10b981' : '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: checkPasswordStrength(newPassword).length ? '#10b981' : '#ef4444' }} />
                  At least 8 characters
                </div>
                <div style={{ color: checkPasswordStrength(newPassword).uppercase && checkPasswordStrength(newPassword).lowercase ? '#10b981' : '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: checkPasswordStrength(newPassword).uppercase && checkPasswordStrength(newPassword).lowercase ? '#10b981' : '#ef4444' }} />
                  Uppercase & lowercase letters
                </div>
                <div style={{ color: checkPasswordStrength(newPassword).number ? '#10b981' : '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: checkPasswordStrength(newPassword).number ? '#10b981' : '#ef4444' }} />
                  At least one number
                </div>
                <div style={{ color: checkPasswordStrength(newPassword).special ? '#10b981' : '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: checkPasswordStrength(newPassword).special ? '#10b981' : '#ef4444' }} />
                  At least one special character
                </div>
              </div>

              <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
                {loading ? 'Updating Password...' : 'Update Password'}
                <ClipboardCheck size={16} />
              </button>
            </form>
          )}

          {authMode === 'auth' && (
            <div style={styles.toggleContainer}>
              <span style={{ color: '#9ca3af', fontSize: 13 }}>
                {isRegister ? 'Already have an account? ' : "Don't have an account? "}
              </span>
              <button 
                type="button" 
                style={styles.toggleBtn}
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
              >
                {isRegister ? 'Sign in instead' : 'Create one now'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    width: '100vw',
    backgroundImage: 'radial-gradient(circle at 75% 25%, rgba(15, 23, 42, 0.2), rgba(3, 7, 18, 0.95))',
    overflow: 'hidden',
    boxSizing: 'border-box',
    position: 'relative',
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 1.2,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '60px 56px',
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: 2,
    '@media (max-width: 900px)': {
      display: 'none',
    }
  },
  topBranding: {
    width: '100%',
  },
  bottomBranding: {
    width: '100%',
  },
  logoTag: {
    color: '#60a5fa',
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    padding: '4px 12px',
    borderRadius: 99,
  },
  brandTitle: {
    fontSize: 40,
    fontWeight: 600,
    lineHeight: '1.2',
    color: '#ffffff',
    fontFamily: 'var(--font-header)',
    letterSpacing: '-0.02em',
  },
  brandDesc: {
    color: '#9ca3af',
    fontSize: 15,
    lineHeight: 1.6,
    marginBottom: 28,
    fontWeight: '400',
    maxWidth: 550,
  },
  badgesRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  brandBadge: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 99,
    padding: '6px 14px',
    fontSize: 12,
    color: '#cbd5e1',
  },
  rightPanel: {
    flex: 0.8,
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 40px',
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: 2,
    '@media (max-width: 900px)': {
      flex: 1,
      background: 'transparent',
    }
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    padding: '40px 32px',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    background: 'rgba(9, 13, 22, 0.42)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: 'var(--shadow-lg), 0 8px 32px rgba(0, 0, 0, 0.35)',
  },
  formHeader: {
    fontSize: 26,
    color: '#ffffff',
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    marginBottom: 6,
  },
  formSubheader: {
    color: '#9ca3af',
    fontSize: 14,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  nameRow: {
    display: 'flex',
    gap: 16,
  },
  inputWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: 500,
  },
  inputIconContainer: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#4b5563',
  },
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    marginTop: 6,
  },
  toggleContainer: {
    textAlign: 'center',
    marginTop: 24,
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 13,
    marginLeft: 4,
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.08)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  developerCredit: {
    display: 'inline-block',
    background: 'rgba(16, 185, 129, 0.06)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    padding: '6px 16px',
    borderRadius: 99,
    marginTop: 28,
    color: '#34d399',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  }
};
