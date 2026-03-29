import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
    children: ReactNode;
    onError?: (message: string) => void;
    title: string;
    reloadLabel: string;
};

type State = {
    hasError: boolean;
    message: string;
};

export class AppErrorBoundary extends Component<Props, State> {
    state: State = {
        hasError: false,
        message: '',
    };

    static getDerivedStateFromError(error: unknown): State {
        return {
            hasError: true,
            message: error instanceof Error ? error.message : String(error),
        };
    }

    componentDidCatch(error: unknown, info: ErrorInfo) {
        const message = error instanceof Error ? error.message : String(error);
        void info;
        this.props.onError?.(message);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <div className="flex h-screen items-end justify-center bg-ui-bg p-6 text-ui-text">
                <div className="flex max-w-md items-center gap-3 rounded-xl border border-ui-danger-border bg-ui-surface px-4 py-3 shadow-xl">
                    <div className="min-w-0">
                        <p className="text-sm font-medium">{this.props.title}</p>
                        <p className="text-xs text-ui-text-muted">{this.state.message}</p>
                    </div>
                    <button
                        type="button"
                        onClick={this.handleReload}
                        className="shrink-0 rounded-lg border border-ui-border bg-ui-bg px-3 py-1.5 text-xs font-medium hover:bg-ui-surface-hover"
                    >
                        {this.props.reloadLabel}
                    </button>
                </div>
            </div>
        );
    }
}
