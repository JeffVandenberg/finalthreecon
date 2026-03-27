import { AlertCircle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
}

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onCancel}
        />

        {/* Dialog */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-500">{message}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm()
                onCancel()
              }}
              className="btn btn-primary"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
