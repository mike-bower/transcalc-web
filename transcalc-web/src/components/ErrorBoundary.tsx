import { Component, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Optional label shown in the error message to identify which calculator failed */
  label?: string
}

type State = { error: Error | null }

/**
 * Error boundary that catches rendering errors in calculator subtrees.
 * Displays a recoverable error message instead of crashing the whole page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary" role="alert" aria-live="assertive">
          <strong>Calculator error{this.props.label ? ` — ${this.props.label}` : ''}</strong>
          <p className="error-boundary-message">{this.state.error.message}</p>
          <button className="export-btn" onClick={this.handleRetry}>
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
