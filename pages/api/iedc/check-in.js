import { proxyJson, badMethod } from './_utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return badMethod(res);
  const { membershipId } = req.body || {};
  if (!membershipId) return res.status(400).json({ success: false, error: 'membershipId is required' });
  try {
    const { upstream, data } = await proxyJson(req, '/public/check-in', {
      method: 'POST',
      body: { membershipId },
    });
    return res.status(upstream.ok ? 200 : upstream.status).json(data || { success: false });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Check-in failed' });
  }
}
