import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../utils/test-utils'
import Layout from '../../components/Layout'
import { useAuthStore } from '../../stores/authStore'

// Mock the auth store
vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render navigation links', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      },
      token: 'token',
      isAuthenticated: true,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    render(<Layout />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Badges')).toBeInTheDocument()
    expect(screen.getByText('Events')).toBeInTheDocument()
    expect(screen.getByText('Schedule')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
  })

  it('should display user name', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      },
      token: 'token',
      isAuthenticated: true,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    render(<Layout />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should call logout when logout button is clicked', async () => {
    const mockLogout = vi.fn()

    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      },
      token: 'token',
      isAuthenticated: true,
      setAuth: vi.fn(),
      logout: mockLogout,
    })

    render(<Layout />)

    const logoutButton = screen.getByRole('button', { name: /logout/i })
    logoutButton.click()

    expect(mockLogout).toHaveBeenCalled()
  })

  it('should render app title', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      },
      token: 'token',
      isAuthenticated: true,
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    render(<Layout />)

    expect(screen.getByText('Final Three Con')).toBeInTheDocument()
  })
})
