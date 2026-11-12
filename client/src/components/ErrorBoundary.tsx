import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('wh40k_11e_active_roster_id');
      localStorage.removeItem('wh40k_11e_play_mode');
    } catch {}
    window.location.reload();
  };

  handleHardReset = () => {
    try {
      localStorage.clear();
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center font-bold text-lg">
                !
              </div>
              <div>
                <h2 className="font-bold text-base">Application Error</h2>
                <p className="text-xs text-slate-400">Something went wrong during rendering</p>
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-red-300 overflow-x-auto whitespace-pre-wrap">
              {this.state.error?.message || 'Unknown error'}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Reload
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold"
              >
                Reset Active List
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

