import { Loader2 } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="text-muted-foreground flex items-center gap-3 text-sm">
        <Loader2 className="size-5 animate-spin" />
        Cargando…
      </div>
    </div>
  )
}
