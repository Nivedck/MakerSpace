require('dotenv').config();
const express = require('express');
const { getDb, admin } = require('./firebaseAdmin');
const app = express();
app.use(express.json());

// --- Helper: get today range ---
function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { start, end: now };
}

// --- GET /api/admin/live ---
app.get('/api/admin/live', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('sessions').where('status', '==', 'open').get();
    const sessions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    sessions.sort((a, b) => (b.check_in_time?.toMillis?.() || 0) - (a.check_in_time?.toMillis?.() || 0));
    res.json({ ok: true, sessions });
  } catch (err) {
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// --- GET /api/admin/today ---
app.get('/api/admin/today', async (req, res) => {
  try {
    const db = getDb();
    const { start } = getTodayRange();
    const snap = await db.collection('sessions').where('check_in_time', '>=', admin.firestore.Timestamp.fromDate(start)).get();
    const sessions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    sessions.sort((a, b) => (b.check_in_time?.toMillis?.() || 0) - (a.check_in_time?.toMillis?.() || 0));
    res.json({ ok: true, sessions });
  } catch (err) {
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// --- GET /api/admin/stats ---
app.get('/api/admin/stats', async (req, res) => {
  try {
    const db = getDb();
    const { start } = getTodayRange();
    const snap = await db.collection('sessions').where('check_in_time', '>=', admin.firestore.Timestamp.fromDate(start)).get();
    const sessions = snap.docs.map(doc => doc.data());
    const stats = {
      total_checkins: sessions.length,
      active_users: sessions.filter(s => s.status === 'open').length,
      students: sessions.filter(s => s.user_type === 'student').length,
      staff: sessions.filter(s => s.user_type === 'staff').length,
      guests: sessions.filter(s => s.user_type === 'guest').length,
      by_purpose: {}
    };
    sessions.forEach(s => {
      const p = s.purpose || 'Unknown';
      stats.by_purpose[p] = (stats.by_purpose[p] || 0) + 1;
    });
    res.json({ ok: true, stats });
  } catch (err) {
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// --- GET /api/admin/monthly?month=YYYY-MM ---
app.get('/api/admin/monthly', async (req, res) => {
  try {
    const monthParam = (req.query.month || '').toString();
    const match = monthParam.match(/^(\d{4})-(\d{2})$/);
    if (!match) return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
    const year = parseInt(match[1], 10);
    const monthIdx = parseInt(match[2], 10) - 1;
    const start = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIdx + 1, 1, 0, 0, 0));
    const db = getDb();
    const snap = await db.collection('sessions')
      .where('check_in_time', '>=', admin.firestore.Timestamp.fromDate(start))
      .where('check_in_time', '<', admin.firestore.Timestamp.fromDate(end))
      .get();
    const sessions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    sessions.sort((a, b) => (b.check_in_time?.toMillis?.() || 0) - (a.check_in_time?.toMillis?.() || 0));
    res.json({ ok: true, sessions });
  } catch (err) {
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// --- POST /api/admin/checkout ---
app.post('/api/admin/checkout', async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    const db = getDb();
    const ref = db.collection('sessions').doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Session not found' });
    const data = snap.data();
    if (data.status === 'closed') return res.status(400).json({ error: 'Session already closed' });
    const checkInMs = data.check_in_time?.toMillis ? data.check_in_time.toMillis() : (data.check_in_time?.seconds || 0) * 1000;
    const nowTs = admin.firestore.Timestamp.now();
    const nowMs = nowTs.toMillis();
    const durationMinutes = checkInMs ? Math.max(0, Math.round((nowMs - checkInMs) / 60000)) : null;
    await ref.update({
      check_out_time: nowTs,
      duration_minutes: durationMinutes,
      status: 'closed'
    });
    res.json({ ok: true, sessionId, check_out_time: nowMs, duration_minutes: durationMinutes });
  } catch (err) {
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Dashboard API server running on port ${PORT}`);
});
