import { useQuery } from '@tanstack/react-query'
import { syncApi } from '../lib/api'

const POLL_INTERVAL = 2500 // 2.5 seconds
const MAX_POLL_DURATION = 300000 // 5 minutes

interface SyncStatus {
  status: 'pending' | 'active' | 'completed' | 'failed'
  progress: number
  message?: string
  recordCount?: number
  error?: string
  metadata?: any
}

export function useSyncStatus(syncJobId: string | null, enabled: boolean) {
  const startTime = Date.now()

  return useQuery<SyncStatus>({
    queryKey: ['sync-status', syncJobId],
    queryFn: async () => {
      if (!syncJobId) throw new Error('No sync job ID')

      const response = await syncApi.getStatus(syncJobId)
      return response.data as SyncStatus
    },
    enabled: enabled && !!syncJobId,
    refetchInterval: (query) => {
      const data = query.state.data
      const elapsed = Date.now() - startTime

      // Stop polling if completed, failed, or timeout
      if (!data) return false
      if (data.status === 'completed' || data.status === 'failed') return false
      if (elapsed > MAX_POLL_DURATION) return false

      return POLL_INTERVAL
    },
    refetchOnWindowFocus: false,
  })
}
