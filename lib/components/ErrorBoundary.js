import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="screen">
          <div className="card stack" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--danger, #ef4444)', display: 'grid', placeItems: 'center'
            }}>
              <span style={{ fontSize: '1.8rem', color: '#fff' }}>!</span>
            </div>
            <div className="title">Something went wrong</div>
            <div className="subtitle">
              {this.state.error?.message || 'An unexpected error occurred'}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--muted, #888)',
              background: 'var(--surface-2, #1a1a2e)',
              padding: '12px',
              borderRadius: '8px',
              maxHeight: '120px',
              overflow: 'auto',
              textAlign: 'left',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap'
            }}>
              {this.state.error?.stack || 'No stack trace available'}
            </div>
            <button
              className="btn btn-primary"
              style={{ maxWidth: 240 }}
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Page
            </button>
            <button
              className="btn btn-outline"
              style={{ maxWidth: 240 }}
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
            >
              Back to Home
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
