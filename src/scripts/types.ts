// help typescript to understand this file is a module
export {}

declare global {
  interface Window {
    JSBEEB_RESOURCES: Record<string, string>
    JSBEEB_DISC?: string
  }
}
