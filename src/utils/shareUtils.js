// Utility functions for sharing crosswords via URL

/**
 * Encode crossword data for sharing in URL
 * @param {string} gridCSV - The grid CSV data
 * @param {string} cluesCSV - The clues CSV data
 * @param {string} displayName - The display name of the crossword
 * @returns {string} Encoded string for URL
 */
export function encodeCrosswordData(gridCSV, cluesCSV, displayName) {
  try {
    const data = {
      grid: gridCSV,
      clues: cluesCSV,
      name: displayName
    }
    const jsonString = JSON.stringify(data)
    // Use base64 encoding for URL-safe sharing
    const encoded = btoa(encodeURIComponent(jsonString))
    return encoded
  } catch (error) {
    console.error('Error encoding crossword data:', error)
    throw new Error('Failed to encode crossword data')
  }
}

/**
 * Decode crossword data from URL
 * @param {string} encoded - The encoded string from URL
 * @returns {object} Object with grid, clues, and name
 */
export function decodeCrosswordData(encoded) {
  try {
    const jsonString = decodeURIComponent(atob(encoded))
    const data = JSON.parse(jsonString)
    return {
      gridCSV: data.grid,
      cluesCSV: data.clues,
      displayName: data.name
    }
  } catch (error) {
    console.error('Error decoding crossword data:', error)
    throw new Error('Invalid share link')
  }
}

/**
 * Generate a shareable URL for a crossword
 * @param {string} gridCSV - The grid CSV data
 * @param {string} cluesCSV - The clues CSV data
 * @param {string} displayName - The display name of the crossword
 * @returns {string} Full shareable URL
 */
export function generateShareableLink(gridCSV, cluesCSV, displayName) {
  const encoded = encodeCrosswordData(gridCSV, cluesCSV, displayName)
  const baseUrl = window.location.origin + (import.meta.env.BASE_URL || '/')
  return `${baseUrl}?share=${encoded}`
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textArea)
      return success
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error)
    return false
  }
}

