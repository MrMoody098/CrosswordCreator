import React from 'react'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import CrosswordViewer from './components/CrosswordViewer'
import CrosswordBuilder from './components/CrosswordBuilder'
import Home from './components/Home'
import './App.css'

function App() {
  return (
    <BrowserRouter>
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

