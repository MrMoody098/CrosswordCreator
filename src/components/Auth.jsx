import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import './Auth.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient = null
if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
}

function Auth({ onAuthChange }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (!supabaseClient) {
      setLoading(false)
      return
    }

    // Check current session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (onAuthChange) {
        onAuthChange(session?.user ?? null)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (onAuthChange) {
        onAuthChange(session?.user ?? null)
      }
    })

    return () => subscription.unsubscribe()
  }, [onAuthChange])

  const signInWithGoogle = async () => {
    if (!supabaseClient) {
      alert('Supabase not configured. Please check your environment variables.')
      return
    }

    try {
      setSigningIn(true)
      
      // Construct redirect URL properly for GitHub Pages
      const baseUrl = import.meta.env.BASE_URL || '/'
      const redirectTo = window.location.origin + baseUrl
      
      console.log('Attempting OAuth sign-in with redirectTo:', redirectTo)
      console.log('Current location:', window.location.href)
      console.log('BASE_URL:', import.meta.env.BASE_URL)
      
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
        },
      })

      if (error) {
        console.error('OAuth error details:', {
          message: error.message,
          status: error.status,
          error: error
        })
        alert(`Error signing in: ${error.message}\n\nPlease check:\n1. Supabase URL Configuration\n2. Google OAuth settings\n3. Browser console for details`)
      } else if (data) {
        console.log('OAuth redirect initiated:', data.url)
      }
    } catch (error) {
      console.error('Unexpected error during sign-in:', error)
      alert(`Unexpected error: ${error.message}\n\nCheck browser console for details.`)
    } finally {
      setSigningIn(false)
    }
  }

  const signOut = async () => {
    if (!supabaseClient) {
      return
    }

    try {
      const { error } = await supabaseClient.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        alert(`Error signing out: ${error.message}`)
      }
    } catch (error) {
      console.error('Error signing out:', error)
      alert(`Error signing out: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="auth-container">
        <p>Loading...</p>
      </div>
    )
  }

  if (user) {
    return (
      <div className="auth-container">
        <div className="auth-user-info">
          <img 
            src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
            alt="Profile" 
            className="auth-avatar"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className="auth-username">
            {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
          </span>
          <button className="auth-btn auth-btn-signout" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <button 
        className="auth-btn auth-btn-google" 
        onClick={signInWithGoogle}
        disabled={signingIn}
      >
        {signingIn ? 'Signing in...' : 'Sign in with Google'}
      </button>
    </div>
  )
}

export default Auth

