import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function CheckIn() {
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [user, setUser] = useState(null);
  const [purpose, setPurpose] = useState('');
  const [stage, setStage] = useState('lookup'); // lookup | details | otp | register
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', department: '', organization: '' });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [registering, setRegistering] = useState(false);
  const router = useRouter();

  const LoadingBar = ({ label }) => (
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
      {label && (
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem', marginTop: '8px' }}>
          {label}
        </p>
      )}
    </div>
  );

  const role = (() => {
    const val = (router.query.role || 'student').toString().toLowerCase();
    return ['student', 'staff', 'guest'].includes(val) ? val : 'student';
  })();

  const isStudent = role === 'student';
  const idPlaceholder = isStudent
    ? 'IEDC Membership ID (e.g., IEDC28CS029)'
    : role === 'staff'
      ? 'IEDC Staff ID (e.g., IEDC26ST005)'
      : 'IEDC Guest ID';

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setUser(null);
    setPurpose('');
    setStage('lookup');
    setOtp('');
    setOtpSent(false);
    setLoading(true);

    try {
      const cleanId = id.trim().toUpperCase();
      if (!cleanId) {
        setErr('Membership ID required');
        setLoading(false);
        return;
      }

      if (isStudent) {
        const resp = await fetch(`/api/iedc-member?id=${encodeURIComponent(cleanId)}`);
        const data = await resp.json();
        if (!resp.ok || !data || data.success !== true || !data.data) {
          window.location.href = 'https://www.iedclbscek.in/register';
          return;
        }
        const member = { ...data.data, membershipId: data.data.membershipId || cleanId, userType: 'student' };
        setUser(member);
        // Show details first; send OTP only when user clicks Continue
        setStage('details');
        setPurpose('');
      } else {
        const verifyResp = await fetch(`/api/iedc/verify-member?id=${encodeURIComponent(cleanId)}`);
        const verifyData = await verifyResp.json();
        if (!verifyResp.ok || !verifyData?.success) {
          setErr('Could not verify member. Try again.');
          setLoading(false);
          return;
        }

        if (verifyData.isRegistered) {
          // Try to fetch details if available
          let member = { membershipId: cleanId, userType: role };
          try {
            const detailResp = await fetch(`/api/iedc-member?id=${encodeURIComponent(cleanId)}`);
            const detailData = await detailResp.json();
            if (detailResp.ok && detailData?.success && detailData.data) {
              member = { ...detailData.data, membershipId: detailData.data.membershipId || cleanId, userType: role };
            }
          } catch (_) {}
          setUser(member);
          setForm(f => ({ ...f, firstName: member.firstName || '', lastName: member.lastName || '', email: member.email || '', department: member.department || '' }));
          setStage('details');
          setPurpose('');
        } else if (verifyData.userType && ['staff', 'guest'].includes(verifyData.userType)) {
          setStage('register');
          setErr('Not registered yet. Complete the form and verify via email OTP.');
        } else {
          setErr('ID not recognized for this role. Please check the ID or register.');
        }
      }
    } catch (e) {
      setErr('Could not verify membership. Try again.');
    }

    setLoading(false);
  }

  function startRegister() {
    setErr('');
    setUser(null);
    setPurpose('');
    setOtp('');
    setOtpSent(false);
    setOtpVerified(false);
    setOtpToken('');
    setStage('register');
  }

  async function sendOtp(identifier) {
    setErr('');
    setOtpVerified(false);
    setOtpToken('');
    const payload = {};
    // identifier can be email or membershipId; fallback to form.email or user.membershipId
    if (typeof identifier === 'string' && identifier.trim()) {
      const idClean = identifier.trim();
      if (idClean.toUpperCase().startsWith('IEDC')) payload.membershipId = idClean;
      else payload.email = idClean;
    } else if (form.email && form.email.trim()) {
      payload.email = form.email.trim();
    } else if (user?.membershipId) {
      payload.membershipId = user.membershipId;
    } else {
      setErr('Email or membership ID is required to send OTP');
      return;
    }

    setOtpSending(true);
    try {
      const resp = await fetch('/api/iedc/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) {
        setErr(data?.error || 'Failed to send OTP');
        setOtpSending(false);
        return;
      }
      setOtpSent(true);
    } catch (e) {
      setErr('Failed to send OTP');
    }
    setOtpSending(false);
  }

  async function verifyOtp() {
    setErr('');
    if (!otp.trim()) {
      setErr('Enter the OTP');
      return;
    }
    setRegistering(true);
    try {
      const payload = { otp: otp.trim() };
      // For membership lookup flow, we always verify by membershipId.
      if (stage === 'otp' && user?.membershipId) payload.membershipId = user.membershipId;
      else if (form.email && form.email.trim()) payload.email = form.email.trim();
      else if (user?.membershipId) payload.membershipId = user.membershipId;
      else {
        setErr('Email or membership ID is required to verify OTP');
        setRegistering(false);
        return;
      }

      const resp = await fetch('/api/iedc/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) {
        setErr(data?.error || 'Invalid or expired OTP');
        setRegistering(false);
        return;
      }
      setOtpVerified(true);
      setOtpToken(data?.otpToken || '');
      setErr('');
      // Auto-proceed to capture for check-in flow
      if (stage === 'otp') {
        const payload = {
          ...user,
          membershipId: user?.membershipId,
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: '',
          department: user?.department || '',
          organization: user?.organization || '',
          purpose,
          role,
        };
        sessionStorage.setItem('iedc_user', JSON.stringify(payload));
        router.push('/capture');
        return;
      }
    } catch (e) {
      setErr('Failed to verify OTP. Try again.');
    }
    setRegistering(false);
  }

  async function continueToOtp() {
    setErr('');
    if (!purpose) {
      setErr('Purpose is required');
      return;
    }
    if (!user?.membershipId) {
      setErr('Membership ID missing. Please restart check-in.');
      return;
    }

    // Reset OTP state for a clean start
    setOtp('');
    setOtpSent(false);
    setOtpVerified(false);
    setOtpToken('');

    await sendOtp(user.membershipId);
    // Move to OTP entry stage after user action
    setStage('otp');
  }

  async function registerStaffGuest() {
    setErr('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setErr('First and last name are required');
      return;
    }
    if (!form.email.trim()) {
      setErr('Email is required');
      return;
    }
    if (role === 'guest' && !form.organization.trim()) {
      setErr('Organization is required for guests');
      return;
    }
    if (!otp.trim()) {
      setErr('Enter the OTP sent to your email');
      return;
    }
    if (!otpVerified) {
      setErr('Please verify the OTP first.');
      return;
    }
    const tokenToSend = otpToken || otp.trim();
    setRegistering(true);
    try {
      const resp = await fetch('/api/iedc/register-staff-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          otpToken: tokenToSend,
          otp: tokenToSend,
          userType: role,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          department: role === 'staff' ? (form.department.trim() || undefined) : undefined,
          organization: role === 'guest' ? form.organization.trim() : undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) {
        setErr(data?.error || 'Registration failed');
        setRegistering(false);
        return;
      }
      const membershipId = data.membershipId || data.accessCode;
      if (!membershipId) {
        setErr('Registration succeeded but no membership ID returned');
        setRegistering(false);
        return;
      }
      const newUser = {
        membershipId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        department: role === 'staff' ? form.department.trim() : '',
        organization: role === 'guest' ? form.organization.trim() : '',
        email: form.email.trim(),
        userType: role,
      };
      setUser(newUser);
      setErr('');
      // Redirect back to role-specific login/check-in page only on success
      router.push(`/checkin?role=${role}`);
      return;
    } catch (e) {
      setErr('Registration failed. Try again.');
    }
    setRegistering(false);
  }

  function proceed() {
    if (!purpose) {
      setErr('Purpose is required');
      return;
    }

    if (!user?.membershipId) {
      setErr('Membership ID missing. Please restart check-in.');
      return;
    }

    const finalFirst = user?.firstName || form.firstName?.trim();
    const finalLast = user?.lastName || form.lastName?.trim();
    const finalEmail = user?.email || form.email?.trim();
    if (!isStudent && (!finalFirst || !finalLast || !finalEmail)) {
      setErr('Name and email are required for staff/guest');
      return;
    }

    const payload = {
      ...user,
      membershipId: user?.membershipId,
      firstName: finalFirst || user?.firstName,
      lastName: finalLast || user?.lastName,
      email: finalEmail || user?.email,
      department: user?.department || form.department || '',
      purpose,
      role,
    };

    sessionStorage.setItem('iedc_user', JSON.stringify(payload));
    router.push('/capture');
  }

  function resetFlow() {
    setUser(null);
    setPurpose('');
    setStage('lookup');
    setErr('');
    setOtp('');
    setOtpSent(false);
    setOtpVerified(false);
    setOtpToken('');
  }

  const showDetails = stage === 'details' && user;
  const needsNameEmail = !isStudent;

  return (
    <main className="screen">
      <div className="stack">
        <div>
          <div className="title">IEDC Makerspace Check-In</div>
          <div className="subtitle">Verify your ID and continue</div>
          <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '999px', background: 'var(--surface-2)', color: 'var(--text)' }}>
            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{role}</span>
            <Link href="/checkin-role" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600 }}>Change</Link>
          </div>
        </div>

        {stage === 'lookup' && (
          <form className="card stack" onSubmit={handleSubmit}>
            <input
              className="input"
              placeholder={idPlaceholder}
              value={id}
              onChange={e => setId(e.target.value)}
              required
              maxLength={16}
              disabled={!!user || loading}
              autoFocus
            />

            {loading && (
              <div style={{ marginTop: '8px' }}>
                <LoadingBar label="Verifying membership..." />
              </div>
            )}

            {err && <div className="error">{err}</div>}

            {!user && (
              <button className="btn btn-primary" type="submit" disabled={loading || !id.trim()}>
                {loading ? 'Checking...' : 'Continue'}
              </button>
            )}

            {!user && (
              <>
                <Link href="/checkin-role" className="btn btn-outline">Back</Link>
                {isStudent && (
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
                )}
                {!isStudent && (
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <button 
                      type="button" 
                      onClick={startRegister}
                      style={{ background:'transparent', border:'none', color:'var(--primary)', fontSize: '0.9rem', fontWeight: 600, cursor:'pointer', padding:0 }}
                    >
                      Not registered? Register here →
                    </button>
                  </div>
                )}
              </>
            )}
          </form>
        )}

        {stage === 'register' && (
          <div className="card stack">
            <div className="subtitle">Register as {role}</div>
            <div className="grid2">
              <div className="field">
                <label className="label">First Name</label>
                <input className="input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">Last Name</label>
                <input className="input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label className="label">Email (for OTP)</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            {role === 'staff' && (
              <div className="field">
                <label className="label">Department</label>
                <input className="input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
              </div>
            )}
            {role === 'guest' && (
              <div className="field">
                <label className="label">Organization (required for guests)</label>
                <input className="input" value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} />
              </div>
            )}

            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="btn btn-outline" onClick={sendOtp} disabled={otpSending}>
                {otpSending ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
              {otpSent && <span className="muted">OTP sent to {form.email}</span>}
            </div>

            <div className="row" style={{ gap: '10px' }}>
              <input
                className="input"
                placeholder="Enter OTP"
                value={otp}
                onChange={e => { setOtp(e.target.value); setOtpVerified(false); }}
                maxLength={6}
                required
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={verifyOtp}
                disabled={registering || !otp.trim() || !(form.email.trim() || user?.membershipId)}
              >
                {registering ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
            {(otpSending || registering) && (
              <LoadingBar label={otpSending ? 'Sending OTP...' : otpVerified ? 'Submitting registration...' : 'Verifying OTP...'} />
            )}
            {otpSent && !registering && (
              <small style={{ color: otpVerified ? 'var(--primary)' : 'var(--muted)', fontWeight: 600 }}>
                {otpVerified ? 'OTP verified ✓' : 'OTP sent. Enter and verify.'}
              </small>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={registerStaffGuest}
              disabled={registering || !otpVerified}
            >
              {registering ? 'Submitting...' : 'Register & Continue'}
            </button>

            {err && <div className="error">{err}</div>}

            <div className="footer-actions">
              <Link href="/checkin-role" className="btn btn-outline">Cancel</Link>
            </div>
          </div>
        )}

        {stage === 'otp' && (
          <div className="card stack">
            <div className="subtitle">OTP Verification</div>
            <div className="muted">OTP was sent to your registered email. Enter and verify it.</div>

            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="btn btn-outline" onClick={() => sendOtp(user?.membershipId)} disabled={otpSending}>
                {otpSending ? 'Sending...' : otpSent ? 'Resend OTP' : 'Resend OTP'}
              </button>
              {otpSent && <span className="muted">OTP sent</span>}
            </div>

            <div className="row" style={{ gap: '10px' }}>
              <input
                className="input"
                placeholder="Enter OTP"
                value={otp}
                onChange={e => { setOtp(e.target.value); setOtpVerified(false); }}
                maxLength={6}
              />
              <button type="button" className="btn btn-primary" onClick={verifyOtp} disabled={registering || !otp.trim()}>
                {registering ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>

            {(otpSending || registering) && <LoadingBar label={otpSending ? 'Sending OTP...' : 'Verifying OTP...'} />}
            {err && <div className="error">{err}</div>}

            <div className="footer-actions">
              <button className="btn btn-outline" type="button" onClick={resetFlow}>Start Over</button>
            </div>
          </div>
        )}

        {showDetails && (
          <div className="card stack">
            <div className="subtitle">Membership Details</div>
            <div><b>Name:</b> {(user.firstName || form.firstName) || '—'} {(user.lastName || form.lastName) || ''}</div>
            <div><b>Membership ID:</b> {user.membershipId}</div>
            {isStudent && (
              <>
                <div><b>Admission No:</b> {user.admissionNo}</div>
                <div><b>Year of Admission:</b> {user.yearOfJoining}</div>
              </>
            )}
            {role === 'staff' && (
              <div><b>Department:</b> {user.department || form.department || '—'}</div>
            )}
            {role === 'guest' && (
              <div><b>Organization:</b> {user.organization || form.organization || '—'}</div>
            )}
            {!isStudent && (
              <div><b>Email:</b> {user.email || form.email || '—'}</div>
            )}

            {!isStudent && (
              <div className="grid2">
                <div className="field">
                  <label className="label">First Name</label>
                  <input className="input" value={user.firstName || form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label">Last Name</label>
                  <input className="input" value={user.lastName || form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label">Email</label>
                  <input className="input" type="email" value={user.email || form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                {role === 'staff' && (
                  <div className="field">
                    <label className="label">Department </label>
                    <input className="input" value={user.department || form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                  </div>
                )}
                {role === 'guest' && (
                  <div className="field">
                    <label className="label">Organization</label>
                    <input className="input" value={user.organization || form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} />
                  </div>
                )}
              </div>
            )}

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
              <button className="btn btn-primary" onClick={continueToOtp} disabled={!purpose || otpSending}>Continue</button>
              <button className="btn btn-outline" onClick={resetFlow}>Start Over</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
