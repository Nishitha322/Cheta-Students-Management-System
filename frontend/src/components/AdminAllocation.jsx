import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, BookOpen, Trash2, Edit2, UserX } from 'lucide-react';

export default function AdminAllocation({ API_URL, token }) {
  const [data, setData] = useState({ pending: [], unassigned: [], batches: [] });
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState({});
  const [selectedBatch, setSelectedBatch] = useState({});

  // Batch creation states
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');
  const [creatingBatch, setCreatingBatch] = useState(false);

  // Edit batch state
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [editBatchName, setEditBatchName] = useState('');
  const [editBatchDesc, setEditBatchDesc] = useState('');

  const fetchAllocationData = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/pending-students/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      setData(resData);
      
      if (resData.batches.length > 0) {
        const initialSelected = {};
        resData.unassigned.forEach(s => {
          initialSelected[s.id] = resData.batches[0].id;
        });
        resData.pending.forEach(s => {
          initialSelected[s.student] = s.batch;
        });
        setSelectedBatch(initialSelected);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocationData();
  }, []);

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;

    setCreatingBatch(true);
    try {
      const res = await fetch(`${API_URL}/admin/create-batch/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newBatchName.trim(),
          description: newBatchDesc.trim()
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to create batch');

      alert(resData.status || 'Batch created successfully!');
      setNewBatchName('');
      setNewBatchDesc('');
      fetchAllocationData();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleUpdateBatch = async (batchId) => {
    if (!editBatchName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/admin/batch/${batchId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editBatchName.trim(), description: editBatchDesc.trim() })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      alert(resData.status || 'Batch updated successfully!');
      setEditingBatchId(null);
      fetchAllocationData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteBatch = async (batchId, batchName) => {
    if (!window.confirm(`Are you sure you want to delete batch "${batchName}"? This will unassign students in this batch.`)) return;

    try {
      const res = await fetch(`${API_URL}/admin/batch/${batchId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      alert(resData.status || 'Batch deleted successfully!');
      fetchAllocationData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAllocate = async (studentId, batchId, action = 'approved') => {
    const defaultBatchId = data.batches.length > 0 ? data.batches[0].id : null;
    const finalBatchId = batchId || selectedBatch[studentId] || defaultBatchId;
    if (!finalBatchId) return alert('Please select or create a batch first');
    
    setAllocating(prev => ({ ...prev, [studentId]: true }));
    try {
      const res = await fetch(`${API_URL}/admin/allocate-batch/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentId, batchId: finalBatchId, action })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);
      
      alert(resData.status);
      fetchAllocationData();
    } catch (err) {
      alert(err.message);
    } finally {
      setAllocating(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleRemoveStudentFromBatch = async (studentId) => {
    if (!window.confirm('Are you sure you want to remove this student from their batch?')) return;

    try {
      const res = await fetch(`${API_URL}/admin/remove-student-batch/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentId })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      alert(resData.status);
      fetchAllocationData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: 24 }}>Loading pending allocation list...</div>;

  const allStudents = [...data.pending, ...data.unassigned];

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>
        <Users size={28} style={{ color: 'var(--primary)' }} /> Student Batch Allocation & Batch Management
      </h2>
      <p style={styles.subheader}>
        Define training batches, edit/delete batches, and allocate registered student accounts.
      </p>

      {/* Create New Batch Card */}
      <div className="glass-card" style={styles.createCard}>
        <h3 style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: 10, fontSize: 18 }}>
          <BookOpen size={20} style={{ color: '#10b981' }} /> Create a New Training Batch
        </h3>
        <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 4, marginBottom: 16 }}>
          Define a new training batch (e.g., PYTHON-FSD) to enable student allocation and coursework assignments.
        </p>
        <form onSubmit={handleCreateBatch} style={styles.formInline}>
          <div style={styles.formGroup}>
            <input 
              type="text" 
              placeholder="Batch Name (e.g. PYTHON-FSD)" 
              className="custom-input"
              value={newBatchName}
              onChange={e => setNewBatchName(e.target.value)}
              required
              style={{ flex: 1 }}
            />
          </div>
          <div style={styles.formGroup}>
            <input 
              type="text" 
              placeholder="Description (optional)" 
              className="custom-input"
              value={newBatchDesc}
              onChange={e => setNewBatchDesc(e.target.value)}
              style={{ flex: 2 }}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={creatingBatch}>
            {creatingBatch ? 'Creating...' : 'Create Batch'}
          </button>
        </form>
      </div>

      {/* Existing Batches List with Edit/Delete */}
      {data.batches.length > 0 && (
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 12 }}>Active Training Batches ({data.batches.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {data.batches.map(b => (
              <div key={b.id} style={{ background: 'rgba(0,0,0,0.25)', padding: 14, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                {editingBatchId === b.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="text" className="custom-input" value={editBatchName} onChange={e => setEditBatchName(e.target.value)} />
                    <input type="text" className="custom-input" value={editBatchDesc} onChange={e => setEditBatchDesc(e.target.value)} placeholder="Description" />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleUpdateBatch(b.id)}>Save</button>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setEditingBatchId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: '#60a5fa', fontWeight: 600, fontSize: 15 }}>{b.name}</div>
                      <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{b.description || 'No description'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button 
                        onClick={() => { setEditingBatchId(b.id); setEditBatchName(b.name); setEditBatchDesc(b.description || ''); }} 
                        style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 2 }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteBatch(b.id, b.name)} 
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allocation Table */}
      {allStudents.length === 0 ? (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
          <h3>No students awaiting allocation</h3>
          <p style={{ color: '#9ca3af', marginTop: 8 }}>All registered students have active approved batches.</p>
        </div>
      ) : (
        <div className="table-container" style={{ margin: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Email</th>
                <th>Current Status</th>
                <th>Allocate to Batch</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allStudents.map(student => {
                const sId = student.student || student.id;
                const defaultBId = data.batches.length > 0 ? data.batches[0].id : '';
                return (
                  <tr key={sId}>
                    <td style={{ fontWeight: '700', color: '#ffffff' }}>{student.student_roll || 'N/A'}</td>
                    <td>{student.student_name}</td>
                    <td>{student.student_email}</td>
                    <td>
                      {student.status === 'pending' ? (
                        <span className="badge badge-warning">Pending Request</span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', color: '#9ca3af' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <select 
                        className="custom-input" 
                        value={selectedBatch[sId] || defaultBId}
                        onChange={e => setSelectedBatch(prev => ({ ...prev, [sId]: e.target.value }))}
                        style={{ width: 180, height: 38, padding: '4px 12px' }}
                      >
                        {data.batches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          className="btn-primary" 
                          style={{ padding: '8px 14px', fontSize: 13, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399' }}
                          onClick={() => handleAllocate(sId, selectedBatch[sId], 'approved')}
                          disabled={allocating[sId]}
                        >
                          <CheckCircle size={14} /> Approve
                        </button>

                        <button 
                          className="btn-secondary" 
                          style={{ padding: '8px 14px', fontSize: 13, borderColor: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                          onClick={() => handleRemoveStudentFromBatch(sId)}
                        >
                          <UserX size={14} /> Unassign
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
  createCard: {
    padding: 28,
    borderRadius: '20px',
  },
  formInline: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: 1,
    minWidth: 200,
  }
};
