import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const QrScanner = dynamic(() => import('../lib/components/QrScanner'), {
  ssr: false,
  loading: () => (
    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
      <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
      <p>Loading scanner...</p>
    </div>
  )
});

export default function Checkout() {
  const router = useRouter();
  const [membershipId, setMembershipId] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('id'); // 'id' or 'qr'
  const [scannerKey, setScannerKey] = useState(0);
  const [qrProcessing, setQrProcessing] = useState(false);

  async function lookup(e) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const id = membershipId.trim().toUpperCase();
      const resp = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id }),
      });

      const json = await resp.json();

      if (!resp.ok) {
        setErr(json.error || 'Lookup failed');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('ms_checkout_session', JSON.stringify(json.session));
      router.push('/checkout-confirm');
    } catch (e) {
      setErr(e.message || 'An error occurred');
    }

    setLoading(false);
  }

  async function handleQrScan(decodedText) {
    if (qrProcessing) return;
    setQrProcessing(true);
    setErr(null);

    try {
      // Look up the QR link in the execom sheet to get membership ID
      const lookupResp = await fetch('/api/execom-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrLink: decodedText }),
      });
      const lookupData = await lookupResp.json();

      if (!lookupResp.ok || !lookupData.success) {
        setErr(lookupData.error || 'QR code not recognized');
        setQrProcessing(false);
        setScannerKey(k => k + 1);
        return;
      }

      const id = lookupData.membershipId;

      // Now do checkout lookup with this membership ID
      const resp = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id }),
      });
      const json = await resp.json();

      if (!resp.ok) {
        setErr(json.error || 'No active check-in found for this QR code');
        setQrProcessing(false);
        setScannerKey(k => k + 1);
        return;
      }

      sessionStorage.setItem('ms_checkout_session', JSON.stringify(json.session));
      router.push('/checkout-confirm');
    } catch (e) {
      setErr(e.message || 'An error occurred');
      setScannerKey(k => k + 1);
    }

    setQrProcessing(false);
  }

  return (
    <main className="screen">
      <div>
        <div className="title">Check-Out</div>
        <div className="subtitle">
          {mode === 'id' ? 'Enter your IEDC Membership ID' : 'Scan your IEDC QR Code'}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '4px' }}>
        <button
          className={`tab ${mode === 'id' ? 'active' : ''}`}
          onClick={() => { setMode('id'); setErr(null); }}
        >
          Enter ID
        </button>
        <button
          className={`tab ${mode === 'qr' ? 'active' : ''}`}
          onClick={() => { setMode('qr'); setErr(null); setScannerKey(k => k + 1); }}
        >
          Scan QR
        </button>
      </div>

      {mode === 'id' && (
        <form className="card stack" onSubmit={lookup}>
          <div className="field">
            <label className="label">IEDC Membership ID</label>
            <input
              className="input"
              value={membershipId}
              onChange={(e) => { setMembershipId(e.target.value); setErr(null); }}
              required
              placeholder="e.g., IEDC24IT029"
              maxLength={16}
            />
          </div>

          {loading && (
            <div style={{ marginTop: '8px' }}>
              <div style={{
                width: '100%',
                height: '4px',
                background: 'var(--border)',
                borderRadius: '999px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
                  animation: 'loading-slide 1.5s ease-in-out infinite'
                }} />
              </div>
              <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem', marginTop: '8px' }}>
                Finding your check-in...
              </p>
            </div>
          )}

          {err && <div className="error">{err}</div>}

          <div className="footer-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Searching...' : 'Find My Check-In'}
            </button>
            <Link href="/" className="btn btn-outline">Back</Link>
          </div>
        </form>
      )}

      {mode === 'qr' && (
        <div className="card stack">
          <div className="muted">Point your camera at the QR code on your IEDC membership card</div>

          {qrProcessing ? (
            <div style={{ width: '100%' }}>
              <div style={{
                width: '100%',
                height: '4px',
                background: 'var(--border-soft)',
                borderRadius: '999px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
                  animation: 'loading-slide 1.5s ease-in-out infinite'
                }} />
              </div>
              <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem', marginTop: '8px' }}>
                Looking up your check-in...
              </p>
            </div>
          ) : (
            <QrScanner
              key={scannerKey}
              onScan={handleQrScan}
              onError={(msg) => setErr(msg)}
            />
          )}

          {err && <div className="error">{err}</div>}

          <div className="footer-actions">
            <Link href="/" className="btn btn-outline">Back</Link>
          </div>
        </div>
      )}
    </main>
  );
}
