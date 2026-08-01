import React, { useState, useEffect } from 'react';
import { ClipboardList, PlusCircle, Calendar, Send, Code, Sparkles, FolderGit, FileText } from 'lucide-react';

export default function AdminTasks({ API_URL, token }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskType, setTaskType] = useState('regular'); // 'regular', 'leetcode', 'bulk_leetcode'

  // Regular & single LeetCode states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Project states
  const [maximumMarks, setMaximumMarks] = useState('50');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [specificationFile, setSpecificationFile] = useState(null);
  const [specificationFilename, setSpecificationFilename] = useState('');
  const [specExtractedText, setSpecExtractedText] = useState('');
  const [createdProject, setCreatedProject] = useState(null);
  const [replacingFile, setReplacingFile] = useState(false);

  // 10-Day Bulk LeetCode states
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [bulkItems, setBulkItems] = useState(
    Array.from({ length: 10 }, (_, i) => ({ dayNumber: i + 1, title: '', url: '' }))
  );

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await fetch(`${API_URL}/batches/`);
        const data = await res.json();
        const batchList = Array.isArray(data) ? data : (data.batches || []);
        setBatches(batchList);
        if (batchList.length > 0) {
          setSelectedBatchId(batchList[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  const handleBulkChange = (index, field, value) => {
    setBulkItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleFillSample = () => {
    const samples = [
      { dayNumber: 1, title: '1. Two Sum', url: 'https://leetcode.com/problems/two-sum/' },
      { dayNumber: 2, title: '9. Palindrome Number', url: 'https://leetcode.com/problems/palindrome-number/' },
      { dayNumber: 3, title: '46. Permutations', url: 'https://leetcode.com/problems/permutations/' },
      { dayNumber: 4, title: '47. Permutations II', url: 'https://leetcode.com/problems/permutations-ii/' },
      { dayNumber: 5, title: '53. Maximum Subarray', url: 'https://leetcode.com/problems/maximum-subarray/' },
      { dayNumber: 6, title: '70. Climbing Stairs', url: 'https://leetcode.com/problems/climbing-stairs/' },
      { dayNumber: 7, title: '121. Best Time to Buy/Sell Stock', url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/' },
      { dayNumber: 8, title: '141. Linked List Cycle', url: 'https://leetcode.com/problems/linked-list-cycle/' },
      { dayNumber: 9, title: '206. Reverse Linked List', url: 'https://leetcode.com/problems/reverse-linked-list/' },
      { dayNumber: 10, title: '242. Valid Anagram', url: 'https://leetcode.com/problems/valid-anagram/' },
    ];
    setBulkItems(samples);
  };

  const handleRemoveSpec = async () => {
    if (!createdProject) return;
    if (!window.confirm("Are you sure you want to remove the specification file? This will delete the extracted requirements text as well.")) return;
    
    try {
      const res = await fetch(`${API_URL}/admin/project/${createdProject.id}/?removeSpecOnly=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert(data.status || 'File removed successfully!');
      setCreatedProject(data.project);
      setReplacingFile(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReplaceSpecSubmit = async (e) => {
    const file = e.target.files[0];
    if (!file || !createdProject) return;
    
    const formData = new FormData();
    formData.append('specification', file);
    
    try {
      const res = await fetch(`${API_URL}/admin/project/${createdProject.id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert('Specification file replaced successfully!');
      setCreatedProject(data);
      setReplacingFile(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (taskType === 'regular') {
      if (!title || !description || !dueDate || !selectedBatchId) {
        return alert('Missing required task fields');
      }
      setSubmitting(true);
      try {
        const res = await fetch(`${API_URL}/admin/create-task/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ batchId: selectedBatchId, title, description, dueDate })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert('Task created and assigned successfully!');
        setTitle('');
        setDescription('');
        setDueDate('');
      } catch (err) {
        alert(err.message);
      } finally {
        setSubmitting(false);
      }
    } else if (taskType === 'leetcode') {
      if (!title || !leetcodeUrl || !dueDate) {
        return alert('Missing required LeetCode challenge fields');
      }
      setSubmitting(true);
      try {
        const res = await fetch(`${API_URL}/admin/create-leetcode-challenge/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title, url: leetcodeUrl, deadline: dueDate, availableDate: dueDate })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert('LeetCode Daily Challenge created and assigned!');
        setTitle('');
        setLeetcodeUrl('');
        setDueDate('');
      } catch (err) {
        alert(err.message);
      } finally {
        setSubmitting(false);
      }
    } else if (taskType === 'bulk_leetcode') {
      const validItems = bulkItems.filter(item => item.title.trim() && item.url.trim());
      if (validItems.length === 0) {
        return alert('Please enter at least 1 valid LeetCode problem (Title & URL)');
      }

      setSubmitting(true);
      try {
        const res = await fetch(`${API_URL}/admin/bulk-create-leetcode/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ startDate, challenges: validItems })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert(`Successfully scheduled ${data.count} LeetCode challenges for 10-day release cycle!`);
      } catch (err) {
        alert(err.message);
      } finally {
        setSubmitting(false);
      }
    } else if (taskType === 'projects') {
      if (!title || !selectedBatchId || !specificationFile || !dueDate) {
        return alert('Missing required project fields or specification file');
      }
      setSubmitting(true);
      try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('batchId', selectedBatchId);
        formData.append('maximumMarks', maximumMarks);
        formData.append('startDate', startDate || todayStr);
        formData.append('deadline', dueDate);
        formData.append('additionalInstructions', additionalInstructions);
        formData.append('specification', specificationFile);

        const res = await fetch(`${API_URL}/admin/create-project/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert('Project created and assigned successfully!');
        setTitle('');
        setAdditionalInstructions('');
        setSpecificationFile(null);
        setSpecificationFilename('');
        setCreatedProject(data);
      } catch (err) {
        alert(err.message);
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) return <div style={{ color: '#fff' }}>Loading batches...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>
        <ClipboardList size={28} style={{ color: 'var(--primary)', verticalAlign: 'middle', marginRight: 8 }} /> Task & Challenge Administration
      </h2>
      
      <div style={styles.layout}>
        <div className="glass-card" style={styles.formCard}>
          <h3 style={styles.sectionHeader}>
            {taskType === 'regular' ? (
              <PlusCircle size={18} style={{ color: 'var(--primary)' }} />
            ) : taskType === 'leetcode' ? (
              <Code size={18} style={{ color: '#eab308' }} />
            ) : taskType === 'bulk_leetcode' ? (
              <Sparkles size={18} style={{ color: '#a855f7' }} />
            ) : (
              <FolderGit size={18} style={{ color: '#60a5fa' }} />
            )}
            <span>
              {taskType === 'regular' ? 'Assign Worksheet Task' : taskType === 'leetcode' ? 'Single LeetCode Challenge' : taskType === 'bulk_leetcode' ? '10-Day LeetCode Bulk Scheduler' : 'Create Assigned Project'}
            </span>
          </h3>

          {/* Task Type Switcher Toggle */}
          <div style={styles.toggleContainer}>
            <button 
              type="button"
              style={taskType === 'regular' ? styles.toggleBtnActive : styles.toggleBtn}
              onClick={() => setTaskType('regular')}
            >
              Worksheet Task
            </button>
            <button 
              type="button"
              style={taskType === 'leetcode' ? styles.toggleBtnActive : styles.toggleBtn}
              onClick={() => setTaskType('leetcode')}
            >
              Single LeetCode
            </button>
            <button 
              type="button"
              style={taskType === 'bulk_leetcode' ? styles.toggleBtnActivePurple : styles.toggleBtn}
              onClick={() => setTaskType('bulk_leetcode')}
            >
              ✨ 10-Day Schedule Bulk
            </button>
            <button 
              type="button"
              style={taskType === 'projects' ? styles.toggleBtnActive : styles.toggleBtn}
              onClick={() => setTaskType('projects')}
            >
              Projects
            </button>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {taskType === 'regular' && (
              <>
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

                <div style={styles.inputWrapper}>
                  <label style={styles.label}>Task Title</label>
                  <input 
                    type="text" 
                    className="custom-input" 
                    placeholder="e.g. W7S4T3 (Worksheet 7, Task 3)"
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    required 
                  />
                </div>

                <div style={styles.inputWrapper}>
                  <label style={styles.label}>Task Instructions</label>
                  <textarea 
                    className="custom-input" 
                    placeholder="Describe task description, GitHub requirements..."
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    style={{ minHeight: 140, resize: 'vertical' }}
                    required 
                  />
                </div>

                <div style={styles.inputWrapper}>
                  <label style={styles.label}>Due Date / Deadline</label>
                  <input 
                    type="date" 
                    className="custom-input" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)} 
                    required 
                  />
                </div>
              </>
            )}

            {taskType === 'leetcode' && (
              <>
                <div style={styles.inputWrapper}>
                  <label style={styles.label}>Challenge Title</label>
                  <input 
                    type="text" 
                    className="custom-input" 
                    placeholder="e.g. Two Sum"
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    required 
                  />
                </div>

                <div style={styles.inputWrapper}>
                  <label style={styles.label}>LeetCode Problem Link</label>
                  <input 
                    type="url" 
                    className="custom-input" 
                    placeholder="https://leetcode.com/problems/two-sum/"
                    value={leetcodeUrl} 
                    onChange={e => setLeetcodeUrl(e.target.value)} 
                    required 
                  />
                </div>

                <div style={styles.inputWrapper}>
                  <label style={styles.label}>Scheduled Date</label>
                  <input 
                    type="date" 
                    className="custom-input" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)} 
                    required 
                  />
                </div>
              </>
            )}

            {taskType === 'bulk_leetcode' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={styles.inputWrapper}>
                    <label style={styles.label}>Day 1 Release Start Date</label>
                    <input 
                      type="date" 
                      className="custom-input" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                      required 
                    />
                  </div>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={handleFillSample}
                    style={{ fontSize: 12, padding: '8px 12px', marginTop: 18 }}
                  >
                    ✨ Auto-Fill 10 Sample Problems
                  </button>
                </div>

                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
                  Enter 10 days of LeetCode challenges below. Each day's problem will unlock automatically for students on consecutive dates (1 code per day).
                </p>

                <div style={styles.bulkGrid}>
                  {bulkItems.map((item, idx) => (
                    <div key={idx} style={styles.bulkRow}>
                      <span className="day-badge day-badge-open" style={{ minWidth: 54, textAlign: 'center' }}>
                        Day {item.dayNumber}
                      </span>
                      <input 
                        type="text" 
                        className="custom-input" 
                        placeholder="Problem Title (e.g. Two Sum)"
                        value={item.title}
                        onChange={e => handleBulkChange(idx, 'title', e.target.value)}
                        style={{ flex: 1, fontSize: 13 }}
                      />
                      <input 
                        type="url" 
                        className="custom-input" 
                        placeholder="LeetCode URL"
                        value={item.url}
                        onChange={e => handleBulkChange(idx, 'url', e.target.value)}
                        style={{ flex: 1.5, fontSize: 13 }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {taskType === 'projects' && (
              <>
                {!createdProject ? (
                  <>
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

                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>Project Title</label>
                      <input 
                        type="text" 
                        className="custom-input" 
                        placeholder="e.g. Student Management System"
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        required 
                      />
                    </div>

                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>Upload Project Specification (PDF, DOCX, TXT)</label>
                      <input 
                        type="file" 
                        className="custom-input" 
                        accept=".pdf,.docx,.txt"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            setSpecificationFile(file);
                            setSpecificationFilename(file.name);
                          }
                        }}
                        required 
                      />
                    </div>

                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>Maximum Marks</label>
                      <input 
                        type="number" 
                        className="custom-input" 
                        placeholder="e.g. 50"
                        value={maximumMarks} 
                        onChange={e => setMaximumMarks(e.target.value)} 
                        required 
                      />
                    </div>

                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>Start Date</label>
                      <input 
                        type="date" 
                        className="custom-input" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)} 
                        required 
                      />
                    </div>

                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>Deadline / Due Date</label>
                      <input 
                        type="date" 
                        className="custom-input" 
                        value={dueDate} 
                        onChange={e => setDueDate(e.target.value)} 
                        required 
                      />
                    </div>

                    <div style={styles.inputWrapper}>
                      <label style={styles.label}>Additional Instructions (Optional)</label>
                      <textarea 
                        className="custom-input" 
                        placeholder="Describe any tech stack details or submission notes..."
                        value={additionalInstructions} 
                        onChange={e => setAdditionalInstructions(e.target.value)} 
                        style={{ minHeight: 80, resize: 'vertical' }}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', padding: 16, borderRadius: 12, color: '#e5e7eb' }}>
                      <h4 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, fontWeight: '700', marginBottom: 6 }}>
                        Project Specification Uploaded ✓
                      </h4>
                      <p style={{ fontSize: 13 }}><strong>Project:</strong> {createdProject.title}</p>
                      <p style={{ fontSize: 13, marginTop: 4 }}><strong>File:</strong> {createdProject.specification_filename || 'Uploaded File'}</p>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                      <a 
                        href={createdProject.specification_file ? `${API_URL.replace('/api', '')}${createdProject.specification_file}` : '#'} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-secondary"
                        style={{ flex: 1, textDecoration: 'none', textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center' }}
                      >
                        View File
                      </a>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={() => setReplacingFile(!replacingFile)}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        Replace File
                      </button>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={handleRemoveSpec}
                        style={{ flex: 1, justifyContent: 'center', color: '#ef4444' }}
                      >
                        Remove File
                      </button>
                    </div>

                    {replacingFile && (
                      <div style={{ background: 'rgba(0,0,0,0.15)', padding: 12, borderRadius: 8, border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <label style={styles.label}>Select Replacement File</label>
                        <input 
                          type="file" 
                          className="custom-input" 
                          accept=".pdf,.docx,.txt"
                          onChange={handleReplaceSpecSubmit}
                          style={{ marginTop: 6 }}
                        />
                      </div>
                    )}

                    {createdProject.specification_extracted_text && (
                      <div>
                        <label style={styles.label}>Extracted Specification Preview</label>
                        <div style={{ 
                          marginTop: 6, 
                          background: 'rgba(0,0,0,0.3)', 
                          padding: 12, 
                          borderRadius: 8, 
                          maxHeight: 250, 
                          overflowY: 'auto', 
                          fontSize: 12, 
                          fontFamily: 'monospace', 
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          color: '#9ca3af',
                          border: '1px solid rgba(255,255,255,0.06)'
                        }}>
                          {createdProject.specification_extracted_text}
                        </div>
                      </div>
                    )}

                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => setCreatedProject(null)}
                      style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
                    >
                      ← Create Another Project
                    </button>
                  </div>
                )}
              </>
            )}

            <button type="submit" className="btn-primary" disabled={submitting || (taskType === 'projects' && createdProject)} style={{ justifyContent: 'center', marginTop: 16, padding: '12px 20px' }}>
              <Send size={16} /> 
              {submitting ? 'Processing...' : (
                taskType === 'regular' ? 'Assign Task to Batch' : 
                taskType === 'leetcode' ? 'Assign Single Challenge' : 
                taskType === 'bulk_leetcode' ? 'Schedule 10-Day LeetCode Release' :
                'Create Project'
              )}
            </button>
          </form>
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
    width: '100%',
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
    marginBottom: 8,
  },
  layout: {
    display: 'flex',
    justifyContent: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 720,
    borderRadius: '24px',
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  toggleContainer: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
    background: 'rgba(3, 7, 18, 0.45)',
    padding: 6,
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  toggleBtn: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-header)',
    fontWeight: '600',
    fontSize: 13,
    transition: 'all 0.2s',
  },
  toggleBtnActive: {
    flex: 1,
    background: 'rgba(59, 130, 246, 0.08)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    color: 'var(--primary)',
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-header)',
    fontWeight: '700',
    fontSize: 13,
  },
  toggleBtnActivePurple: {
    flex: 1,
    background: 'rgba(168, 85, 247, 0.08)',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    color: '#c084fc',
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-header)',
    fontWeight: '700',
    fontSize: 13,
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
  bulkGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: 400,
    overflowY: 'auto',
    paddingRight: 6,
  },
  bulkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(3, 7, 18, 0.25)',
    padding: 10,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.04)',
  }
};
