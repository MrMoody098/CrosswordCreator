import React from 'react'
import './CrosswordPreview.css'

function CrosswordPreview({ grid, maxSize = 8 }) {
  if (!grid || grid.length === 0) {
    return <div className="crossword-preview-empty">No preview available</div>
  }

  // Calculate the actual grid size (find the bounds)
  let maxRow = 0
  let maxCol = 0
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length || 0); c++) {
      if (grid[r] && grid[r][c] && grid[r][c] !== '.') {
        maxRow = Math.max(maxRow, r)
        maxCol = Math.max(maxCol, c)
      }
    }
  }

  const gridSize = Math.max(maxRow + 1, maxCol + 1, 1)
  
  // Scale down the grid if it's larger than maxSize
  const scale = gridSize > maxSize ? maxSize / gridSize : 1
  const displaySize = Math.min(gridSize, maxSize)

  // Sample cells to show in preview (if grid is larger than maxSize, sample evenly)
  const getCell = (r, c) => {
    if (scale < 1) {
      // Sample cells
      const sourceRow = Math.floor(r / scale)
      const sourceCol = Math.floor(c / scale)
      return grid[sourceRow]?.[sourceCol]
    }
    return grid[r]?.[c]
  }

  return (
    <div className="crossword-preview">
      <div className="preview-grid" style={{ gridTemplateColumns: `repeat(${displaySize}, 1fr)` }}>
        {Array.from({ length: displaySize }).map((_, rowIndex) =>
          Array.from({ length: displaySize }).map((_, colIndex) => {
            const cell = getCell(rowIndex, colIndex)
            const isBlocked = !cell || cell === '.'
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`preview-cell ${isBlocked ? 'preview-cell-blocked' : 'preview-cell-filled'}`}
                title={cell && typeof cell === 'object' && cell.solution ? cell.solution : ''}
              >
                {cell && typeof cell === 'object' && cell.number && (
                  <span className="preview-cell-number">{cell.number}</span>
                )}
                {cell && typeof cell === 'object' && cell.solution && (
                  <span className="preview-cell-letter">{cell.solution}</span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default CrosswordPreview

