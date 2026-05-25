'use client';

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

import { ErrorFallback } from './ErrorFallback';

type ErrorBoundaryProps = {
    children: ReactNode;
    fallback?: ReactNode;
    fallbackRender?: (props: { error: Error; reset: () => void }) => ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type ErrorBoundaryState = {
    error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.props.onError?.(error, errorInfo);
    }

    reset = () => {
        this.setState({ error: null });
    };

    render() {
        const { error } = this.state;
        const { children, fallback, fallbackRender } = this.props;

        if (error) {
            if (fallbackRender) {
                return fallbackRender({ error, reset: this.reset });
            }
            if (fallback) {
                return fallback;
            }
            return <ErrorFallback onRetry={this.reset} />;
        }

        return children;
    }
}
