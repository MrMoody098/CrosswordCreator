import React from 'react'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import CrosswordViewer from './components/CrosswordViewer'
import CrosswordBuilder from './components/CrosswordBuilder'
import Home from './components/Home'
import './App.css'

function App() {
  // Use base URL from Vite config (empty for dev, /CrosswordCreator/ for GitHub Pages)
  const basePath = import.meta.env.BASE_URL || '/'
  
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
  return <CrosswordViewer crosswordName={crosswordName || 'default'} />
}

export default App

