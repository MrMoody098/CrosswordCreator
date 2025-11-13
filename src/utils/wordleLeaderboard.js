import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient = null

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Get the current date in Ireland timezone (Europe/Dublin)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getIrelandDate() {
  const now = new Date()
  const irelandDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Dublin' }))
  const year = irelandDate.getFullYear()
  const month = String(irelandDate.getMonth() + 1).padStart(2, '0')
  const day = String(irelandDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Save a Wordle attempt to the database
 * @param {Array} attempts - Array of guess objects with {guess: string, evaluation: Array}
 * @param {number} score - Number of attempts (1-6, or 7 for failed)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveWordleAttempt(attempts, score) {
  try {
    if (!supabaseClient) {
      return { success: false, error: 'Supabase not configured' }
    }

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (!user || authError) {
      return { success: false, error: 'You must be signed in to save your attempt' }
    }

    const wordDate = getIrelandDate()

    // Insert or update attempt (upsert)
    const { error } = await supabaseClient
      .from('wordle_attempts')
      .upsert({
        user_id: user.id,
        word_date: wordDate,
        attempts: attempts,
        score: score,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,word_date'
      })

    if (error) {
      console.error('Error saving Wordle attempt:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error saving Wordle attempt:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get or set username for the current user
 * @param {string} username - Optional username to set
 * @returns {Promise<{success: boolean, username?: string, error?: string}>}
 */
export async function setUsername(username) {
  try {
    if (!supabaseClient) {
      return { success: false, error: 'Supabase not configured' }
    }

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (!user || authError) {
      return { success: false, error: 'You must be signed in to set a username' }
    }

    if (!username || username.trim().length === 0) {
      return { success: false, error: 'Username cannot be empty' }
    }

    if (username.length > 50) {
      return { success: false, error: 'Username must be 50 characters or less' }
    }

    // Validate username (alphanumeric, spaces, hyphens, underscores only)
    const usernameRegex = /^[a-zA-Z0-9 _-]+$/
    if (!usernameRegex.test(username)) {
      return { success: false, error: 'Username can only contain letters, numbers, spaces, hyphens, and underscores' }
    }

    // Upsert username
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        username: username.trim()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error setting username:', error)
      return { success: false, error: error.message }
    }

    return { success: true, username: data.username }
  } catch (error) {
    console.error('Error setting username:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get username for the current user
 * @returns {Promise<{success: boolean, username?: string, error?: string}>}
 */
export async function getUsername() {
  try {
    if (!supabaseClient) {
      return { success: false, error: 'Supabase not configured' }
    }

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (!user || authError) {
      return { success: false, error: 'Not authenticated' }
    }

    // Fetch username from user_profiles
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .select('username')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found
        return { success: true, username: null }
      }
      console.error('Error fetching username:', error)
      return { success: false, error: error.message }
    }

    return { success: true, username: data?.username || null }
  } catch (error) {
    console.error('Error fetching username:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get leaderboard for today's word
 * @returns {Promise<{success: boolean, attempts?: Array, error?: string}>}
 */
export async function getWordleLeaderboard() {
  try {
    if (!supabaseClient) {
      return { success: false, error: 'Supabase not configured' }
    }

    const wordDate = getIrelandDate()

    // Fetch all attempts for today, ordered by score (best first), then by completed_at (earliest first)
    const { data, error } = await supabaseClient
      .from('wordle_attempts')
      .select(`
        id,
        user_id,
        attempts,
        score,
        completed_at
      `)
      .eq('word_date', wordDate)
      .order('score', { ascending: true })
      .order('completed_at', { ascending: true })

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return { success: false, error: error.message }
    }

    // Get current user
    const { data: { user } } = await supabaseClient.auth.getUser()

    // Fetch user profiles for all unique user IDs
    const userIds = [...new Set((data || []).map(a => a.user_id))]
    const userNameMap = new Map()
    
    if (userIds.length > 0) {
      // Fetch all user profiles at once
      const { data: profiles, error: profilesError } = await supabaseClient
        .from('user_profiles')
        .select('user_id, username')
        .in('user_id', userIds)

      if (!profilesError && profiles) {
        profiles.forEach(profile => {
          userNameMap.set(profile.user_id, profile.username)
        })
      }
    }
    
    // For the current user, use their custom username or fallback to Google name
    if (user) {
      if (!userNameMap.has(user.id)) {
        const currentUserName = user.user_metadata?.full_name || 
                                user.user_metadata?.name || 
                                user.email?.split('@')[0] || 
                                'You'
        userNameMap.set(user.id, currentUserName)
      }
    }

    // For other users without custom usernames, use fallback
    for (const userId of userIds) {
      if (!userNameMap.has(userId)) {
        userNameMap.set(userId, `Player ${userId.substring(0, 8)}`)
      }
    }

    // Format attempts with user info
    const formattedAttempts = (data || []).map(attempt => ({
      id: attempt.id,
      userId: attempt.user_id,
      attempts: attempt.attempts,
      score: attempt.score,
      completedAt: attempt.completed_at,
      isCurrentUser: user && attempt.user_id === user.id,
      userName: userNameMap.get(attempt.user_id) || `Player ${attempt.user_id.substring(0, 8)}`
    }))

    return { success: true, attempts: formattedAttempts }
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get current user's attempt for today's word
 * @returns {Promise<{success: boolean, attempt?: object, error?: string}>}
 */
export async function getMyWordleAttempt() {
  try {
    if (!supabaseClient) {
      return { success: false, error: 'Supabase not configured' }
    }

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (!user || authError) {
      return { success: false, error: 'Not authenticated' }
    }

    const wordDate = getIrelandDate()

    // Fetch user's attempt for today
    const { data, error } = await supabaseClient
      .from('wordle_attempts')
      .select('id, attempts, score, completed_at')
      .eq('user_id', user.id)
      .eq('word_date', wordDate)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No attempt found
        return { success: true, attempt: null }
      }
      console.error('Error fetching my attempt:', error)
      return { success: false, error: error.message }
    }

    return { success: true, attempt: data }
  } catch (error) {
    console.error('Error fetching my attempt:', error)
    return { success: false, error: error.message }
  }
}

