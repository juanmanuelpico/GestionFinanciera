import type { LucideIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface DashboardStatCardProps {
  label: string
  value: number
  icon: LucideIcon
  zeroMessage: string
}

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  zeroMessage,
}: DashboardStatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="min-w-0 text-sm font-medium">{label}</CardTitle>
        <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {value === 0 && (
          <p className="text-success mt-1 text-xs break-words">{zeroMessage}</p>
        )}
      </CardContent>
    </Card>
  )
}
