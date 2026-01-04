import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

function useApi(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const token = localStorage.getItem('ms_admin_token');
      const res = await window.fetch(path, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      const j = await res.json();
      if (res.ok) setData(j);
      else setData({ error: j.error });
      setLoading(false);
    };
    fetch();
  }, [path, tick]);
  
  return { data, loading, refresh: () => setTick(t => t + 1) };
}

function formatTime(ts) {
  if (!ts) return '-';
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(mins) {
  if (!mins) return '-';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function timeSince(ts) {
  if (!ts) return '-';
  const d = ts instanceof Date ? ts : new Date(ts);
  const mins = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  return formatDuration(mins);
}

function exportCSV(sessions) {
  const headers = ['Name', 'Type', 'Reg No', 'Phone', 'Department', 'Year', 'Purpose', 'Check-In', 'Check-Out', 'Duration (min)', 'Status'];
  const rows = sessions.map(s => [
    s.name || '',
    s.user_type || '',
    s.reg_no || '',
    s.phone || '',
    s.department || '',
    s.year || '',
    s.purpose || '',
    s.check_in_time ? new Date(s.check_in_time).toISOString() : '',
    s.check_out_time ? new Date(s.check_out_time).toISOString() : '',
    s.duration_minutes || '',
    s.status || ''
  ]);
  
  const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `makerspace_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState('live');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [forceCheckoutId, setForceCheckoutId] = useState(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  });
  const [exportingMonth, setExportingMonth] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('ms_admin_token');
    if (!token) {
      router.replace('/admin/login');
    }
  }, [router]);

  const live = useApi('/api/admin/live');
  const today = useApi('/api/admin/today');
  const stats = useApi('/api/admin/stats');

  useEffect(() => {
    const unauthorized = live.data?.error === 'Unauthorized' || today.data?.error === 'Unauthorized' || stats.data?.error === 'Unauthorized';
    if (unauthorized) {
      logout();
    }
  }, [live.data, today.data, stats.data]);

  function logout() {
    localStorage.removeItem('ms_admin_token');
    router.push('/admin/login');
  }

  function applyFilters(sessions) {
    if (!sessions) return [];
    
    let filtered = sessions;
    
    // Search
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.reg_no || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q)
      );
    }
    
    // Filter by type
    if (filter !== 'all') {
      filtered = filtered.filter(s => s.user_type === filter);
    }
    
    return filtered;
  }

  const currentData = tab === 'live' ? live.data?.sessions : today.data?.sessions;
  const filtered = applyFilters(currentData);

  async function handleForceCheckout(sessionId) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ms_admin_token') : null;
    if (!token) {
      logout();
      return;
    }

    setForceCheckoutId(sessionId);
    try {
      const res = await window.fetch('/api/admin/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to force check-out');
      }

      live.refresh();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Manual check-out failed');
    } finally {
      setForceCheckoutId(null);
    }
  }

  async function handleExportMonthly() {
    setExportError('');
    setExportingMonth(true);
    try {
      const token = localStorage.getItem('ms_admin_token');
      if (!token) {
        logout();
        return;
      }
      const res = await window.fetch(`/api/admin/monthly?month=${encodeURIComponent(month)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const j = await res.json();
      if (!res.ok) {
        throw new Error(j.error || 'Export failed');
      }
      exportCSV(j.sessions || []);
    } catch (err) {
      console.error(err);
      setExportError(err.message || 'Export failed');
    } finally {
      setExportingMonth(false);
    }
  }

  return (
    <main className="screen">
      <div className="row" style={{marginBottom:'16px'}}>
        <div>
          <div className="title">Admin Dashboard</div>
          <div className="subtitle">Makerspace Access Control</div>
        </div>
        <button onClick={logout} className="btn btn-outline" style={{width:'auto',padding:'8px 16px'}}>
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${tab === 'live' ? 'active' : ''}`}
          onClick={() => setTab('live')}
        >
          Live ({live.data?.sessions?.length || 0})
        </button>
        <button 
          className={`tab ${tab === 'today' ? 'active' : ''}`}
          onClick={() => setTab('today')}
        >
          Today ({today.data?.sessions?.length || 0})
        </button>
        <button 
          className={`tab ${tab === 'stats' ? 'active' : ''}`}
          onClick={() => setTab('stats')}
        >
          Stats
        </button>
      </div>

      {tab === 'stats' ? (
        <div className="card stack">
          {stats.loading && <p>Loading...</p>}
          {stats.data?.error && <div className="error">{stats.data.error}</div>}
          {stats.data?.stats && (
            <>
              <div className="row">
                <span className="label">Total Check-Ins Today</span>
                <strong style={{fontSize:'1.5rem'}}>{stats.data.stats.total_checkins}</strong>
              </div>
              <div className="row">
                <span className="label">Currently Active</span>
                <strong style={{fontSize:'1.5rem',color:'var(--accent)'}}>{stats.data.stats.active_users}</strong>
              </div>
              <div className="grid2">
                <div className="card" style={{background:'#1b1f2a'}}>
                  <div className="label">Students</div>
                  <strong style={{fontSize:'1.2rem'}}>{stats.data.stats.students}</strong>
                </div>
                <div className="card" style={{background:'#1b1f2a'}}>
                  <div className="label">Staff</div>
                  <strong style={{fontSize:'1.2rem'}}>{stats.data.stats.staff}</strong>
                </div>
              </div>
              <div>
                <div className="label" style={{marginBottom:'8px'}}>By Purpose</div>
                {Object.entries(stats.data.stats.by_purpose).map(([purpose, count]) => (
                  <div key={purpose} className="row" style={{padding:'8px 0'}}>
                    <span>{purpose}</span>
                    <span className="chip">{count}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{background:'#1b1f2a', gap:'12px', flexDirection:'column'}}>
                <div className="label">Monthly export</div>
                <div className="row" style={{gap:'8px', alignItems:'center'}}>
                  <input
                    type="month"
                    className="input"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    style={{maxWidth:'200px'}}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={handleExportMonthly}
                    disabled={exportingMonth}
                  >
                    {exportingMonth ? 'Exporting...' : 'Export CSV'}
                  </button>
                </div>
                {exportError && <div className="error">{exportError}</div>}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="card" style={{display:'flex',gap:'12px',flexDirection:'column'}}>
            <input 
              className="input"
              placeholder="Search by name, reg no, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="row" style={{gap:'8px'}}>
              <button 
                className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter('all')}
                style={{flex:1}}
              >
                All
              </button>
              <button 
                className={`btn ${filter === 'student' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter('student')}
                style={{flex:1}}
              >
                Students
              </button>
              <button 
                className={`btn ${filter === 'staff' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter('staff')}
                style={{flex:1}}
              >
                Staff
              </button>
            </div>
            {tab === 'today' && filtered.length > 0 && (
              <button 
                className="btn btn-secondary"
                onClick={() => exportCSV(filtered)}
              >
                📥 Export CSV ({filtered.length} records)
              </button>
            )}
          </div>

          {/* Sessions List */}
          {(live.loading || today.loading) && <div className="card">Loading...</div>}
          {(live.data?.error || today.data?.error) && (
            <div className="error card">{live.data?.error || today.data?.error}</div>
          )}
          
          {filtered.length === 0 && !live.loading && !today.loading && (
            <div className="card muted">No sessions found</div>
          )}
          
          <div className="list">
            {filtered.map(s => (
              <div key={s.id} className="card stack">
                <div className="row">
                  <strong>{s.name}</strong>
                  <span className="chip">{s.purpose}</span>
                </div>
                <div className="row">
                  <span className="muted">{s.user_type === 'student' ? 'Student' : 'Staff'}</span>
                  <span>{s.user_type === 'student' ? s.reg_no : s.phone}</span>
                </div>
                {s.user_type === 'student' && s.department && (
                  <div className="row">
                    <span className="muted">Dept</span>
                    <span>{s.department} {s.year ? `- Year ${s.year}` : ''}</span>
                  </div>
                )}
                <div className="row">
                  <span className="muted">Check-In</span>
                  <span>{formatTime(s.check_in_time)}</span>
                </div>
                {s.status === 'closed' && (
                  <>
                    <div className="row">
                      <span className="muted">Check-Out</span>
                      <span>{formatTime(s.check_out_time)}</span>
                    </div>
                    <div className="row">
                      <span className="muted">Duration</span>
                      <strong>{formatDuration(s.duration_minutes)}</strong>
                    </div>
                  </>
                )}
                {s.status === 'open' && (
                  <div className="row">
                    <span className="muted">Elapsed</span>
                    <strong style={{color:'var(--accent)'}}>{timeSince(s.check_in_time)}</strong>
                  </div>
                )}
                {tab === 'live' && s.status === 'open' && (
                  <div className="row" style={{justifyContent:'flex-end'}}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleForceCheckout(s.id)}
                      disabled={forceCheckoutId === s.id}
                      style={{width:'auto'}}
                    >
                      {forceCheckoutId === s.id ? 'Checking out...' : 'Force check-out'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
