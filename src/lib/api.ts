import type { AppData, InboundTransaction, OutboundTransaction, StockAdjustment } from '../types'

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: response.statusText })) as { message?: string }
    throw new Error(payload.message ?? `API request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function getBootstrap() {
  return request<{ data: AppData }>('/bootstrap')
}

export async function postOutbound(transaction: Omit<OutboundTransaction, 'id' | 'createdAt'>) {
  return request<{ data: OutboundTransaction }>('/outbound', { method: 'POST', body: JSON.stringify(transaction) })
}

export async function postInbound(transaction: Omit<InboundTransaction, 'id' | 'createdAt'>) {
  return request<{ data: InboundTransaction }>('/inbound', { method: 'POST', body: JSON.stringify(transaction) })
}

export async function postAdjustment(adjustment: Omit<StockAdjustment, 'id' | 'createdAt'>) {
  return request<{ data: StockAdjustment }>('/adjustment', { method: 'POST', body: JSON.stringify(adjustment) })
}

export function apiIsConfigured() {
  return Boolean(import.meta.env.VITE_API_BASE_URL)
}
