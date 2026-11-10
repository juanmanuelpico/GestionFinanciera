import { Moon, Sun, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { themeModeIds, themeModeOptions, type ThemeModeId } from './theme-mode'
import { useThemeModeStore } from './theme-mode-store'

const themeModeIcons: Record<ThemeModeId, LucideIcon> = {
  light: Sun,
  dark: Moon,
}

interface ThemeModeSelectorProps {
  disabled?: boolean
  onChange?: (mode: ThemeModeId) => void
}

export function ThemeModeSelector({
  disabled = false,
  onChange,
}: ThemeModeSelectorProps = {}) {
  const mode = useThemeModeStore((state) => state.mode)
  const setMode = useThemeModeStore((state) => state.setMode)

  return (
    <div
      role="group"
      aria-label="Modo de la aplicación"
      className="grid grid-cols-2 gap-2"
    >
      {themeModeIds.map((id) => {
        const option = themeModeOptions[id]
        const Icon = themeModeIcons[id]
        const isActive = mode === id

        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => (onChange ? onChange(id) : setMode(id))}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-50',
              isActive
                ? 'border-primary bg-accent text-accent-foreground'
                : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="size-4" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
