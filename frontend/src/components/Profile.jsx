import React, { useState } from 'react';
import { User, Shield, Link, Award, Save } from 'lucide-react';

export default function Profile({ studentData, token, API_URL, refreshUserData }) {
  const [firstName, setFirstName] = useState(studentData.first_name || '');
  const [lastName, setLastName] = useState(studentData.last_name || '');
  const [phoneNumber, setPhoneNumber] = useState(studentData.phone_number || '');
  const [githubUrl, setGithubUrl] = useState(studentData.github_url || '');
  const [linkedinUrl, setLinkedinUrl] = useState(studentData.linkedin_url || '');
  const [portfolioUrl, setPortfolioUrl] = useState(studentData.portfolio_url || '');
  const [hackerrankUrl, setHackerrankUrl] = useState(studentData.hackerrank_url || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      return alert('Passwords do not match');
    }

    setSaving(true);
    const payload = {
      firstName, lastName, phoneNumber,
      githubUrl, linkedinUrl, portfolioUrl, hackerrankUrl,
      password: password || undefined
    };

    try {
      const res = await fetch(`${API_URL}/student/profile/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Profile updated successfully!');
      setPassword('');
      setConfirmPassword('');
      refreshUserData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>My Profile Settings</h2>

      <form onSubmit={handleSave} style={styles.formLayout}>
        {/* Basic Information */}
        <div className="glass-card" style={styles.sectionCard}>
          <h3 style={styles.sectionHeader}>
            <User size={18} style={{ color: 'var(--primary)' }} /> Basic Information
          </h3>
          <div style={styles.grid2}>
            <div style={styles.inputWrapper}>
              <label style={styles.label}>First Name</label>
              <input type="text" className="custom-input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div style={styles.inputWrapper}>
              <label style={styles.label}>Last Name</label>
              <input type="text" className="custom-input" value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>
          </div>
          <div style={styles.grid2}>
            <div style={styles.inputWrapper}>
              <label style={styles.label}>Email Address (Read Only)</label>
              <input type="email" className="custom-input" value={studentData.email} disabled style={{ opacity: 0.6 }} />
            </div>
            <div style={styles.inputWrapper}>
              <label style={styles.label}>Phone Number</label>
              <input type="tel" className="custom-input" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Professional Connections */}
        <div className="glass-card" style={styles.sectionCard}>
          <h3 style={styles.sectionHeader}>
            <Link size={18} style={{ color: 'var(--primary)' }} /> Professional Links
          </h3>
          <div style={styles.grid2}>
            <div style={styles.inputWrapper}>
              <label style={styles.label}>GitHub Profile URL</label>
              <input type="url" className="custom-input" placeholder="https://github.com/yourusername" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} />
            </div>
            <div style={styles.inputWrapper}>
              <label style={styles.label}>LinkedIn Profile URL</label>
              <input type="url" className="custom-input" placeholder="https://linkedin.com/in/yourusername" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} />
            </div>
          </div>
          <div style={styles.inputWrapper}>
            <label style={styles.label}>Portfolio Website</label>
            <input type="url" className="custom-input" placeholder="https://yourwebsite.dev" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} />
          </div>
        </div>

        {/* Coding Platforms */}
        <div className="glass-card" style={styles.sectionCard}>
          <h3 style={styles.sectionHeader}>
            <Award size={18} style={{ color: 'var(--primary)' }} /> Coding Platforms
          </h3>
          <div style={styles.grid2}>
            <div style={styles.inputWrapper}>
              <label style={styles.label}>LeetCode Profile URL</label>
              <input type="url" className="custom-input" placeholder="https://leetcode.com/yourusername" value={studentData.leetcode_url || ''} disabled style={{ opacity: 0.6 }} />
              <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Leetcode username linked during signup</span>
            </div>
            <div style={styles.inputWrapper}>
              <label style={styles.label}>HackerRank Profile URL</label>
              <input type="url" className="custom-input" placeholder="https://hackerrank.com/yourusername" value={hackerrankUrl} onChange={e => setHackerrankUrl(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Security Password Change */}
        <div className="glass-card" style={styles.sectionCard}>
          <h3 style={styles.sectionHeader}>
            <Shield size={18} style={{ color: 'var(--primary)' }} /> Security settings
          </h3>
          <div style={styles.grid2}>
            <div style={styles.inputWrapper}>
              <label style={styles.label}>New Password (Optional)</label>
              <input type="password" className="custom-input" placeholder="Enter new password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div style={styles.inputWrapper}>
              <label style={styles.label}>Confirm New Password</label>
              <input type="password" className="custom-input" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} /> {saving ? 'Saving changes...' : 'Save Profile Settings'}
          </button>
        </div>
      </form>
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
    borderRadius: '20px',
    padding: 24,
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
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
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
  }
};
