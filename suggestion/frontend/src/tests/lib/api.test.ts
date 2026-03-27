import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { api, badgeApi, eventApi, ticketApi } from '../../lib/api'

vi.mock('axios')

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('badgeApi', () => {
    it('should call getAll with correct endpoint', async () => {
      const mockData = [{ id: '1', name: 'Badge 1' }]
      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: mockData }),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as any)

      // Since api is already created, we need to mock the instance method
      const mockGet = vi.fn().mockResolvedValue({ data: mockData })
      api.get = mockGet

      await badgeApi.getAll()

      expect(mockGet).toHaveBeenCalledWith('/badges', { params: undefined })
    })

    it('should call getById with badge id', async () => {
      const mockBadge = { id: '1', name: 'Badge 1' }
      const mockGet = vi.fn().mockResolvedValue({ data: mockBadge })
      api.get = mockGet

      await badgeApi.getById('1')

      expect(mockGet).toHaveBeenCalledWith('/badges/1')
    })

    it('should call create with badge data', async () => {
      const badgeData = { name: 'New Badge' }
      const mockPost = vi.fn().mockResolvedValue({ data: badgeData })
      api.post = mockPost

      await badgeApi.create(badgeData)

      expect(mockPost).toHaveBeenCalledWith('/badges', badgeData)
    })

    it('should call checkIn with badge id', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: { success: true } })
      api.post = mockPost

      await badgeApi.checkIn('1')

      expect(mockPost).toHaveBeenCalledWith('/badges/1/check-in')
    })
  })

  describe('eventApi', () => {
    it('should call getAll with query params', async () => {
      const params = { eventTypeId: 'type-1' }
      const mockGet = vi.fn().mockResolvedValue({ data: [] })
      api.get = mockGet

      await eventApi.getAll(params)

      expect(mockGet).toHaveBeenCalledWith('/events', { params })
    })

    it('should call getGrid', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: {} })
      api.get = mockGet

      await eventApi.getGrid()

      expect(mockGet).toHaveBeenCalledWith('/events/grid')
    })

    it('should call delete with event id', async () => {
      const mockDelete = vi.fn().mockResolvedValue({ data: { success: true } })
      api.delete = mockDelete

      await eventApi.delete('event-1')

      expect(mockDelete).toHaveBeenCalledWith('/events/event-1')
    })
  })

  describe('ticketApi', () => {
    it('should create ticket with correct data', async () => {
      const ticketData = { badgeId: 'badge-1', eventId: 'event-1' }
      const mockPost = vi.fn().mockResolvedValue({ data: ticketData })
      api.post = mockPost

      await ticketApi.create(ticketData)

      expect(mockPost).toHaveBeenCalledWith('/tickets', ticketData)
    })

    it('should get tickets by badge id', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: [] })
      api.get = mockGet

      await ticketApi.getByBadge('badge-1')

      expect(mockGet).toHaveBeenCalledWith('/tickets/badge/badge-1')
    })

    it('should get tickets by event id', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: [] })
      api.get = mockGet

      await ticketApi.getByEvent('event-1')

      expect(mockGet).toHaveBeenCalledWith('/tickets/event/event-1')
    })
  })
})
