import { proxyJson, badMethod } from './_utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return badMethod(res);
  const { email, otp } = req.body || {};
  if (!email || !otp) return res.status(400).json({ success: false, error: 'Email and OTP are required' });
  try {
    const { upstream, data } = await proxyJson(req, '/public/verify-otp', { method: 'POST', body: { email, otp } });
    return res.status(upstream.ok ? 200 : upstream.status).json(data || { success: false });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'OTP verify failed' });
  }
}
