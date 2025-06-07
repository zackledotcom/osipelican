import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary specifically for settings-related components
 */
export class SettingsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    });
    
    // Log the error
    console.error('Settings component error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      return this.props.fallback || (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center text-red-600 dark:text-red-400 mb-2">
            <AlertCircle className="w-5 h-5 mr-2" />
            <h3 className="font-medium">Settings Error</h3>
          </div>
          
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">
            {this.state.error?.message || 'An unexpected error occurred in the settings component.'}
          </p>
          
          <button
            onClick={this.handleReset}
            className="flex items-center px-3 py-1.5 text-sm bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-700"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
