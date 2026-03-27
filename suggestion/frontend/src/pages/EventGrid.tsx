import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventApi } from '../lib/api'
import { format } from 'date-fns'

// Convention name for building external links
const CONVENTION_NAME = 'final-three-con-2026'

// Helper: Calculate how many columns an event should span
const calculateEventSpan = (
  duration: number,
  startIndex: number,
  totalDayparts: number
): number => {
  const daypartDuration = 30 // Assume 30-minute dayparts
  const calculatedSpan = Math.max(1, Math.ceil(duration / daypartDuration))
  const maxSpan = totalDayparts - startIndex
  return Math.min(calculatedSpan, maxSpan)
}

// Helper: Get event for a specific room/daypart combination
const getEventForCell = (
  roomId: string,
  daypartId: string,
  eventMap: Map<string, any[]>
): any | null => {
  const key = `${roomId}-${daypartId}`
  const events = eventMap.get(key) || []
  return events[0] || null
}

// Helper: Get event card color based on GrimNeeded custom field
const getEventCardColor = (event: any): { bg: string; border: string; hoverBorder: string } => {
  const grimNeeded = event.customFields?.GrimNeeded

  if (!grimNeeded || typeof grimNeeded !== 'string') {
    return { bg: 'bg-green-50', border: 'border-green-200', hoverBorder: 'hover:border-green-300' }
  }

  const grimLower = grimNeeded.toLowerCase()

  // Purple: contains both "yes" AND "exp"
  if (grimLower.includes('yes') && grimLower.includes('exp')) {
    return { bg: 'bg-purple-50', border: 'border-purple-200', hoverBorder: 'hover:border-purple-300' }
  }

  // Red: contains "yes" but NOT "exp"
  if (grimLower.includes('yes') && !grimLower.includes('exp')) {
    return { bg: 'bg-red-50', border: 'border-red-200', hoverBorder: 'hover:border-red-300' }
  }

  // Default: green
  return { bg: 'bg-green-50', border: 'border-green-200', hoverBorder: 'hover:border-green-300' }
}

export default function EventGrid() {
  const [selectedEventType, setSelectedEventType] = useState<string>('all')
  const [selectedDay, setSelectedDay] = useState<string>('all')

  const { data: grid, isLoading } = useQuery({
    queryKey: ['event-grid'],
    queryFn: () => eventApi.getGrid().then((res) => res.data.data),
  })

  // Extract unique event types from all events
  const eventTypes = useMemo(() => {
    if (!grid?.events) return []
    const types = new Set<string>()
    grid.events.forEach((event: any) => {
      if (event.eventType?.name) {
        types.add(event.eventType.name)
      }
    })
    return Array.from(types).sort()
  }, [grid?.events])

  // Extract unique days from dayparts
  const days = useMemo(() => {
    if (!grid?.dayparts) return []
    const uniqueDays = new Set<string>()
    grid.dayparts.forEach((daypart: any) => {
      if (daypart.dayName) {
        uniqueDays.add(daypart.dayName)
      }
    })
    return Array.from(uniqueDays)
  }, [grid?.dayparts])

  // Filter rooms by selected event type (based on actual events)
  const filteredRooms = useMemo(() => {
    if (!grid?.rooms || !grid?.events) return []
    if (selectedEventType === 'all') return grid.rooms

    // Find all room IDs that have events of the selected type
    const roomIdsWithEvents = new Set<string>()
    grid.events.forEach((event: any) => {
      if (event.eventType?.name === selectedEventType) {
        roomIdsWithEvents.add(event.roomId)
      }
    })

    // Filter rooms to only those with events of this type
    return grid.rooms.filter((room: any) => roomIdsWithEvents.has(room.id))
  }, [grid?.rooms, grid?.events, selectedEventType])

  // Filter dayparts by selected day
  const filteredDayparts = useMemo(() => {
    if (!grid?.dayparts) return []
    if (selectedDay === 'all') return grid.dayparts

    return grid.dayparts.filter((daypart: any) =>
      daypart.dayName === selectedDay
    )
  }, [grid?.dayparts, selectedDay])

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const { events = [] } = grid || {}

  // Create a map of events by room and daypart
  const eventMap = new Map()
  events.forEach((event: any) => {
    const key = `${event.roomId}-${event.startDaypartId}`
    if (!eventMap.has(key)) {
      eventMap.set(key, [])
    }
    eventMap.get(key).push(event)
  })

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Event Schedule</h1>

      {/* Filters */}
      <div className="mb-4 flex gap-4 flex-wrap">
        <div>
          <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-1">
            Event Type
          </label>
          <select
            id="eventType"
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="block w-48 py-2 px-3 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="all">All Event Types</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="day" className="block text-sm font-medium text-gray-700 mb-1">
            Day
          </label>
          <select
            id="day"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="block w-48 py-2 px-3 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="all">All Days</option>
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scrollable table container */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)]">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="sticky top-0 left-0 z-40 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room / Space
                </th>
                {filteredDayparts.map((daypart: any) => (
                  <th
                    key={daypart.id}
                    className="sticky top-0 z-30 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]"
                  >
                    <div>{daypart.dayName}</div>
                    <div className="text-xs font-normal">
                      {format(new Date(daypart.startDate), 'h:mm a')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredRooms.map((room: any, rowIndex: number) => {
                // Track which dayparts are spanned by events
                const spannedDayparts = new Set<string>()
                const rowBg = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'

                return (
                  <tr key={room.id} className={rowBg}>
                    <td className={`sticky left-0 z-20 ${rowBg} px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200`}>
                      <div>{room.name}</div>
                      <div className="text-xs text-gray-500">{room.space?.name}</div>
                    </td>
                    {filteredDayparts.map((daypart: any, daypartIndex: number) => {
                      // Skip rendering if this cell is spanned by previous event
                      if (spannedDayparts.has(daypart.id)) {
                        return null
                      }

                      // Check if event starts in this daypart
                      const event = getEventForCell(room.id, daypart.id, eventMap)

                      if (event) {
                        // Calculate span for this event
                        const span = calculateEventSpan(
                          event.duration,
                          daypartIndex,
                          filteredDayparts.length
                        )

                        // Mark next (span-1) dayparts as spanned
                        for (let j = 1; j < span; j++) {
                          if (daypartIndex + j < filteredDayparts.length) {
                            spannedDayparts.add(filteredDayparts[daypartIndex + j].id)
                          }
                        }

                        // Render event cell with colspan
                        const colors = getEventCardColor(event)
                        return (
                          <td
                            key={daypart.id}
                            colSpan={span}
                            className="px-3 py-2 text-sm text-gray-500 border-b border-gray-200"
                          >
                            <a
                              href={`https://tabletop.events/conventions/${CONVENTION_NAME}/schedule/${event.eventNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`block h-20 p-2 ${colors.bg} border ${colors.border} rounded text-xs overflow-hidden flex flex-col justify-between hover:shadow-md ${colors.hoverBorder} transition-shadow cursor-pointer`}
                            >
                              <div className="font-medium text-gray-900 truncate" title={event.name}>
                                {event.name}
                              </div>
                              <div className="text-gray-600 truncate" title={event.eventType?.name}>
                                {event.eventType?.name}
                              </div>
                              <div className="text-gray-500">
                                {event.tickets?.length || 0} attendees • {event.duration}min
                              </div>
                            </a>
                          </td>
                        )
                      } else {
                        // Render empty cell
                        return (
                          <td
                            key={daypart.id}
                            className="px-3 py-2 text-sm text-gray-500 border-b border-gray-200"
                          >
                            <div className="text-center text-gray-400">-</div>
                          </td>
                        )
                      }
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
