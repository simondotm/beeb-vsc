// DOM helper functions

/**
 * Return the element with the given id or throw an error if no element is found.
 * @param id - The id of the element to find
 * @returns HTMLElement
 * @throws Error
 */
export function getElementById(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (!element) {
    throw new Error(`No element found with id: ${id}`)
  }
  return element
}
