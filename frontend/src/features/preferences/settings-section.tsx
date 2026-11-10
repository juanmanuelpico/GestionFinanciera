import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SettingsSectionProps {
  titleId: string
  title: string
  description: string
  children: ReactNode
  defaultOpen?: boolean
}

export function SettingsSection({
  titleId,
  title,
  description,
  children,
  defaultOpen = true,
}: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = `${titleId}-panel`

  return (
    <section aria-labelledby={titleId}>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0 space-y-1.5">
            <CardTitle id={titleId} className="text-lg">
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 sm:size-10"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? `Contraer ${title}` : `Expandir ${title}`}
            onClick={() => setOpen((value) => !value)}
          >
            <ChevronDown
              className={cn('transition-transform', open && 'rotate-180')}
            />
          </Button>
        </CardHeader>

        {open && <CardContent id={panelId}>{children}</CardContent>}
      </Card>
    </section>
  )
}
