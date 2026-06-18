import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Đã có lỗi xảy ra. Vui lòng thử lại sau.";
      
      try {
        if (this.state.error?.message.startsWith('{')) {
          const errInfo = JSON.parse(this.state.error.message);
          if (errInfo.error?.includes('Missing or insufficient permissions') || errInfo.error?.includes('permission')) {
            errorMessage = "Bạn không có quyền thực hiện thao tác này. Vui lòng đăng nhập với tài khoản quản trị.";
          } else {
            errorMessage = `Lỗi hệ thống: ${errInfo.error || errInfo.message || this.state.error.message}`;
          }
        } else {
          errorMessage = `Lỗi hệ thống: ${this.state.error?.message}`;
        }
      } catch (e) {
        errorMessage = `Lỗi hệ thống: ${this.state.error?.message}`;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4 text-center">
          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Rất tiếc!</h2>
            <p className="text-dark/60 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    const { children } = (this as any).props;
    return children;
  }
}
