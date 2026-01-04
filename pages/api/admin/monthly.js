const { getDb } = require('../../../lib/firebaseAdmin');
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
  if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const monthParam = (req.query.month || '').toString();
    // Expecting YYYY-MM
    const match = monthParam.match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
    }
    const year = parseInt(match[1], 10);
    const monthIdx = parseInt(match[2], 10) - 1; // 0-based
    const start = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIdx + 1, 1, 0, 0, 0));

    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Firebase not initialized' });
    }

    const snap = await db.collection('sessions')
      .where('check_in_time', '>=', start)
      .where('check_in_time', '<', end)
      .get();

    const sessions = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        check_in_time: data.check_in_time?.toDate?.() || null,
        check_out_time: data.check_out_time?.toDate?.() || null,
      };
    });

    // Sort by check_in_time desc
    sessions.sort((a, b) => {
      const at = a.check_in_time ? a.check_in_time.getTime() : 0;
      const bt = b.check_in_time ? b.check_in_time.getTime() : 0;
      return bt - at;
    });

    return res.json({ ok: true, sessions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
}
