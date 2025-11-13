import React, { useEffect, useRef } from 'react'
import './Crossword.css'

function Crossword({ grid, userAnswers, selectedCell, selectedDirection, onCellClick, onKeyPress, checkStatus }) {
  const gridRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if the event target is an actual input field or button
      const target = e.target
      const isInputElement = target && (
        (target.tagName === 'INPUT' && target.type !== 'button' && target.type !== 'submit' && target.type !== 'reset') || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      )
      
      // Don't handle if user is typing in an input field
      if (isInputElement) {
        return
      }
      
      // Only handle crossword-related keys
      const isCrosswordKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete', 'Enter'].includes(e.key) ||
                            (e.key.length === 1 && /[A-Za-z]/.test(e.key))
      
      if (isCrosswordKey) {
        // Prevent default behavior (scrolling, etc.)
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        
        // Always focus the grid when handling crossword keys
        if (gridRef.current) {
          gridRef.current.focus()
        }
        
        onKeyPress(e.key, e.shiftKey)
        return false
      }
    }

    // Focus the grid when a cell is selected
    if (gridRef.current && selectedCell) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        if (gridRef.current) {
          gridRef.current.focus()
        }
      }, 0)
    }

    // Use capture phase to catch events before they reach other handlers
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onKeyPress, selectedCell])

  // Focus grid when clicking anywhere (except inputs)
  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target
      const isInputElement = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'BUTTON' ||
        target.isContentEditable
      )
      
      // Focus grid if clicking outside input elements and a cell is selected
      if (!isInputElement && selectedCell && gridRef.current) {
        gridRef.current.focus()
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [selectedCell])

  const getCellClass = (row, col) => {
    const cell = grid[row][col]
    if (!cell || cell === '.') return 'cell cell-blocked'
    
    const isSelected = selectedCell?.row === row && selectedCell?.col === col
    const isInWord = selectedCell && 
      ((selectedDirection === 'across' && cell.across && 
        grid[selectedCell.row]?.[selectedCell.col]?.across === cell.across) ||
       (selectedDirection === 'down' && cell.down && 
        grid[selectedCell.row]?.[selectedCell.col]?.down === cell.down))
    
    // Highlight cells in the current direction - highlight entire row/column
    let isInDirection = false
    if (selectedCell && !isSelected && cell !== '.' && typeof cell === 'object') {
      if (selectedDirection === 'across' && selectedCell.row === row) {
        // Highlight entire row (all cells in the same row)
        isInDirection = true
      } else if (selectedDirection === 'down' && selectedCell.col === col) {
        // Highlight entire column (all cells in the same column)
        isInDirection = true
      }
    }
    
    let classes = 'cell'
    if (isSelected) classes += ' cell-selected'
    if (isInWord && selectedCell) classes += ' cell-in-word'
    if (isInDirection) classes += ' cell-in-direction'
    return classes
  }

  const getCellContent = (row, col) => {
    const cell = grid[row][col]
    if (!cell || cell === '.') return null
    
    const answer = userAnswers[`${row}-${col}`] || ''
    return (
      <>
        {cell.number && <span className="cell-number">{cell.number}</span>}
        <span className="cell-letter">{answer}</span>
      </>
    )
  }

  if (!grid || grid.length === 0) return null

  const gridClass = `crossword-grid ${checkStatus === 'correct' ? 'correct' : ''} ${checkStatus === 'wrong' ? 'wrong' : ''}`

  return (
    <div 
      className={gridClass} 
      ref={gridRef} 
      tabIndex={0}
      onFocus={(e) => {
        // Ensure grid stays focused when clicked
        if (gridRef.current) {
          gridRef.current.focus()
        }
      }}
    >
      {grid.map((row, rowIndex) => (
        <div key={rowIndex} className="grid-row">
          {row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={getCellClass(rowIndex, colIndex)}
      onClick={(e) => {
        e.stopPropagation()
        onCellClick(rowIndex, colIndex)
        // Focus grid after clicking
        if (gridRef.current) {
          gridRef.current.focus()
        }
      }}
            >
              {getCellContent(rowIndex, colIndex)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default Crossword

