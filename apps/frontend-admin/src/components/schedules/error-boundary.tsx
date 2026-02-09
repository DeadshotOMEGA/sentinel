import { Component, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from '@/components/ui/AppCard'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ScheduleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <AppCard status="error">
          <AppCardHeader>
            <AppCardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Something went wrong
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent>
            <p className="text-sm text-base-content/60 mb-4">
              {this.state.error?.message ?? 'An unexpected error occurred while loading schedules.'}
            </p>
            <button className="btn btn-outline btn-sm" onClick={this.handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </button>
          </AppCardContent>
        </AppCard>
      )
    }

    return this.props.children
  }
}
