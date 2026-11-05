import { NextResponse } from 'next/server';

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = {
  ok: false;
  error: { code: string; message: string; field?: string };
};

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export function ok<T>(data: T, init?: { status?: number }): NextResponse {
  const body: ApiOk<T> = { ok: true, data };
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: NO_STORE,
  });
}

export function err(
  code: string,
  message: string,
  init?: { status?: number; field?: string },
): NextResponse {
  const body: ApiErr = {
    ok: false,
    error: { code, message, ...(init?.field ? { field: init.field } : {}) },
  };
  return NextResponse.json(body, {
    status: init?.status ?? 400,
    headers: NO_STORE,
  });
}
