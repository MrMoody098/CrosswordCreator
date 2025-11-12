import React, { useRef } from 'react'
import { parseCluesCSV, parseGridCSV } from '../utils/csvParser'
import './CSVImporter.css'

function CSVImporter({ onImport }) {
  const cluesFileRef = useRef(null)
  const gridFileRef = useRef(null)

  const handleFileRead = (file, type) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csvText = e.target.result
        if (type === 'clues') {
          const clues = parseCluesCSV(csvText)
          onImport({ clues })
        } else if (type === 'grid') {
          const grid = parseGridCSV(csvText)
          onImport({ grid })
        }
      } catch (error) {
        alert(`Error parsing ${type} CSV: ${error.message}`)
      }
    }
    reader.readAsText(file)
  }

  const handleCluesFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileRead(file, 'clues')
    }
  }

  const handleGridFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileRead(file, 'grid')
    }
  }

  return (
    <div className="csv-importer">
      <h3>Import Crossword from CSV</h3>
      <div className="file-inputs">
        <div className="file-input-group">
          <label htmlFor="clues-file">Clues CSV:</label>
          <input
            id="clues-file"
            type="file"
            accept=".csv"
            ref={cluesFileRef}
            onChange={handleCluesFileChange}
          />
        </div>
        <div className="file-input-group">
          <label htmlFor="grid-file">Grid CSV:</label>
          <input
            id="grid-file"
            type="file"
            accept=".csv"
            ref={gridFileRef}
            onChange={handleGridFileChange}
          />
        </div>
      </div>
      <div className="csv-help">
        <p><strong>Clues CSV format:</strong> direction,number,text</p>
        <p><strong>Grid CSV format:</strong> row,col,number,across,down,solution</p>
        <p className="note">Use empty values for blocked cells. Omit number/across/down for non-starting cells.</p>
      </div>
    </div>
  )
}

export default CSVImporter

