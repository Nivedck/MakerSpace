/**
 * Local HTTPS server for accessing the Next.js app on your local network.
 * 
 * This is needed because browsers require HTTPS to access camera/microphone
 * on non-localhost origins (e.g., when opening from a mobile on the same WiFi).
 * 
 * Usage:  node server-local.js
 * Then open:  https://192.168.2.143:3443  on your mobile browser.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { parse } = require('url');
const next = require('next');

const dev = true;
const hostname = '0.0.0.0';       // listen on all interfaces
const HTTP_PORT = 3000;
const HTTPS_PORT = 3443;

const app = next({ dev, hostname, port: HTTP_PORT });
const handle = app.getRequestHandler();

// Read the self-signed SSL certificate
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
};

app.prepare().then(() => {
  // HTTP server (for localhost development)
  http.createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`\n  ✅  HTTP  ready → http://localhost:${HTTP_PORT}`);
  });

  // HTTPS server (for mobile / LAN camera access)
  https.createServer(sslOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`  🔒  HTTPS ready → https://192.168.2.143:${HTTPS_PORT}`);
    console.log(`\n  📱  Open the HTTPS URL on your mobile to use the camera.\n`);
    console.log(`  ⚠️  Your browser will show a "Not Secure" warning —`);
    console.log(`      tap "Advanced" → "Proceed" to continue. This is safe`);
    console.log(`      because the certificate is self-signed for your LAN only.\n`);
  });
});
