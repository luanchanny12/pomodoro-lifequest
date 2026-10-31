import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-[#0B0D14] text-white flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141722]/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center backdrop-blur-xl">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold mb-2">Đã xảy ra sự cố hiển thị</h2>
            <p className="text-sm text-white/60 mb-6">
              Ứng dụng gặp lỗi tạm thời khi tải thành phần giao diện. Dữ liệu học tập của bạn luôn được bảo vệ an toàn.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 bg-black/40 border border-white/5 rounded-xl text-left text-xs font-mono text-white/50 overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tải lại trang</span>
              </button>

              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-sm font-semibold rounded-xl border border-white/10 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Home className="w-4 h-4" />
                <span>Thử khôi phục</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
