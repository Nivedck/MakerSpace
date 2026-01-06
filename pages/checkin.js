import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function CheckIn() {
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null);
  const [purpose, setPurpose] = useState('');
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setUser(null);
    setLoading(true);

    try {
      const cleanId = id.trim().toUpperCase();
      const resp = await fetch(`/api/iedc-member?id=${encodeURIComponent(cleanId)}`);
      const data = await resp.json();

      if (!resp.ok || !data || data.success !== true || !data.data) {
        window.location.href = 'https://www.iedclbscek.in/register';
        return;
      }

      setUser(data.data);
      setPurpose('');
    } catch (e) {
      setErr('Could not verify membership. Try again.');
    }

    setLoading(false);
  }

  function proceed() {
    if (!purpose) {
      setErr('Purpose is required');
      return;
    }
    sessionStorage.setItem('iedc_user', JSON.stringify({ ...user, purpose }));
    router.push('/capture');
  }

  return (
    <main className="screen">
      <div className="stack">
        <div>
          <div className="title">IEDC Makerspace Check-In</div>
          <div className="subtitle">Enter your IEDC Membership ID to continue</div>
        </div>

        <form className="card stack" onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="IEDC Membership ID (e.g., IEDC24IT029)"
            value={id}
            onChange={e => setId(e.target.value)}
            required
            maxLength={16}
            disabled={!!user || loading}
            autoFocus
          />

          {err && <div className="error">{err}</div>}

          {!user && (
            <button className="btn btn-primary" type="submit" disabled={loading || !id.trim()}>
              {loading ? 'Checking...' : 'Continue'}
            </button>
          )}

          {!user && (
            <>
              <Link href="/" className="btn btn-outline">Back</Link>
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <a 
                  href="https://www.iedclbscek.in/register" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', fontSize: '0.9rem', textDecoration: 'none', fontWeight: '500' }}
                >
                  Not registered? Sign up here →
                </a>
              </div>
            </>
          )}
        </form>

        {user && (
          <div className="card stack">
            <div className="subtitle">Membership Verified</div>
            <div><b>Name:</b> {user.firstName} {user.lastName}</div>
            <div><b>Membership ID:</b> {user.membershipId}</div>
            <div><b>Admission No:</b> {user.admissionNo}</div>
            <div><b>Year of Admission:</b> {user.yearOfJoining}</div>
            <div><b>Department:</b> {user.department}</div>

            <div className="field">
              <label className="label">Purpose</label>
              <select className="select" value={purpose} onChange={e => setPurpose(e.target.value)} required>
                <option value="" disabled>Select purpose</option>
                <option value="Project Work">Project Work</option>
                <option value="Workshop">Workshop</option>
                <option value="Event">Event</option>
                <option value="Mentoring">Mentoring</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {err && <div className="error">{err}</div>}

            <div className="footer-actions">
              <button className="btn btn-primary" onClick={proceed} disabled={!purpose}>Proceed to Photo Capture</button>
              <Link href="/" className="btn btn-outline">Cancel</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
