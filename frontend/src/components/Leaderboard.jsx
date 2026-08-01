import React, { useState, useEffect } from 'react';
import { Award } from 'lucide-react';

export default function Leaderboard({ API_URL, token }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/student/leaderboard/?_cb=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  if (loading) return <div style={{ color: '#fff' }}>Loading leaderboard standings...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.header}>Batch Leaderboard</h2>
          <p style={styles.subheader}>Review academic rankings of students based on task grades and mock scores.</p>
        </div>
        <div style={styles.filterGroup}>
          <select className="custom-input" style={{ width: 180, height: 42 }}>
            <option>PYTHON-FSD</option>
          </select>
        </div>
      </div>

      <div className="table-container" style={{ margin: 0 }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Student Name</th>
              <th>Tasks Score</th>
              <th>Mocks Score</th>
              <th>Overall Score</th>
            </tr>
          </thead>
          <tbody>
            {students.map((stud) => (
              <tr 
                key={stud.id} 
                style={{ 
                  backgroundColor: stud.is_me ? 'rgba(59,130,246,0.06)' : 'transparent',
                  borderLeft: stud.is_me ? '4px solid var(--primary)' : '4px solid transparent'
                }}
              >
                <td style={{ fontWeight: 600, color: stud.rank <= 3 ? '#ffffff' : 'var(--text-muted)' }}>
                  {stud.rank === 1 ? '🥇 1' : stud.rank === 2 ? '🥈 2' : stud.rank === 3 ? '🥉 3' : stud.rank}
                </td>
                <td>
                  <div style={styles.studentCol}>
                    <span style={{ fontWeight: '700', color: stud.is_me ? '#ffffff' : 'var(--text-main)' }}>
                      {stud.name}
                    </span>
                    {stud.is_me && <span style={styles.meTag}>(You)</span>}
                  </div>
                </td>
                <td style={{ fontFamily: 'var(--font-primary)' }}>{stud.tasksScore}</td>
                <td style={{ fontFamily: 'var(--font-primary)' }}>{stud.mocksScore.toFixed(0)}</td>
                <td style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-primary)' }}>{stud.overallScore.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  filterGroup: {
    alignSelf: 'center',
  },
  studentCol: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  meTag: {
    background: 'rgba(59, 130, 246, 0.1)',
    color: 'var(--primary)',
    fontSize: 10,
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: 6,
    border: '1px solid rgba(59, 130, 246, 0.2)',
  }
};
