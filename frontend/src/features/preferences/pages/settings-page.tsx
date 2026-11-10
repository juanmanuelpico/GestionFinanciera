import { useState } from 'react'
import { getApiErrorMessage } from '@/lib/errors'
import { DashboardSettingsCard } from '../dashboard-settings-card'
import { PaymentMethodsSettingsCard } from '../payment-methods-settings-card'
import { SavingsSettingsCard } from '../savings-settings-card'
import { updatePreferences } from '../preferences-api'
import { ThemeColorSwitcher } from '../theme-color-switcher'
import { useThemeColorStore } from '../theme-color-store'
import { ThemeModeSelector } from '../theme-mode-selector'
import { useThemeModeStore } from '../theme-mode-store'
import { SettingsSection } from '../settings-section'
import type { ThemeColorId } from '../theme-colors'
import type { ThemeModeId } from '../theme-mode'

export function SettingsPage() {
  const color = useThemeColorStore((state) => state.color)
  const setColor = useThemeColorStore((state) => state.setColor)
  const mode = useThemeModeStore((state) => state.mode)
  const setMode = useThemeModeStore((state) => state.setMode)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveColor = async (nextColor: ThemeColorId) => {
    const previousColor = color
    setColor(nextColor)
    setError(null)
    setIsSaving(true)

    try {
      await updatePreferences({ themeColor: nextColor })
    } catch (saveError) {
      setColor(previousColor)
      setError(getApiErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  const saveMode = async (nextMode: ThemeModeId) => {
    const previousMode = mode
    setMode(nextMode)
    setError(null)
    setIsSaving(true)

    try {
      await updatePreferences({ themeMode: nextMode })
    } catch (saveError) {
      setMode(previousMode)
      setError(getApiErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Personalizá la aplicación según tus preferencias.
        </p>
      </div>

      <SettingsSection
        titleId="vista-title"
        title="Vista"
        description="Elegí el color del tema y el modo de la aplicación."
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Color del tema</p>
              <p className="text-muted-foreground text-xs">
                Se aplica a botones, enlaces y estados activos.
              </p>
            </div>
            <ThemeColorSwitcher disabled={isSaving} onChange={saveColor} />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Modo</p>
              <p className="text-muted-foreground text-xs">
                Claro para fondos blancos u oscuro para reducir el brillo.
              </p>
            </div>
            <ThemeModeSelector disabled={isSaving} onChange={saveMode} />
          </div>

          <div aria-live="polite">
            {isSaving && (
              <p className="text-muted-foreground text-sm">Guardando…</p>
            )}
            {error && (
              <p className="text-destructive text-sm break-words" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </SettingsSection>

      <SavingsSettingsCard />

      <PaymentMethodsSettingsCard />

      <DashboardSettingsCard />
    </div>
  )
}
