import { DebtActorType, DebtStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  summarizeDebts,
  summarizeFixedExpenses,
} from './dashboard-calculations.js';

const now = new Date('2026-11-06T12:00:00.000Z');
const periodStart = new Date('2026-11-01T00:00:00.000Z');

describe('summarizeFixedExpenses', () => {
  const expenses = [
    {
      id: 'overdue',
      firstDueDate: new Date('2026-01-01T00:00:00.000Z'),
      intervalMonths: 1,
    },
    {
      id: 'paid',
      firstDueDate: new Date('2026-01-05T00:00:00.000Z'),
      intervalMonths: 1,
    },
    {
      id: 'due-soon',
      firstDueDate: new Date('2026-01-09T00:00:00.000Z'),
      intervalMonths: 1,
    },
    {
      id: 'later',
      firstDueDate: new Date('2026-01-20T00:00:00.000Z'),
      intervalMonths: 1,
    },
    {
      id: 'not-due-this-month',
      firstDueDate: new Date('2026-12-15T00:00:00.000Z'),
      intervalMonths: 1,
    },
  ];

  it('cuenta pagados, pendientes, vencidos y a vencer del período', () => {
    const stats = summarizeFixedExpenses(
      expenses,
      new Set(['paid']),
      periodStart,
      now,
    );

    expect(stats).toEqual({ paid: 1, pending: 3, overdue: 1, dueSoon: 1 });
  });

  it('no cuenta vencidos cuando el vencimiento es hoy', () => {
    const stats = summarizeFixedExpenses(
      [
        {
          id: 'today',
          firstDueDate: new Date('2026-01-06T00:00:00.000Z'),
          intervalMonths: 1,
        },
      ],
      new Set(),
      periodStart,
      now,
    );

    expect(stats).toEqual({ paid: 0, pending: 1, overdue: 0, dueSoon: 1 });
  });
});

describe('summarizeDebts', () => {
  it('cuenta personas, deudas activas y cuotas vencidas', () => {
    const stats = summarizeDebts(
      [
        {
          actorId: 'person-a',
          actorType: DebtActorType.PERSONA,
          status: DebtStatus.ACTIVA,
          installments: [
            {
              dueDate: new Date('2026-10-01T00:00:00.000Z'),
              paidAt: null,
            },
            {
              dueDate: new Date('2026-12-01T00:00:00.000Z'),
              paidAt: null,
            },
          ],
        },
        {
          actorId: 'card-b',
          actorType: DebtActorType.TARJETA,
          status: DebtStatus.ACTIVA,
          installments: [
            {
              dueDate: new Date('2026-10-15T00:00:00.000Z'),
              paidAt: new Date('2026-10-15T00:00:00.000Z'),
            },
          ],
        },
        {
          actorId: 'person-c',
          actorType: DebtActorType.PERSONA,
          status: DebtStatus.FINALIZADA,
          installments: [
            {
              dueDate: new Date('2026-09-01T00:00:00.000Z'),
              paidAt: new Date('2026-09-01T00:00:00.000Z'),
            },
          ],
        },
      ],
      now,
    );

    expect(stats).toEqual({
      people: 2,
      activePeople: 1,
      activeDebts: 2,
      overdueDebts: 1,
      overdueInstallments: 1,
      peopleWithOverdue: 1,
    });
  });

  it('cuenta una persona una sola vez aunque tenga varias deudas', () => {
    const stats = summarizeDebts(
      [
        {
          actorId: 'person-a',
          actorType: DebtActorType.PERSONA,
          status: DebtStatus.ACTIVA,
          installments: [],
        },
        {
          actorId: 'person-a',
          actorType: DebtActorType.PERSONA,
          status: DebtStatus.ACTIVA,
          installments: [],
        },
      ],
      now,
    );

    expect(stats.people).toBe(1);
    expect(stats.activeDebts).toBe(2);
  });
});
