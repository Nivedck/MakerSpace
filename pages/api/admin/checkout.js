const { getDb, admin } = require('../../../lib/firebaseAdmin');
const jwt = require('jsonwebtoken');

function auth(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  const token = h.split(' ')[1];
  try {
    return jwt.verify(token, process.env.ADMIN_JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST' });
  if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Firebase not initialized' });
    }

    const ref = db.collection('sessions').doc(sessionId);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const data = snap.data();
    if (data.status === 'closed') {
      return res.status(400).json({ error: 'Session already closed' });
    }

    const checkInMs = data.check_in_time?.toMillis
      ? data.check_in_time.toMillis()
      : (data.check_in_time?.seconds || 0) * 1000;

    const nowTs = admin.firestore.Timestamp.now();
    const nowMs = nowTs.toMillis();
    const durationMinutes = checkInMs
      ? Math.max(0, Math.round((nowMs - checkInMs) / 60000))
      : null;

    await ref.update({
      check_out_time: nowTs,
      duration_minutes: durationMinutes,
      status: 'closed'
    });

    return res.json({
      ok: true,
      sessionId,
      check_out_time: nowMs,
      duration_minutes: durationMinutes
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
}
