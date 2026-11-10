import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '../store'

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const bootstrap = useAuthStore((state) => state.bootstrap)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  return <>{children}</>
}
