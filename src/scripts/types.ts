// help typescript to understand this file is a module
export {}

declare global {
  interface Window {
    TELEMETRY_ENABLED: boolean
    JSBEEB_RESOURCES: Record<string, string>
  }
}
