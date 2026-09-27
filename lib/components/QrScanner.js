import { useEffect, useRef, useState } from 'react';

export default function QrScanner({ onScan, onError }) {
  const [scanning, setScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const scannerRef = useRef(null);
  const mountedRef = useRef(true);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    hasScannedRef.current = false;

    let html5QrCode = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mountedRef.current) return;

        html5QrCode = new Html5Qrcode('qr-reader-container');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;
            if (onScan) onScan(decodedText);
            // Stop scanner after successful scan
            html5QrCode.stop().catch(() => {});
          },
          () => {} // ignore per-frame scan misses
        );

        if (mountedRef.current) setScanning(true);
      } catch (err) {
        console.error('QR Scanner error:', err);
        if (mountedRef.current) {
          setPermissionDenied(true);
          if (onError) onError(err.message || 'Failed to start camera');
        }
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (permissionDenied) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--danger)' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>📷 Camera access denied</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '8px' }}>
          Please allow camera permissions and reload the page.
        </p>
      </div>
    );
  }

  return (
    <div className="qr-scanner-wrapper">
      <div id="qr-reader-container" style={{ width: '100%' }}></div>
      {!scanning && (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
          <p>Starting camera...</p>
        </div>
      )}
    </div>
  );
}
