import React from 'react'
import { BrowserRouter, Routes, Route, useParams, Navigate, useLocation } from 'react-router-dom'
import CrosswordViewer from './components/CrosswordViewer'
import CrosswordBuilder from './components/CrosswordBuilder'
import Home from './components/Home'
import Wordle from './components/Wordle'
import WordleLeaderboard from './components/WordleLeaderboard'
import Marketplace from './components/Marketplace'
import './App.css'

function App() {
  // Use base URL from Vite config (empty for dev, /CrosswordCreator/ for GitHub Pages)
  // Remove trailing slash for BrowserRouter basename
  let basePath = import.meta.env.BASE_URL || '/'
  if (basePath.endsWith('/') && basePath !== '/') {
    basePath = basePath.slice(0, -1)
  }
  
  return (
    <BrowserRouter basename={basePath}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-crossword" element={<CrosswordBuilder />} />
        <Route path="/daily-wordle" element={<Wordle />} />
        <Route path="/daily-wordle/leaderboard" element={<WordleLeaderboard />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/:crosswordName" element={<CrosswordViewerWrapper />} />
      </Routes>
    </BrowserRouter>
  )
}

function CrosswordViewerWrapper() {
  const { crosswordName } = useParams()
  const location = useLocation()
  
  // Prevent reserved names from being treated as crossword names
  // Redirect to home if someone tries to access these routes
  const reservedNames = ['create-crossword', 'daily-wordle', 'marketplace', 'leaderboard', 'CrosswordCreator', 'crosswordcreator']
  
  // Also check if the pathname itself suggests we're at the root
  // This handles cases where basename might not be working correctly
  const pathname = location.pathname.toLowerCase()
  if (pathname === '/crosswordcreator' || pathname === '/crosswordcreator/') {
    return <Navigate to="/" replace />
  }
  
  // Check immediately and redirect before rendering anything
  if (!crosswordName || reservedNames.includes(crosswordName)) {
    return <Navigate to="/" replace />
  }
  
  return <CrosswordViewer crosswordName={crosswordName} />
}

export default App

