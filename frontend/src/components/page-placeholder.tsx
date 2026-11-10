import type { LucideIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface PagePlaceholderProps {
  title: string
  description: string
  icon: LucideIcon
}

export function PagePlaceholder({
  title,
  description,
  icon: Icon,
}: PagePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader className="items-center text-center">
          <div className="bg-muted mb-2 rounded-full p-4">
            <Icon className="text-muted-foreground size-8" />
          </div>
          <CardTitle>Módulo listo para implementar</CardTitle>
          <CardDescription className="max-w-md">
            La estructura de esta sección ya está creada. Los endpoints y la
            interfaz se agregarán junto con los casos de uso.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  )
}
