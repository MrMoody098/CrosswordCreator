// LocalStorage utilities for saving and loading crosswords

const STORAGE_KEY_PREFIX = 'crossword_'
const CROSSWORD_LIST_KEY = 'crossword_list'

/**
 * Get the storage key for a crossword's grid data
 */
function getGridKey(name) {
  return `${STORAGE_KEY_PREFIX}${name}_grid`
}

/**
 * Get the storage key for a crossword's clues data
 */
function getCluesKey(name) {
  return `${STORAGE_KEY_PREFIX}${name}_clues`
}

/**
 * Get the storage key for a crossword's metadata
 */
function getMetadataKey(name) {
  return `${STORAGE_KEY_PREFIX}${name}_metadata`
}

/**
 * Save a crossword to localStorage
 * @param {string} name - The crossword name (will be normalized)
 * @param {string} gridCSV - The grid CSV data
 * @param {string} cluesCSV - The clues CSV data
 * @param {object} metadata - Optional metadata (displayName, createdAt, etc.)
 */
export function saveCrosswordToLocalStorage(name, gridCSV, cluesCSV, metadata = {}) {
  try {
    const normalizedName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    
    // Save grid and clues
    localStorage.setItem(getGridKey(normalizedName), gridCSV)
    localStorage.setItem(getCluesKey(normalizedName), cluesCSV)
    
    // Save metadata
    const crosswordMetadata = {
      name: normalizedName,
      displayName: metadata.displayName || name.trim(),
      createdAt: metadata.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...metadata
    }
    localStorage.setItem(getMetadataKey(normalizedName), JSON.stringify(crosswordMetadata))
    
    // Update the crossword list
    const list = getCrosswordList()
    const existingIndex = list.findIndex(c => c.name === normalizedName)
    if (existingIndex >= 0) {
      list[existingIndex] = crosswordMetadata
    } else {
      list.push(crosswordMetadata)
    }
    localStorage.setItem(CROSSWORD_LIST_KEY, JSON.stringify(list))
    
    return { success: true, name: normalizedName }
  } catch (error) {
    console.error('Error saving to localStorage:', error)
    // Check if quota exceeded
    if (error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please delete some crosswords or clear browser data.')
    }
    throw new Error(`Failed to save crossword: ${error.message}`)
  }
}

/**
 * Load a crossword from localStorage
 * @param {string} name - The crossword name
 * @returns {object} Object with gridCSV and cluesCSV, or null if not found
 */
export function loadCrosswordFromLocalStorage(name) {
  try {
    const normalizedName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    
    const gridCSV = localStorage.getItem(getGridKey(normalizedName))
    const cluesCSV = localStorage.getItem(getCluesKey(normalizedName))
    
    if (!gridCSV || !cluesCSV) {
      return null
    }
    
    return {
      gridCSV,
      cluesCSV,
      metadata: getCrosswordMetadata(normalizedName)
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error)
    return null
  }
}

/**
 * Get metadata for a crossword
 */
export function getCrosswordMetadata(name) {
  try {
    const normalizedName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    const metadataStr = localStorage.getItem(getMetadataKey(normalizedName))
    return metadataStr ? JSON.parse(metadataStr) : null
  } catch (error) {
    console.error('Error loading metadata:', error)
    return null
  }
}

/**
 * Get the list of all saved crosswords
 * @returns {array} Array of crossword metadata objects
 */
export function getCrosswordList() {
  try {
    const listStr = localStorage.getItem(CROSSWORD_LIST_KEY)
    return listStr ? JSON.parse(listStr) : []
  } catch (error) {
    console.error('Error loading crossword list:', error)
    return []
  }
}

/**
 * Delete a crossword from localStorage
 * @param {string} name - The crossword name
 */
export function deleteCrosswordFromLocalStorage(name) {
  try {
    const normalizedName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    
    // Remove grid, clues, and metadata
    localStorage.removeItem(getGridKey(normalizedName))
    localStorage.removeItem(getCluesKey(normalizedName))
    localStorage.removeItem(getMetadataKey(normalizedName))
    
    // Update the list
    const list = getCrosswordList()
    const filteredList = list.filter(c => c.name !== normalizedName)
    localStorage.setItem(CROSSWORD_LIST_KEY, JSON.stringify(filteredList))
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting from localStorage:', error)
    throw new Error(`Failed to delete crossword: ${error.message}`)
  }
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable() {
  try {
    const test = '__localStorage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Get storage usage information
 */
export function getStorageInfo() {
  try {
    let totalSize = 0
    const items = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const value = localStorage.getItem(key)
        const size = new Blob([value]).size
        totalSize += size
        items.push({ key, size })
      }
    }
    
    return {
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      itemCount: items.length,
      items
    }
  } catch (error) {
    console.error('Error getting storage info:', error)
    return { totalSize: 0, totalSizeMB: '0', itemCount: 0, items: [] }
  }
}

// Wordle localStorage utilities

const WORDLE_LAST_WORD_KEY = 'wordle_last_word'

/**
 * Save the last seen wordle word with date
 * @param {string} word - The word
 * @param {string} date - The date string (YYYY-MM-DD format)
 */
export function saveWordleLastWord(word, date) {
  try {
    const data = { word, date }
    localStorage.setItem(WORDLE_LAST_WORD_KEY, JSON.stringify(data))
    return { success: true }
  } catch (error) {
    console.error('Error saving wordle last word:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get the last seen wordle word
 * @returns {object|null} Object with word and date, or null if not found
 */
export function getWordleLastWord() {
  try {
    const dataStr = localStorage.getItem(WORDLE_LAST_WORD_KEY)
    return dataStr ? JSON.parse(dataStr) : null
  } catch (error) {
    console.error('Error loading wordle last word:', error)
    return null
  }
}

/**
 * Check if the last seen word matches the current date
 * @param {string} currentDate - Current date string (YYYY-MM-DD format)
 * @returns {boolean} True if last word is for current date
 */
export function isWordleLastWordForDate(currentDate) {
  const lastWord = getWordleLastWord()
  return lastWord && lastWord.date === currentDate
}

// Crossword Builder state persistence
const BUILDER_STATE_KEY = 'crossword_builder_state'

export function saveBuilderState(state) {
  try {
    localStorage.setItem(BUILDER_STATE_KEY, JSON.stringify(state))
    return { success: true }
  } catch (error) {
    console.error('Error saving builder state:', error)
    return { success: false, error: error.message }
  }
}

export function loadBuilderState() {
  try {
    const stateStr = localStorage.getItem(BUILDER_STATE_KEY)
    return stateStr ? JSON.parse(stateStr) : null
  } catch (error) {
    console.error('Error loading builder state:', error)
    return null
  }
}

export function clearBuilderState() {
  try {
    localStorage.removeItem(BUILDER_STATE_KEY)
    return { success: true }
  } catch (error) {
    console.error('Error clearing builder state:', error)
    return { success: false, error: error.message }
  }
}

// Wordle game state persistence
const WORDLE_STATE_KEY = 'wordle_game_state'

export function saveWordleState(state) {
  try {
    localStorage.setItem(WORDLE_STATE_KEY, JSON.stringify(state))
    return { success: true }
  } catch (error) {
    console.error('Error saving wordle state:', error)
    return { success: false, error: error.message }
  }
}

export function loadWordleState() {
  try {
    const stateStr = localStorage.getItem(WORDLE_STATE_KEY)
    return stateStr ? JSON.parse(stateStr) : null
  } catch (error) {
    console.error('Error loading wordle state:', error)
    return null
  }
}

export function clearWordleState() {
  try {
    localStorage.removeItem(WORDLE_STATE_KEY)
    return { success: true }
  } catch (error) {
    console.error('Error clearing wordle state:', error)
    return { success: false, error: error.message }
  }
}

// Crossword Viewer state persistence
const VIEWER_STATE_KEY_PREFIX = 'crossword_viewer_state_'

export function saveViewerState(crosswordName, state) {
  try {
    const normalizedName = crosswordName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    const key = `${VIEWER_STATE_KEY_PREFIX}${normalizedName}`
    localStorage.setItem(key, JSON.stringify(state))
    return { success: true }
  } catch (error) {
    console.error('Error saving viewer state:', error)
    return { success: false, error: error.message }
  }
}

export function loadViewerState(crosswordName) {
  try {
    const normalizedName = crosswordName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    const key = `${VIEWER_STATE_KEY_PREFIX}${normalizedName}`
    const stateStr = localStorage.getItem(key)
    return stateStr ? JSON.parse(stateStr) : null
  } catch (error) {
    console.error('Error loading viewer state:', error)
    return null
  }
}

export function clearViewerState(crosswordName) {
  try {
    const normalizedName = crosswordName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    const key = `${VIEWER_STATE_KEY_PREFIX}${normalizedName}`
    localStorage.removeItem(key)
    return { success: true }
  } catch (error) {
    console.error('Error clearing viewer state:', error)
    return { success: false, error: error.message }
  }
}

// Marketplace upload tracking
const MARKETPLACE_UPLOADS_KEY = 'marketplace_uploads'

/**
 * Track a marketplace upload
 * @param {string} marketplaceId - The ID of the uploaded crossword
 */
export function trackMarketplaceUpload(marketplaceId) {
  try {
    const uploads = getMarketplaceUploads()
    if (!uploads.includes(marketplaceId)) {
      uploads.push(marketplaceId)
      localStorage.setItem(MARKETPLACE_UPLOADS_KEY, JSON.stringify(uploads))
    }
  } catch (error) {
    console.error('Error tracking marketplace upload:', error)
  }
}

/**
 * Get list of marketplace IDs the user has uploaded
 * @returns {Array<string>} Array of marketplace crossword IDs
 */
export function getMarketplaceUploads() {
  try {
    const uploads = localStorage.getItem(MARKETPLACE_UPLOADS_KEY)
    return uploads ? JSON.parse(uploads) : []
  } catch (error) {
    console.error('Error getting marketplace uploads:', error)
    return []
  }
}

/**
 * Remove a marketplace upload from tracking
 * @param {string} marketplaceId - The ID of the crossword to untrack
 */
export function untrackMarketplaceUpload(marketplaceId) {
  try {
    const uploads = getMarketplaceUploads()
    const filtered = uploads.filter(id => id !== marketplaceId)
    localStorage.setItem(MARKETPLACE_UPLOADS_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error untracking marketplace upload:', error)
  }
}

