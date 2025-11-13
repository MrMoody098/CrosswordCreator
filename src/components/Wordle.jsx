import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDailyWord } from '../utils/wordleApi'
import { validateWordCached } from '../utils/wordValidator'
import { saveWordleAttempt, getMyWordleAttempt, getWordleLeaderboard, getUsername, setUsername } from '../utils/wordleLeaderboard'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient = null
if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
}
import '../App.css'
import './Wordle.css'

const WORD_LENGTH = 5
const MAX_GUESSES = 6

function Wordle() {
  const [word, setWord] = useState('')
  const [guesses, setGuesses] = useState(Array(MAX_GUESSES).fill(''))
  const [currentGuess, setCurrentGuess] = useState('')
  const [currentRow, setCurrentRow] = useState(0)
  const [gameState, setGameState] = useState('playing') // 'playing', 'won', 'lost'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [letterStates, setLetterStates] = useState({}) // 'correct', 'present', 'absent'
  const [isInvalidWord, setIsInvalidWord] = useState(false) // Track if current word is invalid
  const [attemptsHistory, setAttemptsHistory] = useState([]) // Store all attempts with evaluations
  const [finalScore, setFinalScore] = useState(null) // Final score (1-6, or 7 for failed)
  const [myAttempt, setMyAttempt] = useState(null) // User's completed attempt for today
  const [leaderboardAttempts, setLeaderboardAttempts] = useState([]) // Leaderboard data
  const [showLetters, setShowLetters] = useState(false) // Toggle for showing letters in leaderboard
  const [checkingAttempt, setCheckingAttempt] = useState(true) // Loading state for checking attempt
  const [user, setUser] = useState(null) // Current user
  const [currentUsername, setCurrentUsername] = useState(null) // Current username
  const [showUsernameModal, setShowUsernameModal] = useState(false) // Show username modal
  const [usernameInput, setUsernameInput] = useState('') // Username input value
  const [usernameError, setUsernameError] = useState('') // Username error message
  const [savingUsername, setSavingUsername] = useState(false) // Saving username state
  const [showCompletedLayout, setShowCompletedLayout] = useState(false) // Show completed layout after congrats
  const [showLeaderboard, setShowLeaderboard] = useState(false) // Show leaderboard view
  const navigate = useNavigate()

  useEffect(() => {
    checkMyAttempt()
    checkUserAndUsername()
  }, [])

  // Reconstruct letter states from myAttempt when loading a previous game
  useEffect(() => {
    if (myAttempt && myAttempt.attempts && word) {
      const newLetterStates = {}
      myAttempt.attempts.forEach(attempt => {
        attempt.guess.split('').forEach((letter, i) => {
          const state = attempt.evaluation[i]
          const currentState = newLetterStates[letter]
          
          // Priority: correct > present > absent
          if (!currentState || 
              (currentState === 'absent' && state !== 'absent') ||
              (currentState === 'present' && state === 'correct')) {
            newLetterStates[letter] = state
          }
        })
      })
      setLetterStates(newLetterStates)
    }
  }, [myAttempt, word])


  const checkUserAndUsername = async () => {
    if (!supabaseClient) return
    
    try {
      const { data: { user: currentUser } } = await supabaseClient.auth.getUser()
      setUser(currentUser)
      
      if (currentUser) {
        const usernameResult = await getUsername()
        if (usernameResult.success) {
          setCurrentUsername(usernameResult.username)
          setUsernameInput(usernameResult.username || '')
        }
      }
    } catch (err) {
      console.error('Error checking user:', err)
    }
  }

  const checkMyAttempt = async () => {
    setCheckingAttempt(true)
    try {
      // Check if user has already completed today's Wordle
      const attemptResult = await getMyWordleAttempt()
      if (attemptResult.success && attemptResult.attempt) {
        // User has already completed today's Wordle
        setMyAttempt(attemptResult.attempt)
        setFinalScore(attemptResult.attempt.score)
        setGameState(attemptResult.attempt.score === 7 ? 'lost' : 'won')
        setShowCompletedLayout(true)
        // Load the word (we still need it to display the grid)
        await loadDailyWord()
        // Load leaderboard (only show if user has completed)
        await loadLeaderboard()
      } else {
        // User hasn't completed today's Wordle, load the game normally
        await loadDailyWord()
        // Don't load leaderboard if user hasn't played yet
      }
    } catch (err) {
      console.error('Error checking attempt:', err)
      // If check fails, still load the game
      await loadDailyWord()
      // Don't load leaderboard if check failed
    } finally {
      setCheckingAttempt(false)
    }
  }

  const loadDailyWord = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchDailyWord()
      if (result.success && result.word) {
        setWord(result.word.toUpperCase())
      } else {
        setError(result.error || 'Failed to load daily word')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadLeaderboard = async () => {
    try {
      const result = await getWordleLeaderboard()
      if (result.success && result.attempts) {
        setLeaderboardAttempts(result.attempts)
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err)
    }
  }

  const evaluateGuess = useCallback((guess, targetWord) => {
    const result = Array(WORD_LENGTH).fill('absent')
    const targetLetters = targetWord.split('')
    const guessLetters = guess.split('')
    const letterCounts = {}

    // Count letters in target word
    targetLetters.forEach(letter => {
      letterCounts[letter] = (letterCounts[letter] || 0) + 1
    })

    // First pass: mark correct positions
    guessLetters.forEach((letter, i) => {
      if (letter === targetLetters[i]) {
        result[i] = 'correct'
        letterCounts[letter]--
      }
    })

    // Second pass: mark present letters (wrong position)
    guessLetters.forEach((letter, i) => {
      if (result[i] !== 'correct' && letterCounts[letter] > 0) {
        result[i] = 'present'
        letterCounts[letter]--
      }
    })

    return result
  }, [])

  const updateLetterStates = useCallback((guess, evaluation) => {
    setLetterStates(prevStates => {
      const newStates = { ...prevStates }
      guess.split('').forEach((letter, i) => {
        const currentState = newStates[letter]
        const newState = evaluation[i]

        // Priority: correct > present > absent
        if (!currentState || 
            (currentState === 'absent' && newState !== 'absent') ||
            (currentState === 'present' && newState === 'correct')) {
          newStates[letter] = newState
        }
      })
      return newStates
    })
  }, [])

  const submitGuess = useCallback(async () => {
    if (currentGuess.length !== WORD_LENGTH || gameState !== 'playing') return

    // Validate the word
    setIsInvalidWord(false)
    
    const validation = await validateWordCached(currentGuess)
    
    if (!validation.valid) {
      setIsInvalidWord(true)
      // Reset invalid state after animation
      setTimeout(() => {
        setIsInvalidWord(false)
      }, 500)
      return
    }

    setIsInvalidWord(false)

    const newGuesses = [...guesses]
    newGuesses[currentRow] = currentGuess
    setGuesses(newGuesses)

    const evaluation = evaluateGuess(currentGuess, word)
    updateLetterStates(currentGuess, evaluation)

    // Store this attempt with evaluation
    const attemptData = {
      guess: currentGuess,
      evaluation: evaluation
    }
    setAttemptsHistory(prev => [...prev, attemptData])

    if (currentGuess === word) {
      // Won - score is currentRow + 1 (1-indexed)
      const score = currentRow + 1
      setFinalScore(score)
      setGameState('won')
      // Show completed layout
      setShowCompletedLayout(true)
      // Save attempt to leaderboard only if user is logged in
      if (user) {
        saveWordleAttempt([...attemptsHistory, attemptData], score).then(() => {
          loadLeaderboard()
        }).catch(err => {
          console.error('Failed to save attempt:', err)
          loadLeaderboard()
        })
      } else {
        // Still load leaderboard for non-logged-in users
        loadLeaderboard()
      }
    } else if (currentRow === MAX_GUESSES - 1) {
      // Lost - score is 7
      setFinalScore(7)
      setGameState('lost')
      // For lost games, show completed layout immediately
      setShowCompletedLayout(true)
      // Save attempt to leaderboard only if user is logged in
      if (user) {
        saveWordleAttempt([...attemptsHistory, attemptData], 7).then(() => {
          loadLeaderboard()
        }).catch(err => {
          console.error('Failed to save attempt:', err)
          loadLeaderboard()
        })
      } else {
        // Still load leaderboard for non-logged-in users
        loadLeaderboard()
      }
    } else {
      setCurrentRow(prev => prev + 1)
      setCurrentGuess('')
    }
  }, [currentGuess, currentRow, guesses, word, gameState, attemptsHistory, evaluateGuess, updateLetterStates, loadLeaderboard, user])

  const handleKeyPress = useCallback((key) => {
    // Don't allow input if user has already completed today's Wordle
    if (myAttempt || gameState !== 'playing' || loading) return

    if (key === 'ENTER') {
      // Submit if we have a complete word (all 5 letters filled)
      if (currentGuess.length === WORD_LENGTH) {
        submitGuess()
      }
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1))
      setIsInvalidWord(false) // Clear invalid state when editing
    } else if (key.length === 1 && /[A-Z]/.test(key)) {
      if (currentGuess.length < WORD_LENGTH) {
        setCurrentGuess(prev => prev + key)
        setIsInvalidWord(false) // Clear invalid state when typing
      }
    }
  }, [myAttempt, currentGuess, gameState, loading, submitGuess])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleKeyPress('ENTER')
      } else if (e.key === 'Backspace') {
        handleKeyPress('BACKSPACE')
      } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        handleKeyPress(e.key.toUpperCase())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyPress])

  const getCellState = (row, col) => {
    // If showing my attempt, use the attempt data
    if (myAttempt && myAttempt.attempts && myAttempt.attempts[row]) {
      const attempt = myAttempt.attempts[row]
      return attempt.evaluation[col] || 'empty'
    }

    if (row < currentRow) {
      // Past guess - show evaluation
      const guess = guesses[row]
      if (guess && guess[col]) {
        const evaluation = evaluateGuess(guess, word)
        return evaluation[col]
      }
    } else if (row === currentRow) {
      // Current guess
      if (isInvalidWord) {
        return 'invalid'
      }
      // If game is won or lost, show the evaluation for the final guess
      if (gameState === 'won' || gameState === 'lost') {
        const guess = guesses[row]
        if (guess && guess[col]) {
          const evaluation = evaluateGuess(guess, word)
          return evaluation[col]
        }
      }
      return currentGuess[col] ? 'typing' : 'empty'
    }
    return 'empty'
  }

  const getCellLetter = (row, col) => {
    // If showing my attempt, use the attempt data
    if (myAttempt && myAttempt.attempts && myAttempt.attempts[row]) {
      const attempt = myAttempt.attempts[row]
      return attempt.guess[col] || ''
    }

    if (row < currentRow) {
      return guesses[row]?.[col] || ''
    } else if (row === currentRow) {
      return currentGuess[col] || ''
    }
    return ''
  }

  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
  ]

  const getScoreDisplay = (score) => {
    if (score === 7) return 'Failed'
    return `${score}/6`
  }

  const getScoreColor = (score) => {
    if (score === 1) return '#28a745' // Green
    if (score === 2) return '#20c997' // Teal
    if (score === 3) return '#17a2b8' // Cyan
    if (score === 4) return '#ffc107' // Yellow
    if (score === 5) return '#fd7e14' // Orange
    if (score === 6) return '#dc3545' // Red
    return '#6c757d' // Gray for failed
  }

  const renderAttemptGrid = (attemptData, showLetters) => {
    if (!attemptData || !Array.isArray(attemptData)) return null

    return (
      <div className="leaderboard-attempt-grid">
        {attemptData.map((attempt, attemptIndex) => (
          <div key={attemptIndex} className="leaderboard-attempt-row">
            {attempt.guess.split('').map((letter, letterIndex) => {
              const state = attempt.evaluation[letterIndex] || 'absent'
              return (
                <div
                  key={letterIndex}
                  className={`leaderboard-cell leaderboard-cell-${state}`}
                >
                  {showLetters ? letter : ''}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  if (loading || checkingAttempt) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="newspaper-title">Daily Wordl</h1>
          <p className="subtitle">Loading today's word...</p>
        </header>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="newspaper-title">Daily Wordl</h1>
          <p className="subtitle">Error loading game</p>
        </header>
        <div className="wordle-container">
          <div className="wordle-error">
            <p>{error}</p>
            <button className="wordle-btn" onClick={loadDailyWord}>
              Try Again
            </button>
            <button className="wordle-btn" onClick={() => navigate('/')}>
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-nav">
          <button className="home-link" onClick={() => navigate('/')}>
            ← Home
          </button>
        </div>
        <h1 className="newspaper-title">Daily Wordl</h1>
        <p className="subtitle">Guess the word in {MAX_GUESSES} tries</p>
      </header>

      <div className="wordle-container">
        {(showCompletedLayout || myAttempt) && !showLeaderboard && (
          <button 
            className="wordle-leaderboard-arrow"
            onClick={() => {
              setShowLeaderboard(true)
            }}
            aria-label="View Leaderboard"
          >
            <span className="wordle-leaderboard-arrow-text">Leaderboard</span>
            <span className="wordle-leaderboard-arrow-icon">→</span>
          </button>
        )}
        {showLeaderboard && (
          <button 
            className="wordle-back-arrow"
            onClick={() => {
              setShowLeaderboard(false)
            }}
            aria-label="Back to Game"
          >
            <span className="wordle-back-arrow-icon">←</span>
            <span className="wordle-back-arrow-text">Game</span>
          </button>
        )}
        <div className="wordle-views-container">
          <div className={`wordle-main-content ${showLeaderboard ? 'wordle-slide-out-left' : 'wordle-slide-in-left'}`}>
          <div className="wordle-game-section">
            <div className="wordle-grid">
              {Array(MAX_GUESSES).fill(0).map((_, row) => (
                <div key={row} className="wordle-row">
                  {Array(WORD_LENGTH).fill(0).map((_, col) => {
                    const state = getCellState(row, col)
                    const letter = getCellLetter(row, col)
                    return (
                      <div
                        key={col}
                        className={`wordle-cell wordle-cell-${state}`}
                      >
                        {letter}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="wordle-keyboard">
              {keyboardRows.map((row, rowIndex) => (
                <div key={rowIndex} className="wordle-keyboard-row">
                  {row.map((key) => {
                    const state = letterStates[key] || 'default'
                    const isSpecial = key === 'ENTER' || key === 'BACKSPACE'
                    return (
                      <button
                        key={key}
                        className={`wordle-key wordle-key-${state} ${isSpecial ? 'wordle-key-special' : ''}`}
                        onClick={() => handleKeyPress(key)}
                        disabled={gameState !== 'playing'}
                      >
                        {key === 'BACKSPACE' ? '⌫' : key}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          </div>

          <div className={`wordle-leaderboard-content wordle-leaderboard-page ${showLeaderboard ? 'wordle-slide-in-right' : 'wordle-slide-out-right'}`}>
            <div className="leaderboard-controls">
              <button
                className={`wordle-btn ${showLetters ? 'wordle-btn-active' : ''}`}
                onClick={() => setShowLetters(!showLetters)}
              >
                {showLetters ? 'Hide Letters' : 'Show Letters'}
              </button>
            </div>

            {leaderboardAttempts.length === 0 ? (
              <div className="wordle-message">
                <p>Loading leaderboard...</p>
              </div>
            ) : (
              <div className="leaderboard-list">
                  {leaderboardAttempts.slice(0, 10).map((attempt, index) => (
                    <div
                      key={attempt.id}
                    className={`leaderboard-item ${attempt.isCurrentUser ? 'leaderboard-item-current' : ''}`}
                    >
                    <div className="leaderboard-item-header">
                      <div className="leaderboard-rank">#{index + 1}</div>
                      <div className="leaderboard-user">
                          {attempt.userName}
                          {attempt.isCurrentUser && <span className="leaderboard-you"> (You)</span>}
                      </div>
                      <div
                        className="leaderboard-score"
                          style={{ color: getScoreColor(attempt.score) }}
                        >
                          {getScoreDisplay(attempt.score)}
                      </div>
                    </div>
                      {renderAttemptGrid(attempt.attempts, showLetters)}
                    </div>
                  ))}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Wordle

