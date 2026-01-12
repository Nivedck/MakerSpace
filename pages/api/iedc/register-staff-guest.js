import { proxyJson, badMethod } from './_utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return badMethod(res);
  const { email, otp, userType, firstName, lastName, department } = req.body || {};
  if (!email || !otp || !userType || !firstName || !lastName) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  try {
    const { upstream, data } = await proxyJson(req, '/public/register-staff-guest', {
      method: 'POST',
      body: { email, otp, userType, firstName, lastName, department },
    });
    return res.status(upstream.ok ? 200 : upstream.status).json(data || { success: false });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Registration failed' });
  }
}
