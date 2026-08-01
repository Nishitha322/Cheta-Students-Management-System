import React, { useState, useEffect } from 'react';
import { Users, BookOpen, ClipboardList, ShieldAlert, Activity } from 'lucide-react';

export default function AdminDashboard({ API_URL, token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/stats/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div style={{ color: '#fff' }}>Loading Admin stats...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.welcomeRow}>
        <h2 style={styles.header}>CSMS Admin Control Workspace</h2>
        <p style={styles.subheader}>Monitor batch allocations, manage course tasks, grade submissions, and review leave requests.</p>
      </div>

      <div style={styles.grid}>
        <div className="glass-card" style={styles.card}>
          <Users size={32} style={{ color: 'var(--primary)' }} />
          <div>
            <div style={styles.statVal}>{stats.totalStudents}</div>
            <div style={styles.statLabel}>Total Students Registered</div>
          </div>
        </div>

        <div className="glass-card" style={styles.card}>
          <Activity size={32} style={{ color: 'var(--primary)' }} />
          <div>
            <div style={styles.statVal}>
              <span className="live-dot-inline"></span> {stats.onlineStudents || 1}
            </div>
            <div style={styles.statLabel}>Live Online Students</div>
          </div>
        </div>

        <div className="glass-card" style={styles.card}>
          <BookOpen size={32} style={{ color: '#10b981' }} />
          <div>
            <div style={styles.statVal}>{stats.activeBatches}</div>
            <div style={styles.statLabel}>Active Course Batches</div>
          </div>
        </div>

        <div className="glass-card" style={styles.card}>
          <ClipboardList size={32} style={{ color: '#f59e0b' }} />
          <div>
            <div style={styles.statVal}>{stats.pendingGrades}</div>
            <div style={styles.statLabel}>Submissions to Grade</div>
          </div>
        </div>

        <div className="glass-card" style={styles.card}>
          <ShieldAlert size={32} style={{ color: '#ef4444' }} />
          <div>
            <div style={styles.statVal}>{stats.pendingLeaves}</div>
            <div style={styles.statLabel}>Pending Leave Applications</div>
          </div>
        </div>
      </div>


      <div className="glass-card" style={styles.infoBanner}>
        <h3>College Portal Administrator Rules</h3>
        <ul style={{ marginLeft: 20, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <li><strong>Student Onboarding</strong>: Newly signed up accounts start in a pending unassigned state. You must allocate them to a training batch (e.g., Python-FSD) under the **Batch Allocation** tab before they can access worksheets.</li>
          <li><strong>Attendance check-in auditing</strong>: Check-in records are tracked dynamically. Logs can be downloaded and monitored under **Attendance Logs**.</li>
          <li><strong>Task Grading and Review</strong>: View submissions directly using student GitHub links, grade scores, and provide written developer feedback.</li>
        </ul>
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
  welcomeRow: {
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 24,
  },
  header: {
    fontSize: 26,
    fontFamily: 'var(--font-primary)', fontWeight: 700,
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: 6,
  },
  subheader: {
    fontSize: 14,
    color: '#9ca3af',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 24,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    padding: 24,
    borderRadius: '18px',
  },
  statVal: {
    fontSize: 28,
    fontWeight: 600,
    color: '#ffffff',
    fontFamily: 'var(--font-primary)', fontWeight: 700,
  },
  statLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  infoBanner: {
    padding: 32,
    color: '#cbd5e1',
    lineHeight: 1.6,
    borderRadius: '24px',
  }
};
