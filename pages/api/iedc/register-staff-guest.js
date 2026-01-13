import { proxyJson, badMethod } from './_utils';

const REGISTER_PATH = process.env.IEDC_REGISTER_STAFF_GUEST_PATH || '/public/register-staff-guest';

export default async function handler(req, res) {
  if (req.method !== 'POST') return badMethod(res);
  const { email, otp, otpToken, userType, firstName, lastName, department, organization } = req.body || {};
  const role = (userType || '').toLowerCase();
  if (!email || (!otp && !otpToken) || !role || !firstName || !lastName) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  if (!['staff', 'guest'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid user type' });
  }
  if (role === 'guest' && !organization) {
    return res.status(400).json({ success: false, error: 'Organization is required for guests' });
  }

  const otpToSend = otpToken || otp;
  const orgToSend = role === 'guest' ? organization : undefined;

  try {
    const { upstream, data } = await proxyJson(req, REGISTER_PATH, {
      method: 'POST',
      body: { email, otp: otpToSend, otpToken: otpToken || undefined, userType: role, firstName, lastName, department, organization: orgToSend },
    });
    return res.status(upstream.ok ? 200 : upstream.status).json(data || { success: false });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Registration failed' });
  }
}
