const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3_600,
  d: 86_400,
  w: 604_800,
};

export function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d|w)?$/i.exec(value.trim());

  if (!match) {
    throw new Error(`Duración inválida: ${value}`);
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = (match[2] ?? 's').toLowerCase();

  return Math.max(1, amount * UNIT_SECONDS[unit]);
}
