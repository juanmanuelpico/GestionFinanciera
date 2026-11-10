import { DashboardSection } from '@prisma/client';

export const dashboardSectionIds = [
  'savings',
  'fixedExpenses',
  'myDebts',
  'thirdPartyDebts',
  'dollarQuotes',
] as const;

export type DashboardSectionId = (typeof dashboardSectionIds)[number];

export const DASHBOARD_SECTION_TO_API: Record<
  DashboardSection,
  DashboardSectionId
> = {
  [DashboardSection.SAVINGS]: 'savings',
  [DashboardSection.FIXED_EXPENSES]: 'fixedExpenses',
  [DashboardSection.MY_DEBTS]: 'myDebts',
  [DashboardSection.THIRD_PARTY_DEBTS]: 'thirdPartyDebts',
  [DashboardSection.DOLLAR_QUOTES]: 'dollarQuotes',
};

export const API_TO_DASHBOARD_SECTION: Record<
  DashboardSectionId,
  DashboardSection
> = {
  savings: DashboardSection.SAVINGS,
  fixedExpenses: DashboardSection.FIXED_EXPENSES,
  myDebts: DashboardSection.MY_DEBTS,
  thirdPartyDebts: DashboardSection.THIRD_PARTY_DEBTS,
  dollarQuotes: DashboardSection.DOLLAR_QUOTES,
};

export function toDashboardSectionIds(
  sections: DashboardSection[],
): DashboardSectionId[] {
  return sections.map((section) => DASHBOARD_SECTION_TO_API[section]);
}

export function toDashboardSections(
  sections: DashboardSectionId[],
): DashboardSection[] {
  return sections.map((section) => API_TO_DASHBOARD_SECTION[section]);
}
