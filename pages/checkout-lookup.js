import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function CheckoutLookup() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function lookup(e) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const resp = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const json = await resp.json();

      if (!resp.ok) {
        setErr(json.error || 'Lookup failed');
        setLoading(false);
        return;
      }

      // Store session and navigate to confirm
      sessionStorage.setItem('ms_checkout_session', JSON.stringify(json.session));
      router.push('/checkout-confirm');
    } catch (e) {
      setErr(e.message || 'An error occurred');
      setLoading(false);
    }
  }

  return (
    <main className="screen">
      <div>
        <div className="title">Check-Out</div>
        <div className="subtitle">Enter your registration number or phone</div>
      </div>
      
      <form className="card stack" onSubmit={lookup}>
        <div className="field">
          <label className="label">Registration Number or Phone</label>
          <input 
            className="input" 
            value={identifier} 
            onChange={(e) => { setIdentifier(e.target.value); setErr(null); }}
            required 
            placeholder="KSD24IT051 or 9876543210"
          />
          <small className="muted">Enter your reg no (students) or phone (staff)</small>
        </div>
        
        {err && <div className="error">{err}</div>}
        
        <div className="footer-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Find My Check-In'}
          </button>
          <Link href="/" className="btn btn-outline">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
