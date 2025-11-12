import React, { useEffect, useRef } from 'react'
import './ClueList.css'

function ClueList({ clues, selectedDirection, selectedCell, grid, onClueClick, onDirectionChange }) {
  const cluesContentRef = useRef(null)

  // Prevent arrow keys from scrolling the clues list
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent arrow keys from scrolling the clues content
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        // Only prevent if the clues content is focused or contains the target
        if (cluesContentRef.current && 
            (cluesContentRef.current === e.target || cluesContentRef.current.contains(e.target))) {
          e.preventDefault()
          e.stopPropagation()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  const getCurrentClueNumber = () => {
    if (!selectedCell) return null
    const cell = grid[selectedCell.row]?.[selectedCell.col]
    if (!cell || cell === '.') return null
    return selectedDirection === 'across' ? cell.across : cell.down
  }

  const currentClueNumber = getCurrentClueNumber()

  return (
    <div className="clues-container">
      <div className="clues-tabs">
        <button
          className={`tab ${selectedDirection === 'across' ? 'tab-active' : ''}`}
          onClick={() => onDirectionChange('across')}
        >
          Across
        </button>
        <button
          className={`tab ${selectedDirection === 'down' ? 'tab-active' : ''}`}
          onClick={() => onDirectionChange('down')}
        >
          Down
        </button>
      </div>
      <div className="clues-list">
        <h3 className="clues-title">{selectedDirection === 'across' ? 'Across' : 'Down'}</h3>
        <div className="clues-content" ref={cluesContentRef} tabIndex={-1}>
          {clues[selectedDirection].map((clue) => (
            <div
              key={clue.number}
              className={`clue-item ${currentClueNumber === clue.number ? 'clue-active' : ''}`}
              onClick={() => onClueClick(clue.number, selectedDirection)}
            >
              <span className="clue-number">{clue.number}.</span>
              <span className="clue-text">{clue.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ClueList

