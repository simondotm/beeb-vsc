/**
 * This file is responsible for handling telemetry events in the WebView.
 */
import {
  ApplicationInsights,
  ICustomProperties,
  IExceptionTelemetry,
} from '@microsoft/applicationinsights-web'
import { TELEMETRY_CONFIG } from '../types/shared/telemetry-config'

let appInsights: ApplicationInsights | undefined

/**
 * Host extension injects TELEMETRY_ENABLED into the WebView
 * @returns boolean
 */
export function isTelemetryEnabled() {
  return window.TELEMETRY_ENABLED
}

export function initialiseWebViewTelemetry() {
  if (!isTelemetryEnabled()) {
    return
  }
  const connectionString = TELEMETRY_CONFIG.connectionString
  appInsights = new ApplicationInsights({
    config: {
      connectionString,
      /* ...Other Configuration Options... */
    },
  })
  appInsights.loadAppInsights()
  appInsights.context.application.ver = APP_VERSION
  appInsights.trackPageView()
}

export function sendTelemetryEvent(
  eventName: string,
  properties: ICustomProperties = {},
) {
  if (isTelemetryEnabled() && appInsights) {
    appInsights.trackEvent({ name: `webview/${eventName}` }, properties)
  }
}

export function flushTelemetry() {
  if (appInsights) {
    appInsights.flush()
  }
}

export function sendTelemetryException(error: Error) {
  if (isTelemetryEnabled() && appInsights) {
    appInsights.trackException( { error })
    appInsights.flush()
  }
}
