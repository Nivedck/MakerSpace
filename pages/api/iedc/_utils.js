const BASE = process.env.IEDC_API_BASE || 'https://api.iedclbscek.in/api';

async function proxyJson(req, path, options = {}) {
  const url = `${BASE}${path}`;
  const upstream = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });
  const data = await upstream.json().catch(() => null);
  return { upstream, data };
}

function badMethod(res) {
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export { proxyJson, badMethod };
