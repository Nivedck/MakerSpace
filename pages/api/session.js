const { getDb, admin } = require('../../lib/firebaseAdmin');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const PURPOSES = ['Work', 'Project', 'Maintenance', 'Visit'];
const BRANCHES = ['IT', 'CS', 'CE', 'ME', 'EC', 'EE', 'CB', 'AI'];

function normalizeRegNo(raw) {
  return raw ? raw.toString().trim().toUpperCase().replace(/\s+/g, '') : '';
}

function validateRegNo(regNo) {
  const regex = /^KSD(2[0-9])(IT|CS|CE|ME|EC|EE|CB|AI)\d{3}$/;
  const iedcRegex = /^IEDC[0-9A-Z]+$/;
  return regex.test(regNo) || iedcRegex.test(regNo);
}

function validatePhone(phone) {
  const regex = /^[6-9]\d{9}$/;
  return regex.test(phone);
}

async function uploadPhoto(base64, regNo) {
  const result = await cloudinary.uploader.upload(base64, {
    folder: 'makerspace/sessions',
    public_id: `${regNo}_${Date.now()}`,
    resource_type: 'image',
  });
  return result.secure_url;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST' });

    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Firebase not initialized. Check .env.local' });
    }

    const action = (req.body.action || 'checkin').toLowerCase();
    const deviceInfo = req.headers['user-agent'] || null;

    // CHECK-IN
    if (action === 'checkin') {
      const { user_type, name, reg_no, phone, department, year, purpose, photo_base64 } = req.body;

      if (!user_type || !['student', 'staff'].includes(user_type)) {
        return res.status(400).json({ error: 'Invalid user_type' });
      }
      if (!name) return res.status(400).json({ error: 'Missing name' });
      if (!purpose) return res.status(400).json({ error: 'Invalid purpose' });
      // Allow IEDC flow with purpose 'IEDC'
      if (purpose !== 'IEDC' && !PURPOSES.includes(purpose)) {
        return res.status(400).json({ error: 'Invalid purpose' });
      }
      if (!photo_base64) return res.status(400).json({ error: 'Photo is required for check-in' });

      let identifier, identifierField;
      
      if (user_type === 'student') {
        const regNo = normalizeRegNo(reg_no);
        if (!validateRegNo(regNo)) {
          return res.status(400).json({ error: 'Invalid registration number format' });
        }
        identifier = regNo;
        identifierField = 'reg_no';
      } else {
        const cleanPhone = (phone || '').replace(/\s+/g, '');
        if (!validatePhone(cleanPhone)) {
          return res.status(400).json({ error: 'Invalid phone number (10 digits required)' });
        }
        identifier = cleanPhone;
        identifierField = 'phone';
      }

      // Check for existing open session
      const openQuery = await db.collection('sessions')
        .where(identifierField, '==', identifier)
        .where('status', '==', 'open')
        .limit(1)
        .get();

      if (!openQuery.empty) {
        return res.status(400).json({ error: 'You already have an active check-in. Please check out first.' });
      }

      const photoUrl = await uploadPhoto(photo_base64, identifier);

      const sessionData = {
        user_type,
        name,
        purpose,
        check_in_time: admin.firestore.FieldValue.serverTimestamp(),
        check_in_photo_url: photoUrl,
        check_out_time: null,
        duration_minutes: null,
        status: 'open',
        device_info: deviceInfo
      };

      if (user_type === 'student') {
        sessionData.reg_no = identifier;
        sessionData.department = department || null;
        sessionData.year = year || null;
        sessionData.phone = null;
      } else {
        sessionData.phone = identifier;
        sessionData.reg_no = null;
        sessionData.department = null;
        sessionData.year = null;
      }

      const docRef = await db.collection('sessions').add(sessionData);
      return res.json({ ok: true, action: 'checked-in', id: docRef.id });
    }

    // CHECK-OUT
    if (action === 'checkout') {
      const { identifier } = req.body;
      if (!identifier) return res.status(400).json({ error: 'Missing identifier' });

      // Try both reg_no and phone
      const normalized = normalizeRegNo(identifier);
      const isRegNo = validateRegNo(normalized);
      const isPhone = validatePhone(identifier.replace(/\s+/g, ''));

      if (!isRegNo && !isPhone) {
        return res.status(400).json({ error: 'Invalid registration number or phone number' });
      }

      const field = isRegNo ? 'reg_no' : 'phone';
      const value = isRegNo ? normalized : identifier.replace(/\s+/g, '');

      const openQuery = await db.collection('sessions')
        .where(field, '==', value)
        .where('status', '==', 'open')
        .limit(1)
        .get();

      if (openQuery.empty) {
        return res.status(404).json({ error: 'No active check-in found' });
      }

      const doc = openQuery.docs[0];
      const session = doc.data();
      const inMs = session.check_in_time?.toMillis
        ? session.check_in_time.toMillis()
        : (session.check_in_time?.seconds || 0) * 1000;
      const outMs = admin.firestore.Timestamp.now().toMillis();
      const durationMinutes = Math.max(0, Math.round((outMs - inMs) / 60000));

      await doc.ref.update({
        check_out_time: admin.firestore.FieldValue.serverTimestamp(),
        duration_minutes: durationMinutes,
        status: 'closed'
      });

      return res.json({ ok: true, action: 'checked-out', id: doc.id, duration_minutes: durationMinutes });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
}
