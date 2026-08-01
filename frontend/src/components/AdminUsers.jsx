import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Search, Send } from 'lucide-react';

export default function AdminUsers({ API_URL, token }) {
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New user form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('student');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsersAndBatches = async () => {
    try {
      const [resUsers, resBatches] = await Promise.all([
        fetch(`${API_URL}/admin/users/`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/pending-students/`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const dataUsers = await resUsers.json();
      const dataBatches = await resBatches.json();

      setUsers(dataUsers);
      setBatches(dataBatches.batches || []);
      if (dataBatches.batches && dataBatches.batches.length > 0) {
        setSelectedBatchId(dataBatches.batches[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndBatches();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!email) return alert('Email address is required');

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          rollNumber,
          phoneNumber,
          role,
          batchId: role === 'student' ? selectedBatchId : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.status || 'User created successfully!');
      setEmail('');
      setFirstName('');
      setLastName('');
      setRollNumber('');
      setPhoneNumber('');
      fetchUsersAndBatches();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: 24 }}>Loading user directory...</div>;

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.roll_number.toLowerCase().includes(search.toLowerCase()) ||
    u.batch.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user account "${userName}"?`)) return;

    try {
      const res = await fetch(`${API_URL}/admin/user/${userId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.status || 'User deleted successfully');
      fetchUsersAndBatches();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>
        <Users size={28} style={{ color: '#c084fc' }} /> Student & Staff User Directory
      </h2>
      <p style={styles.subheader}>
        Directly register student accounts, assign initial course batches, and audit system user credentials.
      </p>

      <div className="admin-users-layout" style={styles.layout}>
        {/* Create User Form */}
        <div className="glass-card" style={styles.formCard}>
          <h3 style={styles.formHeader}>
            <UserPlus size={18} style={{ color: '#c084fc' }} /> Register New Account
          </h3>

          <form onSubmit={handleCreateUser} style={styles.form}>
            <div style={styles.nameRow}>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>First Name</label>
                <input type="text" className="custom-input" placeholder="Chethan" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Last Name</label>
                <input type="text" className="custom-input" placeholder="Balija" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>

            <div style={styles.inputWrapper}>
              <label style={styles.label}>Email Address (Login ID)</label>
              <input type="email" className="custom-input" placeholder="student@mits.ac.in" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div style={styles.inputWrapper}>
              <label style={styles.label}>Initial Password</label>
              <input type="password" className="custom-input" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <div style={styles.nameRow}>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Roll Number</label>
                <input type="text" className="custom-input" placeholder="23691A3340" value={rollNumber} onChange={e => setRollNumber(e.target.value)} />
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Phone Number</label>
                <input type="tel" className="custom-input" placeholder="9908322634" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
              </div>
            </div>

            <div style={styles.nameRow}>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Account Role</label>
                <select className="custom-input" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="student">Student Account</option>
                  <option value="admin">Admin / Faculty Coordinator</option>
                </select>
              </div>

              {role === 'student' && (
                <div style={styles.inputWrapper}>
                  <label style={styles.label}>Assign Batch</label>
                  <select className="custom-input" value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)}>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={submitting} style={{ justifyContent: 'center', marginTop: 8 }}>
              <Send size={16} /> {submitting ? 'Creating...' : 'Register User Account'}
            </button>
          </form>
        </div>

        {/* Directory Table */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ color: '#fff' }}>User Accounts ({filteredUsers.length})</h3>
            <div style={{ position: 'relative', minWidth: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input 
                type="text" 
                className="custom-input" 
                placeholder="Search name, roll, email..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34, fontSize: 13 }}
              />
            </div>
          </div>

          <div className="table-container" style={{ margin: 0 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Roll No</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Batch</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: '700', color: '#ffffff' }}>{u.full_name}</td>
                    <td style={{ fontFamily: 'var(--font-primary)' }}>{u.roll_number}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-danger' : 'badge-success'}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>{u.batch}</td>
                    <td>
                      <button 
                        onClick={() => handleDeleteUser(u.id, u.full_name)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4, fontWeight: '600' }}
                        title="Delete User"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  layout: {},
  formCard: {
    padding: 24,
    borderRadius: '20px',
  },
  formHeader: {
    fontSize: 18,
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  nameRow: {
    display: 'flex',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
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
