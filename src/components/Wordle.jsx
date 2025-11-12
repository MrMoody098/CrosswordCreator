import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDailyWord } from '../utils/wordleApi'
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
  const navigate = useNavigate()

  useEffect(() => {
    loadDailyWord()
  }, [])

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

  const submitGuess = useCallback(() => {
    if (currentGuess.length !== WORD_LENGTH || gameState !== 'playing') return

    const newGuesses = [...guesses]
    newGuesses[currentRow] = currentGuess
    setGuesses(newGuesses)

    const evaluation = evaluateGuess(currentGuess, word)
    updateLetterStates(currentGuess, evaluation)

    if (currentGuess === word) {
      setGameState('won')
    } else if (currentRow === MAX_GUESSES - 1) {
      setGameState('lost')
    } else {
      setCurrentRow(prev => prev + 1)
      setCurrentGuess('')
    }
  }, [currentGuess, currentRow, guesses, word, gameState, evaluateGuess, updateLetterStates])

  const handleKeyPress = useCallback((key) => {
    if (gameState !== 'playing' || loading) return

    if (key === 'ENTER') {
      if (currentGuess.length === WORD_LENGTH) {
        submitGuess()
      }
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1))
    } else if (key.length === 1 && /[A-Z]/.test(key)) {
      if (currentGuess.length < WORD_LENGTH) {
        setCurrentGuess(prev => prev + key)
      }
    }
  }, [currentGuess, gameState, loading, submitGuess])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
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
    if (row < currentRow) {
      // Past guess - show evaluation
      const guess = guesses[row]
      if (guess && guess[col]) {
        const evaluation = evaluateGuess(guess, word)
        return evaluation[col]
      }
    } else if (row === currentRow) {
      // Current guess
      return currentGuess[col] ? 'typing' : 'empty'
    }
    return 'empty'
  }

  const getCellLetter = (row, col) => {
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

  if (loading) {
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

        {gameState === 'won' && (
          <div className="wordle-message wordle-message-won">
            <h2>Congratulations!</h2>
            <p>You guessed the word in {currentRow + 1} {currentRow === 0 ? 'try' : 'tries'}!</p>
          </div>
        )}

        {gameState === 'lost' && (
          <div className="wordle-message wordle-message-lost">
            <h2>Game Over</h2>
            <p>The word was: <strong>{word}</strong></p>
          </div>
        )}

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
  )
}

export default Wordle

