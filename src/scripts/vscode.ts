import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeDivider,
  vsCodeDropdown,
  vsCodeLink,
  vsCodeOption,
  vsCodeTextField,
} from '@vscode/webview-ui-toolkit'
import { ClientMessage } from '../types/shared/messages'

export function initialiseVSCode() {
  provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeCheckbox(),
    vsCodeTextField(),
    vsCodeDivider(),
    vsCodeDropdown(),
    vsCodeOption(),
    vsCodeLink(),
  )
}

export const vscode = acquireVsCodeApi()

export function notifyHost(message: ClientMessage) {
  vscode.postMessage(message)
}
