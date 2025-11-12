import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getCrosswordList, deleteCrosswordFromLocalStorage } from '../utils/localStorage'
import '../App.css'
import './Home.css'

function Home() {
  const [crosswords, setCrosswords] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadCrosswords()
  }, [])

  const loadCrosswords = async () => {
    try {
      setLoading(true)
      
      // Load from localStorage (primary source)
      const localCrosswords = getCrosswordList()
      
      // Also try to load from server (for backwards compatibility/shared crosswords)
      // On GitHub Pages, this will fail silently and we'll use localStorage only
      let serverCrosswords = []
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        
        const response = await fetch('/api/list-crosswords', {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const data = await response.json()
          serverCrosswords = data.crosswords || []
        }
      } catch (serverError) {
        // Server not available (expected on GitHub Pages), silently use localStorage only
        // This is normal for static site deployments - no error to show
      }
      
      // Combine lists, prioritizing localStorage (remove duplicates)
      const localNames = new Set(localCrosswords.map(c => c.name))
      const combined = [
        ...localCrosswords,
        ...serverCrosswords.filter(c => !localNames.has(c.name))
      ]
      
      // Sort by updatedAt or createdAt (most recent first)
      combined.sort((a, b) => {
        const aDate = new Date(a.updatedAt || a.createdAt || 0)
        const bDate = new Date(b.updatedAt || b.createdAt || 0)
        return bDate - aDate
      })
      
      setCrosswords(combined)
    } catch (error) {
      console.error('Error loading crosswords:', error)
      setCrosswords([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (crosswordName) => {
    const crossword = crosswords.find(c => c.name === crosswordName)
    const displayName = crossword?.displayName || crosswordName
    
    if (!confirm(`Are you sure you want to delete "${displayName}"?`)) {
      return
    }

    try {
      // Delete from localStorage
      deleteCrosswordFromLocalStorage(crosswordName)
      
      // Also try to delete from server (if it exists there)
      try {
        const response = await fetch('/api/delete-crossword', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: crosswordName })
        })
        // Don't throw if server delete fails - localStorage delete succeeded
        if (!response.ok) {
          console.warn('Server delete failed (crossword may not exist on server)')
        }
      } catch (serverError) {
        // Server not available or delete failed, but localStorage delete succeeded
        console.warn('Server delete failed:', serverError)
      }

      // Reload the list
      loadCrosswords()
    } catch (error) {
      console.error('Error deleting crossword:', error)
      alert(`Error deleting crossword: ${error.message}`)
    }
  }

  const handlePlay = (crosswordName) => {
    navigate(`/${crosswordName}`)
  }

  const handleCreate = () => {
    navigate('/create-crossword')
  }

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="newspaper-title">The Daily Crossword</h1>
          <p className="subtitle">Loading crosswords...</p>
        </header>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="newspaper-title">The Daily Crossword</h1>
        <p className="subtitle">Your Crossword Collection</p>
      </header>

      <div className="home-container">
        <div className="home-actions">
          <button className="home-btn create-btn" onClick={handleCreate}>
            Create New Crossword
          </button>
          <button className="home-btn wordle-btn" onClick={() => navigate('/daily-wordle')}>
            Daily Wordl
          </button>
        </div>

        <div className="crosswords-grid">
          {crosswords.length === 0 ? (
            <div className="no-crosswords">
              <p>No crosswords found. Create your first crossword!</p>
            </div>
          ) : (
            crosswords.map((crossword) => (
              <div key={crossword.name} className="crossword-card">
                <div className="card-header">
                  <h3 className="card-title">{crossword.displayName}</h3>
                </div>
                <div className="card-actions">
                  <button
                    className="card-btn play-btn"
                    onClick={() => handlePlay(crossword.name)}
                  >
                    Play
                  </button>
                  <button
                    className="card-btn delete-btn"
                    onClick={() => handleDelete(crossword.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Home

