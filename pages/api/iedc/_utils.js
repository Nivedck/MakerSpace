const BASE = process.env.IEDC_API_BASE || 'https://api.iedclbscek.in/api';

async function proxyJson(req, path, init = {}) {
  const url = `${BASE}${path}`;
  const headers = {
    Accept: 'application/json',
    ...(init.headers || {}),
  };
  // Default JSON content-type when body is an object
  if (init.body && typeof init.body === 'object' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const resp = await fetch(url, {
    method: init.method || 'GET',
    headers,
    body: init.body && typeof init.body === 'object' ? JSON.stringify(init.body) : init.body,
    cache: 'no-store',
  });

  let data = null;
  try {
    data = await resp.json();
  } catch (_) {
    data = null;
  }
  return { upstream: resp, data };
}

function badMethod(res) {
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export { proxyJson, badMethod };
