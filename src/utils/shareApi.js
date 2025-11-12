// API utilities for sharing crosswords via Supabase

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient = null

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
} else if (import.meta.env.DEV) {
  console.warn('Supabase not configured for sharing. Check your .env file.')
}

/**
 * Generate a unique share ID
 * @returns {string} Unique share ID
 */
function generateShareId() {
  // Generate a random 8-character alphanumeric ID
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let shareId = ''
  for (let i = 0; i < 8; i++) {
    shareId += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return shareId
}

/**
 * Share a crossword to Supabase
 * @param {string} gridCSV - The grid CSV data
 * @param {string} cluesCSV - The clues CSV data
 * @param {string} displayName - The display name of the crossword
 * @returns {Promise<{success: boolean, shareId?: string, shareLink?: string, error?: string}>}
 */
export async function shareCrosswordToSupabase(gridCSV, cluesCSV, displayName) {
  try {
    if (!supabaseClient) {
      const errorMsg = import.meta.env.DEV
        ? 'Supabase client not configured. Please check your .env file.'
        : 'Supabase client not configured. Please contact the administrator.'
      throw new Error(errorMsg)
    }

    // Generate unique share ID
    let shareId = generateShareId()
    let attempts = 0
    const maxAttempts = 10

    // Ensure share ID is unique (retry if collision)
    while (attempts < maxAttempts) {
      const { data: existing } = await supabaseClient
        .from('shared_crosswords')
        .select('share_id')
        .eq('share_id', shareId)
        .single()

      if (!existing) {
        break // Share ID is unique
      }
      shareId = generateShareId()
      attempts++
    }

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique share ID')
    }

    // Set expiration to 1 year from now
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    // Insert into Supabase
    const { data, error } = await supabaseClient
      .from('shared_crosswords')
      .insert({
        share_id: shareId,
        grid_csv: gridCSV,
        clues_csv: cluesCSV,
        display_name: displayName,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error sharing crossword:', error)
      throw new Error(`Failed to share crossword: ${error.message}`)
    }

    // Generate shareable link
    const baseUrl = window.location.origin + (import.meta.env.BASE_URL || '/')
    const shareLink = `${baseUrl}?share=${shareId}`

    return {
      success: true,
      shareId: shareId,
      shareLink: shareLink
    }
  } catch (error) {
    console.error('Error sharing crossword to Supabase:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Fetch a shared crossword from Supabase
 * @param {string} shareId - The share ID
 * @returns {Promise<{success: boolean, gridCSV?: string, cluesCSV?: string, displayName?: string, error?: string}>}
 */
export async function fetchSharedCrossword(shareId) {
  try {
    if (!supabaseClient) {
      const errorMsg = import.meta.env.DEV
        ? 'Supabase client not configured. Please check your .env file.'
        : 'Supabase client not configured. Please contact the administrator.'
      throw new Error(errorMsg)
    }

    // Fetch from Supabase
    const { data, error } = await supabaseClient
      .from('shared_crosswords')
      .select('grid_csv, clues_csv, display_name, expires_at')
      .eq('share_id', shareId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        throw new Error('Share link not found or has expired')
      }
      console.error('Error fetching shared crossword:', error)
      throw new Error(`Failed to fetch shared crossword: ${error.message}`)
    }

    // Check if expired
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at)
      if (expiresAt < new Date()) {
        throw new Error('Share link has expired')
      }
    }

    return {
      success: true,
      gridCSV: data.grid_csv,
      cluesCSV: data.clues_csv,
      displayName: data.display_name
    }
  } catch (error) {
    console.error('Error fetching shared crossword:', error)
    return {
      success: false,
      error: error.message
    }
  }
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

