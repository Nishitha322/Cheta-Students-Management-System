import React, { useState, useEffect } from 'react';
import { Award, PlusCircle, Building2, Layers, FileCode, Pencil, Trash2, ExternalLink, FileText, X, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AdminPlacementPrep({ API_URL, token }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('company'); // 'company', 'round', 'resource'

  // Company Form
  const [companyName, setCompanyName] = useState('');
  const [companyDesc, setCompanyDesc] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Round Form
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [roundNum, setRoundNum] = useState(1);
  const [roundTitle, setRoundTitle] = useState('');
  const [roundDesc, setRoundDesc] = useState('');

  // Resource Form
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceFileUrl, setResourceFileUrl] = useState('');
  const [sampleQuestions, setSampleQuestions] = useState('');

  // Edit / Delete State
  const [editingResource, setEditingResource] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFileUrl, setEditFileUrl] = useState('');
  const [editSampleQuestions, setEditSampleQuestions] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [editRoundId, setEditRoundId] = useState('');

  const [deletingResource, setDeletingResource] = useState(null);
  const [viewingResource, setViewingResource] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const fetchPlacementPrep = async () => {
    try {
      const res = await fetch(`${API_URL}/student/placement-prep/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCompanies(data);
      if (data.length > 0) {
        setSelectedCompanyId(data[0].id);
        if (data[0].rounds && data[0].rounds.length > 0) {
          setSelectedRoundId(data[0].rounds[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlacementPrep();
  }, []);

  const showFeedback = (msg, type = 'success') => {
    setFeedbackMsg({ text: msg, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!companyName) return alert('Company Name is required');

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/company/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: companyName, description: companyDesc, logoUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create company');

      showFeedback('Placement Company created successfully!');
      setCompanyName('');
      setCompanyDesc('');
      setLogoUrl('');
      fetchPlacementPrep();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRound = async (e) => {
    e.preventDefault();
    if (!selectedCompanyId || !roundTitle) return alert('Select a company and enter Round Title');

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/placement-round/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ companyId: selectedCompanyId, roundNum: parseInt(roundNum) || 1, title: roundTitle, description: roundDesc })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create round');

      showFeedback('Hiring Round added successfully!');
      setRoundTitle('');
      setRoundDesc('');
      fetchPlacementPrep();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();
    if (!selectedRoundId || !resourceTitle) return alert('Select a Round and enter Resource Title');

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/placement-resource/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roundId: selectedRoundId, title: resourceTitle, fileUrl: resourceFileUrl, sampleQuestions })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create resource');

      showFeedback('Round Resource created successfully!');
      setResourceTitle('');
      setResourceFileUrl('');
      setSampleQuestions('');
      fetchPlacementPrep();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (resItem, roundItem, compItem) => {
    setEditingResource(resItem);
    setEditTitle(resItem.title || '');
    setEditFileUrl(resItem.file_url || '');
    setEditSampleQuestions(resItem.sample_questions || '');
    setEditCompanyId(compItem.id);
    setEditRoundId(roundItem.id);
  };

  // Save Edit Changes
  const handleUpdateResource = async (e) => {
    e.preventDefault();
    if (!editingResource) return;
    if (!editTitle.trim()) return alert('Resource Title is required');
    if (!editRoundId) return alert('Please select a Hiring Round');

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/placement-resource/${editingResource.id}/update/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          fileUrl: editFileUrl,
          sampleQuestions: editSampleQuestions,
          roundId: editRoundId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update resource');

      showFeedback('Resource updated successfully.');
      setEditingResource(null);
      fetchPlacementPrep();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Deletion
  const handleDeleteResource = async () => {
    if (!deletingResource) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/placement-resource/${deletingResource.id}/delete/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete resource');

      showFeedback('Resource deleted successfully.');
      setDeletingResource(null);
      fetchPlacementPrep();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: 24 }}>Loading Placement Prep Manager...</div>;

  const allRounds = companies.flatMap(c => c.rounds.map(r => ({ ...r, companyName: c.name })));
  
  // Rounds available for selected company in edit modal
  const editCompanyObj = companies.find(c => String(c.id) === String(editCompanyId));
  const editAvailableRounds = editCompanyObj ? editCompanyObj.rounds : [];

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>
        <Building2 size={28} style={{ color: 'var(--primary, #38bdf8)' }} /> Placement Prep Companies & Resources Manager
      </h2>
      <p style={styles.subheader}>
        Add hiring companies (Accenture, IBM, CTS, etc.), define placement rounds, and attach prep resources for students.
      </p>

      {feedbackMsg && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          background: feedbackMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${feedbackMsg.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
          color: feedbackMsg.type === 'error' ? '#fca5a5' : '#6ee7b7',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 14,
          fontWeight: 600
        }}>
          {feedbackMsg.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          {feedbackMsg.text}
        </div>
      )}

      {/* Mode Switcher */}
      <div style={styles.toggleContainer}>
        <button 
          style={mode === 'company' ? styles.toggleBtnActive : styles.toggleBtn}
          onClick={() => setMode('company')}
        >
          <Building2 size={16} /> 1. Add Company
        </button>
        <button 
          style={mode === 'round' ? styles.toggleBtnActive : styles.toggleBtn}
          onClick={() => setMode('round')}
        >
          <Layers size={16} /> 2. Add Hiring Round
        </button>
        <button 
          style={mode === 'resource' ? styles.toggleBtnActive : styles.toggleBtn}
          onClick={() => setMode('resource')}
        >
          <FileCode size={16} /> 3. Add Prep Resource
        </button>
      </div>

      <div className="admin-users-layout" style={styles.layout}>
        {/* Form Panel */}
        <div className="glass-card" style={styles.formCard}>
          {mode === 'company' && (
            <form onSubmit={handleCreateCompany} style={styles.form}>
              <h3 style={styles.formTitle}>Add New Target Company</h3>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Company Name</label>
                <input type="text" className="custom-input" placeholder="e.g. Google, Accenture" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Company Overview / Description</label>
                <textarea className="custom-input" placeholder="Role description, CTC package info..." value={companyDesc} onChange={e => setCompanyDesc(e.target.value)} style={{ minHeight: 80 }} />
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Logo URL (Optional)</label>
                <input type="url" className="custom-input" placeholder="https://api.dicebear.com/7.x/initials/svg?seed=AC" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary" disabled={submitting} style={{ justifyContent: 'center' }}>
                {submitting ? 'Creating...' : 'Create Company'}
              </button>
            </form>
          )}

          {mode === 'round' && (
            <form onSubmit={handleCreateRound} style={styles.form}>
              <h3 style={styles.formTitle}>Add Placement Round to Company</h3>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Select Target Company</label>
                <select className="custom-input" value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} required>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Round Number</label>
                <input type="number" className="custom-input" value={roundNum} onChange={e => setRoundNum(e.target.value)} min="1" max="10" required />
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Round Title</label>
                <input type="text" className="custom-input" placeholder="e.g. Round 1: Online Technical Assessment" value={roundTitle} onChange={e => setRoundTitle(e.target.value)} required />
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Round Instructions</label>
                <textarea className="custom-input" placeholder="Description of topics tested in this round..." value={roundDesc} onChange={e => setRoundDesc(e.target.value)} style={{ minHeight: 80 }} />
              </div>
              <button type="submit" className="btn-primary" disabled={submitting} style={{ justifyContent: 'center' }}>
                {submitting ? 'Adding...' : 'Add Round to Company'}
              </button>
            </form>
          )}

          {mode === 'resource' && (
            <form onSubmit={handleCreateResource} style={styles.form}>
              <h3 style={styles.formTitle}>Attach Prep Resource / Questions</h3>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Select Hiring Round</label>
                <select className="custom-input" value={selectedRoundId} onChange={e => setSelectedRoundId(e.target.value)} required>
                  {allRounds.map(r => (
                    <option key={r.id} value={r.id}>{r.companyName} - Round {r.round_num}: {r.title}</option>
                  ))}
                </select>
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Resource Title</label>
                <input type="text" className="custom-input" placeholder="e.g. Accenture Aptitude Questions PDF" value={resourceTitle} onChange={e => setResourceTitle(e.target.value)} required />
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Drive File URL / Link</label>
                <input type="url" className="custom-input" placeholder="https://drive.google.com/file/d/.../view" value={resourceFileUrl} onChange={e => setResourceFileUrl(e.target.value)} />
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Sample Questions / Practice Notes</label>
                <textarea className="custom-input" placeholder="Sample questions..." value={sampleQuestions} onChange={e => setSampleQuestions(e.target.value)} style={{ minHeight: 80 }} />
              </div>
              <button type="submit" className="btn-primary" disabled={submitting} style={{ justifyContent: 'center' }}>
                {submitting ? 'Creating...' : 'Attach Resource'}
              </button>
            </form>
          )}
        </div>

        {/* Existing Companies, Rounds & Prep Resources Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ color: '#fff' }}>Hiring Companies & Resources ({companies.length})</h3>

          {companies.map(comp => (
            <div key={comp.id} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <img src={comp.logo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${comp.name}`} alt="logo" style={{ width: 36, height: 36, borderRadius: 8 }} />
                <div>
                  <h4 style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>{comp.name}</h4>
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>{comp.description || 'Target Hiring Partner'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                {comp.rounds && comp.rounds.length > 0 ? comp.rounds.map(r => (
                  <div key={r.id} style={{ background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary, #60a5fa)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Round {r.round_num}: {r.title}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{r.resources ? r.resources.length : 0} resources</span>
                    </div>
                    {r.description && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{r.description}</div>}

                    {/* Resources List */}
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {r.resources && r.resources.length > 0 ? (
                        r.resources.map(resItem => (
                          <div 
                            key={resItem.id} 
                            style={{ 
                              background: 'rgba(255,255,255,0.04)', 
                              border: '1px solid rgba(255,255,255,0.08)', 
                              padding: '10px 12px', 
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              flexWrap: 'wrap'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FileText size={15} style={{ color: 'var(--primary, #38bdf8)' }} />
                                {resItem.title}
                              </div>
                              {resItem.sample_questions && (
                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
                                  {resItem.sample_questions}
                                </div>
                              )}
                            </div>

                            {/* Resource Actions: [ View Resource ] [ Edit ] [ Delete ] */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {(resItem.file_url || resItem.sample_questions) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (resItem.file_url) {
                                      window.open(resItem.file_url, '_blank', 'noopener,noreferrer');
                                    } else {
                                      setViewingResource(resItem);
                                    }
                                  }}
                                  style={{
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    border: '1px solid rgba(56, 189, 248, 0.25)',
                                    color: '#38bdf8',
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                  title="View Resource"
                                >
                                  <ExternalLink size={13} /> View Resource
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => openEditModal(resItem, r, comp)}
                                style={{
                                  background: 'var(--primary-glow, rgba(59, 130, 246, 0.12))',
                                  border: '1px solid var(--border-hover, rgba(59, 130, 246, 0.3))',
                                  color: 'var(--primary, #3b82f6)',
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title="Edit Resource"
                              >
                                <Pencil size={13} /> Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingResource(resItem)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#f87171',
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title="Delete Resource"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: 11, color: '#6b7280', italic: 'true' }}>No resources attached to this round yet.</div>
                      )}
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: '#6b7280' }}>No hiring rounds created yet.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDIT RESOURCE MODAL */}
      {editingResource && (
        <div style={modalStyles.overlay} onClick={() => setEditingResource(null)}>
          <div style={modalStyles.card} onClick={e => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pencil size={20} style={{ color: 'var(--primary, #38bdf8)' }} /> Edit Resource
              </h3>
              <button style={modalStyles.closeBtn} onClick={() => setEditingResource(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateResource} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Resource Title</label>
                <input 
                  type="text" 
                  className="custom-input" 
                  value={editTitle} 
                  onChange={e => setEditTitle(e.target.value)} 
                  required 
                />
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Associated Company</label>
                <select 
                  className="custom-input" 
                  value={editCompanyId} 
                  onChange={e => {
                    setEditCompanyId(e.target.value);
                    const selectedC = companies.find(c => String(c.id) === String(e.target.value));
                    if (selectedC && selectedC.rounds.length > 0) {
                      setEditRoundId(selectedC.rounds[0].id);
                    } else {
                      setEditRoundId('');
                    }
                  }}
                  required
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Associated Hiring Round</label>
                <select 
                  className="custom-input" 
                  value={editRoundId} 
                  onChange={e => setEditRoundId(e.target.value)} 
                  required
                >
                  {editAvailableRounds.map(r => (
                    <option key={r.id} value={r.id}>Round {r.round_num}: {r.title}</option>
                  ))}
                </select>
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Resource File URL / Link</label>
                <input 
                  type="url" 
                  className="custom-input" 
                  placeholder="https://drive.google.com/..." 
                  value={editFileUrl} 
                  onChange={e => setEditFileUrl(e.target.value)} 
                />
                <span style={{ fontSize: 11, color: '#9ca3af' }}>Leave unchanged to keep existing uploaded file/link.</span>
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.label}>Description / Sample Questions</label>
                <textarea 
                  className="custom-input" 
                  value={editSampleQuestions} 
                  onChange={e => setEditSampleQuestions(e.target.value)} 
                  style={{ minHeight: 90 }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button 
                  type="button" 
                  onClick={() => setEditingResource(null)} 
                  style={modalStyles.cancelBtn}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE RESOURCE CONFIRMATION MODAL */}
      {deletingResource && (
        <div style={modalStyles.overlay} onClick={() => setDeletingResource(null)}>
          <div style={{ ...modalStyles.card, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: 10, borderRadius: 12 }}>
                <AlertTriangle size={24} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Delete Resource?</h3>
                <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }}>This action cannot be undone.</p>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 14, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', margin: '12px 0' }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{deletingResource.title}</div>
              {deletingResource.file_url && (
                <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {deletingResource.file_url}
                </div>
              )}
            </div>

            <p style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 16 }}>
              Are you sure you want to delete <strong style={{ color: '#fff' }}>"{deletingResource.title}"</strong>?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button 
                type="button" 
                onClick={() => setDeletingResource(null)} 
                style={modalStyles.cancelBtn}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleDeleteResource} 
                disabled={submitting}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {submitting ? 'Deleting...' : 'Delete Resource'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW QUESTIONS MODAL IF NO FILE URL */}
      {viewingResource && (
        <div style={modalStyles.overlay} onClick={() => setViewingResource(null)}>
          <div style={modalStyles.card} onClick={e => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{viewingResource.title}</h3>
              <button style={modalStyles.closeBtn} onClick={() => setViewingResource(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, marginTop: 14, color: '#e2e8f0', fontSize: 14, whiteSpace: 'pre-wrap' }}>
              {viewingResource.sample_questions || 'No details provided.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    background: '#090d16',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 540,
    boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: 4
  },
  cancelBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#cbd5e1',
    padding: '9px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  }
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
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
    paddingBottom: 20,
    marginTop: -8,
  },
  toggleContainer: {
    display: 'flex',
    gap: 10,
    background: 'rgba(3, 7, 18, 0.45)',
    padding: 6,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  toggleBtn: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    padding: '10px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-header)',
    fontWeight: '600',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'all 0.2s',
  },
  toggleBtnActive: {
    flex: 1,
    background: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    color: 'var(--primary, #38bdf8)',
    padding: '10px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-header)',
    fontWeight: '700',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  layout: {},
  formCard: {
    padding: 24,
    borderRadius: '20px',
  },
  formTitle: {
    color: '#fff',
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    fontSize: 18,
    marginBottom: 16,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
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
