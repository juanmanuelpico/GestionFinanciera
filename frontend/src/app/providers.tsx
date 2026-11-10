import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthBootstrap } from '@/features/auth/components/auth-bootstrap'
import { PreferencesSync } from '@/features/preferences/preferences-sync'
import { queryClient } from '@/lib/query-client'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <PreferencesSync />
        {children}
      </AuthBootstrap>
    </QueryClientProvider>
  )
}
