import { Database, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SyncCardProps {
  syncType: string
  title: string
  description: string
  lastSync: string | null
  status: 'pending' | 'active' | 'completed' | 'failed' | 'idle'
  onSync: () => void
}

export default function SyncCard({
  title,
  description,
  lastSync,
  status,
  onSync,
}: SyncCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <span className="animate-pulse mr-1">●</span>
            Syncing
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Completed
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            ✗ Failed
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            ⏳ Pending
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Idle
          </span>
        )
    }
  }

  const displayTime = lastSync
    ? formatDistanceToNow(new Date(lastSync), { addSuffix: true })
    : 'Never synced'

  const isDisabled = status === 'active' || status === 'pending'

  return (
    <div className="card flex items-center justify-between">
      <div className="flex items-center flex-1">
        <div className="flex-shrink-0">
          {/* TODO: Replace icon if desired */}
          <Database className="h-8 w-8 text-primary-600" />
        </div>
        <div className="ml-4 flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-gray-600">{description}</p>
          <p className="text-xs text-gray-500 mt-1">
            Last synced: {displayTime}
          </p>
        </div>
      </div>
      <div className="ml-4">
        <button
          onClick={onSync}
          disabled={isDisabled}
          className={`btn btn-primary flex items-center gap-2 ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${status === 'active' ? 'animate-spin' : ''}`} />
          Sync Now
        </button>
      </div>
    </div>
  )
}
