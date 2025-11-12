import React, { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { gridToCSV, cluesToCSV, downloadCSV, saveCSVToServer } from '../utils/crosswordBuilder'
import { saveCrosswordToLocalStorage } from '../utils/localStorage'
import './CrosswordBuilder.css'

const GRID_SIZE = 15

function CrosswordBuilder() {
  const [gridSize, setGridSize] = useState(GRID_SIZE)
  const [grid, setGrid] = useState(() => {
    const initialGrid = []
    for (let r = 0; r < GRID_SIZE; r++) {
      initialGrid[r] = []
      for (let c = 0; c < GRID_SIZE; c++) {
        initialGrid[r][c] = null // Start with empty (white) cells
      }
    }
    return initialGrid
  })
  const [selectedCell, setSelectedCell] = useState(null)
  const [selectionStart, setSelectionStart] = useState(null) // For multi-cell selection
  const [selectionEnd, setSelectionEnd] = useState(null) // For multi-cell selection
  const [isSelecting, setIsSelecting] = useState(false) // Track if we're extending selection
  const [hasChangedDirection, setHasChangedDirection] = useState(false) // Track if direction was changed in current shift session
  const [lastShiftDirection, setLastShiftDirection] = useState(null) // Track last direction used with Shift
  const [copiedCells, setCopiedCells] = useState(null) // For copy/paste
  const [isMouseDragging, setIsMouseDragging] = useState(false) // Track if we're dragging with mouse
  const [dragStartCell, setDragStartCell] = useState(null) // Track where mouse drag started
  const [hasDragged, setHasDragged] = useState(false) // Track if mouse moved during drag (to distinguish click from drag)
  const [currentMode, setCurrentMode] = useState('letter') // 'letter', 'block', 'number'
  const [currentLetter, setCurrentLetter] = useState('')
  const [currentDirection, setCurrentDirection] = useState('across')
  const [clues, setClues] = useState({ across: [], down: [] })
  const [crosswordName, setCrosswordName] = useState('')
  const [editingClue, setEditingClue] = useState(null) // { number, direction }
  // selectedClueDirection is now synced with currentDirection - no separate state needed
  const [nameInputError, setNameInputError] = useState(false) // For flashing/shaking animation
  const [showShortcuts, setShowShortcuts] = useState(false) // For showing shortcuts popup

  const handleCellClick = (row, col) => {
    // Don't handle click if we just finished a drag - the drag handler manages that
    if (hasDragged) {
      setHasDragged(false)
      return
    }
    
    setSelectedCell({ row, col })
    // Clear selection when clicking (unless we're dragging)
    setSelectionStart(null)
    setSelectionEnd(null)
    setIsSelecting(false)
    setHasChangedDirection(false)
    setLastShiftDirection(null)
    
    if (currentMode === 'block') {
      const newGrid = grid.map(r => [...r])
      const currentCell = newGrid[row][col]
      // Toggle between empty (null) and blocked ('.')
      newGrid[row][col] = currentCell === '.' ? null : '.'
      setGrid(newGrid)
      return
    }

    if (currentMode === 'number') {
      const cell = grid[row][col]
      if (cell === '.') {
        // Can't number blocked cells
        return
      }
      
      const newGrid = grid.map(r => [...r])
      const currentCell = newGrid[row][col]
      let newClues = { ...clues }
      
      let isRemoving = false
      
      if (currentCell && typeof currentCell === 'object') {
        // Toggle number
        if (currentCell.number) {
          // Remove number
          isRemoving = true
          const oldNumber = currentCell.number
          newGrid[row][col] = {
            ...currentCell,
            number: null
          }
          
          // Remove clues for this number
          newClues.across = newClues.across.filter(c => c.number !== oldNumber)
          newClues.down = newClues.down.filter(c => c.number !== oldNumber)
        } else {
          // Add number - will be assigned by renumbering
          newGrid[row][col] = {
            ...currentCell,
            number: 999 // Temporary number, will be renumbered
          }
        }
      } else {
        // Create new cell with number (will be renumbered)
        newGrid[row][col] = {
          number: 999, // Temporary number, will be renumbered
          across: null,
          down: null,
          solution: currentCell?.solution || ''
        }
      }
      
      // Renumber all cells based on position
      const { updatedGrid, updatedClues } = renumberAllNumbers(newGrid, newClues)
      
      // Automatically update hints based on letters around numbered cells
      // Only creates hints if the numbered cell has a letter AND adjacent cells have letters
      const finalClues = updateHintsFromNumbers(updatedGrid, updatedClues)
      
      setGrid(updatedGrid)
      setClues(finalClues)
      return
    }

    // Letter mode - start editing
    if (currentMode === 'letter') {
      const cell = grid[row][col]
      if (cell === '.') {
        // Can't edit blocked cells
        return
      }
      
      if (cell && typeof cell === 'object') {
        setCurrentLetter(cell.solution || '')
      } else {
        // Convert empty cell to cell object for editing
        const newGrid = grid.map(r => [...r])
        newGrid[row][col] = {
          number: null,
          across: null,
          down: null,
          solution: ''
        }
        setGrid(newGrid)
        setCurrentLetter('')
      }
    }
  }

  const detectWordStart = (gridToCheck, row, col) => {
    const cell = gridToCheck[row]?.[col]
    if (!cell || cell === '.' || typeof cell !== 'object') return false
    if (!cell.solution || !cell.solution.trim()) return false // Must have a letter
    
    // Check if this is the start of an across word
    const isAcrossStart = isWordStartAcross(gridToCheck, row, col)
    // Check if this is the start of a down word
    const isDownStart = isWordStartDown(gridToCheck, row, col)
    
    return isAcrossStart || isDownStart
  }

  const isWordStartAcross = (gridToCheck, row, col) => {
    const cell = gridToCheck[row]?.[col]
    if (!cell || cell === '.' || typeof cell !== 'object' || !cell.solution) return false
    
    // Check if previous cell is blocked/empty (making this a start)
    const prevCell = col > 0 ? gridToCheck[row]?.[col - 1] : null
    const isStart = !prevCell || prevCell === '.' || prevCell === null
    
    // Check if next cell has a letter (word continues)
    const nextCell = gridToCheck[row]?.[col + 1]
    const hasContinuation = nextCell && nextCell !== '.' && nextCell !== null && 
                           typeof nextCell === 'object' && nextCell.solution
    
    return isStart && hasContinuation
  }

  const isWordStartDown = (gridToCheck, row, col) => {
    const cell = gridToCheck[row]?.[col]
    if (!cell || cell === '.' || typeof cell !== 'object' || !cell.solution) return false
    
    // Check if previous cell is blocked/empty (making this a start)
    const prevCell = row > 0 ? gridToCheck[row - 1]?.[col] : null
    const isStart = !prevCell || prevCell === '.' || prevCell === null
    
    // Check if next cell has a letter (word continues)
    const nextCell = gridToCheck[row + 1]?.[col]
    const hasContinuation = nextCell && nextCell !== '.' && nextCell !== null && 
                           typeof nextCell === 'object' && nextCell.solution
    
    return isStart && hasContinuation
  }

  const cleanupOrphanedClues = (gridToCheck, cluesToClean) => {
    // Collect all numbers that exist on the grid
    const gridNumbers = new Set()
    gridToCheck.forEach(row => {
      row.forEach(cell => {
        if (cell && typeof cell === 'object' && cell.number) {
          gridNumbers.add(cell.number)
        }
      })
    })
    
    // Remove clues that don't have corresponding numbers
    const cleanedClues = {
      across: cluesToClean.across.filter(c => gridNumbers.has(c.number)),
      down: cluesToClean.down.filter(c => gridNumbers.has(c.number))
    }
    
    // Only update if there were changes
    if (cleanedClues.across.length !== cluesToClean.across.length ||
        cleanedClues.down.length !== cluesToClean.down.length) {
      setClues(cleanedClues)
    }
  }

  // Automatically update hints based on letters around numbered cells
  const updateHintsFromNumbers = useCallback((gridToCheck, cluesToUpdate) => {
    const updatedClues = { across: [], down: [] }
    
    // Find all numbered cells
    const numberedCells = []
    for (let r = 0; r < gridToCheck.length; r++) {
      for (let c = 0; c < gridToCheck[r].length; c++) {
        const cell = gridToCheck[r]?.[c]
        if (cell && typeof cell === 'object' && cell.number) {
          numberedCells.push({ row: r, col: c, number: cell.number, cell })
        }
      }
    }
    
    // For each numbered cell, check adjacent letters and create hints
    for (const { row, col, number, cell } of numberedCells) {
      // Check if the numbered cell itself has a letter
      const cellHasLetter = cell && typeof cell === 'object' && 
                           cell.solution && cell.solution.trim()
      
      // Check if there's a letter to the right (across direction)
      const rightCell = col + 1 < gridSize ? gridToCheck[row]?.[col + 1] : null
      const hasRightLetter = rightCell && rightCell !== '.' && rightCell !== null &&
                            typeof rightCell === 'object' && rightCell.solution && rightCell.solution.trim()
      
      // Check if there's a letter below (down direction)
      const belowCell = row + 1 < gridSize ? gridToCheck[row + 1]?.[col] : null
      const hasBelowLetter = belowCell && belowCell !== '.' && belowCell !== null &&
                            typeof belowCell === 'object' && belowCell.solution && belowCell.solution.trim()
      
      // Find existing clue text for this number
      const existingAcrossClue = cluesToUpdate.across.find(c => c.number === number)
      const existingDownClue = cluesToUpdate.down.find(c => c.number === number)
      
      // Add across hint only if cell has letter AND there's a letter to the right
      if (cellHasLetter && hasRightLetter) {
        updatedClues.across.push({ 
          number, 
          text: existingAcrossClue?.text || '' 
        })
      }
      
      // Add down hint only if cell has letter AND there's a letter below
      if (cellHasLetter && hasBelowLetter) {
        updatedClues.down.push({ 
          number, 
          text: existingDownClue?.text || '' 
        })
      }
    }
    
    // Sort clues by number
    updatedClues.across.sort((a, b) => a.number - b.number)
    updatedClues.down.sort((a, b) => a.number - b.number)
    
    return updatedClues
  }, [gridSize])

  // Renumber all cells with numbers based on position (top-left to bottom-right)
  const renumberAllNumbers = useCallback((gridToRenumber, cluesToUpdate) => {
    // Find all cells with numbers
    const numberedCells = []
    for (let r = 0; r < gridToRenumber.length; r++) {
      for (let c = 0; c < gridToRenumber[r].length; c++) {
        const cell = gridToRenumber[r]?.[c]
        if (cell && typeof cell === 'object' && cell.number) {
          numberedCells.push({ row: r, col: c, cell })
        }
      }
    }
    
    // Sort by position (top to bottom, left to right)
    numberedCells.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row
      return a.col - b.col
    })
    
    // Create mapping from old number to new number
    const oldToNewNumber = new Map()
    let newNumber = 1
    for (const { row, col, cell } of numberedCells) {
      const oldNumber = cell.number
      if (!oldToNewNumber.has(oldNumber)) {
        oldToNewNumber.set(oldNumber, newNumber)
        newNumber++
      }
    }
    
    // Update grid with new numbers
    const updatedGrid = gridToRenumber.map(r => [...r])
    for (const { row, col, cell } of numberedCells) {
      const oldNumber = cell.number
      const newNum = oldToNewNumber.get(oldNumber)
      updatedGrid[row][col] = {
        ...cell,
        number: newNum
      }
    }
    
    // Update clues to match new numbers
    const updatedClues = { across: [], down: [] }
    
    // Update across clues
    for (const clue of cluesToUpdate.across) {
      if (oldToNewNumber.has(clue.number)) {
        const newNum = oldToNewNumber.get(clue.number)
        updatedClues.across.push({ number: newNum, text: clue.text })
      }
    }
    
    // Update down clues
    for (const clue of cluesToUpdate.down) {
      if (oldToNewNumber.has(clue.number)) {
        const newNum = oldToNewNumber.get(clue.number)
        updatedClues.down.push({ number: newNum, text: clue.text })
      }
    }
    
    // Sort clues by number
    updatedClues.across.sort((a, b) => a.number - b.number)
    updatedClues.down.sort((a, b) => a.number - b.number)
    
    return { updatedGrid, updatedClues }
  }, [])

  const renumberGrid = useCallback((gridToRenumber) => {
    // Find all word starts and assign numbers properly
    const wordStarts = new Map() // Map from (row,col) to {across, down}
    
    // Scan for word starts
    for (let r = 0; r < gridToRenumber.length; r++) {
      for (let c = 0; c < gridToRenumber[r].length; c++) {
        const cell = gridToRenumber[r]?.[c]
        if (!cell || cell === '.' || typeof cell !== 'object') continue
        
        const key = `${r},${c}`
        let startInfo = wordStarts.get(key) || { across: null, down: null }
        
        // Check if this is the start of an across word
        if (cell.across) {
          const prevCell = c > 0 ? gridToRenumber[r]?.[c - 1] : null
          const isStart = !prevCell || prevCell === '.' || prevCell === null ||
            (typeof prevCell === 'object' && prevCell.across !== cell.across)
          
          if (isStart) {
            startInfo.across = cell.across
            wordStarts.set(key, startInfo)
          }
        }
        
        // Check if this is the start of a down word
        if (cell.down) {
          const prevCell = r > 0 ? gridToRenumber[r - 1]?.[c] : null
          const isStart = !prevCell || prevCell === '.' || prevCell === null ||
            (typeof prevCell === 'object' && prevCell.down !== cell.down)
          
          if (isStart) {
            startInfo.down = cell.down
            wordStarts.set(key, startInfo)
          }
        }
      }
    }
    
    // Convert to array and sort by position (top to bottom, left to right)
    const startsArray = Array.from(wordStarts.entries()).map(([key, info]) => {
      const [r, c] = key.split(',').map(Number)
      return { row: r, col: c, ...info }
    })
    
    startsArray.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row
      return a.col - b.col
    })
    
    // Assign numbers to word starts (same position gets same number)
    const numberMap = new Map() // Map from (row,col) to number
    let nextNumber = 1
    
    for (const start of startsArray) {
      const key = `${start.row},${start.col}`
      if (!numberMap.has(key)) {
        numberMap.set(key, nextNumber)
        nextNumber++
      }
    }
    
    // Apply numbers to grid
    const updatedGrid = gridToRenumber.map(r => [...r])
    for (const start of startsArray) {
      const key = `${start.row},${start.col}`
      const number = numberMap.get(key)
      const cell = updatedGrid[start.row]?.[start.col]
      if (cell && typeof cell === 'object') {
        updatedGrid[start.row][start.col] = {
          ...cell,
          number: number
        }
      }
    }
    
    // Clear numbers from non-start cells
    for (let r = 0; r < updatedGrid.length; r++) {
      for (let c = 0; c < updatedGrid[r].length; c++) {
        const cell = updatedGrid[r]?.[c]
        if (cell && typeof cell === 'object' && cell.number) {
          const key = `${r},${c}`
          if (!numberMap.has(key)) {
            updatedGrid[r][c] = {
              ...cell,
              number: null
            }
          }
        }
      }
    }
    
    // Update clues to match new numbers
    const newClues = { across: [], down: [] }
    
    for (const start of startsArray) {
      const number = numberMap.get(`${start.row},${start.col}`)
      const cell = updatedGrid[start.row]?.[start.col]
      
      if (start.across && cell.across) {
        const existing = newClues.across.find(c => c.number === number)
        if (!existing) {
          const oldClue = clues.across.find(c => c.number === cell.across)
          newClues.across.push({ number, text: oldClue?.text || '' })
        }
      }
      
      if (start.down && cell.down) {
        const existing = newClues.down.find(c => c.number === number)
        if (!existing) {
          const oldClue = clues.down.find(c => c.number === cell.down)
          newClues.down.push({ number, text: oldClue?.text || '' })
        }
      }
    }
    
    newClues.across.sort((a, b) => a.number - b.number)
    newClues.down.sort((a, b) => a.number - b.number)
    
    setGrid(updatedGrid)
    setClues(newClues)
    
    // Clean up any orphaned clues after renumbering
    cleanupOrphanedClues(updatedGrid, newClues)
  }, [clues])

  const handlePlaceWord = useCallback(() => {
    if (!selectedCell) {
      alert('Please select a starting cell first')
      return
    }

    const word = prompt('Enter word:')
    if (!word || !word.trim()) return

    // Get next clue number
    const allNumbers = new Set()
    clues.across.forEach(c => allNumbers.add(c.number))
    clues.down.forEach(c => allNumbers.add(c.number))
    grid.forEach(row => {
      row.forEach(cell => {
        if (cell && typeof cell === 'object' && cell.number) {
          allNumbers.add(cell.number)
        }
      })
    })
    let clueNumber = 1
    while (allNumbers.has(clueNumber)) clueNumber++

    const { row, col } = selectedCell
    
    // Assign word to cells
    const newGrid = grid.map(r => [...r])
    const upperWord = word.trim().toUpperCase().replace(/[^A-Z]/g, '')
    
    // Check if starting cell already has a number (intersection)
    const startCell = newGrid[row]?.[col]
    let useExistingNumber = false
    let actualClueNumber = clueNumber
    
    if (startCell && typeof startCell === 'object' && startCell.number) {
      // Starting cell already has a number - use it (intersection)
      actualClueNumber = startCell.number
      useExistingNumber = true
    }
    
    for (let i = 0; i < upperWord.length; i++) {
      const r = currentDirection === 'across' ? row : row + i
      const c = currentDirection === 'across' ? col + i : col
      
      if (r >= gridSize || c >= gridSize || r < 0 || c < 0) {
        alert(`Word extends beyond grid boundaries`)
        return
      }
      
      const currentCell = newGrid[r]?.[c]
      if (currentCell === '.') {
        alert(`Cannot place word - blocked cell at position ${r},${c}`)
        return
      }
      
      if (currentCell && currentCell !== '.') {
        if (typeof currentCell === 'object') {
          if (currentCell.solution && currentCell.solution !== upperWord[i]) {
            alert(`Letter conflict at ${r},${c}: existing "${currentCell.solution}" vs new "${upperWord[i]}"`)
            return
          }
          
          // Determine if this cell should have a number
          let cellNumber = currentCell.number
          if (i === 0) {
            // First cell - use existing number if present, otherwise use new number
            cellNumber = currentCell.number || actualClueNumber
          } else {
            // Not first cell - only keep number if it's the start of another word
            // Check if this cell is the start of a word in the opposite direction
            const isStartOfOtherWord = currentCell.across && currentCell.across !== actualClueNumber && 
                                      (currentDirection === 'down' || !currentCell.across) ||
                                      currentCell.down && currentCell.down !== actualClueNumber && 
                                      (currentDirection === 'across' || !currentCell.down)
            if (!isStartOfOtherWord) {
              cellNumber = null
            }
          }
          
          newGrid[r][c] = {
            ...currentCell,
            [currentDirection]: actualClueNumber,
            solution: currentCell.solution || upperWord[i],
            number: cellNumber
          }
        } else {
          newGrid[r][c] = {
            number: i === 0 ? actualClueNumber : null,
            across: currentDirection === 'across' ? actualClueNumber : null,
            down: currentDirection === 'down' ? actualClueNumber : null,
            solution: upperWord[i]
          }
        }
      } else {
        newGrid[r][c] = {
          number: i === 0 ? actualClueNumber : null,
          across: currentDirection === 'across' ? actualClueNumber : null,
          down: currentDirection === 'down' ? actualClueNumber : null,
          solution: upperWord[i]
        }
      }
    }
    
    setGrid(newGrid)
    
    // Add clue (only if we used a new number, not an existing one)
    if (!useExistingNumber) {
      const newClues = { ...clues }
      const clueList = newClues[currentDirection]
      if (!clueList.find(c => c.number === actualClueNumber)) {
        clueList.push({ number: actualClueNumber, text: '' })
        clueList.sort((a, b) => a.number - b.number)
        setClues(newClues)
      }
    }
    
    // Renumber the grid to fix any numbering issues
    renumberGrid(newGrid)
  }, [selectedCell, currentDirection, grid, clues, gridSize])

  const deleteWord = useCallback((gridToModify, startRow, startCol, direction, wordNumber) => {
    const newGrid = gridToModify.map(r => [...r])
    const newClues = { ...clues }
    
    // Find all cells that belong to this word
    const cellsToClear = []
    let currentRow = startRow
    let currentCol = startCol
    
    // Traverse the word in the given direction
    while (currentRow >= 0 && currentRow < gridSize && currentCol >= 0 && currentCol < gridSize) {
      const cell = newGrid[currentRow]?.[currentCol]
      if (!cell || cell === '.' || typeof cell !== 'object') break
      
      const isPartOfWord = direction === 'across' 
        ? (cell.across === wordNumber)
        : (cell.down === wordNumber)
      
      if (!isPartOfWord) break
      
      cellsToClear.push({ row: currentRow, col: currentCol, cell })
      
      // Move to next cell in direction
      if (direction === 'across') {
        currentCol++
      } else {
        currentRow++
      }
    }
    
    // Clear or update cells
    for (const { row, col, cell } of cellsToClear) {
      const otherDirection = direction === 'across' ? 'down' : 'across'
      const otherWordNumber = cell[otherDirection]
      
      if (otherWordNumber) {
        // Cell is part of another word - keep it but remove this direction
        newGrid[row][col] = {
          ...cell,
          [direction]: null,
          solution: cell.solution, // Keep the letter for the other word
          number: cell.number && cell[direction] && cell.number === wordNumber ? null : cell.number // Remove number if it was for this word
        }
      } else {
        // Cell is only part of this word - clear it
        newGrid[row][col] = null
      }
    }
    
    // Remove clue
    const clueList = newClues[direction]
    const clueIndex = clueList.findIndex(c => c.number === wordNumber)
    if (clueIndex !== -1) {
      clueList.splice(clueIndex, 1)
    }
    
    setGrid(newGrid)
    setClues(newClues)
    
    // Clean up orphaned clues (clues without corresponding numbers)
    cleanupOrphanedClues(newGrid, newClues)
    
    // Renumber the grid after deletion
    setTimeout(() => {
      renumberGrid(newGrid)
    }, 0)
  }, [clues, gridSize, renumberGrid])

  const saveCrossword = useCallback(async () => {
    if (!crosswordName.trim()) {
      // Flash and shake the input instead of alert
      setNameInputError(true)
      setTimeout(() => setNameInputError(false), 600)
      return
    }

    // Collect all numbers that actually exist on the grid
    const gridNumbers = new Set()
    grid.forEach(row => {
      row.forEach(cell => {
        if (cell && typeof cell === 'object' && cell.number) {
          gridNumbers.add(cell.number)
        }
      })
    })
    
    // Filter clues to only include those with numbers that exist on the grid
    // Also filter out empty clues (optional hints)
    const validClues = {
      across: clues.across.filter(c => 
        c.text && c.text.trim() && gridNumbers.has(c.number)
      ),
      down: clues.down.filter(c => 
        c.text && c.text.trim() && gridNumbers.has(c.number)
      )
    }

    // Convert grid to proper format for CSV
    const csvGrid = grid.map((row, r) => 
      row.map((cell, c) => {
        if (!cell || cell === '.') {
          return '.'
        }
        if (typeof cell === 'object') {
          return cell
        }
        return '.'
      })
    )

    const gridCSV = gridToCSV(csvGrid, validClues)
    const cluesCSV = cluesToCSV(validClues)

    const name = crosswordName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    const displayName = crosswordName.trim()
    
    try {
      // Save to localStorage (primary storage)
      saveCrosswordToLocalStorage(name, gridCSV, cluesCSV, {
        displayName: displayName
      })
      
      // Also try to save to server (optional, for sharing/public access)
      try {
        await saveCSVToServer(cluesCSV, `${name}-clues.csv`)
        await saveCSVToServer(gridCSV, `${name}-grid.csv`)
      } catch (serverError) {
        // Server save failed, but localStorage save succeeded
        console.warn('Server save failed (this is okay if server is not running):', serverError)
      }
      
      alert(`Crossword "${displayName}" saved successfully to your local storage! Visit /${name} to play it.`)
    } catch (error) {
      console.error('Error saving crossword:', error)
      alert(`Error saving crossword: ${error.message}`)
    }
  }, [grid, clues, crosswordName])

  const clearGrid = useCallback(() => {
    if (confirm('Clear entire grid?')) {
      const newGrid = []
      for (let r = 0; r < gridSize; r++) {
        newGrid[r] = []
        for (let c = 0; c < gridSize; c++) {
          newGrid[r][c] = null // Empty (white) cells
        }
      }
      setGrid(newGrid)
      setClues({ across: [], down: [] })
      setSelectedCell(null)
    }
  }, [gridSize])

  // Helper to get all cells in selection range
  const getSelectionCells = useCallback(() => {
    if (!selectionStart || !selectionEnd) return []
    const cells = []
    const minRow = Math.min(selectionStart.row, selectionEnd.row)
    const maxRow = Math.max(selectionStart.row, selectionEnd.row)
    const minCol = Math.min(selectionStart.col, selectionEnd.col)
    const maxCol = Math.max(selectionStart.col, selectionEnd.col)
    
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
          cells.push({ row: r, col: c })
        }
      }
    }
    return cells
  }, [selectionStart, selectionEnd, gridSize])

  // Extend selection in any direction (colDelta, rowDelta)
  const extendSelectionAnyDirection = useCallback((colDelta, rowDelta) => {
    if (!selectedCell) return
    
    const { row, col } = selectedCell
    let newRow = row + rowDelta
    let newCol = col + colDelta

    // Find next valid cell
    while (newRow >= 0 && newRow < gridSize && 
           newCol >= 0 && newCol < gridSize) {
      const cell = grid[newRow]?.[newCol]
      if (currentMode === 'block' || cell !== '.') {
        setSelectedCell({ row: newRow, col: newCol })
        if (selectionStart) {
          setSelectionEnd({ row: newRow, col: newCol })
        } else {
          setSelectionStart(selectedCell)
          setSelectionEnd({ row: newRow, col: newCol })
        }
        return
      }
      newRow += rowDelta
      newCol += colDelta
    }
  }, [selectedCell, selectionStart, currentMode, grid, gridSize])

  // Copy selection
  const copySelection = useCallback(() => {
    if (!selectionStart || !selectionEnd) return
    
    const cells = getSelectionCells()
    const copied = cells.map(({ row, col }) => ({
      row,
      col,
      cell: grid[row]?.[col]
    }))
    setCopiedCells(copied)
  }, [selectionStart, selectionEnd, getSelectionCells, grid])

  // Paste selection
  const pasteSelection = useCallback(() => {
    if (!copiedCells || !selectedCell) return
    
    const newGrid = grid.map(r => [...r])
    const { row: startRow, col: startCol } = selectedCell
    
    copiedCells.forEach(({ row: srcRow, col: srcCol, cell }) => {
      const destRow = startRow + (srcRow - copiedCells[0].row)
      const destCol = startCol + (srcCol - copiedCells[0].col)
      
      if (destRow >= 0 && destRow < gridSize && destCol >= 0 && destCol < gridSize) {
        newGrid[destRow][destCol] = cell ? JSON.parse(JSON.stringify(cell)) : null
      }
    })
    
    setGrid(newGrid)
  }, [copiedCells, selectedCell, grid, gridSize])

  // Delete selection
  const deleteSelection = useCallback(() => {
    if (!selectionStart || !selectionEnd) return
    
    const cells = getSelectionCells()
    const newGrid = grid.map(r => [...r])
    
    cells.forEach(({ row, col }) => {
      if (currentMode === 'block') {
        newGrid[row][col] = null
      } else {
        const cell = newGrid[row][col]
        if (cell && typeof cell === 'object') {
          newGrid[row][col] = {
            ...cell,
            solution: ''
          }
        } else {
          newGrid[row][col] = null
        }
      }
    })
    
    setGrid(newGrid)
    // Don't clear selection - keep it so user can see what was deleted
    // Selection will be cleared when they click or move
  }, [selectionStart, selectionEnd, getSelectionCells, grid, currentMode])

  // Fill selection with a value
  const fillSelection = useCallback((value) => {
    if (!selectionStart || !selectionEnd) return
    
    const cells = getSelectionCells()
    const newGrid = grid.map(r => [...r])
    
    cells.forEach(({ row, col }) => {
      newGrid[row][col] = value
    })
    
    setGrid(newGrid)
  }, [selectionStart, selectionEnd, getSelectionCells, grid])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectionStart(null)
    setSelectionEnd(null)
    setIsSelecting(false)
  }, [])

  // Handle mouse down - start selection
  const handleCellMouseDown = useCallback((row, col, e) => {
    // Only start drag selection on left mouse button
    if (e.button !== 0) return
    
    setDragStartCell({ row, col })
    setSelectedCell({ row, col })
    setIsMouseDragging(true)
    setHasDragged(false) // Reset drag flag
    // Start selection at this cell
    setSelectionStart({ row, col })
    setSelectionEnd({ row, col })
    setIsSelecting(true)
    e.preventDefault() // Prevent text selection
  }, [])

  // Handle mouse move - extend selection while dragging
  const handleCellMouseMove = useCallback((row, col, e) => {
    if (isMouseDragging && dragStartCell) {
      // Mark that we've dragged (not just clicked)
      setHasDragged(true)
      // Update selection end to current cell
      setSelectionEnd({ row, col })
      setSelectedCell({ row, col })
      e.preventDefault()
    }
  }, [isMouseDragging, dragStartCell])

  // Handle mouse up - end selection
  const handleCellMouseUp = useCallback((row, col, e) => {
    if (isMouseDragging) {
      // Finalize selection
      setSelectionEnd({ row, col })
      setSelectedCell({ row, col })
      setIsMouseDragging(false)
      setIsSelecting(false)
      setDragStartCell(null)
      // Keep hasDragged flag briefly to prevent click handler from firing
      setTimeout(() => setHasDragged(false), 0)
      e.preventDefault()
    }
  }, [isMouseDragging])

  // Handle mouse leave grid - end selection if dragging
  const handleGridMouseLeave = useCallback(() => {
    if (isMouseDragging) {
      setIsMouseDragging(false)
      setIsSelecting(false)
      setDragStartCell(null)
      setTimeout(() => setHasDragged(false), 0)
    }
  }, [isMouseDragging])

  // Handle mouse up anywhere - end selection if dragging
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isMouseDragging) {
        setIsMouseDragging(false)
        setIsSelecting(false)
        setDragStartCell(null)
        setTimeout(() => setHasDragged(false), 0)
      }
    }
    
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isMouseDragging])

  const moveToNextCell = useCallback((direction, forcedDirection = null) => {
    if (!selectedCell) return

    const { row, col } = selectedCell
    const isAcross = forcedDirection ? forcedDirection === 'across' : currentDirection === 'across'
    const rowDelta = isAcross ? 0 : direction
    const colDelta = isAcross ? direction : 0

    if (forcedDirection) {
      setCurrentDirection(forcedDirection)
    }

    let newRow = row + rowDelta
    let newCol = col + colDelta

    // Find next valid cell
    // In block mode, allow navigation to blocked cells too
    while (newRow >= 0 && newRow < gridSize && 
           newCol >= 0 && newCol < gridSize) {
      const cell = grid[newRow]?.[newCol]
      // In block mode, all cells (including blocked) are valid
      // In other modes, skip blocked cells
      if (currentMode === 'block' || cell !== '.') {
        setSelectedCell({ row: newRow, col: newCol })
        return
      }
      newRow += rowDelta
      newCol += colDelta
    }
  }, [selectedCell, currentDirection, currentMode, grid, gridSize])

  const handleKeyPress = useCallback((e) => {
    // Shift/Ctrl + 1, 2, 3: Change edit modes (works everywhere, even in input fields)
    if ((e.shiftKey || e.ctrlKey || e.metaKey) && (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3')) {
      e.preventDefault()
      e.stopPropagation()
      if (e.code === 'Digit1') {
        setCurrentMode('letter')
      } else if (e.code === 'Digit2') {
        setCurrentMode('number')
      } else if (e.code === 'Digit3') {
        setCurrentMode('block')
      }
      return
    }

    // Handle keyboard shortcuts (Ctrl/Cmd combinations)
    if (e.ctrlKey || e.metaKey) {
      // Don't prevent shortcuts when typing in input fields (except save)
      const target = e.target
      const isInputField = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      )
      
      // Ctrl+S: Save crossword (works even in input fields)
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        e.stopPropagation()
        saveCrossword()
        return
      }
      
      // Other shortcuts only work outside input fields
      if (isInputField) {
        return
      }
      
      // Ctrl+C: Copy selection or clear grid
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        e.stopPropagation()
        if (selectionStart && selectionEnd && 
            (selectionStart.row !== selectionEnd.row || selectionStart.col !== selectionEnd.col)) {
          copySelection()
        } else {
          clearGrid()
        }
        return
      }
      
      // Ctrl+V: Paste
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault()
        e.stopPropagation()
        if (copiedCells && selectedCell) {
          pasteSelection()
        }
        return
      }
      
      // Prevent other Ctrl shortcuts from triggering browser actions
      if (['Enter', 'Backspace', 'Delete'].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // Don't handle keys if user is typing in an input field
    const target = e.target
    if (target && (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable
    )) {
      return
    }

    if (!selectedCell) return

    // In block mode, Delete/Backspace removes the block (only if no selection)
    // Note: Selection deletion is handled by the main Delete handler below
    if (currentMode === 'block' && (e.key === 'Delete' || e.key === 'Backspace')) {
      // Skip single cell handling if there's a selection - let main handler deal with it
      if (selectionStart && selectionEnd && 
          (selectionStart.row !== selectionEnd.row || selectionStart.col !== selectionEnd.col)) {
        // Selection exists - let main Delete handler handle it
        // Don't return here, let it fall through to main handler
      } else {
        // No selection - handle single cell
        e.preventDefault()
        e.stopPropagation()
        const { row, col } = selectedCell
        const cell = grid[row][col]
        
        // Only remove if it's a block
        if (cell === '.') {
          const newGrid = grid.map(r => [...r])
          newGrid[row][col] = null // Remove block, make it empty
          setGrid(newGrid)
        }
        return
      }
    }

    // In number mode, Delete/Backspace removes the number
    if (currentMode === 'number' && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault()
      e.stopPropagation()
      const { row, col } = selectedCell
      const cell = grid[row][col]
      if (cell === '.') return // Can't remove number from blocked cells
      
      const newGrid = grid.map(r => [...r])
      const currentCell = newGrid[row][col]
      let newClues = { ...clues }
      
      // Only remove if there's a number
      if (currentCell && typeof currentCell === 'object' && currentCell.number) {
        const oldNumber = currentCell.number
        newGrid[row][col] = {
          ...currentCell,
          number: null
        }
        
        // Remove clues for this number
        newClues.across = newClues.across.filter(c => c.number !== oldNumber)
        newClues.down = newClues.down.filter(c => c.number !== oldNumber)
        
        // Renumber all cells based on position
        const { updatedGrid, updatedClues } = renumberAllNumbers(newGrid, newClues)
        
        // Automatically update hints based on letters around numbered cells
        const finalClues = updateHintsFromNumbers(updatedGrid, updatedClues)
        
        setGrid(updatedGrid)
        setClues(finalClues)
      }
      return
    }

    // In number mode, Enter adds a number
    if (currentMode === 'number' && e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      const { row, col } = selectedCell
      const cell = grid[row][col]
      if (cell === '.') return // Can't add number to blocked cells
      
      const newGrid = grid.map(r => [...r])
      const currentCell = newGrid[row][col]
      let newClues = { ...clues }
      
      // Only add if there's no number
      if (!currentCell || typeof currentCell !== 'object' || !currentCell.number) {
        if (currentCell && typeof currentCell === 'object') {
          // Add number - will be assigned by renumbering
          newGrid[row][col] = {
            ...currentCell,
            number: 999 // Temporary number, will be renumbered
          }
        } else {
          // Create new cell with number (will be renumbered)
          newGrid[row][col] = {
            number: 999, // Temporary number, will be renumbered
            across: null,
            down: null,
            solution: currentCell?.solution || ''
          }
        }
        
        // Renumber all cells based on position
        const { updatedGrid, updatedClues } = renumberAllNumbers(newGrid, newClues)
        
        // Automatically update hints based on letters around numbered cells
        const finalClues = updateHintsFromNumbers(updatedGrid, updatedClues)
        
        setGrid(updatedGrid)
        setClues(finalClues)
      }
      return
    }

    // Prevent arrow keys from scrolling the page
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault()
    }

    // Shift/Ctrl + Arrow keys: first press changes direction, same direction twice starts selection
    if ((e.shiftKey || e.ctrlKey || e.metaKey) && selectedCell) {
      e.preventDefault()
      e.stopPropagation()
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const newDirection = 'across'
        if (isSelecting) {
          // Already selecting: extend selection in any direction
          const direction = e.key === 'ArrowRight' ? 1 : -1
          extendSelectionAnyDirection(direction, 0)
        } else if (!hasChangedDirection) {
          // First press: change direction only
          setCurrentDirection(newDirection)
          setHasChangedDirection(true)
          setLastShiftDirection(newDirection)
        } else if (lastShiftDirection === newDirection) {
          // Same direction as last: start selection
          setSelectionStart(selectedCell)
          setSelectionEnd(selectedCell)
          setIsSelecting(true)
          // Extend selection horizontally
          const direction = e.key === 'ArrowRight' ? 1 : -1
          extendSelectionAnyDirection(direction, 0)
        } else {
          // Different direction: just change direction, don't start selection
          setCurrentDirection(newDirection)
          setLastShiftDirection(newDirection)
        }
        return
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const newDirection = 'down'
        if (isSelecting) {
          // Already selecting: extend selection in any direction
          const direction = e.key === 'ArrowDown' ? 1 : -1
          extendSelectionAnyDirection(0, direction)
        } else if (!hasChangedDirection) {
          // First press: change direction only
          setCurrentDirection(newDirection)
          setHasChangedDirection(true)
          setLastShiftDirection(newDirection)
        } else if (lastShiftDirection === newDirection) {
          // Same direction as last: start selection
          setSelectionStart(selectedCell)
          setSelectionEnd(selectedCell)
          setIsSelecting(true)
          // Extend selection vertically
          const direction = e.key === 'ArrowDown' ? 1 : -1
          extendSelectionAnyDirection(0, direction)
        } else {
          // Different direction: just change direction, don't start selection
          setCurrentDirection(newDirection)
          setLastShiftDirection(newDirection)
        }
        return
      }
    }

    // Arrow key navigation (works in all modes)
    // Clear selection if arrow keys are pressed without Shift/Ctrl
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Clear selection when moving without Shift/Ctrl
        if (selectionStart && selectionEnd) {
          setSelectionStart(null)
          setSelectionEnd(null)
        }
      }
      const direction = e.key === 'ArrowRight' ? 1 : -1
      moveToNextCell(direction, 'across')
      return
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Clear selection when moving without Shift/Ctrl
        if (selectionStart && selectionEnd) {
          setSelectionStart(null)
          setSelectionEnd(null)
        }
      }
      const direction = e.key === 'ArrowDown' ? 1 : -1
      moveToNextCell(direction, 'down')
      return
    }

    // Handle Enter key: place word in letter mode, or perform action on selection
    if (e.key === 'Enter') {
      e.preventDefault()
      if (selectionStart && selectionEnd && (selectionStart.row !== selectionEnd.row || selectionStart.col !== selectionEnd.col)) {
        // Perform action on selection based on mode
        if (currentMode === 'block') {
          // Fill selection with blocks
          fillSelection('.')
          // Don't clear selection - keep it selected
        } else if (currentMode === 'letter') {
          // Clear selection
          clearSelection()
        }
      } else if (currentMode === 'block') {
        // Single cell in block mode: add block
        const { row, col } = selectedCell
        const cell = grid[row][col]
        if (cell !== '.') {
          const newGrid = grid.map(r => [...r])
          newGrid[row][col] = '.' // Add block
          setGrid(newGrid)
        }
      } else if (currentMode === 'letter') {
        handlePlaceWord()
      }
      return
    }

    // Handle Delete/Backspace: delete selection or single cell
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      if (selectionStart && selectionEnd && 
          (selectionStart.row !== selectionEnd.row || selectionStart.col !== selectionEnd.col)) {
        // Delete entire selection
        deleteSelection()
        // Don't clear selection state - keep it selected so user can see what was deleted
        // Selection will be cleared when they click or move
        return
      }
    }

    // Cancel selection on most actions (except copy/paste/delete/enter)
    // This must happen after copy/paste/delete handlers but before letter typing
    if (selectionStart && selectionEnd && 
        (selectionStart.row !== selectionEnd.row || selectionStart.col !== selectionEnd.col)) {
      // Only cancel if it's not copy, paste, delete, or enter
      // Note: Ctrl+C and Ctrl+V are handled earlier, so we check for just the letter keys
      if (!e.ctrlKey && !e.metaKey && 
          e.key !== 'Delete' && e.key !== 'Backspace' && e.key !== 'Enter' &&
          e.key.length === 1 && /[A-Za-z]/.test(e.key)) {
        // Cancel selection when typing letters or other non-action keys
        clearSelection()
      }
    }

    if (currentMode !== 'letter') return

    const { row, col } = selectedCell
    const cell = grid[row][col]
    if (cell === '.') return // Can't type in blocked cells
    
    const newGrid = grid.map(r => [...r])
    let currentCell = newGrid[row][col]
    
    // If cell is null/empty, create it first
    if (!currentCell || typeof currentCell !== 'object') {
      currentCell = {
        number: null,
        across: null,
        down: null,
        solution: ''
      }
      newGrid[row][col] = currentCell
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      // Check if this is a word start (has a number)
      if (currentCell.number) {
        // Delete entire word
        const wordNumber = currentDirection === 'across' ? currentCell.across : currentCell.down
        if (wordNumber) {
          deleteWord(grid, row, col, currentDirection, wordNumber)
          return
        }
      }
      
      // Otherwise, just clear current cell
      newGrid[row][col] = {
        ...currentCell,
        solution: ''
      }
      setGrid(newGrid)
      setCurrentLetter('')
      
      // Update hints automatically based on letters around numbered cells
      const updatedClues = updateHintsFromNumbers(newGrid, clues)
      setClues(updatedClues)
      
      // Move back one cell in the current direction
      if (currentDirection === 'across') {
        if (col > 0) {
          const prevCell = newGrid[row][col - 1]
          if (prevCell !== '.' && (prevCell === null || typeof prevCell === 'object')) {
            setSelectedCell({ row, col: col - 1 })
          }
        }
      } else {
        if (row > 0) {
          const prevCell = newGrid[row - 1]?.[col]
          if (prevCell !== '.' && (prevCell === null || typeof prevCell === 'object')) {
            setSelectedCell({ row: row - 1, col })
          }
        }
      }
    } else if (e.key.length === 1 && /[A-Za-z]/.test(e.key)) {
      const letter = e.key.toUpperCase()
      newGrid[row][col] = {
        ...currentCell,
        solution: letter
      }
      setGrid(newGrid)
      setCurrentLetter(letter)
      
      // Update hints automatically based on letters around numbered cells
      const updatedClues = updateHintsFromNumbers(newGrid, clues)
      setClues(updatedClues)
      
      // Auto-advance to next cell in current direction
      if (currentDirection === 'across') {
        if (col + 1 < gridSize) {
          const nextCell = newGrid[row][col + 1]
          if (nextCell !== '.' && (nextCell === null || typeof nextCell === 'object')) {
            setSelectedCell({ row, col: col + 1 })
          }
        }
      } else {
        if (row + 1 < gridSize) {
          const nextCell = newGrid[row + 1]?.[col]
          if (nextCell !== '.' && (nextCell === null || typeof nextCell === 'object')) {
            setSelectedCell({ row: row + 1, col })
          }
        }
      }
    }
      }, [selectedCell, currentMode, currentDirection, grid, gridSize, handlePlaceWord, deleteWord, clues, updateHintsFromNumbers, moveToNextCell, saveCrossword, clearGrid, isSelecting, selectionStart, selectionEnd, extendSelectionAnyDirection, copySelection, pasteSelection, deleteSelection, fillSelection, clearSelection, copiedCells, hasChangedDirection, lastShiftDirection])

  React.useEffect(() => {
    const handleKeyUp = (e) => {
      // If Shift/Ctrl is released, stop extending selection but keep it
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setIsSelecting(false)
        setHasChangedDirection(false)
        setLastShiftDirection(null)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyPress])

  const addClue = (number, direction) => {
    const newClues = { ...clues }
    const clueList = newClues[direction]
    if (!clueList.find(c => c.number === number)) {
      clueList.push({ number, text: '' })
      clueList.sort((a, b) => a.number - b.number)
      setClues(newClues)
      setEditingClue({ number, direction })
    } else {
      setEditingClue({ number, direction })
    }
  }

  const updateClue = (number, direction, text) => {
    const newClues = { ...clues }
    const clueList = newClues[direction]
    const clue = clueList.find(c => c.number === number)
    if (clue) {
      clue.text = text
    } else {
      clueList.push({ number, text })
      clueList.sort((a, b) => a.number - b.number)
    }
    setClues(newClues)
  }

  const assignWordToCells = (startRow, startCol, word, direction, clueNumber) => {
    const newGrid = grid.map(r => [...r])
    const upperWord = word.toUpperCase().replace(/[^A-Z]/g, '')
    
    for (let i = 0; i < upperWord.length; i++) {
      const r = direction === 'across' ? startRow : startRow + i
      const c = direction === 'across' ? startCol + i : startCol
      
      if (r >= gridSize || c >= gridSize || r < 0 || c < 0) {
        alert(`Word extends beyond grid boundaries`)
        return
      }
      
      const currentCell = newGrid[r]?.[c]
      if (currentCell === '.') {
        alert(`Cannot place word - blocked cell at position ${r},${c}`)
        return
      }
      
      if (currentCell && currentCell !== '.') {
        if (typeof currentCell === 'object') {
          // Check if letter matches if already set
          if (currentCell.solution && currentCell.solution !== upperWord[i]) {
            alert(`Letter conflict at ${r},${c}: existing "${currentCell.solution}" vs new "${upperWord[i]}"`)
            return
          }
          newGrid[r][c] = {
            ...currentCell,
            [direction]: clueNumber,
            solution: currentCell.solution || upperWord[i],
            number: i === 0 ? (currentCell.number || clueNumber) : currentCell.number
          }
        } else {
          newGrid[r][c] = {
            number: i === 0 ? clueNumber : null,
            across: direction === 'across' ? clueNumber : null,
            down: direction === 'down' ? clueNumber : null,
            solution: upperWord[i]
          }
        }
      } else {
        // Empty cell - create new
        newGrid[r][c] = {
          number: i === 0 ? clueNumber : null,
          across: direction === 'across' ? clueNumber : null,
          down: direction === 'down' ? clueNumber : null,
          solution: upperWord[i]
        }
      }
    }
    
    setGrid(newGrid)
  }

  const getCellClass = (row, col) => {
    const cell = grid[row][col]
    const isSelected = selectedCell?.row === row && selectedCell?.col === col
    let classes = 'builder-cell'
    
    if (cell === '.') {
      classes += ' blocked'
    } else if (cell && typeof cell === 'object') {
      classes += ' active'
      if (cell.number) classes += ' has-number'
      if (cell.solution && cell.solution.trim()) {
        classes += ' has-letter'
      }
    } else {
      // Empty cell (null) - white/editable
      classes += ' empty'
    }
    
    if (isSelected) classes += ' selected'
    
    // Check if cell is in selection range
    if (selectionStart && selectionEnd) {
      const minRow = Math.min(selectionStart.row, selectionEnd.row)
      const maxRow = Math.max(selectionStart.row, selectionEnd.row)
      const minCol = Math.min(selectionStart.col, selectionEnd.col)
      const maxCol = Math.max(selectionStart.col, selectionEnd.col)
      
      if (row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) {
        classes += ' in-selection'
      }
    }
    
    // Highlight cells in the current direction starting from selected cell (only if not selecting)
    if (selectedCell && !isSelected && !isSelecting && cell !== '.') {
      let isInDirection = false
      
      if (currentDirection === 'across' && selectedCell.row === row && col > selectedCell.col) {
        // Highlight cells to the right in the same row
        isInDirection = true
      } else if (currentDirection === 'down' && selectedCell.col === col && row > selectedCell.row) {
        // Highlight cells below in the same column
        isInDirection = true
      }
      
      if (isInDirection) {
        classes += ' in-direction'
      }
    }
    
    return classes
  }

  const getCellContent = (row, col) => {
    const cell = grid[row][col]
    if (cell === '.') return null // Blocked cell
    if (!cell || typeof cell !== 'object') return null // Empty cell
    
    return (
      <>
        {cell.number && <span className="cell-number">{cell.number}</span>}
        <span className="cell-letter">{cell.solution || ''}</span>
      </>
    )
  }

  return (
    <div className="builder-app">
      <header className="builder-header">
        <div className="header-nav">
          <Link to="/" className="home-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="home-icon">
              <path d="M8 1L1 6V14H5V10H11V14H15V6L8 1Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
            </svg>
            Home
          </Link>
        </div>
        <h1 className="newspaper-title">Crossword Builder</h1>
        <p className="subtitle">Visual Grid Editor</p>
      </header>

      <div className="builder-container">
        <div className="builder-controls">
          <div className="control-section">
            <label>
              <strong>Crossword Name:</strong>
              <input
                type="text"
                value={crosswordName}
                onChange={(e) => setCrosswordName(e.target.value)}
                placeholder="my-crossword"
                className={`name-input ${nameInputError ? 'error-shake' : ''}`}
              />
              <small>URL: /{crosswordName || 'name'}</small>
            </label>
          </div>

          <div className="control-section">
            <h3>Edit Mode</h3>
            <div className="mode-buttons">
              <button
                className={currentMode === 'letter' ? 'active' : ''}
                onClick={() => setCurrentMode('letter')}
              >
                Letter
              </button>
              <button
                className={currentMode === 'number' ? 'active' : ''}
                onClick={() => setCurrentMode('number')}
              >
                Number
              </button>
              <button
                className={currentMode === 'block' ? 'active' : ''}
                onClick={() => setCurrentMode('block')}
              >
                Block
              </button>
            </div>
            <p className="mode-help">
              {currentMode === 'letter' && 'Click cells and type letters. Use arrow keys to navigate.'}
              {currentMode === 'block' && 'Click cells to toggle blocked (black squares).'}
              {currentMode === 'number' && 'Click cells to add/remove clue numbers.'}
            </p>
          </div>

          <div className="control-section">
            <h3>Direction</h3>
            <div className="mode-buttons">
              <button
                className={currentDirection === 'across' ? 'active' : ''}
                onClick={() => setCurrentDirection('across')}
              >
                Across
              </button>
              <button
                className={currentDirection === 'down' ? 'active' : ''}
                onClick={() => setCurrentDirection('down')}
              >
                Down
              </button>
            </div>
          </div>

          <div className="control-section">
            <button onClick={handlePlaceWord} className="action-btn">
              Place Word from Selected Cell
            </button>
            <button onClick={clearGrid} className="action-btn danger">
              Clear Grid
            </button>
          </div>

          <div className="control-section">
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="shortcuts-btn"
                onClick={() => setShowShortcuts(true)}
                title="Keyboard Shortcuts"
              >
                ⌨️ Shortcuts
              </button>
              <button
                onClick={saveCrossword}
                disabled={!crosswordName.trim()}
                className="save-btn"
              >
                Save Crossword
              </button>
            </div>
          </div>
        </div>

        <div className="builder-main">
          <div className="grid-editor">
            <div 
              className="builder-grid"
              onMouseLeave={handleGridMouseLeave}
            >
              {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="builder-row">
                  {row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={getCellClass(rowIndex, colIndex)}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                      onMouseMove={(e) => handleCellMouseMove(rowIndex, colIndex, e)}
                      onMouseUp={(e) => handleCellMouseUp(rowIndex, colIndex, e)}
                      onMouseEnter={(e) => {
                        // Handle selection dragging (works in all modes including block mode)
                        if (e.buttons === 1 && isMouseDragging) {
                          handleCellMouseMove(rowIndex, colIndex, e)
                        }
                      }}
                    >
                      {getCellContent(rowIndex, colIndex)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="clues-editor">
            <h3>Clues</h3>
              <div className="clues-tabs">
                <button
                  className={currentDirection === 'across' ? 'tab-active' : ''}
                  onClick={() => setCurrentDirection('across')}
                >
                  Across
                </button>
                <button
                  className={currentDirection === 'down' ? 'tab-active' : ''}
                  onClick={() => setCurrentDirection('down')}
                >
                  Down
                </button>
              </div>
              
              <div className="clues-list">
                {currentDirection === 'across' && (
                <>
                  {clues.across.length > 0 ? (
                    clues.across.map(clue => (
                      <div key={clue.number} className="clue-editor-item">
                        <strong>{clue.number}.</strong>
                        <input
                          type="text"
                          value={clue.text}
                          onChange={(e) => updateClue(clue.number, 'across', e.target.value)}
                          placeholder="Enter clue..."
                          className="clue-input-editor"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="no-clues">No across clues yet. Add clue numbers to cells.</p>
                  )}
                </>
              )}
              
                  {currentDirection === 'down' && (
                <>
                  {clues.down.length > 0 ? (
                    clues.down.map(clue => (
                      <div key={clue.number} className="clue-editor-item">
                        <strong>{clue.number}.</strong>
                        <input
                          type="text"
                          value={clue.text}
                          onChange={(e) => updateClue(clue.number, 'down', e.target.value)}
                          placeholder="Enter clue..."
                          className="clue-input-editor"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="no-clues">No down clues yet. Add clue numbers to cells.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showShortcuts && (
        <div className="shortcuts-modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="shortcuts-modal-header">
              <h2>Keyboard Shortcuts</h2>
              <button 
                className="shortcuts-close-btn"
                onClick={() => setShowShortcuts(false)}
              >
                ×
              </button>
            </div>
            <div className="shortcuts-content">
              <div className="shortcuts-section">
                <h3>Mode Selection</h3>
                <div className="shortcut-item">
                  <span className="shortcut-key">Shift/Ctrl + 1</span>
                  <span className="shortcut-desc">Switch to Letter mode</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">Shift/Ctrl + 2</span>
                  <span className="shortcut-desc">Switch to Number mode</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">Shift/Ctrl + 3</span>
                  <span className="shortcut-desc">Switch to Block mode</span>
                </div>
              </div>

              <div className="shortcuts-section">
                <h3>Actions</h3>
                <div className="shortcut-item">
                  <span className="shortcut-key">Ctrl + S</span>
                  <span className="shortcut-desc">Save crossword</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">Ctrl + C</span>
                  <span className="shortcut-desc">Clear entire grid</span>
                </div>
              </div>

              <div className="shortcuts-section">
                <h3>Navigation</h3>
                <div className="shortcut-item">
                  <span className="shortcut-key">Arrow Keys</span>
                  <span className="shortcut-desc">Move between cells</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">Shift/Ctrl + Arrow Keys</span>
                  <span className="shortcut-desc">Change direction (works in all modes)</span>
                </div>
              </div>

              <div className="shortcuts-section">
                <h3>Letter Mode</h3>
                <div className="shortcut-item">
                  <span className="shortcut-key">A-Z</span>
                  <span className="shortcut-desc">Type letters into cells</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">Enter</span>
                  <span className="shortcut-desc">Place word from selected cell</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">Backspace/Delete</span>
                  <span className="shortcut-desc">Delete letter or entire word (if on numbered cell)</span>
                </div>
              </div>

              <div className="shortcuts-section">
                <h3>Number Mode</h3>
                <div className="shortcut-item">
                  <span className="shortcut-key">Enter</span>
                  <span className="shortcut-desc">Add number to selected cell</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">Backspace/Delete</span>
                  <span className="shortcut-desc">Remove number from selected cell</span>
                </div>
              </div>

              <div className="shortcuts-section">
                <h3>Block Mode</h3>
                <div className="shortcut-item">
                  <span className="shortcut-key">Enter</span>
                  <span className="shortcut-desc">Add block to selected cell</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">Backspace/Delete</span>
                  <span className="shortcut-desc">Remove block from selected cell</span>
                </div>
              </div>

              <div className="shortcuts-section">
                <h3>Tips</h3>
                <ul className="shortcuts-tips">
                  <li>Type letters directly into cells in Letter mode</li>
                  <li>Add numbers to word starts in Number mode - hints are created automatically</li>
                  <li>Use Block mode to create black squares</li>
                  <li>Numbers are automatically ordered from top-left to bottom-right</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CrosswordBuilder
