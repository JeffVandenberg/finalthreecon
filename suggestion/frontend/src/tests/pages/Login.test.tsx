import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../utils/test-utils'
import userEvent from '@testing-library/user-event'
import Login from '../../pages/Login'
import { useAuthStore } from '../../stores/authStore'
import * as api from '../../lib/api'

// Mock dependencies
vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../lib/api', () => ({
  authApi: {
    login: vi.fn(),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

describe('Login', () => {
  const mockSetAuth = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: mockSetAuth,
      logout: vi.fn(),
    })
  })

  it('should render login form', () => {
    render(<Login />)

    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should display app title', () => {
    render(<Login />)

    expect(screen.getByText('Final Three Con')).toBeInTheDocument()
    expect(screen.getByText('Convention Management System')).toBeInTheDocument()
  })

  it('should handle successful login', async () => {
    const user = userEvent.setup()
    const mockResponse = {
      data: {
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user',
          },
          token: 'test-token',
        },
      },
    }

    vi.mocked(api.authApi.login).mockResolvedValue(mockResponse)

    render(<Login />)

    await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(api.authApi.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      )
      expect(mockSetAuth).toHaveBeenCalledWith(
        mockResponse.data.data.user,
        mockResponse.data.data.token
      )
    })
  })

  it('should display error message on failed login', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Invalid credentials'

    vi.mocked(api.authApi.login).mockRejectedValue({
      response: {
        data: {
          message: errorMessage,
        },
      },
    })

    render(<Login />)

    await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('should show loading state during login', async () => {
    const user = userEvent.setup()

    vi.mocked(api.authApi.login).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    render(<Login />)

    await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByText('Signing in...')).toBeInTheDocument()
  })

  it('should require email and password fields', () => {
    render(<Login />)

    const emailInput = screen.getByPlaceholderText('Email address')
    const passwordInput = screen.getByPlaceholderText('Password')

    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
  })
})
