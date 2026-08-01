import React, { useState, useEffect } from 'react';
import { BookOpen, PlusCircle, Trash2, ExternalLink, FileText } from 'lucide-react';

export default function AdminNotes({ API_URL, token }) {
  const [notes, setNotes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('global'); // 'global' or 'batch-specific'
  const [fileUrl, setFileUrl] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchNotesAndBatches = async () => {
    try {
      const [resNotes, resBatches] = await Promise.all([
        fetch(`${API_URL}/student/notes/`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/pending-students/`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const dataNotes = await resNotes.json();
      const dataBatches = await resBatches.json();
      
      setNotes(dataNotes.global_notes ? [...dataNotes.global_notes, ...(dataNotes.batch_notes || [])] : dataNotes);
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
    fetchNotesAndBatches();
  }, []);

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!title || !fileUrl) return alert('Title and Drive File URL are required');

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/notes/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          summary,
          category,
          fileUrl,
          batchId: category === 'batch-specific' ? selectedBatchId : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Study Note created and published successfully!');
      setTitle('');
      setSummary('');
      setFileUrl('');
      fetchNotesAndBatches();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this study note?')) return;

    try {
      const res = await fetch(`${API_URL}/admin/notes/delete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ noteId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Study note deleted successfully!');
      fetchNotesAndBatches();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: 24 }}>Loading study notes manager...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>
        <BookOpen size={28} style={{ color: '#10b981' }} /> Study Notes & Resources Manager
      </h2>
      <p style={styles.subheader}>
        Publish global or batch-specific study material, cheatsheets, and Google Drive guides for students.
      </p>

      <div className="admin-users-layout" style={styles.layout}>
        {/* Create Form */}
        <div className="glass-card" style={styles.formCard}>
          <h3 style={styles.formHeader}>
            <PlusCircle size={18} style={{ color: '#10b981' }} /> Publish New Study Note
          </h3>

          <form onSubmit={handleCreateNote} style={styles.form}>
            <div style={styles.inputWrapper}>
              <label style={styles.label}>Note Title</label>
              <input 
                type="text" 
                className="custom-input" 
                placeholder="e.g. Django Templates & Context Processors"
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
              />
            </div>

            <div style={styles.inputWrapper}>
              <label style={styles.label}>Category Scope</label>
              <select 
                className="custom-input" 
                value={category} 
                onChange={e => setCategory(e.target.value)}
              >
                <option value="global">Global (Visible to All Students)</option>
                <option value="batch-specific">Batch-Specific (Target Course)</option>
              </select>
            </div>

            {category === 'batch-specific' && (
              <div style={styles.inputWrapper}>
                <label style={styles.label}>Select Target Batch</label>
                <select 
                  className="custom-input" 
                  value={selectedBatchId} 
                  onChange={e => setSelectedBatchId(e.target.value)}
                  required
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.inputWrapper}>
              <label style={styles.label}>Google Drive / Document File Link</label>
              <input 
                type="url" 
                className="custom-input" 
                placeholder="https://drive.google.com/file/d/.../view"
                value={fileUrl} 
                onChange={e => setFileUrl(e.target.value)} 
                required 
              />
            </div>

            <div style={styles.inputWrapper}>
              <label style={styles.label}>Summary / Guide Overview</label>
              <textarea 
                className="custom-input" 
                placeholder="Key concepts covered in this note..."
                value={summary} 
                onChange={e => setSummary(e.target.value)} 
                style={{ minHeight: 90 }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={submitting} style={{ justifyContent: 'center' }}>
              {submitting ? 'Publishing...' : 'Publish Study Note'}
            </button>
          </form>
        </div>

        {/* Existing Notes List */}
        <div style={styles.listSection}>
          <h3 style={{ color: '#fff', marginBottom: 16 }}>Published Notes ({notes.length})</h3>

          <div style={styles.grid}>
            {notes.map(note => (
              <div key={note.id} className="glass-card" style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className={`badge ${note.category === 'global' ? 'badge-success' : 'badge-warning'}`}>
                    {note.category === 'global' ? 'Global Note' : `Batch: ${note.batch_name || 'Class'}`}
                  </span>

                  <button 
                    onClick={() => handleDeleteNote(note.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <h4 style={styles.cardTitle}>{note.title}</h4>
                <p style={styles.cardSummary}>{note.summary || 'No summary description provided.'}</p>

                <div style={styles.cardFooter}>
                  <a href={note.file_url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                    View Drive Material <ExternalLink size={12} />
                  </a>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>
                    {note.date_shared || 'Recent'}
                  </span>
                </div>
              </div>
            ))}
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
  listSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  card: {
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    borderRadius: '20px',
  },
  cardTitle: {
    color: '#ffffff',
    fontFamily: 'var(--font-header)',
    fontSize: 16,
    fontWeight: '700',
  },
  cardSummary: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 1.5,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  link: {
    color: '#60a5fa',
    fontSize: 12,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontWeight: '700',
  }
};
