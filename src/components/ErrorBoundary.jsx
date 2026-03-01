import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <p className="text-5xl font-bold text-slate-600 mb-4">Oops</p>
          <p className="text-xl text-slate-400 mb-6">Something went wrong.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn-primary bg-gradient-to-r from-cyan-500 to-blue-500"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
