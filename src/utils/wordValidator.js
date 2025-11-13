/**
 * Validates if a word is a valid 5-letter English word
 * Uses Dictionary API (dictionaryapi.dev) - free, no API key required
 * @param {string} word - The word to validate (should be uppercase)
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function validateWord(word) {
  if (!word || word.length !== 5) {
    return { valid: false, error: 'Word must be exactly 5 letters' }
  }

  // Check if word contains only letters
  if (!/^[A-Z]{5}$/.test(word)) {
    return { valid: false, error: 'Word must contain only letters' }
  }

  try {
    // Use Dictionary API (free, no key required)
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`)
    
    if (response.ok) {
      const data = await response.json()
      // Check if we got valid dictionary entries
      if (Array.isArray(data) && data.length > 0) {
        // Verify it's actually a word (has definitions)
        const hasDefinitions = data.some(entry => 
          entry.meanings && 
          Array.isArray(entry.meanings) && 
          entry.meanings.length > 0
        )
        if (hasDefinitions) {
          return { valid: true }
        }
      }
    }
    
    // If we get here, the word is not in the dictionary
    return { valid: false, error: 'Not a valid word' }
  } catch (error) {
    console.error('Error validating word:', error)
    // On error, allow the word (fail open) to avoid blocking gameplay
    // In production, you might want to fail closed
    return { valid: true } // Fail open to avoid blocking gameplay
  }
}

/**
 * Cache for validated words to avoid repeated API calls
 */
const wordCache = new Map()

/**
 * Validates a word with caching
 * @param {string} word - The word to validate
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function validateWordCached(word) {
  const upperWord = word.toUpperCase()
  
  // Check cache first
  if (wordCache.has(upperWord)) {
    return wordCache.get(upperWord)
  }
  
  // Validate and cache result
  const result = await validateWord(upperWord)
  wordCache.set(upperWord, result)
  
  return result
}

