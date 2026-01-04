import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

function formatElapsed(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}

export default function CheckoutConfirm() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const data = sessionStorage.getItem('ms_checkout_session');
    if (!data) {
      router.push('/checkout-lookup');
      return;
    }
    setSession(JSON.parse(data));
  }, [router]);

  async function confirmCheckout() {
    if (!session) return;
    setErr(null);
    setLoading(true);

    try {
      const identifier = session.reg_no || session.phone;
      const resp = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkout', identifier }),
      });

      const json = await resp.json();

      if (!resp.ok) {
        setErr(json.error || 'Checkout failed');
        setLoading(false);
        return;
      }

      sessionStorage.removeItem('ms_checkout_session');
      router.push(`/success?id=${json.id}&duration=${json.duration_minutes}`);
    } catch (e) {
      setErr(e.message || 'An error occurred');
      setLoading(false);
    }
  }

  if (!session) return null;

  return (
    <main className="screen">
      <div>
        <div className="title">Confirm Check-Out</div>
        <div className="subtitle">Review your session details</div>
      </div>

      <div className="card stack">
        <div className="row">
          <span className="label">Name</span>
          <strong>{session.name}</strong>
        </div>
        
        {session.user_type === 'student' ? (
          <>
            <div className="row">
              <span className="label">Reg No</span>
              <span>{session.reg_no}</span>
            </div>
            {session.department && (
              <div className="row">
                <span className="label">Department</span>
                <span>{session.department}</span>
              </div>
            )}
            {session.year && (
              <div className="row">
                <span className="label">Year</span>
                <span>{session.year}</span>
              </div>
            )}
          </>
        ) : (
          <div className="row">
            <span className="label">Phone</span>
            <span>{session.phone}</span>
          </div>
        )}
        
        <div className="row">
          <span className="label">Purpose</span>
          <span className="chip">{session.purpose}</span>
        </div>
        
        <div className="row">
          <span className="label">Time Elapsed</span>
          <strong>{formatElapsed(session.elapsed_minutes)}</strong>
        </div>

        {session.check_in_photo_url && (
          <div>
            <span className="label">Check-In Photo</span>
            <img 
              src={session.check_in_photo_url} 
              alt="Check-in" 
              style={{width:'100%', borderRadius:'10px', marginTop:'8px'}}
            />
          </div>
        )}
      </div>

      {err && <div className="error card">{err}</div>}

      <div className="footer-actions">
        <button onClick={confirmCheckout} className="btn btn-primary" disabled={loading}>
          {loading ? 'Processing...' : 'Confirm Check-Out'}
        </button>
        <Link href="/checkout-lookup" className="btn btn-outline">Back</Link>
      </div>
    </main>
  );
}
