const SHEET_ID = '1-0c3MqpKd-N3RUBPIi2EzU2hv2QiK27O8QtxQMyh5IQ';
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

// Server-side cache to avoid hitting Google Sheets on every scan
let cachedRows = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const results = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else if (ch !== '\r') {
        current += ch;
      }
    }
    fields.push(current.trim());
    results.push(fields);
  }
  return results;
}

async function getSheetRows() {
  const now = Date.now();
  if (cachedRows && (now - cacheTime) < CACHE_DURATION) {
    return cachedRows;
  }

  const response = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet data (HTTP ${response.status})`);
  }

  const csvText = await response.text();
  cachedRows = parseCSV(csvText);
  cacheTime = now;
  return cachedRows;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Only POST allowed' });
  }

  const { qrLink } = req.body;
  if (!qrLink || typeof qrLink !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing qrLink' });
  }

  try {
    const rows = await getSheetRows();
    const normalizedInput = qrLink.trim();

    // Skip header row (index 0), search column A for matching link
    for (let i = 1; i < rows.length; i++) {
      const colA = (rows[i][0] || '').trim();
      const colB = (rows[i][1] || '').trim();

      if (colA && colA === normalizedInput) {
        if (!colB) {
          return res.status(404).json({
            success: false,
            error: 'Membership ID not found for this QR code',
          });
        }
        return res.status(200).json({ success: true, membershipId: colB });
      }
    }

    return res.status(404).json({
      success: false,
      error: 'QR code not recognized as Execom member',
    });
  } catch (err) {
    console.error('Execom lookup failed:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error during lookup. Please try again.',
    });
  }
}
