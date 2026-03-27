import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../../stores/authStore'

describe('authStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  })

  it('should initialize with default values', () => {
    const { user, token, isAuthenticated } = useAuthStore.getState()

    expect(user).toBeNull()
    expect(token).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('should set auth data', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    }
    const mockToken = 'test-token'

    useAuthStore.getState().setAuth(mockUser, mockToken)

    const { user, token, isAuthenticated } = useAuthStore.getState()

    expect(user).toEqual(mockUser)
    expect(token).toBe(mockToken)
    expect(isAuthenticated).toBe(true)
  })

  it('should logout and clear auth data', () => {
    // First set auth
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    }
    useAuthStore.getState().setAuth(mockUser, 'test-token')

    // Then logout
    useAuthStore.getState().logout()

    const { user, token, isAuthenticated } = useAuthStore.getState()

    expect(user).toBeNull()
    expect(token).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('should update auth when setAuth is called multiple times', () => {
    const user1 = {
      id: 'user-1',
      email: 'user1@example.com',
      name: 'User One',
      role: 'user',
    }
    const user2 = {
      id: 'user-2',
      email: 'user2@example.com',
      name: 'User Two',
      role: 'admin',
    }

    useAuthStore.getState().setAuth(user1, 'token-1')
    expect(useAuthStore.getState().user).toEqual(user1)

    useAuthStore.getState().setAuth(user2, 'token-2')
    expect(useAuthStore.getState().user).toEqual(user2)
    expect(useAuthStore.getState().token).toBe('token-2')
  })
})
