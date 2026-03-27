import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventApi, daypartApi } from '../lib/api'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import MultiSelect from '../components/MultiSelect'

type SortColumn = 'name' | 'host' | 'date' | 'type' | 'room'
type SortDirection = 'asc' | 'desc'

// Convention name for building external links
const CONVENTION_NAME = 'final-three-con-2026'

export default function Events() {
  const [search, setSearch] = useState('')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Fetch all events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventApi.getAll().then((res) => res.data.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  // Fetch dayparts for filter dropdown
  const { data: dayparts, isLoading: daypartsLoading } = useQuery({
    queryKey: ['dayparts'],
    queryFn: () => daypartApi.getAll().then((res) => res.data.data),
    staleTime: Infinity, // Dayparts rarely change
  })

  // Group dayparts by dayName for multi-select
  const dayOptions = useMemo(() => {
    if (!dayparts) return []

    // Get unique days and their first daypart ID
    const dayMap = new Map<string, string>()
    dayparts.forEach((d: any) => {
      if (!dayMap.has(d.dayName)) {
        dayMap.set(d.dayName, d.id)
      }
    })

    return Array.from(dayMap.entries()).map(([dayName, id]) => ({
      label: dayName,
      value: id,
    }))
  }, [dayparts])

  // Filter events
  const filteredEvents = useMemo(() => {
    let result = events || []

    // Search filter (event name, host name, event type)
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter((event: any) => {
        // Event name
        const nameMatch = event.name?.toLowerCase().includes(searchLower)

        // Event type
        const typeMatch = event.eventType?.name?.toLowerCase().includes(searchLower)

        // Hosts (JSON array: [{name: "...", badge_id: "..."}])
        const hosts = Array.isArray(event.hosts) ? event.hosts : []
        const hostMatch = hosts.some((host) =>
          host.name?.toLowerCase().includes(searchLower)
        )

        return nameMatch || typeMatch || hostMatch
      })
    }

    // Day filter (multi-select by dayName)
    if (selectedDays.length > 0) {
      result = result.filter((event: any) => {
        if (!event.startDaypart) return false
        // Check if event's day matches any selected day
        return selectedDays.some(selectedDayId => {
          const selectedDay = dayparts?.find((d: any) => d.id === selectedDayId)
          return selectedDay?.dayName === event.startDaypart.dayName
        })
      })
    }

    return result
  }, [events, search, selectedDays, dayparts])

  // Sort events
  const sortedEvents = useMemo(() => {
    const sorted = [...filteredEvents]
    const direction = sortDirection === 'asc' ? 1 : -1

    sorted.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name) * direction

        case 'host': {
          const aHost = Array.isArray(a.hosts) && a.hosts[0]?.name ? a.hosts[0].name : ''
          const bHost = Array.isArray(b.hosts) && b.hosts[0]?.name ? b.hosts[0].name : ''
          return aHost.localeCompare(bHost) * direction
        }

        case 'date': {
          const aDate = a.startDaypart?.startDate ? new Date(a.startDaypart.startDate).getTime() : 0
          const bDate = b.startDaypart?.startDate ? new Date(b.startDaypart.startDate).getTime() : 0
          return (aDate - bDate) * direction
        }

        case 'type': {
          const aType = a.eventType?.name || ''
          const bType = b.eventType?.name || ''
          return aType.localeCompare(bType) * direction
        }

        case 'room': {
          const aRoom = a.room?.name || ''
          const bRoom = b.room?.name || ''
          return aRoom.localeCompare(bRoom) * direction
        }

        default:
          return 0
      }
    })

    return sorted
  }, [filteredEvents, sortBy, sortDirection])

  // Paginate events
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedEvents.slice(startIndex, startIndex + pageSize)
  }, [sortedEvents, currentPage, pageSize])

  const totalPages = Math.ceil(sortedEvents.length / pageSize)

  // Handle sorting
  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDirection('asc')
    }
  }

  // Get sort icon
  const getSortIcon = (column: SortColumn) => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="w-4 h-4 inline ml-1 text-gray-400" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1 text-primary-600" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1 text-primary-600" />
    )
  }

  // Format hosts for display
  const formatHosts = (hosts: any[]) => {
    if (!Array.isArray(hosts) || hosts.length === 0) {
      return <span className="text-gray-400">No hosts</span>
    }

    const names = hosts.map((h) => h.name).filter(Boolean)

    if (names.length === 0) {
      return <span className="text-gray-400">No hosts</span>
    }

    if (names.length <= 2) {
      return names.join(', ')
    }

    // Truncate with tooltip
    return (
      <span title={names.join(', ')}>
        {names.slice(0, 2).join(', ')} <span className="text-gray-500">+{names.length - 2} more</span>
      </span>
    )
  }

  // Format date/time
  const formatDateTime = (daypart: any) => {
    if (!daypart?.startDate) {
      return <span className="text-gray-400">TBD</span>
    }

    try {
      const date = new Date(daypart.startDate)
      return format(date, 'EEE h:mm a') // "Sun 2:00 PM"
    } catch {
      return <span className="text-gray-400">Invalid date</span>
    }
  }

  // Clear filters
  const clearFilters = () => {
    setSearch('')
    setSelectedDays([])
    setCurrentPage(1)
  }

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1) // Reset to first page
  }

  // Pagination helpers
  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, sortedEvents.length)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  // Generate page numbers to show (show 5 at a time)
  const getPageNumbers = () => {
    const pages: number[] = []
    const maxPagesToShow = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return pages
  }

  const isLoading = eventsLoading || daypartsLoading
  const hasFilters = search || selectedDays.length > 0

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex gap-4 items-end flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="search"
                type="text"
                placeholder="Search by event name, host, or type..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1) // Reset to first page on search
                }}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Day Multi-Select */}
          <div className="min-w-[200px]">
            <label htmlFor="dayFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Day
            </label>
            <MultiSelect
              options={dayOptions}
              selected={selectedDays}
              onChange={(days) => {
                setSelectedDays(days)
                setCurrentPage(1) // Reset to first page on filter change
              }}
              placeholder="All days"
            />
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <button onClick={clearFilters} className="btn btn-secondary">
              Clear Filters
            </button>
          )}
        </div>

        {/* Filter Summary */}
        {hasFilters && (
          <div className="mt-3 text-sm text-gray-600">
            Showing {sortedEvents.length} of {events?.length || 0} events
          </div>
        )}
      </div>

      {/* Events Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : sortedEvents.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            {hasFilters ? 'No events match your search or filters.' : 'No events found.'}
          </p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      onClick={() => handleSort('name')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Event Name {getSortIcon('name')}
                    </th>
                    <th
                      onClick={() => handleSort('type')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Type {getSortIcon('type')}
                    </th>
                    <th
                      onClick={() => handleSort('date')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Date/Time {getSortIcon('date')}
                    </th>
                    <th
                      onClick={() => handleSort('room')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Room/Space {getSortIcon('room')}
                    </th>
                    <th
                      onClick={() => handleSort('host')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Hosts {getSortIcon('host')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendees
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedEvents.map((event: any, idx: number) => (
                    <tr key={event.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {event.name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-primary-100 text-primary-800">
                          {event.eventType?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDateTime(event.startDaypart)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {event.room?.name || 'TBD'} / {event.space?.name || 'TBD'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatHosts(event.hosts)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {event.tickets?.length || 0}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <a
                          href={`https://tabletop.events/conventions/${CONVENTION_NAME}/schedule/${event.eventNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary-600 hover:text-primary-700"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
            {/* Showing X-Y of Z */}
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex}</span> to{' '}
              <span className="font-medium">{endIndex}</span> of{' '}
              <span className="font-medium">{sortedEvents.length}</span> events
            </div>

            {/* Page Numbers */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-3 py-1 border rounded-md text-sm font-medium ${
                    currentPage === page
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="pageSize" className="text-sm text-gray-700">
                Show:
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
