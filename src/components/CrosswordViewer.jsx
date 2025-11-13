import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Crossword from './Crossword'
import ClueList from './ClueList'
import { parseCluesCSV, parseGridCSV } from '../utils/csvParser'
import { loadCrosswordFromLocalStorage, saveViewerState, loadViewerState, clearViewerState } from '../utils/localStorage'
import '../App.css'

function CrosswordViewer({ crosswordName = 'default' }) {
  const [selectedCell, setSelectedCell] = useState(null)
  const [selectedDirection, setSelectedDirection] = useState('across')
  const [grid, setGrid] = useState([])
  const [clues, setClues] = useState({ across: [], down: [] })
  const [userAnswers, setUserAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isComplete, setIsComplete] = useState(false)
  const [checkStatus, setCheckStatus] = useState(null) // null, 'wrong', 'correct'
  const [displayName, setDisplayName] = useState(null)
  const location = useLocation()

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = loadViewerState(crosswordName)
    if (savedState) {
      setUserAnswers(savedState.userAnswers || {})
      setSelectedCell(savedState.selectedCell || null)
      setSelectedDirection(savedState.selectedDirection || 'across')
    }
  }, [crosswordName])

  // Save state to localStorage when it changes (debounced)
  useEffect(() => {
    if (!crosswordName || loading) return // Don't save until crossword is loaded
    
    const timeoutId = setTimeout(() => {
      const stateToSave = {
        userAnswers,
        selectedCell,
        selectedDirection
      }
      saveViewerState(crosswordName, stateToSave)
    }, 500) // Debounce by 500ms

    return () => clearTimeout(timeoutId)
  }, [crosswordName, userAnswers, selectedCell, selectedDirection, loading])

  // Clear state when navigating away from this crossword
  useEffect(() => {
    return () => {
      // Clear state when component unmounts (navigating away)
      const currentPath = window.location.pathname
      if (!currentPath.includes(crosswordName)) {
        clearViewerState(crosswordName)
      }
    }
  }, [crosswordName])

  // Load crossword CSV files based on name
  useEffect(() => {
    // Don't try to load reserved names
    const reservedNames = ['create-crossword', 'CrosswordCreator', 'crosswordcreator']
    if (reservedNames.includes(crosswordName)) {
      return
    }
    
    const loadPuzzle = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Try loading from localStorage first
        const localData = loadCrosswordFromLocalStorage(crosswordName)
        
        if (localData) {
          // Load from localStorage
          const parsedClues = parseCluesCSV(localData.cluesCSV)
          const parsedGrid = parseGridCSV(localData.gridCSV)
          setClues(parsedClues)
          setGrid(parsedGrid)
          
          // Set display name from metadata
          if (localData.metadata && localData.metadata.displayName) {
            setDisplayName(localData.metadata.displayName)
          } else {
            setDisplayName(null)
          }
        } else {
          // Fallback to server/public files
          const cluesFileName = crosswordName === 'default' ? 'clues.csv' : `${crosswordName}-clues.csv`
          const gridFileName = crosswordName === 'default' ? 'grid.csv' : `${crosswordName}-grid.csv`

          // Use relative paths for GitHub Pages compatibility
          const basePath = import.meta.env.BASE_URL || '/'
          const cluesPath = `${basePath}${cluesFileName}`
          const gridPath = `${basePath}${gridFileName}`

          // Load clues CSV
          const cluesResponse = await fetch(cluesPath)
          if (!cluesResponse.ok) {
            throw new Error(`Failed to load ${cluesFileName}: ${cluesResponse.status}`)
          }
          const cluesText = await cluesResponse.text()
          const parsedClues = parseCluesCSV(cluesText)
          setClues(parsedClues)

          // Load grid CSV
          const gridResponse = await fetch(gridPath)
          if (!gridResponse.ok) {
            throw new Error(`Failed to load ${gridFileName}: ${gridResponse.status}`)
          }
          const gridText = await gridResponse.text()
          const parsedGrid = parseGridCSV(gridText)
          setGrid(parsedGrid)
        }
      } catch (error) {
        console.error('Error loading puzzle:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadPuzzle()
  }, [crosswordName])

  // Set initial selected cell to number 1
  useEffect(() => {
    if (grid && grid.length > 0 && !selectedCell && clues) {
      // Find the cell with number 1
      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
          const cell = grid[row][col]
          if (cell && cell !== '.' && typeof cell === 'object' && cell.number === 1) {
            setSelectedCell({ row, col })
            
            // Set direction based on which direction has a clue available
            const hasAcrossClue = cell.across && clues.across.some(c => c.number === cell.across)
            const hasDownClue = cell.down && clues.down.some(c => c.number === cell.down)
            
            if (hasAcrossClue && hasDownClue) {
              // Both have clues, default to across
              setSelectedDirection('across')
            } else if (hasAcrossClue) {
              setSelectedDirection('across')
            } else if (hasDownClue) {
              setSelectedDirection('down')
            } else {
              // Fallback: use cell properties if clues aren't loaded yet
              if (cell.across && cell.down) {
                setSelectedDirection('across')
              } else if (cell.across) {
                setSelectedDirection('across')
              } else if (cell.down) {
                setSelectedDirection('down')
              }
            }
            return
          }
        }
      }
    }
  }, [grid, selectedCell, clues])

  // Scroll crossword grid into view on mobile when cell is selected
  useEffect(() => {
    if (selectedCell && window.innerWidth <= 768) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const crosswordGrid = document.querySelector('.crossword-grid')
        if (crosswordGrid) {
          crosswordGrid.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          })
        }
      }, 100)
    }
  }, [selectedCell])

  const handleCellClick = (row, col) => {
    const cell = grid[row][col]
    if (!cell || cell === '.') return

    setSelectedCell({ row, col })
    
    if (cell.across && cell.down) {
      // Keep current direction if both available
    } else if (cell.across) {
      setSelectedDirection('across')
    } else if (cell.down) {
      setSelectedDirection('down')
    }
  }

  const handleKeyPress = (key, shiftKey = false) => {
    if (!selectedCell) return

    const { row, col } = selectedCell
    const cell = grid[row][col]

    // Shift + Arrow keys: change direction only
    if (shiftKey) {
      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        setSelectedDirection('across')
        return
      }
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        setSelectedDirection('down')
        return
      }
    }

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const direction = key === 'ArrowRight' ? 1 : -1
      moveToNextCell(direction, 'across')
      return
    }

    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const direction = key === 'ArrowDown' ? 1 : -1
      moveToNextCell(direction, 'down')
      return
    }

    if (key === 'Backspace' || key === 'Delete') {
      const newAnswers = { ...userAnswers }
      delete newAnswers[`${row}-${col}`]
      setUserAnswers(newAnswers)
      
      // Move back one cell in the current direction (like CrosswordBuilder)
      if (selectedDirection === 'across') {
        if (col > 0) {
          const prevCell = grid[row]?.[col - 1]
          if (prevCell && prevCell !== '.' && typeof prevCell === 'object') {
            // Check if prev cell is part of the same word
            const currentWordNumber = cell.across
            if (prevCell.across === currentWordNumber) {
              setSelectedCell({ row, col: col - 1 })
            }
          }
        }
      } else {
        if (row > 0) {
          const prevCell = grid[row - 1]?.[col]
          if (prevCell && prevCell !== '.' && typeof prevCell === 'object') {
            // Check if prev cell is part of the same word
            const currentWordNumber = cell.down
            if (prevCell.down === currentWordNumber) {
              setSelectedCell({ row: row - 1, col })
            }
          }
        }
      }
      return
    }

    if (key === 'Enter') {
      // Check answer if all cells are filled
      if (isComplete) {
        handleCheckAnswer()
      }
      return
    }

    if (key.length === 1 && /[A-Za-z]/.test(key)) {
      const letter = key.toUpperCase()
      const newAnswers = { ...userAnswers, [`${row}-${col}`]: letter }
      setUserAnswers(newAnswers)
      
      // Auto-advance to next cell in current direction (like CrosswordBuilder)
      if (selectedDirection === 'across') {
        if (col + 1 < grid[0]?.length) {
          const nextCell = grid[row]?.[col + 1]
          if (nextCell && nextCell !== '.' && typeof nextCell === 'object') {
            // Check if next cell is part of the same word
            const currentWordNumber = cell.across
            if (nextCell.across === currentWordNumber) {
              setSelectedCell({ row, col: col + 1 })
            }
          }
        }
      } else {
        if (row + 1 < grid.length) {
          const nextCell = grid[row + 1]?.[col]
          if (nextCell && nextCell !== '.' && typeof nextCell === 'object') {
            // Check if next cell is part of the same word
            const currentWordNumber = cell.down
            if (nextCell.down === currentWordNumber) {
              setSelectedCell({ row: row + 1, col })
            }
          }
        }
      }
    }
  }

  const moveToNextCell = (direction, forcedDirection = null) => {
    if (!selectedCell || !grid || grid.length === 0) return

    const { row, col } = selectedCell
    const currentDirection = forcedDirection || selectedDirection
    const isAcross = currentDirection === 'across'
    const rowDelta = isAcross ? 0 : direction
    const colDelta = isAcross ? direction : 0

    // Update direction if forced
    if (forcedDirection && forcedDirection !== selectedDirection) {
      setSelectedDirection(forcedDirection)
    }

    let newRow = row + rowDelta
    let newCol = col + colDelta

    // First, try to find a cell in the exact direction (straight line)
    while (newRow >= 0 && newRow < grid.length && 
           newCol >= 0 && newCol < (grid[0]?.length || 0)) {
      const cell = grid[newRow]?.[newCol]
      // Skip blocked cells ('.'), only move to valid cells
      if (cell && cell !== '.' && typeof cell === 'object') {
        setSelectedCell({ row: newRow, col: newCol })
        // Update direction if the new cell has a different word in that direction
        if (isAcross && cell.across) {
          setSelectedDirection('across')
        } else if (!isAcross && cell.down) {
          setSelectedDirection('down')
        }
        return
      }
      // Continue searching in the same direction, skipping blocked cells
      newRow += rowDelta
      newCol += colDelta
    }
    
    // If no cell found in straight line, search nearby cells (including diagonal)
    // This handles cases where the next valid cell is not in the exact same row/column
    const searchRadius = 3 // Search up to 3 cells away in any direction
    let closestCell = null
    let closestDistance = Infinity

    for (let dr = -searchRadius; dr <= searchRadius; dr++) {
      for (let dc = -searchRadius; dc <= searchRadius; dc++) {
        // Skip the current cell and cells in the opposite direction
        if (dr === 0 && dc === 0) continue
        if (isAcross && dc === 0) continue // Skip same column for across
        if (!isAcross && dr === 0) continue // Skip same row for down
        
        // Prefer cells in the general direction we're moving
        const isInDirection = isAcross 
          ? (direction > 0 ? dc > 0 : dc < 0)
          : (direction > 0 ? dr > 0 : dr < 0)
        
        if (!isInDirection) continue

        const checkRow = row + dr
        const checkCol = col + dc

        if (checkRow >= 0 && checkRow < grid.length && 
            checkCol >= 0 && checkCol < (grid[0]?.length || 0)) {
          const cell = grid[checkRow]?.[checkCol]
          if (cell && cell !== '.' && typeof cell === 'object') {
            // Calculate distance (prefer closer cells)
            const distance = Math.abs(dr) + Math.abs(dc)
            if (distance < closestDistance) {
              closestDistance = distance
              closestCell = { row: checkRow, col: checkCol, cell }
            }
          }
        }
      }
    }

    // If we found a nearby cell, move to it
    if (closestCell) {
      setSelectedCell({ row: closestCell.row, col: closestCell.col })
      // Update direction based on the new cell
      if (isAcross && closestCell.cell.across) {
        setSelectedDirection('across')
      } else if (!isAcross && closestCell.cell.down) {
        setSelectedDirection('down')
      }
      return
    }
    
    // If we didn't find a valid cell, don't move (stay on current cell)
  }

  const handleClueClick = (number, direction) => {
    setSelectedDirection(direction)
    
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[0].length; col++) {
        const cell = grid[row][col]
        if (cell && cell !== '.' && 
            ((direction === 'across' && cell.across === number) ||
             (direction === 'down' && cell.down === number))) {
          setSelectedCell({ row, col })
          return
        }
      }
    }
  }

  // Check if all cells with solutions are filled
  useEffect(() => {
    if (!grid || grid.length === 0) {
      setIsComplete(false)
      return
    }

    let allFilled = true
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cell = grid[row][col]
        if (cell && cell !== '.' && cell.solution) {
          const key = `${row}-${col}`
          if (!userAnswers[key] || userAnswers[key].trim() === '') {
            allFilled = false
            break
          }
        }
      }
      if (!allFilled) break
    }
    setIsComplete(allFilled)
  }, [userAnswers, grid])

  const handleCheckAnswer = () => {
    if (!isComplete) return

    // Check if all answers are correct
    let allCorrect = true
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cell = grid[row][col]
        if (cell && cell !== '.' && cell.solution) {
          const key = `${row}-${col}`
          const userAnswer = (userAnswers[key] || '').trim().toUpperCase()
          const correctAnswer = (cell.solution || '').trim().toUpperCase()
          if (userAnswer !== correctAnswer) {
            allCorrect = false
            break
          }
        }
      }
      if (!allCorrect) break
    }

    if (allCorrect) {
      setCheckStatus('correct')
    } else {
      setCheckStatus('wrong')
      // Reset after animation
      setTimeout(() => {
        setCheckStatus(null)
      }, 1000)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the crossword? All your answers will be cleared.')) {
      setUserAnswers({})
      setCheckStatus(null)
      setSelectedCell(null)
    }
  }

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="newspaper-title">The Daily Crossword</h1>
          <p className="subtitle">Loading puzzle...</p>
        </header>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="newspaper-title">Error</h1>
          <p className="subtitle">{error}</p>
          <p><a href="/">Go Home</a> | <a href="/create-crossword">Create New Crossword</a></p>
        </header>
      </div>
    )
  }

  if (!grid || grid.length === 0) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="newspaper-title">No Puzzle Found</h1>
          <p className="subtitle">Could not load puzzle: {crosswordName}</p>
        </header>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-nav">
          <Link to="/" className="home-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="home-icon">
              <path d="M8 1L1 6V14H5V10H11V14H15V6L8 1Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
            </svg>
            Home
          </Link>
        </div>
        <h1 className="newspaper-title">
          {displayName || (crosswordName === 'default' ? 'Tech Economics Crossword' : crosswordName)}
        </h1>
        <p className="subtitle">Interactive Puzzle</p>
      </header>
      <div className="game-container">
        <div className="crossword-section">
          <div className="instructions-container">
            <div className="how-to-play">
              <h3>How to Play</h3>
              <ul>
                <li>Click a cell or clue to select it</li>
                <li>Type letters to fill in answers</li>
                <li>Use arrow keys to navigate</li>
                <li>Shift + Arrow keys to change direction</li>
                <li>Backspace/Delete to clear letters</li>
              </ul>
            </div>
            <div className="check-button-container">
              <div className="button-group">
                <button
                  className={`check-button ${isComplete ? 'active' : 'inactive'}`}
                  onClick={handleCheckAnswer}
                  disabled={!isComplete}
                >
                  Check Answer
                </button>
                <button
                  className="reset-button"
                  onClick={handleReset}
                  title="Reset"
                >
                  ↻
                </button>
              </div>
              {checkStatus === 'correct' && (
                <div className="congratulations">
                  Correct! Congratulations!
                </div>
              )}
            </div>
          </div>
          <Crossword
            grid={grid}
            userAnswers={userAnswers}
            selectedCell={selectedCell}
            selectedDirection={selectedDirection}
            onCellClick={handleCellClick}
            onKeyPress={handleKeyPress}
            checkStatus={checkStatus}
          />
        </div>
        <div className="clues-section">
          <ClueList
            clues={clues}
            selectedDirection={selectedDirection}
            selectedCell={selectedCell}
            grid={grid}
            onClueClick={handleClueClick}
            onDirectionChange={setSelectedDirection}
          />
        </div>
      </div>
    </div>
  )
}

export default CrosswordViewer

