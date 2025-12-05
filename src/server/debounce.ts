import { TextDocument } from 'vscode-languageserver-textdocument'

// A map to store the AbortController for any ongoing parse
let parseController: AbortController | undefined

// Creates a debounced function that only executes on the trailing edge
// It waits for the user to stop typing before parsing
export function createDebouncer(
  func: (doc: TextDocument, signal: AbortSignal) => Promise<void>,
  delay: number,
) {
  let timeout: NodeJS.Timeout | undefined

  return (document: TextDocument) => {
    // Always cancel any parse that might be in progress
    if (parseController) {
      parseController.abort()
    }

    // Clear any pending timer - we'll set a new one
    if (timeout) {
      clearTimeout(timeout)
    }

    // Create a new controller for the eventual parse
    const newController = new AbortController()
    parseController = newController

    // Set a timer. Only when the user stops typing for `delay` ms will we parse
    timeout = setTimeout(() => {
      func(document, newController.signal).catch((err) => {
        if (err.name !== 'AbortError') console.error(err)
      })
      // Reset the state
      timeout = undefined
    }, delay)
  }
}
