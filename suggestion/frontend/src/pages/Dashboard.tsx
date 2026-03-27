import { useQuery } from '@tanstack/react-query'
import { reportApi, syncApi } from '../lib/api'
import { Users, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { useState, useEffect } from 'react'
import SyncCard from '../components/SyncCard'
import ConfirmDialog from '../components/ConfirmDialog'

type SyncType = 'base-data' | 'event-types' | 'events' | 'badges' | 'tickets' | 'all'

interface ActiveSync {
  type: SyncType
  jobId: string
  toastId: string
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const { addToast, updateToast, removeToast } = useToastStore()

  const [activeSync, setActiveSync] = useState<ActiveSync | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: SyncType | null
    title: string
    message: string
  }>({
    isOpen: false,
    type: null,
    title: '',
    message: '',
  })

  const { data: badgeSummary } = useQuery({
    queryKey: ['badge-summary'],
    queryFn: () => reportApi.badgeSummary().then((res) => res.data.data),
  })

  const { data: lastSyncs, refetch: refetchLastSyncs } = useQuery({
    queryKey: ['last-syncs'],
    queryFn: () => syncApi.getLastSyncs().then((res) => res.data),
    enabled: user?.role === 'admin',
  })

  const { data: syncStatus } = useSyncStatus(
    activeSync?.jobId || null,
    !!activeSync
  )

  // Update toast with sync progress
  useEffect(() => {
    if (!activeSync || !syncStatus) return

    const progress = syncStatus.progress || 0
    const status = syncStatus.status

    updateToast(activeSync.toastId, {
      progress,
      type: status === 'active' || status === 'pending' ? 'loading' :
            status === 'completed' ? 'success' : 'error',
      message: status === 'completed'
        ? `Synced ${syncStatus.recordCount || 0} records`
        : status === 'failed'
        ? syncStatus.error || 'Sync failed'
        : syncStatus.message || 'Syncing...',
    })

    // Cleanup on completion
    if (status === 'completed' || status === 'failed') {
      setTimeout(() => {
        removeToast(activeSync.toastId)
        setActiveSync(null)
        refetchLastSyncs()
      }, 5000)
    }
  }, [syncStatus, activeSync])

  const totalBadges = badgeSummary?.reduce((acc: number, item: any) => acc + item.sold, 0) || 0
  const totalCheckedIn = badgeSummary?.reduce((acc: number, item: any) => acc + item.checkedIn, 0) || 0

  const stats = [
    { name: 'Total Badges Sold', value: totalBadges, icon: Users, color: 'bg-blue-500' },
    { name: 'Checked In', value: totalCheckedIn, icon: CheckCircle, color: 'bg-green-500' },
  ]

  const syncTypes = [
    {
      type: 'base-data' as SyncType,
      title: 'Base Data',
      description: 'Sync rooms, spaces, and dayparts',
      confirmMessage: 'This will refresh all rooms, spaces, and dayparts from the source system.',
    },
    {
      type: 'event-types' as SyncType,
      title: 'Event Types',
      description: 'Sync event types and room mappings',
      confirmMessage: 'This will refresh all event types and their room assignments.',
    },
    {
      type: 'events' as SyncType,
      title: 'Events',
      description: 'Sync all event data',
      confirmMessage: 'This will refresh all event information including schedules and hosts.',
    },
    {
      type: 'badges' as SyncType,
      title: 'Badges',
      description: 'Sync attendee badge data',
      confirmMessage: 'This will refresh all badge and attendee information.',
    },
    {
      type: 'tickets' as SyncType,
      title: 'Tickets',
      description: 'Sync event registrations',
      confirmMessage: 'This will refresh all event ticket and registration data.',
    },
    {
      type: 'all' as SyncType,
      title: 'Sync All',
      description: 'Full sync in correct order',
      confirmMessage: 'This will perform a complete data sync in the correct order: base-data → event-types → events → badges → tickets. This may take several minutes.',
    },
  ]

  const handleSyncClick = (type: SyncType, title: string, message: string) => {
    setConfirmDialog({
      isOpen: true,
      type,
      title: `Sync ${title}?`,
      message,
    })
  }

  const handleConfirmSync = async () => {
    if (!confirmDialog.type) return

    const type = confirmDialog.type
    const syncTypeConfig = syncTypes.find(s => s.type === type)

    try {
      let response
      switch (type) {
        case 'base-data':
          response = await syncApi.triggerBaseData()
          break
        case 'event-types':
          response = await syncApi.triggerEventTypes()
          break
        case 'events':
          response = await syncApi.triggerEvents()
          break
        case 'badges':
          response = await syncApi.triggerBadges()
          break
        case 'tickets':
          response = await syncApi.triggerTickets()
          break
        case 'all':
          response = await syncApi.triggerAll()
          break
      }

      const jobId = response.data.syncJobId
      const toastId = addToast({
        type: 'loading',
        title: `Syncing ${syncTypeConfig?.title}...`,
        progress: 0,
      })

      setActiveSync({ type, jobId, toastId })
    } catch (error: any) {
      addToast({
        type: 'error',
        title: `Failed to start ${syncTypeConfig?.title} sync`,
        message: error.response?.data?.error || error.message,
      })
    }
  }

  const getSyncStatus = (type: SyncType): 'idle' | 'active' => {
    if (activeSync?.type === type) return 'active'
    return 'idle'
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.name} className="card">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${item.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {item.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {user?.role === 'admin' && (
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Data Synchronization</h2>
            <p className="text-sm text-gray-600 mt-1">
              Sync data from the source system to keep information up-to-date
            </p>
          </div>
          <div className="space-y-4">
            {syncTypes.map((sync) => (
              <SyncCard
                key={sync.type}
                syncType={sync.type}
                title={sync.title}
                description={sync.description}
                lastSync={lastSyncs?.[sync.type] || null}
                status={getSyncStatus(sync.type)}
                onSync={() => handleSyncClick(sync.type, sync.title, sync.confirmMessage)}
              />
            ))}
          </div>
        </div>
      )}

      {badgeSummary && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Badge Type Summary</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Badge Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Checked In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {badgeSummary.map((badge: any) => (
                  <tr key={badge.name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {badge.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {badge.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {badge.sold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {badge.checkedIn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {badge.available}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onConfirm={handleConfirmSync}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />
    </div>
  )
}
