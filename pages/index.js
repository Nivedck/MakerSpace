import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setUser(null);
    setLoading(true);
    try {
      const cleanId = id.trim().toUpperCase();
      const resp = await fetch(`https://iedclbscekapi.vercel.app/api/users/member?id=${encodeURIComponent(cleanId)}`);
      const data = await resp.json();
      if (!resp.ok || !data || data.success !== true || !data.data) {
        window.location.href = 'https://www.iedclbscek.in/register';
        return;
      }
      setUser(data.data);
    } catch (e) {
      setErr('Could not verify membership. Try again.');
    }
    setLoading(false);
  }

  function proceed() {
    // Save user details for next step
    sessionStorage.setItem('iedc_user', JSON.stringify(user));
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
        </form>
        {user && (
          <div className="card stack">
            <div className="subtitle">Membership Verified</div>
            <div><b>Name:</b> {user.firstName} {user.lastName}</div>
            <div><b>Membership ID:</b> {user.membershipId}</div>
            <div><b>Admission No:</b> {user.admissionNo}</div>
            <div><b>Year of Admission:</b> {user.yearOfJoining}</div>
            <div><b>Department:</b> {user.department}</div>
            <button className="btn btn-primary" onClick={proceed}>Proceed to Photo Capture</button>
          </div>
        )}
      </div>
    </main>
  );
}
