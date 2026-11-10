import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { AuthLayout } from '@/components/layout/auth-layout'
import { AccountsPage } from '@/features/accounts/pages/accounts-page'
import { ChatPage } from '@/features/chat/pages/chat-page'
import { LoginPage } from '@/features/auth/pages/login-page'
import { RegisterPage } from '@/features/auth/pages/register-page'
import { SpendingControlPage } from '@/features/spending-control/pages/spending-control-page'
import { CategoriesPage } from '@/features/categories/pages/categories-page'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import { DebtsPage } from '@/features/debts/pages/debts-page'
import { FixedExpenseHistoryPage } from '@/features/fixed-expenses/pages/fixed-expense-history-page'
import { FixedExpensesPage } from '@/features/fixed-expenses/pages/fixed-expenses-page'
import { MovementsPage } from '@/features/movements/pages/movements-page'
import { SavingsPage } from '@/features/savings/pages/savings-page'
import { SettingsPage } from '@/features/preferences/pages/settings-page'
import { ReportsPage } from '@/features/reports/pages/reports-page'
import { ProtectedRoute } from '@/routes/protected-route'
import { PublicRoute } from '@/routes/public-route'

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'movements', element: <MovementsPage /> },
          { path: 'savings', element: <SavingsPage /> },
          { path: 'debts', element: <DebtsPage /> },
          { path: 'fixed-expenses', element: <FixedExpensesPage /> },
          {
            path: 'fixed-expenses/:expenseId/history',
            element: <FixedExpenseHistoryPage />,
          },
          { path: 'accounts', element: <AccountsPage /> },
          { path: 'categories', element: <CategoriesPage /> },
          { path: 'budgets', element: <SpendingControlPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'chat', element: <ChatPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
