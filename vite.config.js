import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/CrosswordCreator/' : '/',
  plugins: [
    react(),
    {
      name: 'crossword-api',
      configureServer(server) {
        // List crosswords endpoint
        server.middlewares.use('/api/list-crosswords', (req, res, next) => {
          if (req.method !== 'GET') {
            return next()
          }

          try {
            const publicDir = path.join(__dirname, 'public')
            const files = fs.readdirSync(publicDir)
            
            // Find all clue files (format: name-clues.csv)
            const crosswordMap = new Map()
            
            files.forEach(file => {
              if (file.endsWith('-clues.csv')) {
                const name = file.replace('-clues.csv', '')
                if (!crosswordMap.has(name)) {
                  // Check if corresponding grid file exists
                  const gridFile = `${name}-grid.csv`
                  if (files.includes(gridFile)) {
                    // Format display name (capitalize, replace hyphens with spaces)
                    const displayName = name
                      .split('-')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')
                    crosswordMap.set(name, displayName)
                  }
                }
              } else if (file === 'clues.csv') {
                // Default crossword
                if (!crosswordMap.has('default')) {
                  if (files.includes('grid.csv')) {
                    crosswordMap.set('default', 'Default Crossword')
                  }
                }
              }
            })
            
            const crosswords = Array.from(crosswordMap.entries()).map(([name, displayName]) => ({
              name,
              displayName
            }))
            
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, crosswords }))
          } catch (error) {
            console.error('Error listing crosswords:', error)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Failed to list crosswords', details: error.message }))
          }
        })

        // Delete crossword endpoint
        server.middlewares.use('/api/delete-crossword', (req, res, next) => {
          if (req.method !== 'POST') {
            return next()
          }

          let body = ''
          req.on('data', chunk => {
            body += chunk.toString()
          })
          req.on('end', () => {
            try {
              const { name } = JSON.parse(body)
              
              if (!name) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Crossword name is required' }))
                return
              }

              const safeName = name.replace(/[^a-zA-Z0-9\-_]/g, '')
              const publicDir = path.join(__dirname, 'public')
              
              // Delete both clue and grid files
              const cluesFile = safeName === 'default' ? 'clues.csv' : `${safeName}-clues.csv`
              const gridFile = safeName === 'default' ? 'grid.csv' : `${safeName}-grid.csv`
              
              const cluesPath = path.join(publicDir, cluesFile)
              const gridPath = path.join(publicDir, gridFile)
              
              let deleted = false
              
              if (fs.existsSync(cluesPath)) {
                fs.unlinkSync(cluesPath)
                deleted = true
              }
              
              if (fs.existsSync(gridPath)) {
                fs.unlinkSync(gridPath)
                deleted = true
              }
              
              if (!deleted) {
                res.writeHead(404, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Crossword not found' }))
                return
              }
              
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, message: `Crossword "${safeName}" deleted successfully` }))
            } catch (error) {
              console.error('Error deleting crossword:', error)
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Failed to delete crossword', details: error.message }))
            }
          })
        })

        // Save CSV endpoint
        server.middlewares.use('/api/save-csv', (req, res, next) => {
          if (req.method !== 'POST') {
            return next()
          }

          let body = ''
          req.on('data', chunk => {
            body += chunk.toString()
          })
          req.on('end', () => {
            try {
              const { filename, content } = JSON.parse(body)
              
              if (!filename || !content) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Filename and content are required' }))
                return
              }

              // Ensure filename is safe
              const safeFilename = filename.replace(/[^a-zA-Z0-9\-_\.]/g, '')
              const publicDir = path.join(__dirname, 'public')
              const filePath = path.join(publicDir, safeFilename)

              // Ensure public directory exists
              if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir, { recursive: true })
              }

              // Write file
              fs.writeFileSync(filePath, content, 'utf8')
              
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, message: `File ${safeFilename} saved successfully` }))
            } catch (error) {
              console.error('Error saving file:', error)
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Failed to save file', details: error.message }))
            }
          })
        })
      }
    }
  ]
})
