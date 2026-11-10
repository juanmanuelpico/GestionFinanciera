import { cn } from '@/lib/utils'
import { themeColorIds, themeColorOptions, type ThemeColorId } from './theme-colors'
import { useThemeColorStore } from './theme-color-store'

interface ThemeColorSwitcherProps {
  disabled?: boolean
  onChange?: (color: ThemeColorId) => void
}

export function ThemeColorSwitcher({
  disabled = false,
  onChange,
}: ThemeColorSwitcherProps = {}) {
  const color = useThemeColorStore((state) => state.color)
  const setColor = useThemeColorStore((state) => state.setColor)

  return (
    <div
      role="group"
      aria-label="Color del tema"
      className="flex flex-wrap items-center gap-2"
    >
      {themeColorIds.map((id) => {
        const option = themeColorOptions[id]
        const isActive = color === id

        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            aria-label={`Usar color ${option.label}`}
            title={option.label}
            disabled={disabled}
            onClick={() => (onChange ? onChange(id) : setColor(id))}
            className={cn(
              'flex size-11 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none active:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-50',
              isActive ? 'bg-muted' : 'hover:bg-muted/60',
            )}
          >
            <span
              className={cn(
                'size-6 rounded-full border border-black/10 transition-transform dark:border-white/20',
                isActive
                  ? 'scale-110 ring-2 ring-foreground/60'
                  : 'scale-100',
              )}
              style={{ backgroundColor: option.swatch }}
            />
          </button>
        )
      })}
    </div>
  )
}
