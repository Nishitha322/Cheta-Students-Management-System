import React, { useState, useEffect } from 'react';
import { FileText, Download, Search, RefreshCw } from 'lucide-react';

export default function Notes({ API_URL, token }) {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/student/notes/?_cb=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    (n.summary && n.summary.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.header}>Study Notes Library</h2>
          <p style={styles.subheader}>Access your batch-specific and global reference guidelines, worksheets, and lecture notes.</p>
        </div>
        <div style={styles.badgeCount}>
          <span className="badge badge-success" style={{ padding: '6px 12px' }}>{notes.length} Total Docs</span>
        </div>
      </div>

      <div style={styles.controlsRow}>
        <div style={styles.searchContainer}>
          <Search size={18} style={styles.searchIcon} />
          <input 
            type="text" 
            className="custom-input" 
            placeholder="Search notes by document title or details..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 44 }}
          />
        </div>
        <button className="btn-secondary" onClick={fetchNotes} disabled={loading} style={{ gap: 8 }}>
          <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
          Refresh Data
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#fff' }}>Loading documents...</div>
      ) : (
        <div style={styles.grid}>
          {filteredNotes.map(note => (
            <div key={note.id} className="glass-card" style={styles.card}>
              <div style={styles.cardTop}>
                <span className="badge" style={{ 
                  background: note.category === 'global' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                  color: note.category === 'global' ? '#3b82f6' : '#10b981'
                }}>
                  {note.category === 'global' ? 'Global Notes' : 'Batch Notes'}
                </span>
                <span style={styles.date}>{note.date_shared}</span>
              </div>

              <h3 style={styles.title}>{note.title}</h3>
              <p style={styles.summary}>{note.summary}</p>
              
              <div style={styles.authorRow}>
                <div style={styles.authorAvatar}>
                  {note.uploaded_by_name?.charAt(0) || 'S'}
                </div>
                <div style={styles.authorName}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{note.uploaded_by_name || 'Instructor'}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Uploader</div>
                </div>
              </div>

              <a href={note.file_url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={styles.dlBtn}>
                <Download size={16} /> Open Notes Document
              </a>
            </div>
          ))}
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
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 24,
  },
  header: {
    color: '#ffffff',
    fontFamily: 'var(--font-header)',
    fontSize: 26,
    fontWeight: 600,
    marginBottom: 6,
  },
  subheader: {
    color: '#9ca3af',
    fontSize: 14,
  },
  badgeCount: {
    alignSelf: 'center',
  },
  controlsRow: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#4b5563',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 24,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '20px',
    padding: 24,
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  date: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  title: {
    fontSize: 18,
    fontFamily: 'var(--font-header)',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: 8,
  },
  summary: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 1.6,
    marginBottom: 20,
    flex: 1,
  },
  authorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingTop: 16,
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'rgba(59, 130, 246, 0.1)',
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: 14,
    border: '1px solid rgba(59, 130, 246, 0.25)',
  },
  authorName: {
    display: 'flex',
    flexDirection: 'column',
  },
  dlBtn: {
    width: '100%',
    justifyContent: 'center',
    textDecoration: 'none',
  }
};
