import { X, CheckCircle, AlertCircle, Info, Loader } from 'lucide-react'
import { useToastStore, Toast as ToastType } from '../stores/toastStore'

interface ToastProps {
  toast: ToastType
}

export default function Toast({ toast }: ToastProps) {
  const { removeToast } = useToastStore()

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'loading':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-500'
      case 'error':
        return 'border-red-500'
      case 'loading':
        return 'border-blue-500'
      default:
        return 'border-blue-500'
    }
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border-l-4 ${getBorderColor()} p-4 mb-4 min-w-[320px] max-w-md animate-slide-in`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900">{toast.title}</p>
          {toast.message && (
            <p className="mt-1 text-sm text-gray-500">{toast.message}</p>
          )}
          {typeof toast.progress === 'number' && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{toast.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${toast.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="ml-4 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
