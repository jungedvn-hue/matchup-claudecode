import { Component, type ReactNode, type ErrorInfo } from "react";

interface State { error: Error | null; info: ErrorInfo | null; }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error) {
    return { error, info: null };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[admin] React error:", error, info);
    this.setState({ error, info });
  }
  reset = () => this.setState({ error: null, info: null });

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen p-6 bg-slate-50">
          <div className="max-w-3xl mx-auto bg-white border border-red-300 rounded-lg p-6 space-y-3">
            <h1 className="text-lg font-semibold text-red-700">Something crashed</h1>
            <pre className="text-xs text-red-700 bg-red-50 p-3 rounded overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
            {this.state.info?.componentStack && (
              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer">Component stack</summary>
                <pre className="bg-slate-50 p-3 rounded overflow-auto whitespace-pre-wrap">
                  {this.state.info.componentStack}
                </pre>
              </details>
            )}
            <button onClick={this.reset}
              className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded">
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
