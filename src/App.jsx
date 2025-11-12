import React from 'react'
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom'
import CrosswordViewer from './components/CrosswordViewer'
import CrosswordBuilder from './components/CrosswordBuilder'
import Home from './components/Home'
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
        <Route path="/:crosswordName" element={<CrosswordViewerWrapper />} />
      </Routes>
    </BrowserRouter>
  )
}

function CrosswordViewerWrapper() {
  const { crosswordName } = useParams()
  
  // Prevent reserved names from being treated as crossword names
  // Redirect to home if someone tries to access these routes
  const reservedNames = ['create-crossword', 'CrosswordCreator', 'crosswordcreator']
  
  // Check immediately and redirect before rendering anything
  if (!crosswordName || reservedNames.includes(crosswordName)) {
    return <Navigate to="/" replace />
  }
  
  return <CrosswordViewer crosswordName={crosswordName} />
}

export default App

