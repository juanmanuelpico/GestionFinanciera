export const dashboardSectionIds = [
  'savings',
  'fixedExpenses',
  'myDebts',
  'thirdPartyDebts',
  'dollarQuotes',
] as const

export type DashboardSectionId = (typeof dashboardSectionIds)[number]

export const dashboardSectionOptions: {
  value: DashboardSectionId
  label: string
  description: string
}[] = [
  {
    value: 'savings',
    label: 'Ahorros',
    description: 'Ahorros actuales en cada moneda habilitada.',
  },
  {
    value: 'fixedExpenses',
    label: 'Gastos fijos',
    description: 'Pagados, pendientes, vencidos y a vencer del mes.',
  },
  {
    value: 'myDebts',
    label: 'Mis deudas',
    description: 'Personas a las que debés y cuotas vencidas.',
  },
  {
    value: 'thirdPartyDebts',
    label: 'Deudas de terceros',
    description: 'Personas que te deben y vencimientos impagos.',
  },
  {
    value: 'dollarQuotes',
    label: 'Cotización del dólar',
    description: 'Blue, oficial y MEP desde DolarApi.',
  },
]
