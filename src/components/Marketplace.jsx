import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { browseMarketplace, downloadFromMarketplace, deleteFromMarketplace, getCurrentUser } from '../utils/shareApi'
import { saveCrosswordToLocalStorage, getMarketplaceUploads, untrackMarketplaceUpload } from '../utils/localStorage'
import { parseGridCSV } from '../utils/csvParser'
import CrosswordPreview from './CrosswordPreview'
import Auth from './Auth'
import '../App.css'
import './Marketplace.css'

function Marketplace() {
  const [crosswords, setCrosswords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [userUploads, setUserUploads] = useState([]) // Track user's uploaded crosswords
  const [user, setUser] = useState(null) // Track authenticated user
  const [gridPreviews, setGridPreviews] = useState({}) // Store grid previews by crossword ID
  const navigate = useNavigate()

  const limit = 12

  useEffect(() => {
    loadMarketplace()
    // Load user's uploaded crosswords
    setUserUploads(getMarketplaceUploads())
    // Check authentication status
    getCurrentUser().then(({ user }) => setUser(user))
    
    // Listen for auth state changes
    const handleAuthChange = (event) => {
      setUser(event.detail.user)
    }
    window.addEventListener('auth-state-changed', handleAuthChange)
    return () => window.removeEventListener('auth-state-changed', handleAuthChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy, order, searchTerm, featuredOnly])

  const loadMarketplace = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('Loading marketplace with params:', {
        limit,
        offset: page * limit,
        sortBy,
        order,
        search: searchTerm,
        featuredOnly
      })

      const result = await browseMarketplace({
        limit,
        offset: page * limit,
        sortBy,
        order,
        search: searchTerm,
        featuredOnly
      })

      console.log('Marketplace result:', result)

      if (result.success) {
        const crosswordsList = result.crosswords || []
        setCrosswords(crosswordsList)
        setTotal(result.total || 0)
        console.log(`Loaded ${crosswordsList.length} crosswords, total: ${result.total || 0}`)
        
        // Parse grid previews for all crosswords
        const previews = {}
        crosswordsList.forEach(crossword => {
          try {
            // Note: We need to fetch the grid CSV from the database
            // For now, we'll parse it when we have it in the crossword object
            // The browseMarketplace function should return grid_csv if available
            if (crossword.grid_csv) {
              try {
                const grid = parseGridCSV(crossword.grid_csv)
                if (grid && grid.length > 0 && grid[0] && grid[0].length > 0) {
                  previews[crossword.id] = grid
                }
              } catch (parseError) {
                console.warn(`Failed to parse grid for ${crossword.id}:`, parseError)
              }
            }
          } catch (error) {
            console.warn(`Failed to load preview for ${crossword.id}:`, error)
          }
        })
        setGridPreviews(previews)
      } else {
        const errorMsg = result.error || 'Failed to load marketplace'
        console.error('Marketplace error:', errorMsg)
        setError(errorMsg)
        setCrosswords([])
      }
    } catch (err) {
      console.error('Error loading marketplace:', err)
      setError(err.message || 'Failed to load marketplace')
      setCrosswords([])
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (crossword) => {
    try {
      const result = await downloadFromMarketplace(crossword.id)

      if (!result.success) {
        alert(`Error downloading crossword: ${result.error}`)
        return
      }

      // Generate a unique name for the downloaded crossword
      const timestamp = Date.now()
      const importName = result.displayName
        ? `${result.displayName}-marketplace-${timestamp}`.toLowerCase().replace(/[^a-z0-9]/g, '-')
        : `marketplace-crossword-${timestamp}`

      // Save to localStorage
      saveCrosswordToLocalStorage(importName, result.gridCSV, result.cluesCSV, {
        displayName: result.displayName || `Marketplace Crossword`
      })

      // Navigate to play the crossword
      navigate(`/${importName}`)
    } catch (error) {
      console.error('Error downloading crossword:', error)
      alert(`Error downloading crossword: ${error.message}`)
    }
  }

  const handleDelete = async (crossword) => {
    if (!confirm(`Are you sure you want to delete "${crossword.display_name}" from the marketplace?`)) {
      return
    }

    try {
      const result = await deleteFromMarketplace(crossword.id)

      if (result.success) {
        // Remove from tracking
        untrackMarketplaceUpload(crossword.id)
        setUserUploads(getMarketplaceUploads())
        // Reload marketplace to reflect the deletion
        loadMarketplace()
        alert('Crossword deleted from marketplace successfully!')
      } else {
        alert(`Error deleting crossword: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting crossword:', error)
      alert(`Error deleting crossword: ${error.message}`)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(0) // Reset to first page on new search
    loadMarketplace()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="marketplace-container">
      <div className="marketplace-header">
        <div className="marketplace-header-top">
          <button 
            className="marketplace-home-btn"
            onClick={() => navigate('/')}
            title="Go to home"
          >
            ← Home
          </button>
        </div>
        <div className="marketplace-header-right">
          <Auth />
        </div>
        <h1>Crossword Marketplace</h1>
        <p className="marketplace-subtitle">Discover and download crosswords created by the community</p>
        <p className="marketplace-auth-notice" style={{ fontSize: '0.9em', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
          Sign in with Google to upload and download crosswords
        </p>
      </div>

      <div className="marketplace-controls">
        <form onSubmit={handleSearch} className="marketplace-search">
          <input
            type="text"
            placeholder="Search crosswords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="marketplace-search-input"
          />
          <button type="submit" className="marketplace-search-btn">Search</button>
        </form>

        <div className="marketplace-filters">
          <label className="marketplace-filter-label">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => {
                setFeaturedOnly(e.target.checked)
                setPage(0)
              }}
            />
            Featured Only
          </label>

          <label className="marketplace-filter-label">
            Sort By:
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setPage(0)
              }}
              className="marketplace-sort-select"
            >
              <option value="created_at">Date</option>
              <option value="downloads">Downloads</option>
              <option value="rating">Rating</option>
            </select>
          </label>

          <label className="marketplace-filter-label">
            Order:
            <select
              value={order}
              onChange={(e) => {
                setOrder(e.target.value)
                setPage(0)
              }}
              className="marketplace-sort-select"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>
      </div>

      {loading && (
        <div className="marketplace-loading">
          <p>Loading marketplace...</p>
        </div>
      )}

      {error && (
        <div className="marketplace-error">
          <p>Error: {error}</p>
          <button onClick={loadMarketplace} className="marketplace-retry-btn">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {crosswords.length === 0 ? (
            <div className="marketplace-empty">
              <p>No crosswords found. Be the first to upload one!</p>
              <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#999' }}>
                (Total in database: {total})
              </p>
            </div>
          ) : (
            <>
              <div className="marketplace-grid">
                {crosswords.map((crossword) => (
                  <div key={crossword.id} className="marketplace-card">
                    {crossword.is_featured && (
                      <div className="marketplace-featured-badge">Featured</div>
                    )}
                    <div className="marketplace-card-header">
                      <h3 className="marketplace-card-title">{crossword.display_name}</h3>
                      {crossword.author_name && (
                        <p className="marketplace-card-author">By {crossword.author_name}</p>
                      )}
                    </div>
                    {gridPreviews[crossword.id] && (
                      <CrosswordPreview grid={gridPreviews[crossword.id]} />
                    )}
                    {crossword.description && (
                      <p className="marketplace-card-description">{crossword.description}</p>
                    )}
                    <div className="marketplace-card-stats">
                      <span className="marketplace-stat">
                        <strong>{crossword.downloads || 0}</strong> downloads
                      </span>
                      {crossword.rating_count > 0 && (
                        <span className="marketplace-stat">
                          <strong>{crossword.rating?.toFixed(1) || '0.0'}</strong> ⭐ ({crossword.rating_count})
                        </span>
                      )}
                    </div>
                    <div className="marketplace-card-actions">
                      {userUploads.includes(crossword.id) && user && (
                        <button
                          className="marketplace-delete-btn"
                          onClick={() => handleDelete(crossword)}
                          title="Delete your uploaded crossword"
                        >
                          Delete
                        </button>
                      )}
                      <button
                        className="marketplace-download-btn"
                        onClick={() => handleDownload(crossword)}
                        disabled={!user}
                        title={!user ? 'Sign in to download' : 'Download & Play'}
                      >
                        {user ? 'Download & Play' : 'Sign In to Download'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="marketplace-pagination">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="marketplace-page-btn"
                  >
                    Previous
                  </button>
                  <span className="marketplace-page-info">
                    Page {page + 1} of {totalPages} ({total} total)
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="marketplace-page-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default Marketplace

