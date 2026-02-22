import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'

export interface User {
  id: string
  email: string
  name: string
  joinedAt: string
}

interface AuthState {
  user: User | null
  login: (email: string, name?: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (email, name) => {
        set({
          user: {
            id: generateId(),
            email,
            name: name || email.split('@')[0],
            joinedAt: new Date().toISOString(),
          },
        })
      },
      logout: () => set({ user: null }),
    }),
    { name: 'gestion-auth' }
  )
)
