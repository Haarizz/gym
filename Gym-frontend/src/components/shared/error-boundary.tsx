import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log additional info for date-related errors
    if (error.message.includes('Invalid time value') || error.message.includes('Invalid Date')) {
      console.error('Date parsing error detected. This may be due to invalid date strings in the data.');
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-lg font-semibold mb-4">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">
            An error occurred while loading this page. Please try refreshing or contact support.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Try Again
          </button>
          {this.state.error && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="mt-2 p-4 bg-muted rounded text-sm overflow-auto">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
