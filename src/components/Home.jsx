import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { getCrosswordList, deleteCrosswordFromLocalStorage, saveCrosswordToLocalStorage, loadCrosswordFromLocalStorage } from '../utils/localStorage'
import { parseCluesCSV, parseGridCSV, parseCombinedCSV } from '../utils/csvParser'
import { fetchSharedCrossword, shareCrosswordToSupabase, copyToClipboard } from '../utils/shareApi'
import CrosswordPreview from './CrosswordPreview'
import '../App.css'
import './Home.css'

function Home() {
  const [crosswords, setCrosswords] = useState([])
  const [loading, setLoading] = useState(true)
  const [gridPreviews, setGridPreviews] = useState({}) // Store grid previews by crossword name
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    loadCrosswords()
  }, [])

  // Handle shared crossword links from Supabase
  useEffect(() => {
    const shareParam = searchParams.get('share')
    if (shareParam) {
      handleSharedCrossword(shareParam)
      // Remove the share parameter from URL
      setSearchParams({})
    }
  }, [searchParams])

  const handleSharedCrossword = async (shareId) => {
    try {
      const result = await fetchSharedCrossword(shareId)
      
      if (!result.success) {
        alert(`Error loading shared crossword: ${result.error}`)
        return
      }
      
      // Generate a unique name for the imported crossword
      const timestamp = Date.now()
      const importName = result.displayName 
        ? `${result.displayName}-shared-${timestamp}`.toLowerCase().replace(/[^a-z0-9]/g, '-')
        : `shared-crossword-${timestamp}`
      
      // Save to localStorage
      saveCrosswordToLocalStorage(importName, result.gridCSV, result.cluesCSV, {
        displayName: result.displayName || `Shared Crossword`
      })
      
      // Reload crosswords list
      loadCrosswords()
      
      // Navigate to the shared crossword
      navigate(`/${importName}`)
    } catch (error) {
      console.error('Error importing shared crossword:', error)
      alert(`Error loading shared crossword: ${error.message}`)
    }
  }

  const [shareModalData, setShareModalData] = useState(null)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)

  const handleShare = async (crosswordName) => {
    try {
      // Load crossword data from localStorage
      const crosswordData = loadCrosswordFromLocalStorage(crosswordName)
      if (!crosswordData) {
        alert('Crossword not found')
        return
      }

      // Show loading state
      setShareModalData({ crosswordName, loading: true, shareLink: null })

      // Share to Supabase
      const result = await shareCrosswordToSupabase(
        crosswordData.gridCSV,
        crosswordData.cluesCSV,
        crosswordData.metadata?.displayName || crosswordName
      )

      if (!result.success) {
        alert(`Error sharing crossword: ${result.error}`)
        setShareModalData(null)
        return
      }

      // Show share modal with link
      setShareModalData({
        crosswordName,
        loading: false,
        shareLink: result.shareLink,
        displayName: crosswordData.metadata?.displayName || crosswordName
      })
      setShareLinkCopied(false)
    } catch (error) {
      console.error('Error sharing crossword:', error)
      alert(`Error sharing crossword: ${error.message}`)
      setShareModalData(null)
    }
  }

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
      
      // Load grid previews for all crosswords
      const previews = {}
      combined.forEach(crossword => {
        try {
          const crosswordData = loadCrosswordFromLocalStorage(crossword.name)
          if (crosswordData && crosswordData.gridCSV) {
            try {
              const grid = parseGridCSV(crosswordData.gridCSV)
              // Only store if grid is valid and has content
              if (grid && grid.length > 0 && grid[0] && grid[0].length > 0) {
                previews[crossword.name] = grid
              }
            } catch (parseError) {
              console.warn(`Failed to parse grid for ${crossword.name}:`, parseError)
            }
          }
        } catch (error) {
          console.warn(`Failed to load preview for ${crossword.name}:`, error)
        }
      })
      setGridPreviews(previews)
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

  const crosswordFileRef = useRef(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importName, setImportName] = useState('')
  const [importMode, setImportMode] = useState('file') // 'file' or 'share'
  const [shareIdInput, setShareIdInput] = useState('')

  const handleImport = async () => {
    if (importMode === 'share') {
      // Import from share link
      if (!shareIdInput.trim()) {
        alert('Please enter a share ID or share link')
        return
      }

      // Extract share ID from URL if full link is provided
      let shareId = shareIdInput.trim()
      if (shareId.includes('?share=')) {
        shareId = shareId.split('?share=')[1].split('&')[0]
      } else if (shareId.includes('/share/')) {
        shareId = shareId.split('/share/')[1].split('?')[0].split('#')[0]
      }

      if (!shareId) {
        alert('Invalid share link. Please check the link and try again.')
        return
      }

      try {
        const result = await fetchSharedCrossword(shareId)
        
        if (!result.success) {
          alert(`Error loading shared crossword: ${result.error}`)
          return
        }

        // Generate a unique name for the imported crossword
        const timestamp = Date.now()
        const importName = result.displayName 
          ? `${result.displayName}-shared-${timestamp}`.toLowerCase().replace(/[^a-z0-9]/g, '-')
          : `shared-crossword-${timestamp}`

        // Save to localStorage
        saveCrosswordToLocalStorage(importName, result.gridCSV, result.cluesCSV, {
          displayName: result.displayName || `Shared Crossword`
        })

        // Reset form
        setShareIdInput('')
        setShowImportModal(false)

        // Reload crosswords list
        loadCrosswords()

        // Navigate to the imported crossword
        navigate(`/${importName}`)
      } catch (error) {
        console.error('Error importing shared crossword:', error)
        alert(`Error importing shared crossword: ${error.message}`)
      }
    } else {
      // Import from CSV file
      const crosswordFile = crosswordFileRef.current?.files?.[0]

      if (!crosswordFile) {
        alert('Please select a crossword CSV file')
        return
      }

      if (!importName.trim()) {
        alert('Please enter a name for the crossword')
        return
      }

      try {
        // Read the combined CSV file
        const combinedText = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target.result)
          reader.onerror = reject
          reader.readAsText(crosswordFile)
        })

        // Parse the combined CSV file
        let parsedData
        try {
          const { parseCombinedCSV } = await import('../utils/csvParser')
          parsedData = parseCombinedCSV(combinedText)
        } catch (parseError) {
          alert(`Error parsing CSV file: ${parseError.message}\n\nMake sure you're importing a file downloaded from the Crossword Creator (combined format).`)
          return
        }

        // Save to localStorage
        saveCrosswordToLocalStorage(importName, parsedData.gridCSV, parsedData.cluesCSV, {
          displayName: importName.trim()
        })

        // Reset form
        setImportName('')
        setShowImportModal(false)
        if (crosswordFileRef.current) crosswordFileRef.current.value = ''

        // Reload crosswords list
        loadCrosswords()

        alert('Crossword imported successfully!')
      } catch (error) {
        console.error('Error importing crossword:', error)
        alert(`Error importing crossword: ${error.message}`)
      }
    }
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
          <button className="home-btn import-btn" onClick={() => setShowImportModal(true)}>
            Import Crossword
          </button>
          <button className="home-btn wordle-btn" onClick={() => navigate('/daily-wordle')}>
            Daily Wordl
          </button>
        </div>

        {showImportModal && (
          <div className="import-modal-overlay" onClick={() => setShowImportModal(false)}>
            <div className="import-modal" onClick={(e) => e.stopPropagation()}>
              <div className="import-modal-header">
                <h2>Import Crossword</h2>
                <button className="import-modal-close" onClick={() => setShowImportModal(false)}>×</button>
              </div>
              <div className="import-modal-content">
                {/* Import Mode Toggle */}
                <div className="import-input-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Import From:</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className={`import-btn ${importMode === 'file' ? 'import-btn-primary' : 'import-btn-cancel'}`}
                      onClick={() => {
                        setImportMode('file')
                        setShareIdInput('')
                      }}
                      style={{ flex: 1 }}
                    >
                      CSV File
                    </button>
                    <button
                      className={`import-btn ${importMode === 'share' ? 'import-btn-primary' : 'import-btn-cancel'}`}
                      onClick={() => {
                        setImportMode('share')
                        setImportName('')
                        if (crosswordFileRef.current) crosswordFileRef.current.value = ''
                      }}
                      style={{ flex: 1 }}
                    >
                      Shared Link
                    </button>
                  </div>
                </div>

                {importMode === 'file' ? (
                  <>
                    <div className="import-input-group">
                      <label htmlFor="import-name">Crossword Name:</label>
                      <input
                        id="import-name"
                        type="text"
                        value={importName}
                        onChange={(e) => setImportName(e.target.value)}
                        placeholder="Enter crossword name"
                        className="import-name-input"
                      />
                    </div>
                    <div className="import-file-inputs">
                      <div className="import-file-group">
                        <label htmlFor="import-crossword-file">Crossword CSV File:</label>
                        <input
                          id="import-crossword-file"
                          type="file"
                          accept=".csv"
                          ref={crosswordFileRef}
                          className="import-file-input"
                        />
                        <small style={{ marginTop: '5px', display: 'block', color: '#666', fontStyle: 'italic' }}>
                          Select the combined CSV file downloaded from the Crossword Creator
                        </small>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="import-input-group">
                    <label htmlFor="share-id-input">Share Link or Share ID:</label>
                    <input
                      id="share-id-input"
                      type="text"
                      value={shareIdInput}
                      onChange={(e) => setShareIdInput(e.target.value)}
                      placeholder="Paste share link or enter share ID (e.g., ABC12345)"
                      className="import-name-input"
                    />
                    <small style={{ marginTop: '5px', display: 'block', color: '#666', fontStyle: 'italic' }}>
                      Enter a share link (e.g., yoursite.com?share=ABC12345) or just the share ID
                    </small>
                  </div>
                )}

                <div className="import-modal-buttons">
                  <button className="import-btn import-btn-primary" onClick={handleImport}>
                    Import
                  </button>
                  <button className="import-btn import-btn-cancel" onClick={() => {
                    setShowImportModal(false)
                    setImportMode('file')
                    setShareIdInput('')
                    setImportName('')
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                {gridPreviews[crossword.name] && (
                  <CrosswordPreview grid={gridPreviews[crossword.name]} />
                )}
                <div className="card-actions">
                  <button
                    className="card-btn play-btn"
                    onClick={() => handlePlay(crossword.name)}
                  >
                    Play
                  </button>
                  <button
                    className="card-btn share-btn"
                    onClick={() => handleShare(crossword.name)}
                    title="Share this crossword"
                  >
                    Share
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

      {/* Share Modal */}
      {shareModalData && (
        <div className="import-modal-overlay" onClick={() => setShareModalData(null)}>
          <div className="import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="import-modal-header">
              <h2>Share Crossword</h2>
              <button className="import-modal-close" onClick={() => setShareModalData(null)}>×</button>
            </div>
            <div className="import-modal-content">
              {shareModalData.loading ? (
                <p>Generating share link...</p>
              ) : (
                <>
                  <p style={{ marginBottom: '15px' }}>
                    Share <strong>{shareModalData.displayName}</strong> with others!
                  </p>
                  <div className="import-input-group">
                    <label htmlFor="share-link-input">Shareable Link:</label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        id="share-link-input"
                        type="text"
                        value={shareModalData.shareLink}
                        readOnly
                        className="import-name-input"
                        style={{ flex: 1 }}
                      />
                      <button
                        className="import-btn import-btn-primary"
                        onClick={async () => {
                          const success = await copyToClipboard(shareModalData.shareLink)
                          if (success) {
                            setShareLinkCopied(true)
                            setTimeout(() => setShareLinkCopied(false), 2000)
                          } else {
                            alert('Failed to copy link. Please copy it manually.')
                          }
                        }}
                        style={{ whiteSpace: 'nowrap', minWidth: '100px' }}
                      >
                        {shareLinkCopied ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                    <small style={{ display: 'block', color: '#666', fontStyle: 'italic' }}>
                      Anyone with this link can play your crossword!
                    </small>
                  </div>
                  <div className="import-modal-buttons">
                    <button className="import-btn import-btn-cancel" onClick={() => setShareModalData(null)}>
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home

