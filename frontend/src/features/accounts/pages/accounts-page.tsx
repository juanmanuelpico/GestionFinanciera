import { Wallet } from 'lucide-react'
import { PagePlaceholder } from '@/components/page-placeholder'

export function AccountsPage() {
  return (
    <PagePlaceholder
      title="Cuentas"
      description="Administrá tus cuentas bancarias, billeteras y efectivo."
      icon={Wallet}
    />
  )
}
