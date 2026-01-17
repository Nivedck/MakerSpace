// Minimal Firestore Admin helper for Express
const admin = require('firebase-admin');

let initialized = false;

function loadServiceAccount() {
  const v = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!v) return null;
  try { return JSON.parse(v); } catch {}
  try {
    const decoded = Buffer.from(v, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {}
  try {
    const fs = require('fs');
    if (fs.existsSync(v)) {
      return JSON.parse(fs.readFileSync(v, 'utf8'));
    }
  } catch {}
  return null;
}

function initializeFirebase() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return true;
  }
  const sa = loadServiceAccount();
  if (!sa) {
    console.warn('Firebase Admin not initialized (missing/invalid credentials)');
    return false;
  }
  try {
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    });
    initialized = true;
    console.log('Firebase Admin initialized successfully');
    return true;
  } catch (err) {
    console.error('Firebase Admin initialization failed:', err.message);
    return false;
  }
}

initializeFirebase();

function getDb() {
  if (!initialized) initializeFirebase();
  if (!initialized || !admin.apps.length) return null;
  return admin.firestore();
}

module.exports = { admin, getDb };