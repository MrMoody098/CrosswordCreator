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
 * Get the current authenticated user
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
export async function getCurrentUser() {
  try {
    if (!supabaseClient) {
      return { user: null, error: 'Supabase client not configured' }
    }

    const { data: { user }, error } = await supabaseClient.auth.getUser()
    
    if (error) {
      return { user: null, error: error.message }
    }

    return { user, error: null }
  } catch (error) {
    console.error('Error getting current user:', error)
    return { user: null, error: error.message }
  }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const { user } = await getCurrentUser()
  return !!user
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

/**
 * Upload a crossword to the marketplace
 * @param {string} gridCSV - The grid CSV data
 * @param {string} cluesCSV - The clues CSV data
 * @param {string} displayName - The display name of the crossword
 * @param {string} authorName - The author's name (optional)
 * @param {string} description - Description of the crossword (optional)
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function uploadToMarketplace(gridCSV, cluesCSV, displayName, authorName = '', description = '') {
  try {
    if (!supabaseClient) {
      const errorMsg = import.meta.env.DEV
        ? 'Supabase client not configured. Please check your .env file.'
        : 'Supabase client not configured. Please contact the administrator.'
      throw new Error(errorMsg)
    }

    // Check if user is authenticated
    const { user, error: authError } = await getCurrentUser()
    if (!user || authError) {
      throw new Error('You must be signed in to upload crosswords to the marketplace. Please sign in with Google.')
    }

    // Insert into marketplace
    const { data, error } = await supabaseClient
      .from('marketplace_crosswords')
      .insert({
        display_name: displayName,
        grid_csv: gridCSV,
        clues_csv: cluesCSV,
        author_name: authorName?.trim() || user.user_metadata?.full_name || user.user_metadata?.name || user.email || null,
        description: description || null,
        is_active: true
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error uploading to marketplace:', error)
      throw new Error(`Failed to upload crossword: ${error.message}`)
    }

    return {
      success: true,
      id: data.id
    }
  } catch (error) {
    console.error('Error uploading to marketplace:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Browse marketplace crosswords
 * @param {object} options - Query options
 * @param {number} options.limit - Number of results to return
 * @param {number} options.offset - Offset for pagination
 * @param {string} options.sortBy - Sort by: 'created_at', 'downloads', 'rating'
 * @param {string} options.order - Order: 'asc' or 'desc'
 * @param {string} options.search - Search term for display name
 * @param {boolean} options.featuredOnly - Only return featured crosswords
 * @returns {Promise<{success: boolean, crosswords?: Array, total?: number, error?: string}>}
 */
export async function browseMarketplace({ limit = 20, offset = 0, sortBy = 'created_at', order = 'desc', search = '', featuredOnly = false } = {}) {
  try {
    if (!supabaseClient) {
      const errorMsg = import.meta.env.DEV
        ? 'Supabase client not configured. Please check your .env file.'
        : 'Supabase client not configured. Please contact the administrator.'
      throw new Error(errorMsg)
    }

    let query = supabaseClient
      .from('marketplace_crosswords')
      .select('id, display_name, author_name, description, created_at, downloads, rating, rating_count, is_featured', { count: 'exact' })
      .eq('is_active', true)

    // Apply filters
    if (featuredOnly) {
      query = query.eq('is_featured', true)
    }

    if (search) {
      query = query.ilike('display_name', `%${search}%`)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: order === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    console.log('Executing Supabase query for marketplace...')
    const { data, error, count } = await query

    if (error) {
      console.error('Supabase query error:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      throw new Error(`Failed to browse marketplace: ${error.message}`)
    }

    console.log('Query successful. Data:', data, 'Count:', count)

    return {
      success: true,
      crosswords: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('Error browsing marketplace:', error)
    return {
      success: false,
      error: error.message,
      crosswords: [],
      total: 0
    }
  }
}

/**
 * Delete a crossword from the marketplace
 * @param {string} id - The marketplace crossword ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteFromMarketplace(id) {
  try {
    if (!supabaseClient) {
      const errorMsg = import.meta.env.DEV
        ? 'Supabase client not configured. Please check your .env file.'
        : 'Supabase client not configured. Please contact the administrator.'
      throw new Error(errorMsg)
    }

    // Delete from marketplace (soft delete by setting is_active to false)
    const { error } = await supabaseClient
      .from('marketplace_crosswords')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deleting from marketplace:', error)
      throw new Error(`Failed to delete crossword: ${error.message}`)
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting from marketplace:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Download a crossword from the marketplace
 * @param {string} id - The marketplace crossword ID
 * @returns {Promise<{success: boolean, gridCSV?: string, cluesCSV?: string, displayName?: string, error?: string}>}
 */
export async function downloadFromMarketplace(id) {
  try {
    if (!supabaseClient) {
      const errorMsg = import.meta.env.DEV
        ? 'Supabase client not configured. Please check your .env file.'
        : 'Supabase client not configured. Please contact the administrator.'
      throw new Error(errorMsg)
    }

    // Check if user is authenticated
    const { user, error: authError } = await getCurrentUser()
    if (!user || authError) {
      throw new Error('You must be signed in to download crosswords from the marketplace. Please sign in with Google.')
    }

    // Fetch crossword data
    const { data: crossword, error: fetchError } = await supabaseClient
      .from('marketplace_crosswords')
      .select('grid_csv, clues_csv, display_name')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('Crossword not found')
      }
      throw new Error(`Failed to fetch crossword: ${fetchError.message}`)
    }

    // Increment download count
    const { error: updateError } = await supabaseClient
      .from('marketplace_crosswords')
      .update({ downloads: (crossword.downloads || 0) + 1 })
      .eq('id', id)

    if (updateError) {
      console.warn('Failed to increment download count:', updateError)
      // Don't fail the download if count update fails
    }

    return {
      success: true,
      gridCSV: crossword.grid_csv,
      cluesCSV: crossword.clues_csv,
      displayName: crossword.display_name
    }
  } catch (error) {
    console.error('Error downloading from marketplace:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

