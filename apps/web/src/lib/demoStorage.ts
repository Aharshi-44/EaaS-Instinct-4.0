/**
 * Per-user demo data in localStorage (subscription lock, fake invoice after payment).
 * Keys are scoped by user id so accounts don't share state on the same browser.
 */

const LEGACY_SUB_KEY = 'energix-demo-subscription'

export function demoSubscriptionKey(userId: string): string {
  return `energix-demo-subscription-${userId}`
}

export function demoInvoiceKey(userId: string): string {
  return `energix-demo-invoice-${userId}`
}

/** Remove demo subscription + demo invoice for this user (call on logout). */
export function clearDemoStorageForUser(userId: string): void {
  try {
    window.localStorage.removeItem(demoSubscriptionKey(userId))
    window.localStorage.removeItem(demoInvoiceKey(userId))
  } catch {
    // ignore
  }
}

export function readSubscriptionActiveForUser(userId: string | undefined): boolean {
  if (!userId) return false
  try {
    const raw = window.localStorage.getItem(demoSubscriptionKey(userId))
    if (!raw) return false
    const sub = JSON.parse(raw) as { status?: string }
    return sub.status === 'active'
  } catch {
    return false
  }
}

export function subscriptionStorageKeyMatches(userId: string | undefined, storageKey: string | null): boolean {
  if (!userId || !storageKey) return false
  return storageKey === demoSubscriptionKey(userId) || storageKey === LEGACY_SUB_KEY
}

/** Demo invoice JSON for this user only (set after fake payment). No legacy migration — avoids assigning old global keys to new accounts. */
export function readDemoInvoiceRaw(userId: string | undefined): string | null {
  if (!userId) return null
  try {
    return window.localStorage.getItem(demoInvoiceKey(userId))
  } catch {
    return null
  }
}
