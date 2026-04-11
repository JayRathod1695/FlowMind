import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
	children: ReactNode
}

interface ErrorBoundaryState {
	hasError: boolean
	message: string
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = {
		hasError: false,
		message: 'An unexpected error occurred.',
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return {
			hasError: true,
			message: error.message || 'An unexpected error occurred.',
		}
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error('Unhandled application error', error, errorInfo)
	}

	handleReload = (): void => {
		window.location.reload()
	}

	render(): ReactNode {
		if (!this.state.hasError) {
			return this.props.children
		}

		return (
			<main className="grid min-h-svh place-items-center bg-background px-4">
				<section className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
					<h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
					<p className="mt-3 text-sm text-muted-foreground">{this.state.message}</p>
					<button
						type="button"
						onClick={this.handleReload}
						className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
					>
						Reload
					</button>
				</section>
			</main>
		)
	}
}

export default ErrorBoundary
