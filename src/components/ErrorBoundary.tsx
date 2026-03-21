import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🛠️ [Anti-Regression] Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4 text-center">
          <div className="bg-rose-950/50 border border-rose-900 p-8 rounded-3xl max-w-md w-full">
            <h1 className="text-2xl font-black uppercase tracking-tight text-rose-500 mb-4">Something went wrong</h1>
            <p className="text-slate-400 mb-8 font-medium">A critical error occurred. Please refresh the application to continue.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase tracking-widest text-sm transition-colors"
            >
              Refresh Application
            </button>
            {this.state.error && (
              <div className="mt-8 p-4 bg-black/50 rounded-xl text-left overflow-auto max-h-48">
                <p className="text-rose-400 font-mono text-[10px] whitespace-pre-wrap">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
