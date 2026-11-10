import { Navigate, Outlet } from 'react-router-dom'
import { LoadingScreen } from '@/components/layout/loading-screen'
import { useAuthStore } from '@/features/auth/store'

export function PublicRoute() {
  const status = useAuthStore((state) => state.status)

  if (status === 'idle' || status === 'loading') {
    return <LoadingScreen />
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
