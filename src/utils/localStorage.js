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

