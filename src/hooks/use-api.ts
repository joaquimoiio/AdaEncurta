"use client";

import { toast } from "sonner";

export type ApiIssue = { path: string; message: string };

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues: ApiIssue[] = [],
  ) {
    super(message);
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.error ?? `Erro ${res.status}`;
    throw new ApiClientError(res.status, message, body?.issues ?? []);
  }
  return body as T;
}

export function toastApiError(err: unknown) {
  if (err instanceof ApiClientError) {
    const detail = err.issues.map((i) => i.message).join(" ");
    toast.error(err.message, { description: detail || undefined });
    return;
  }
  toast.error("Algo deu errado. Tente novamente.");
}
