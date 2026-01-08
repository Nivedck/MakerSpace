import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import * as faceapi from 'face-api.js';

export default function Capture() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const router = useRouter();
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    const start = async () => {
      try {
        // Load face detection model
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        setModelsLoaded(true);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user', 
            width: { ideal: 640 }, 
            height: { ideal: 480 } 
          },
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

  function compressImage(canvas, quality = 0.65, maxWidth = 800) {
    // Resize if needed
    if (canvas.width > maxWidth) {
      const scale = maxWidth / canvas.width;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = maxWidth;
      tempCanvas.height = canvas.height * scale;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
      return tempCanvas.toDataURL('image/jpeg', quality);
    }
    return canvas.toDataURL('image/jpeg', quality);
  }

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

      // Face detection
      if (!modelsLoaded) {
        setErr('Face detection model loading. Please wait...');
        setLoading(false);
        return;
      }

      const detections = await faceapi.detectAllFaces(
        v,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      );

      if (detections.length === 0) {
        setErr('⚠️ No face detected. Please position your face clearly in the frame and try again.');
        setLoading(false);
        return;
      }

      // Capture canvas
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(v, 0, 0, c.width, c.height);
      
      // Compress and optimize image
      const imageDataUrl = compressImage(c, 0.65, 800);

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
          purpose: user.purpose || 'IEDC',
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
        {(!cameraReady || !modelsLoaded) && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>{!modelsLoaded ? 'Loading face detection...' : 'Starting camera...'}</p>
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
          disabled={!cameraReady || !modelsLoaded || loading}
        >
          {loading ? 'Uploading...' : 'Capture & Submit'}
        </button>
        <Link href="/checkin" className="btn btn-outline">
          Back
        </Link>
      </div>
    </main>
  );
}
