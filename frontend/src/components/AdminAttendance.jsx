import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw } from 'lucide-react';

export default function AdminAttendance({ API_URL, token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/attendance/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const formatDuration = (dur) => {
    if (!dur) return 'N/A';
    return dur.split('.')[0];
  };

  if (loading) return <div style={{ color: '#fff' }}>Loading student attendance check-ins...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.header}>
            <Clock size={28} style={{ color: 'var(--primary)', verticalAlign: 'middle', marginRight: 8 }} /> Student Check-In Audit Logs
          </h2>
          <p style={styles.subheader}>Monitor all student log check-ins, check-outs, and active session durations across batches.</p>
        </div>
        <button className="btn-secondary" onClick={fetchAttendance} style={{ padding: 12 }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
          <h3>No check-in logs found</h3>
          <p style={{ color: '#9ca3af', marginTop: 8 }}>Students have not logged session times today or in past days.</p>
        </div>
      ) : (
        <div className="table-container" style={{ margin: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Student Name</th>
                <th>Roll No</th>
                <th>First Check-In</th>
                <th>Last Check-Out</th>
                <th>Session Time</th>
                <th>Daily Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: '700', color: '#ffffff' }}>{log.date}</td>
                  <td>{log.student_name}</td>
                  <td style={{ fontFamily: 'var(--font-primary)' }}>{log.student_roll || 'N/A'}</td>
                  <td style={{ fontFamily: 'var(--font-primary)' }}>
                    {log.check_in ? new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-primary)' }}>
                    {log.check_out ? new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-primary)' }}>{formatDuration(log.total_time)}</td>
                  <td>
                    {log.status === 'present' ? (
                      <span className="badge badge-success">Present</span>
                    ) : log.status === 'leave' ? (
                      <span className="badge badge-info">Leave</span>
                    ) : (
                      <span className="badge badge-danger">Absent</span>
                    )}
                  </td>
                </tr>
              ))}
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
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  }
};
