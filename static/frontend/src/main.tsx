import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '16px', fontFamily: 'sans-serif' }}>
          <div style={{
            background: '#FFEBE6', border: '1px solid #DE350B', borderRadius: '6px',
            padding: '12px 16px', color: '#DE350B',
          }}>
            <strong>⚠ App error — please reload</strong>
            <p style={{ marginTop: '6px', fontSize: '12px', wordBreak: 'break-word' }}>
              {this.state.error}
            </p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: '10px', padding: '6px 14px', background: '#0052CC',
              color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
