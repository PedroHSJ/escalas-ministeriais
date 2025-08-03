import { renderHook } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'

// Mock do Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(),
    signOut: jest.fn(),
  }
}

jest.mock('@/lib/supabaseClient', () => ({
  supabase: mockSupabase
}))

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('deve retornar estado inicial correto', () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  test('deve chamar getUser na inicialização', () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })

    renderHook(() => useAuth())

    expect(mockSupabase.auth.getUser).toHaveBeenCalled()
  })

  test('deve configurar listener de mudança de estado de auth', () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })

    renderHook(() => useAuth())

    expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
  })

  test('deve fornecer função de signOut', () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })

    mockSupabase.auth.signOut.mockResolvedValue({
      error: null
    })

    const { result } = renderHook(() => useAuth())

    expect(typeof result.current.signOut).toBe('function')
  })

  test('deve chamar signOut do Supabase quando signOut é executado', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })

    mockSupabase.auth.signOut.mockResolvedValue({
      error: null
    })

    const { result } = renderHook(() => useAuth())

    await result.current.signOut()

    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })
})
