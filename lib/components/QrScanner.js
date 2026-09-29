import { useEffect, useRef, useState } from 'react';

export default function QrScanner({ onScan, onError }) {
  const [scanning, setScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const scannerRef = useRef(null);
  const mountedRef = useRef(true);
  const hasScannedRef = useRef(false);
  const containerId = useRef('qr-reader-' + Math.random().toString(36).slice(2, 8));

  useEffect(() => {
    mountedRef.current = true;
    hasScannedRef.current = false;

    let html5QrCode = null;
    let startTimeout = null;

    const startScanner = async () => {
      try {
        // Small delay to let DOM settle (prevents crash on re-mount)
        await new Promise(resolve => {
          startTimeout = setTimeout(resolve, 300);
        });
        if (!mountedRef.current) return;

        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mountedRef.current) return;

        // Make sure container exists
        const container = document.getElementById(containerId.current);
        if (!container) {
          console.warn('[QrScanner] Container not found, aborting');
          return;
        }

        html5QrCode = new Html5Qrcode(containerId.current);
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

            // Stop scanner first, then call onScan
            html5QrCode.stop().catch(() => {}).finally(() => {
              if (onScan) onScan(decodedText);
            });
          },
          () => {} // ignore per-frame scan misses
        );

        if (mountedRef.current) setScanning(true);
      } catch (err) {
        console.error('[QrScanner] Error:', err);
        if (mountedRef.current) {
          // Check if it's a permission error vs other error
          const msg = (err?.message || err?.toString() || '').toLowerCase();
          if (msg.includes('permission') || msg.includes('denied') || msg.includes('notallowed')) {
            setPermissionDenied(true);
          }
          if (onError) onError(err.message || 'Failed to start camera');
        }
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;
      if (startTimeout) clearTimeout(startTimeout);

      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        try {
          scanner.stop().catch(() => {});
        } catch (_) {
          // Swallow all errors — the scanner may already be stopped
        }
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
      <div id={containerId.current} style={{ width: '100%' }}></div>
      {!scanning && (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
          <p>Starting camera...</p>
        </div>
      )}
    </div>
  );
}
