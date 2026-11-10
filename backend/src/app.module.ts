import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration.js';
import { envValidationSchema } from './config/env.validation.js';
import { PrismaModule } from './database/prisma.module.js';
import { AccountsModule } from './modules/accounts/accounts.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { BudgetsModule } from './modules/budgets/budgets.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { DebtsModule } from './modules/debts/debts.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MovementsModule } from './modules/movements/movements.module.js';
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module.js';
import { FixedExpensesModule } from './modules/fixed-expenses/fixed-expenses.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { SavingsModule } from './modules/savings/savings.module.js';
import { SpendingControlModule } from './modules/spending-control/spending-control.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    AccountsModule,
    CategoriesModule,
    MovementsModule,
    DashboardModule,
    DebtsModule,
    FixedExpensesModule,
    BudgetsModule,
    SpendingControlModule,
    ReportsModule,
    ExchangeRatesModule,
    SavingsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
