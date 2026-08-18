import type { AppData, InboundTransaction, OutboundTransaction, StockAdjustment } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const API_SECRET = import.meta.env.VITE_API_SECRET ?? ''

async function request<T>(action?: string, payload?: unknown): Promise<T> {
  const isPost = Boolean(action)
  const url = isPost 
    ? API_BASE 
    : `${API_BASE}?secret=${encodeURIComponent(API_SECRET)}`
    
  const init: RequestInit = isPost 
    ? {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ secret: API_SECRET, action, payload })
      } 
    : { method: 'GET' }

  const response = await fetch(url, { ...init, redirect: 'follow' })
  const result = await response.json().catch(() => ({ error: response.statusText })) as { error?: string, data?: T }
  
  if (!response.ok || result.error) {
    throw new Error(result.error ?? `API request failed: ${response.status}`)
  }
  return result as unknown as T
}

export async function getBootstrap() {
  return request<{ data: AppData }>()
}

export async function postOutbound(transaction: Omit<OutboundTransaction, 'id' | 'createdAt'>) {
  return request<{ data: OutboundTransaction }>('OUTBOUND', transaction)
}

export async function postInbound(transaction: Omit<InboundTransaction, 'id' | 'createdAt'>) {
  return request<{ data: InboundTransaction }>('INBOUND', transaction)
}

export async function postAdjustment(adjustment: Omit<StockAdjustment, 'id' | 'createdAt'>) {
  return request<{ data: StockAdjustment }>('ADJUSTMENT', adjustment)
}

export function apiIsConfigured() {
  return Boolean(API_BASE && API_SECRET)
}
