// Improved CSV parser that handles quoted fields with commas
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  
  return result
}

export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  const headers = parseCSVLine(lines[0])
  const rows = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row = {}
    headers.forEach((header, index) => {
      let value = values[index] || ''
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1)
      }
      // Convert empty strings to null
      row[header] = value === '' || value === undefined ? null : value
    })
    rows.push(row)
  }
  
  console.log('Parsed CSV rows:', rows.length, 'First row:', rows[0])
  
  return rows
}

export function parseCluesCSV(csvText) {
  const rows = parseCSV(csvText)
  const clues = { across: [], down: [] }
  
  rows.forEach(row => {
    const direction = row.direction?.toLowerCase()
    if (direction === 'across' || direction === 'down') {
      clues[direction].push({
        number: parseInt(row.number),
        text: row.text
      })
    }
  })
  
  // Sort by number
  clues.across.sort((a, b) => a.number - b.number)
  clues.down.sort((a, b) => a.number - b.number)
  
  return clues
}

export function parseGridCSV(csvText) {
  const rows = parseCSV(csvText)
  
  // Find grid dimensions
  let maxRow = 0
  let maxCol = 0
  rows.forEach(row => {
    const r = parseInt(row.row) || 0
    const c = parseInt(row.col) || 0
    if (r > maxRow) maxRow = r
    if (c > maxCol) maxCol = c
  })
  
  // Initialize grid with blocked cells
  const grid = []
  for (let r = 0; r <= maxRow; r++) {
    grid[r] = []
    for (let c = 0; c <= maxCol; c++) {
      grid[r][c] = '.'
    }
  }
  
  // Fill in cells from CSV
  rows.forEach(row => {
    const r = parseInt(row.row)
    const c = parseInt(row.col)
    
    // Skip invalid rows
    if (isNaN(r) || isNaN(c)) {
      console.warn('Skipping invalid row:', row)
      return
    }
    
    if (row.solution === null || row.solution === '' || !row.solution) {
      grid[r][c] = '.'
    } else {
      grid[r][c] = {
        number: row.number && row.number !== '' ? parseInt(row.number) : null,
        across: row.across && row.across !== '' ? parseInt(row.across) : null,
        down: row.down && row.down !== '' ? parseInt(row.down) : null,
        solution: row.solution.toUpperCase().trim()
      }
    }
  })
  
  console.log('Grid parsed successfully. Grid size:', grid.length, 'x', grid[0]?.length)
  console.log('First few cells:', grid[0]?.slice(0, 5))
  
  return grid
}

