export const isMobileApp = () => {
  if (typeof window === 'undefined') return false
  return !!(window as any).Capacitor
}
