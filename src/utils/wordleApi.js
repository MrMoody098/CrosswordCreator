import { createClient } from '@supabase/supabase-js'
import { getWordleLastWord, saveWordleLastWord, isWordleLastWordForDate } from './localStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug: Log environment variables (only in development)
if (import.meta.env.DEV) {
  console.log('Environment check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseAnonKey?.length || 0
  })
}

let supabaseClient = null

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
} else if (import.meta.env.DEV) {
  console.warn('Supabase not configured. Check your .env file:')
  console.warn('- File should be named: .env (in the root directory)')
  console.warn('- Variables should be: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  console.warn('- Format: VITE_SUPABASE_URL=https://your-project.supabase.co')
  console.warn('- No quotes needed, no spaces around =')
  console.warn('- Restart dev server after creating/editing .env file')
}

/**
 * Get the current date in Ireland timezone (Europe/Dublin)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getIrelandDate() {
  const now = new Date()
  // Convert to Ireland timezone
  const irelandDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Dublin' }))
  const year = irelandDate.getFullYear()
  const month = String(irelandDate.getMonth() + 1).padStart(2, '0')
  const day = String(irelandDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Fetch the daily word from Supabase Edge Function
 * @returns {Promise<{success: boolean, word?: string, error?: string}>}
 */
export async function fetchDailyWord() {
  try {
    const currentDate = getIrelandDate()
    
    // Check localStorage first to avoid unnecessary API calls
    if (isWordleLastWordForDate(currentDate)) {
      const lastWord = getWordleLastWord()
      if (lastWord && lastWord.word) {
        return { success: true, word: lastWord.word }
      }
    }

    if (!supabaseClient) {
      const errorMsg = import.meta.env.DEV
        ? `Supabase client not configured. Please check:
1. Create a .env file in the root directory (same level as package.json)
2. Add: VITE_SUPABASE_URL=https://vpmmcdwcxatfhyysiamg.supabase.co
3. Add: VITE_SUPABASE_ANON_KEY=your-anon-key-here
4. Restart the dev server (stop and run npm run dev again)
5. Make sure there are no spaces around the = sign
6. Make sure variables start with VITE_ prefix`
        : 'Supabase client not configured. Please contact the administrator.'
      throw new Error(errorMsg)
    }

    // Call the Edge Function
    const { data, error } = await supabaseClient.functions.invoke('get-daily-word', {
      body: { date: currentDate }
    })

    if (error) {
      console.error('Error calling Edge Function:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        context: error.context
      })
      
      // Provide more helpful error messages
      if (error.status === 404) {
        throw new Error('Edge Function not found. Please deploy the get-daily-word function to Supabase.')
      } else if (error.status === 500) {
        throw new Error('Edge Function error. Check: 1) Database table exists, 2) Edge Function is deployed, 3) Check Supabase logs for details.')
      }
      
      throw new Error(`Failed to fetch daily word: ${error.message}`)
    }

    if (!data || !data.word) {
      throw new Error('No word returned from server')
    }

    // Save to localStorage
    saveWordleLastWord(data.word, currentDate)

    return { success: true, word: data.word }
  } catch (error) {
    console.error('Error fetching daily word:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Check if Supabase is configured
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseAnonKey && supabaseClient)
}

