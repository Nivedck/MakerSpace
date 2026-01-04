import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

//const COLLEGE_COORDS = { lat: 12.5041, lng: 75.0808 }; -- LBS Cordinates
const COLLEGE_COORDS = { lat: 12.419475130348673, lng: 75.18879145754411}; // Kodoth (For testing)
const GEOFENCE_RADIUS_M = 100;


function distanceMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function CheckoutLookup() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geoOk, setGeoOk] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [geoPending, setGeoPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!('geolocation' in navigator)) {
      setGeoError('Location is required to check out.');
      setGeoPending(false);
      return () => {};
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const dist = distanceMeters(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          COLLEGE_COORDS
        );
        if (dist <= GEOFENCE_RADIUS_M) {
          setGeoOk(true);
          setGeoError('');
        } else {
          setGeoOk(false);
          setGeoError('You must be on campus to check out.');
        }
        setGeoPending(false);
      },
      (e) => {
        if (cancelled) return;
        setGeoError('Location permission is required to check out.');
        setGeoPending(false);
        console.error('Geolocation error', e);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  async function lookup(e) {
    e.preventDefault();
    if (!geoOk) {
      setErr(geoError || 'Location check failed. Please enable location.');
      return;
    }
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
        {geoPending ? <div className="muted">Checking your location...</div> : !geoOk && geoError && <div className="error">{geoError}</div>}
        
        <div className="footer-actions">
          <button type="submit" className="btn btn-primary" disabled={loading || geoPending || !geoOk}>
            {loading ? 'Searching...' : 'Find My Check-In'}
          </button>
          <Link href="/" className="btn btn-outline">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
