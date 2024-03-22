import TelemetryReporter, {
  TelemetryEventProperties,
} from '@vscode/extension-telemetry'
import { ExtensionContext, env } from 'vscode'
import { TELEMETRY_CONFIG } from '../../types/shared/telemetry-config'

// telemetry reporter
let reporter: TelemetryReporter

export function isTelemetryEnabled() {
  return env.isTelemetryEnabled
}

export function initialiseExtensionTelemetry(context: ExtensionContext) {
  if (!env.isTelemetryEnabled) {
    return
  }

  // the application insights key (also known as instrumentation key)
  // it is fine to have the key visible in the code as it is public anyway
  const key = TELEMETRY_CONFIG.instrumentationKey
  // create telemetry reporter on extension activation
  // this will automatically respect users preferences for telemetry
  reporter = new TelemetryReporter(key)
  // ensure it gets properly disposed. Upon disposal the events will be flushed
  context.subscriptions.push(reporter)

  sendTelemetryEvent('extensionActivated', {
    isNewAppInstall: env.isNewAppInstall.toString(),
  })

  console.log(`telemetryLevel=${reporter.telemetryLevel}`)
}

export function sendTelemetryEvent(
  eventName: string,
  properties: TelemetryEventProperties = {},
) {
  if (isTelemetryEnabled() && reporter) {
    reporter.sendTelemetryEvent(eventName, {
      ...properties,
      applicationVersion: APP_VERSION,
    })
  }
}
