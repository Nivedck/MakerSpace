import { proxyJson, badMethod } from './_utils';

export default async function handler(req, res) {
  if (req.method !== 'GET') return badMethod(res);
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id is required' });
  try {
    const { upstream, data } = await proxyJson(req, `/public/verify-member?id=${encodeURIComponent(id)}`);
    return res.status(upstream.ok ? 200 : upstream.status).json(data || { success: false });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Verify failed' });
  }
}
