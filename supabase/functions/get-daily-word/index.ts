import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Calculate the date server-side in Ireland timezone to ensure consistency
    // This ensures everyone gets the same date regardless of their local timezone
    const now = new Date()
    const irelandDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Dublin' }))
    const year = irelandDate.getFullYear()
    const month = String(irelandDate.getMonth() + 1).padStart(2, '0')
    const day = String(irelandDate.getDate()).padStart(2, '0')
    const date = `${year}-${month}-${day}`

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if word already exists for this date
    const { data: existingWord, error: queryError } = await supabase
      .from('daily_words')
      .select('word')
      .eq('date', date)
      .single()

    if (queryError && queryError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error querying database:', queryError)
      return new Response(
        JSON.stringify({ error: 'Database query failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If word exists, return it
    if (existingWord && existingWord.word) {
      return new Response(
        JSON.stringify({ word: existingWord.word }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all previously used words
    const { data: usedWords, error: usedWordsError } = await supabase
      .from('daily_words')
      .select('word')

    if (usedWordsError) {
      console.error('Error fetching used words:', usedWordsError)
    }

    const usedWordsSet = new Set((usedWords || []).map(w => w.word.toLowerCase()))

    // Fetch a new word from Random Words API
    let newWord = null
    let attempts = 0
    const maxAttempts = 10

    while (!newWord && attempts < maxAttempts) {
      attempts++
      
      try {
        const response = await fetch(
          `https://random-words-api.kushcreates.com/api?length=5`
        )

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limit - wait a bit and retry
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          throw new Error(`Random Words API error: ${response.status}`)
        }

        const data = await response.json()
        
        // API returns an object with word property: { word: "apple", definition: "...", pronunciation: "..." }
        const word = data?.word || (Array.isArray(data) ? data[0]?.word : null)
        
        if (word && typeof word === 'string' && word.length === 5 && /^[a-zA-Z]+$/.test(word)) {
          const wordLower = word.toLowerCase()
          // Check if word hasn't been used before
          if (!usedWordsSet.has(wordLower)) {
            newWord = word.toUpperCase()
          }
        }
      } catch (apiError) {
        console.error(`Attempt ${attempts} failed:`, apiError)
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }

    // Fallback: if API fails, use a fallback word list
    if (!newWord) {
      const fallbackWords = [
        'APPLE', 'BEACH', 'CHAIR', 'DANCE', 'EARTH', 'FLAME', 'GLASS', 'HEART',
        'IMAGE', 'JOKER', 'KNIFE', 'LEMON', 'MUSIC', 'NIGHT', 'OCEAN', 'PAPER',
        'QUIET', 'RIVER', 'SMILE', 'TABLE', 'UNITY', 'VALUE', 'WATER', 'XENON',
        'YOUTH', 'ZEBRA', 'BRAVE', 'CLOUD', 'DREAM', 'EAGLE', 'FROST', 'GHOST',
        'HAPPY', 'IVORY', 'JUMBO', 'KNEEL', 'LIGHT', 'MAGIC', 'NOBLE', 'OLIVE',
        'PEACE', 'QUICK', 'ROYAL', 'STORM', 'TRUTH', 'ULTRA', 'VIVID', 'WALTZ',
        'XENIA', 'YACHT', 'ZESTY', 'BLAZE', 'CRISP', 'DUSKY', 'ELITE', 'FANCY'
      ]
      
      // Find a word that hasn't been used
      for (const fallbackWord of fallbackWords) {
        if (!usedWordsSet.has(fallbackWord.toLowerCase())) {
          newWord = fallbackWord
          break
        }
      }
      
      // If all fallback words are used, just pick one randomly
      if (!newWord) {
        newWord = fallbackWords[Math.floor(Math.random() * fallbackWords.length)]
      }
    }

    if (!newWord) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch a word' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Save the new word to database
    // Try to insert - if it fails due to unique constraint, another request already created it
    const { error: insertError } = await supabase
      .from('daily_words')
      .insert({
        word: newWord,
        date: date,
        created_at: new Date().toISOString()
      })

    // If insert failed due to duplicate (race condition), fetch the existing word
    if (insertError) {
      if (insertError.code === '23505') { // Unique violation - word already exists for this date
        // Another request already created the word, fetch it
        const { data: existingWord, error: fetchError } = await supabase
          .from('daily_words')
          .select('word')
          .eq('date', date)
          .single()
        
        if (fetchError || !existingWord) {
          console.error('Error fetching existing word after race condition:', fetchError)
          return new Response(
            JSON.stringify({ error: 'Failed to retrieve word' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        return new Response(
          JSON.stringify({ word: existingWord.word }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        console.error('Error inserting word:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to save word' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Successfully inserted new word
    return new Response(
      JSON.stringify({ word: newWord }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

