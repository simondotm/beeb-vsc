import { TextDocument } from 'vscode-languageserver-textdocument'

// A map to store the AbortController for any ongoing parse
let parseController: AbortController | undefined

// Creates a debounced function that executes on the leading and trailing edge
export function createDebouncer(
  func: (doc: TextDocument, signal: AbortSignal) => Promise<void>,
  delay: number,
) {
  let timeout: NodeJS.Timeout | undefined

  // This flag tracks if a new change has occurred since the last parse
  let isTrailingCallNeeded = false

  return (document: TextDocument) => {
    // Always cancel any parse that might be in progress
    if (parseController) {
      parseController.abort()
    }

    // A new parse is about to start or be scheduled, so create a new controller
    const newController = new AbortController()
    parseController = newController

    // If there's no timer active, we are clear to run the leading edge call.
    if (!timeout) {
      console.log(`Leading edge: Parsing immediately for ${document.uri}`)
      func(document, newController.signal).catch((err) => {
        if (err.name !== 'AbortError') console.error(err)
      })
    } else {
      // If a timer is already running, it means we're in a burst of typing.
      // We don't run immediately, but we signal that a final, trailing parse is required.
      isTrailingCallNeeded = true
      // Clear the previous timer to reset the delay
      clearTimeout(timeout)
    }

    // Set a new timer. This runs after the user stops typing
    timeout = setTimeout(() => {
      // When the timer fires, check if a trailing call was flagged
      if (isTrailingCallNeeded) {
        console.log(`Trailing edge: Running final parse for ${document.uri}`)
        func(document, newController.signal).catch((err) => {
          if (err.name !== 'AbortError') console.error(err)
        })
      }
      // Reset the state for the next event series.
      timeout = undefined
      isTrailingCallNeeded = false
    }, delay)
  }
}
