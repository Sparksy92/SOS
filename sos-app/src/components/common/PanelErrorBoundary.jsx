import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default class PanelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ERROR BOUNDARY] Error caught in: ${this.props.name || 'Component'}`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-panel" style={{
          padding: '24px',
          borderColor: 'var(--brand-danger)',
          backgroundColor: 'rgba(255, 0, 0, 0.05)',
          color: 'var(--brand-danger)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontFamily: 'var(--font-mono)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <ShieldAlert size={20} />
            <span>PANEL CRITICAL FAILURE</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            MODULE: {this.props.name?.toUpperCase() || 'UNKNOWN'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', border: '1px solid rgba(255, 0, 0, 0.2)', padding: '10px', backgroundColor: 'rgba(0,0,0,0.5)', overflow: 'auto', whiteSpace: 'pre-wrap', maxHeight: '120px' }}>
            {this.state.error?.toString() || 'Unknown Error'}
          </div>
          <button 
            className="btn-tactical" 
            style={{ alignSelf: 'flex-start', fontSize: '0.75rem', padding: '6px 12px', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)' }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            ATTEMPT PROTOCOL RESTORE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
