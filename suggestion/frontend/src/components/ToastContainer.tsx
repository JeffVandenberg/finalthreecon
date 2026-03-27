import { useToastStore } from '../stores/toastStore'
import Toast from './Toast'

export default function ToastContainer() {
  const { toasts } = useToastStore()

  return (
    <div className="fixed top-4 right-4 z-50">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
