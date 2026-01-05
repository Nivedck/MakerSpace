import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Capture() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const router = useRouter();
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      } catch (e) {
        setErr('Camera access denied. Please allow camera permission.');
        console.error(e);
      }
    };
    start();
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  async function take() {
    try {
      setErr(null);
      setLoading(true);

      const user = JSON.parse(sessionStorage.getItem('iedc_user') || '{}');
      if (!user.membershipId || !user.firstName) {
        setErr('User details missing. Go back and retry.');
        setLoading(false);
        return;
      }

      const v = videoRef.current;
      const c = canvasRef.current;
      
      if (!v || !v.videoWidth) {
        setErr('Camera not ready. Wait a moment and try again.');
        setLoading(false);
        return;
      }

      // Capture canvas
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const imageDataUrl = c.toDataURL('image/jpeg', 0.8);

      // Submit to API
      const resp = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkin',
          user_type: 'student',
          name: `${user.firstName} ${user.lastName || ''}`.trim(),
          reg_no: user.membershipId,
          phone: '',
          department: user.department || '',
          year: user.yearOfJoining || '',
          purpose: 'IEDC',
          photo_base64: imageDataUrl,
        }),
      });

      const json = await resp.json();

      if (!resp.ok) {
        setErr(json.error || 'Upload failed');
        setLoading(false);
        return;
      }

      // Success
      sessionStorage.removeItem('iedc_user');
      router.push(`/success?id=${json.id}`);
    } catch (e) {
      setErr(e.message || 'An error occurred');
      console.error(e);
      setLoading(false);
    }
  }

  return (
    <main className="screen">
      <div className="header">
        <div className="title">Capture Photo</div>
        <div className="subtitle">Photo is mandatory for check-in</div>
      </div>

      {err && <div className="error card">{err}</div>}

      <div className="card camera-container">
        {!cameraReady && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Starting camera...</p>
          </div>
        )}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="video"
          onLoadedMetadata={() => setCameraReady(true)}
        />
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="footer-actions">
        <button 
          onClick={take} 
          className="btn btn-primary"
          disabled={!cameraReady || loading}
        >
          {loading ? 'Uploading...' : 'Capture & Submit'}
        </button>
        <Link href="/" className="btn btn-outline">
          Back
        </Link>
      </div>
    </main>
  );
}
