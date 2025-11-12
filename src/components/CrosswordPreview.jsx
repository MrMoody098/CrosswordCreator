import React from 'react'
import './CrosswordPreview.css'

function CrosswordPreview({ grid, maxSize = 15 }) {
  if (!grid || grid.length === 0) {
    return <div className="crossword-preview-empty">No preview available</div>
  }

  // Get actual grid dimensions
  const gridRows = grid.length
  const gridCols = grid[0]?.length || 0
  
  if (gridRows === 0 || gridCols === 0) {
    return <div className="crossword-preview-empty">No preview available</div>
  }

  // Use actual grid dimensions (don't scale down)
  const displayRows = gridRows
  const displayCols = gridCols

  return (
    <div className="crossword-preview">
      <div className="preview-grid" style={{ gridTemplateColumns: `repeat(${displayCols}, 1fr)` }}>
        {Array.from({ length: displayRows }).map((_, rowIndex) =>
          Array.from({ length: displayCols }).map((_, colIndex) => {
            const cell = grid[rowIndex]?.[colIndex]
            const isBlocked = !cell || cell === '.'
            const hasContent = cell && typeof cell === 'object' && cell.solution
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`preview-cell ${
                  isBlocked 
                    ? 'preview-cell-blocked' 
                    : hasContent
                      ? 'preview-cell-filled' 
                      : 'preview-cell-empty'
                }`}
              >
                {cell && typeof cell === 'object' && cell.number && (
                  <span className="preview-cell-number">{cell.number}</span>
                )}
                {/* Don't show solution letters - only show structure */}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default CrosswordPreview

