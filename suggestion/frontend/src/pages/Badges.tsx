import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { badgeApi } from '../lib/api'
import { Search, CheckCircle, ExternalLink, Eye } from 'lucide-react'
import { useToastStore } from '../stores/toastStore'

// Convention name for building external links
const CONVENTION_NAME = 'final-three-con-2026'

interface ColumnVisibility {
  badgeNumber: boolean
  name: boolean
  badgeDisplayName: boolean
  badgeType: boolean
  pronouns: boolean
  discordName: boolean
  shortname: boolean
  status: boolean
}

export default function Badges() {
  const [search, setSearch] = useState('')
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const [checkedInFilter, setCheckedInFilter] = useState<string>('all')
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
    badgeNumber: true,
    name: false,
    badgeDisplayName: true,
    badgeType: true,
    pronouns: false,
    discordName: false,
    shortname: false,
    status: true,
  })
  const queryClient = useQueryClient()
  const { addToast, updateToast, removeToast } = useToastStore()

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }))
  }

  const { data: badges, isLoading } = useQuery({
    queryKey: ['badges', checkedInFilter],
    queryFn: () => {
      const params = checkedInFilter !== 'all'
        ? { checkedIn: checkedInFilter === 'checked-in' ? 'true' : 'false' }
        : undefined
      return badgeApi.getAll(params).then((res) => res.data.data)
    },
  })

  const filteredBadges = badges?.filter((badge: any) => {
    // Handle barcode scanner format: BDG{badge_number}
    const searchUpper = search.toUpperCase()
    const badgeNumberSearch = searchUpper.startsWith('BDG')
      ? searchUpper.slice(3) // Remove "BDG" prefix
      : search

    return badge.name?.toLowerCase().includes(search.toLowerCase()) ||
      badge.badgeDisplayName?.toLowerCase().includes(search.toLowerCase()) ||
      badge.badgeType?.name?.toLowerCase().includes(search.toLowerCase()) ||
      badge.badgeNumber?.toString().includes(badgeNumberSearch) ||
      badge.shortname?.toLowerCase().includes(search.toLowerCase()) ||
      badge.pronouns?.toLowerCase().includes(search.toLowerCase()) ||
      badge.discordName?.toLowerCase().includes(search.toLowerCase())
  })

  const checkInMutation = useMutation({
    mutationFn: ({ badgeId }: { badgeId: string; badgeName: string }) => badgeApi.checkIn(badgeId),
    onMutate: async ({ badgeName }) => {
      const toastId = addToast({
        type: 'loading',
        title: `Checking in ${badgeName}...`,
      })
      return { toastId, badgeName }
    },
    onSuccess: (_data, _variables, context: any) => {
      updateToast(context.toastId, {
        type: 'success',
        title: `Checked in ${context.badgeName}`,
      })
      setTimeout(() => removeToast(context.toastId), 3000)
      queryClient.invalidateQueries({ queryKey: ['badges'], exact: false })
    },
    onError: (error: any, _variables, context: any) => {
      updateToast(context.toastId, {
        type: 'error',
        title: `Failed to check in ${context.badgeName}`,
        message: error.response?.data?.message || error.message,
      })
    },
  })

  const reverseCheckInMutation = useMutation({
    mutationFn: ({ badgeId }: { badgeId: string; badgeName: string }) => badgeApi.reverseCheckIn(badgeId),
    onMutate: async ({ badgeName }) => {
      const toastId = addToast({
        type: 'loading',
        title: `Reversing check-in for ${badgeName}...`,
      })
      return { toastId, badgeName }
    },
    onSuccess: (_data, _variables, context: any) => {
      updateToast(context.toastId, {
        type: 'success',
        title: `Check-in reversed for ${context.badgeName}`,
      })
      setTimeout(() => removeToast(context.toastId), 3000)
      queryClient.invalidateQueries({ queryKey: ['badges'], exact: false })
    },
    onError: (error: any, _variables, context: any) => {
      updateToast(context.toastId, {
        type: 'error',
        title: `Failed to reverse check-in for ${context.badgeName}`,
        message: error.response?.data?.message || error.message,
      })
    },
  })

  const handleCheckIn = (badge: any) => {
    checkInMutation.mutate({
      badgeId: badge.id,
      badgeName: badge.badgeDisplayName || badge.name
    })
  }

  const handleReverseCheckIn = (badge: any) => {
    reverseCheckInMutation.mutate({
      badgeId: badge.id,
      badgeName: badge.badgeDisplayName || badge.name
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Badges</h1>
      </div>

      <div className="card mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search badges..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>

          <div>
            <label htmlFor="checkedInFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Check-In Status
            </label>
            <select
              id="checkedInFilter"
              value={checkedInFilter}
              onChange={(e) => setCheckedInFilter(e.target.value)}
              className="block w-48 py-2 px-3 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="all">All Badges</option>
              <option value="checked-in">Checked In Only</option>
              <option value="not-checked-in">Not Checked In Only</option>
            </select>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Eye className="w-4 h-4 mr-2" />
              Columns
            </button>

            {showColumnMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1" role="menu">
                  <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.badgeNumber}
                      onChange={() => toggleColumn('badgeNumber')}
                      className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    Badge #
                  </label>
                  <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.name}
                      onChange={() => toggleColumn('name')}
                      className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    Name
                  </label>
                  <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.badgeDisplayName}
                      onChange={() => toggleColumn('badgeDisplayName')}
                      className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    Badge Display Name
                  </label>
                  <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.badgeType}
                      onChange={() => toggleColumn('badgeType')}
                      className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    Badge Type
                  </label>
                  <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.pronouns}
                      onChange={() => toggleColumn('pronouns')}
                      className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    Pronouns
                  </label>
                  <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.discordName}
                      onChange={() => toggleColumn('discordName')}
                      className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    Discord Name
                  </label>
                  <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.shortname}
                      onChange={() => toggleColumn('shortname')}
                      className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    Shortname
                  </label>
                  <label className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.status}
                      onChange={() => toggleColumn('status')}
                      className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    Status
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {visibleColumns.badgeNumber && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Badge #
                    </th>
                  )}
                  {visibleColumns.name && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                  )}
                  {visibleColumns.badgeDisplayName && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Badge Display Name
                    </th>
                  )}
                  {visibleColumns.badgeType && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Badge Type
                    </th>
                  )}
                  {visibleColumns.shortname && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shortname
                    </th>
                  )}
                  {visibleColumns.pronouns && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pronouns
                    </th>
                  )}
                  {visibleColumns.discordName && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discord Name
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBadges?.map((badge: any, rowIndex: number) => {
                  const rowBg = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  return (
                    <tr key={badge.id} className={rowBg}>
                      {visibleColumns.badgeNumber && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {badge.badgeNumber}
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {badge.name}
                        </td>
                      )}
                      {visibleColumns.badgeDisplayName && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {badge.badgeDisplayName || '-'}
                        </td>
                      )}
                      {visibleColumns.badgeType && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {badge.badgeType?.name || '-'}
                        </td>
                      )}
                      {visibleColumns.shortname && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {badge.shortname || '-'}
                        </td>
                      )}
                      {visibleColumns.pronouns && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {badge.pronouns || '-'}
                        </td>
                      )}
                      {visibleColumns.discordName && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {badge.discordName || '-'}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {badge.checkedIn ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Checked In
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Not Checked In
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {!badge.checkedIn ? (
                            <button
                              onClick={() => handleCheckIn(badge)}
                              disabled={checkInMutation.isPending}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Check In
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReverseCheckIn(badge)}
                              disabled={reverseCheckInMutation.isPending}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Undo Check-In
                            </button>
                          )}
                          <a
                            href={`https://tabletop.events/conventions/${CONVENTION_NAME}/badges/${badge.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
