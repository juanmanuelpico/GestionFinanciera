import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { getApiErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import {
  dashboardSectionIds,
  dashboardSectionOptions,
  type DashboardSectionId,
} from './dashboard-sections'
import { updatePreferences, type UserPreferences } from './preferences-api'
import { PREFERENCES_QUERY_KEY, usePreferencesQuery } from './preferences-query'
import { SettingsSection } from './settings-section'

export function DashboardSettingsCard() {
  const queryClient = useQueryClient()
  const preferences = usePreferencesQuery()
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: Partial<UserPreferences>) => updatePreferences(payload),
    onMutate: () => setError(null),
    onError: (saveError) => setError(getApiErrorMessage(saveError)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY }),
  })

  if (!preferences.data) {
    return null
  }

  const { dashboardSections } = preferences.data

  const toggleSection = (section: DashboardSectionId) => {
    const isEnabled = dashboardSections.includes(section)
    const next = isEnabled
      ? dashboardSections.filter((item) => item !== section)
      : dashboardSectionIds.filter(
          (item) => item === section || dashboardSections.includes(item),
        )

    mutation.mutate({ dashboardSections: next })
  }

  return (
    <SettingsSection
      titleId="dashboard-title"
      title="Dashboard"
      description="Elegí qué información de cada módulo querés ver en el Dashboard."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2">
          {dashboardSectionOptions.map((option) => {
            const enabled = dashboardSections.includes(option.value)
            const checkboxId = `dashboard-section-${option.value}`
            return (
              <div
                key={option.value}
                className={cn(
                  'relative flex min-h-11 items-start rounded-lg border transition-colors',
                  'hover:bg-accent/50 focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:outline-none active:bg-accent/70',
                  enabled && 'border-primary/40 bg-accent/40',
                  mutation.isPending && 'opacity-60',
                )}
              >
                <Checkbox
                  id={checkboxId}
                  checked={enabled}
                  disabled={mutation.isPending}
                  onCheckedChange={() => toggleSection(option.value)}
                  className="pointer-events-none absolute top-4 left-3 size-5"
                />
                <Label
                  htmlFor={checkboxId}
                  className={cn(
                    'flex min-h-11 w-full flex-col gap-1 py-3 pr-3 pl-11 text-sm leading-snug font-normal',
                    mutation.isPending ? 'cursor-not-allowed' : 'cursor-pointer',
                  )}
                >
                  <span className="min-w-0 break-words font-medium">
                    {option.label}
                  </span>
                  <span className="text-muted-foreground min-w-0 text-xs break-words">
                    {option.description}
                  </span>
                </Label>
              </div>
            )
          })}
        </div>

        <p className="text-muted-foreground text-xs">
          Si desmarcás todas, el Dashboard queda vacío.
        </p>

        <div aria-live="polite">
          {error && (
            <p className="text-destructive text-sm break-words" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </SettingsSection>
  )
}
