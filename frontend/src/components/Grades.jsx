import React, { useState, useEffect } from 'react';
import { Award, FileText, CheckCircle } from 'lucide-react';

export default function Grades({ API_URL, token }) {
  const [data, setData] = useState({ grades: [], mockDrives: [] });
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('academic'); // 'academic' or 'mockDrives'

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const res = await fetch(`${API_URL}/student/grades/?_cb=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const resData = await res.json();
        setData(resData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, []);

  if (loading) return <div style={{ color: '#fff' }}>Loading academic reports...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.header}>My Academic Reports</h2>
          <p style={styles.subheader}>Review your performance across assignments and mock placement drives</p>
        </div>
      </div>

      <div style={styles.tabsRow}>
        <button 
          style={activeSubTab === 'academic' ? styles.activeTabBtn : styles.tabBtn} 
          onClick={() => setActiveSubTab('academic')}
        >
          Assignment Grades ({data.grades.length})
        </button>
        <button 
          style={activeSubTab === 'mockDrives' ? styles.activeTabBtn : styles.tabBtn} 
          onClick={() => setActiveSubTab('mockDrives')}
        >
          Mock Placement Drives ({data.mockDrives.length})
        </button>
      </div>

      {activeSubTab === 'academic' ? (
        <div style={styles.grid}>
          {data.grades.map(grade => (
            <div key={grade.id} className="glass-card" style={styles.gradeCard}>
              <div style={styles.gradeCardTop}>
                <div style={styles.scoreCircle}>
                  <div style={styles.scoreVal}>{grade.grade}</div>
                  <div style={styles.scoreSub}>Score</div>
                </div>
                <div style={styles.badgeCol}>
                  <span className="badge badge-success">Outstanding!</span>
                  <span style={styles.date}>Graded on {new Date(grade.graded_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <h3 style={styles.taskTitle}>{grade.task_title}</h3>
              
              {grade.feedback && (
                <div style={styles.feedbackBox}>
                  <strong>Instructor Feedback:</strong>
                  <p style={{ marginTop: 4, color: '#d1d5db' }}>{grade.feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.grid}>
          {data.mockDrives && data.mockDrives.length > 0 ? (
            data.mockDrives.map(drive => (
              <div key={drive.id} className="glass-card" style={styles.mockCard}>
                <div style={styles.mockHeader}>
                  <div>
                    <h3 style={styles.driveTitle}>{drive.test_name}</h3>
                    <span style={styles.date}>Drive Date: {drive.date}</span>
                  </div>
                  <div style={styles.gradeBadge}>
                    <div style={styles.gradeCircle}>{drive.grade}</div>
                    <div style={{ fontSize: 11, textAlign: 'center', marginTop: 4 }}>GRADE</div>
                  </div>
                </div>

                <div style={styles.breakdown}>
                  <h4 style={styles.breakdownHeader}>Marks Breakdown</h4>
                  
                  <div style={styles.breakdownRow}>
                    <span>MCQ - Aptitude</span>
                    <strong>{drive.aptitude_score} / 150</strong>
                  </div>
                  <div style={styles.breakdownRow}>
                    <span>MCQ - Tech</span>
                    <strong>{drive.tech_score} / 300</strong>
                  </div>
                  <div style={styles.breakdownRow}>
                    <span>Coding Round</span>
                    <strong>{drive.coding_score} / 400</strong>
                  </div>
                  <div style={styles.breakdownRow}>
                    <span>Tech HR Marks</span>
                    <strong>{drive.tech_hr_score} / 50</strong>
                  </div>
                  <div style={styles.breakdownRow}>
                    <span>HR Marks</span>
                    <strong>{drive.hr_score} / 100</strong>
                  </div>
                  
                  <div style={styles.totalRow}>
                    <span>Percentage Score</span>
                    <strong>{drive.total_score / 10}% ({drive.total_score} / 1000)</strong>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af', width: '100%', gridColumn: '1 / -1' }}>
              No mock drive attempted yet.
            </div>
          )}
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
  tabsRow: {
    display: 'flex',
    gap: 12,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 12,
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'var(--font-header)',
    fontWeight: '600',
    borderRadius: 10,
    transition: 'all 0.2s',
  },
  activeTabBtn: {
    background: 'rgba(59,130,246,0.08)',
    border: 'none',
    color: 'var(--primary)',
    borderRadius: 10,
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'var(--font-header)',
    fontWeight: '700',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: 24,
  },
  gradeCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    borderRadius: '20px',
  },
  gradeCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '2px solid var(--success)',
    boxShadow: '0 0 15px rgba(16, 185, 129, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreVal: {
    fontSize: 18,
    fontWeight: 600,
    color: '#10b981',
    fontFamily: 'var(--font-header)',
  },
  scoreSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  badgeCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  taskTitle: {
    fontSize: 18,
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    color: '#ffffff',
  },
  feedbackBox: {
    background: 'rgba(3, 7, 18, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 14,
    fontSize: 13,
    lineHeight: 1.5,
  },
  mockCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    borderRadius: '20px',
  },
  mockHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  driveTitle: {
    fontSize: 18,
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    color: '#ffffff',
  },
  gradeBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  gradeCircle: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'rgba(249, 115, 22, 0.08)',
    border: '2px solid var(--warning)',
    boxShadow: '0 0 15px rgba(249, 115, 22, 0.15)',
    color: '#fb923c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: 18,
    fontFamily: 'var(--font-header)',
  },
  breakdown: {
    background: 'rgba(3, 7, 18, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    padding: 18,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  breakdownHeader: {
    fontSize: 13,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 8,
    marginBottom: 4,
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: '#9ca3af',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 12,
    marginTop: 6,
    color: '#ffffff',
    fontWeight: 600,
  }
};
