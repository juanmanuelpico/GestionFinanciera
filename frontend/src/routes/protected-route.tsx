import { Navigate, Outlet } from 'react-router-dom'
import { LoadingScreen } from '@/components/layout/loading-screen'
import { useAuthStore } from '@/features/auth/store'

export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status)

  if (status === 'idle' || status === 'loading') {
    return <LoadingScreen />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
