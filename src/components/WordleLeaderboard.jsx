import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWordleLeaderboard } from '../utils/wordleLeaderboard'
import '../App.css'
import './Wordle.css'

function WordleLeaderboard() {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showLetters, setShowLetters] = useState(false)
  const [isSlidingIn, setIsSlidingIn] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadLeaderboard()
    // Trigger slide-in animation after a brief delay
    setTimeout(() => {
      setIsSlidingIn(true)
    }, 10)
  }, [])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getWordleLeaderboard()
      if (result.success && result.attempts) {
        setAttempts(result.attempts)
      } else {
        setError(result.error || 'Failed to load leaderboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-nav">
            <button className="home-link" onClick={() => navigate('/daily-wordle')}>
              ← Back to Game
            </button>
          </div>
          <h1 className="newspaper-title">Wordle Leaderboard</h1>
          <p className="subtitle">Loading...</p>
        </header>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-nav">
            <button className="home-link" onClick={() => navigate('/daily-wordle')}>
              ← Back to Game
            </button>
          </div>
          <h1 className="newspaper-title">Wordle Leaderboard</h1>
          <p className="subtitle">Error loading leaderboard</p>
        </header>
        <div className="wordle-container">
          <div className="wordle-error">
            <p>{error}</p>
            <button className="wordle-btn" onClick={loadLeaderboard}>
              Try Again
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
          <button className="home-link" onClick={() => navigate('/daily-wordle')}>
            ← Back to Game
          </button>
        </div>
        <h1 className="newspaper-title">Wordle Leaderboard</h1>
        <p className="subtitle">Today's Top Attempts</p>
      </header>

      <div className="wordle-container">
        <button 
          className="wordle-back-arrow"
          onClick={() => {
            setIsTransitioning(true)
            sessionStorage.setItem('wordle-returning', 'true')
            setTimeout(() => {
              navigate('/daily-wordle')
            }, 300) // Wait for slide animation
          }}
          aria-label="Back to Game"
        >
          <span className="wordle-back-arrow-icon">←</span>
          <span className="wordle-back-arrow-text">Game</span>
        </button>
        <div className={`wordle-leaderboard-content wordle-leaderboard-page ${isSlidingIn ? 'wordle-slide-in-right' : ''} ${isTransitioning ? 'wordle-slide-out-left' : ''}`}>
          <div className="leaderboard-controls">
          <button
            className={`wordle-btn ${showLetters ? 'wordle-btn-active' : ''}`}
            onClick={() => setShowLetters(!showLetters)}
          >
            {showLetters ? 'Hide Letters' : 'Show Letters'}
          </button>
        </div>

        {attempts.length === 0 ? (
          <div className="wordle-message">
            <p>No attempts yet today. Be the first!</p>
          </div>
        ) : (
          <div className="leaderboard-list">
            {attempts.map((attempt, index) => (
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
  )
}

export default WordleLeaderboard

