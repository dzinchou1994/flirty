export function resolveDatabaseUrl(): string | undefined {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return value;
  }
  return undefined;
}

export function ensureDatabaseUrl(): string | undefined {
  const resolved = resolveDatabaseUrl();
  if (resolved) process.env.DATABASE_URL = resolved;
  return resolved;
}
