// Utility functions for building crosswords from word lists

export function generateGridFromWords(words, gridSize = 15) {
  // Initialize empty grid
  const grid = []
  for (let r = 0; r < gridSize; r++) {
    grid[r] = []
    for (let c = 0; c < gridSize; c++) {
      grid[r][c] = null
    }
  }

  let clueNumber = 1
  const placedWords = []
  const clues = { across: [], down: [] }

  // Sort words by length (longest first) for better placement
  const sortedWords = [...words].sort((a, b) => b.word.length - a.word.length)

  sortedWords.forEach((wordData, index) => {
    const { word, clue, direction } = wordData
    const upperWord = word.toUpperCase().replace(/[^A-Z]/g, '')
    const wordDataWithClue = { ...wordData, word: upperWord, clueAdded: false }

    if (index === 0) {
      // Place first word in center
      const startRow = Math.floor(gridSize / 2)
      const startCol = Math.floor((gridSize - upperWord.length) / 2)
      if (placeWord(grid, upperWord, startRow, startCol, direction, clueNumber, wordDataWithClue)) {
        placedWords.push({ word: upperWord, row: startRow, col: startCol, direction, number: clueNumber })
        if (direction === 'across') {
          clues.across.push({ number: clueNumber, text: clue })
        } else {
          clues.down.push({ number: clueNumber, text: clue })
        }
        clueNumber++
      }
    } else {
      // Try to intersect with existing words
      let placed = false
      for (const placedWord of placedWords) {
        const intersection = findIntersection(upperWord, placedWord)
        if (intersection) {
          const position = calculatePosition(placedWord, intersection, direction)
          if (position && isValidPlacement(grid, upperWord, position.row, position.col, direction, gridSize)) {
            if (placeWord(grid, upperWord, position.row, position.col, direction, clueNumber, wordDataWithClue)) {
              placedWords.push({ word: upperWord, row: position.row, col: position.col, direction, number: clueNumber })
              if (direction === 'across') {
                clues.across.push({ number: clueNumber, text: clue })
              } else {
                clues.down.push({ number: clueNumber, text: clue })
              }
              clueNumber++
              placed = true
              break
            }
          }
        }
      }

      if (!placed) {
        // Place word at first available position
        const position = findFirstAvailablePosition(grid, upperWord, direction, gridSize)
        if (position && placeWord(grid, upperWord, position.row, position.col, direction, clueNumber, wordDataWithClue)) {
          placedWords.push({ word: upperWord, row: position.row, col: position.col, direction, number: clueNumber })
          if (direction === 'across') {
            clues.across.push({ number: clueNumber, text: clue })
          } else {
            clues.down.push({ number: clueNumber, text: clue })
          }
          clueNumber++
        }
      }
    }
  })

  // Fill empty cells with blocked cells ('.')
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!grid[r][c]) {
        grid[r][c] = '.'
      }
    }
  }

  // Sort clues by number
  clues.across.sort((a, b) => a.number - b.number)
  clues.down.sort((a, b) => a.number - b.number)

  return { grid, clues, placedWords }
}

function findIntersection(word1, word2) {
  for (let i = 0; i < word1.length; i++) {
    for (let j = 0; j < word2.word.length; j++) {
      if (word1[i] === word2.word[j]) {
        return { word1Index: i, word2Index: j, letter: word1[i] }
      }
    }
  }
  return null
}

function calculatePosition(placedWord, intersection, newDirection) {
  if (placedWord.direction === 'across' && newDirection === 'down') {
    return {
      row: placedWord.row - intersection.word1Index,
      col: placedWord.col + intersection.word2Index
    }
  } else if (placedWord.direction === 'down' && newDirection === 'across') {
    return {
      row: placedWord.row + intersection.word2Index,
      col: placedWord.col - intersection.word1Index
    }
  }
  return null
}

function isValidPlacement(grid, word, row, col, direction, gridSize) {
  if (direction === 'across') {
    if (col + word.length > gridSize || col < 0 || row < 0 || row >= gridSize) return false
    for (let i = 0; i < word.length; i++) {
      const cell = grid[row]?.[col + i]
      if (cell && typeof cell === 'object' && cell.solution && cell.solution !== word[i]) {
        return false
      }
    }
  } else {
    if (row + word.length > gridSize || row < 0 || col < 0 || col >= gridSize) return false
    for (let i = 0; i < word.length; i++) {
      const cell = grid[row + i]?.[col]
      if (cell && typeof cell === 'object' && cell.solution && cell.solution !== word[i]) {
        return false
      }
    }
  }
  return true
}

function placeWord(grid, word, row, col, direction, number, wordData) {
  if (direction === 'across') {
    for (let i = 0; i < word.length; i++) {
      const currentCell = grid[row]?.[col + i]
      if (!currentCell) {
        grid[row][col + i] = {
          number: i === 0 ? number : null,
          across: number,
          down: null,
          solution: word[i]
        }
      } else if (typeof currentCell === 'string' && currentCell === '.') {
        grid[row][col + i] = {
          number: i === 0 ? number : null,
          across: number,
          down: null,
          solution: word[i]
        }
      } else if (typeof currentCell === 'object' && currentCell.solution === word[i]) {
        // Intersection - update cell
        grid[row][col + i] = {
          number: currentCell.number || (i === 0 ? number : null),
          across: number,
          down: currentCell.down,
          solution: word[i]
        }
      } else {
        // Conflict - can't place here
        return false
      }
    }
  } else {
    for (let i = 0; i < word.length; i++) {
      const currentCell = grid[row + i]?.[col]
      if (!currentCell) {
        grid[row + i][col] = {
          number: i === 0 ? number : null,
          across: null,
          down: number,
          solution: word[i]
        }
      } else if (typeof currentCell === 'string' && currentCell === '.') {
        grid[row + i][col] = {
          number: i === 0 ? number : null,
          across: null,
          down: number,
          solution: word[i]
        }
      } else if (typeof currentCell === 'object' && currentCell.solution === word[i]) {
        // Intersection - update cell
        grid[row + i][col] = {
          number: currentCell.number || (i === 0 ? number : null),
          across: currentCell.across,
          down: number,
          solution: word[i]
        }
      } else {
        // Conflict - can't place here
        return false
      }
    }
  }
  
  return true
}

function findFirstAvailablePosition(grid, word, direction, gridSize) {
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (isValidPlacement(grid, word, row, col, direction, gridSize)) {
        return { row, col }
      }
    }
  }
  return null
}

export function gridToCSV(grid, clues) {
  const rows = ['row,col,number,across,down,solution']
  const maxRow = grid.length - 1
  const maxCol = grid[0]?.length - 1 || 0

  for (let r = 0; r <= maxRow; r++) {
    for (let c = 0; c <= maxCol; c++) {
      const cell = grid[r]?.[c]
      if (cell && typeof cell === 'object' && cell.solution) {
        rows.push(`${r},${c},${cell.number || ''},${cell.across || ''},${cell.down || ''},${cell.solution}`)
      } else if (cell && typeof cell === 'object' && !cell.solution) {
        // Cell exists but no letter yet - still include it
        rows.push(`${r},${c},${cell.number || ''},${cell.across || ''},${cell.down || ''},`)
      } else {
        rows.push(`${r},${c},,,,,`)
      }
    }
  }

  return rows.join('\n')
}

export function cluesToCSV(clues) {
  const rows = ['direction,number,text']
  
  clues.across.forEach(clue => {
    rows.push(`across,${clue.number},${clue.text}`)
  })
  
  clues.down.forEach(clue => {
    rows.push(`down,${clue.number},${clue.text}`)
  })

  return rows.join('\n')
}

export function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

export async function saveCSVToServer(content, filename) {
  try {
    // Use relative path to work with Vite dev server
    const response = await fetch('/api/save-csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename, content })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to save file')
    }
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error saving to server:', error)
    throw error
  }
}

