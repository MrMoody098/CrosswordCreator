import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Save CSV file to public directory
app.post('/api/save-csv', (req, res) => {
  const { filename, content } = req.body
  
  if (!filename || !content) {
    return res.status(400).json({ error: 'Filename and content are required' })
  }

  // Ensure filename is safe
  const safeFilename = filename.replace(/[^a-zA-Z0-9\-_\.]/g, '')
  const publicDir = path.join(__dirname, 'public')
  const filePath = path.join(publicDir, safeFilename)

  try {
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    // Write file
    fs.writeFileSync(filePath, content, 'utf8')
    
    res.json({ success: true, message: `File ${safeFilename} saved successfully` })
  } catch (error) {
    console.error('Error saving file:', error)
    res.status(500).json({ error: 'Failed to save file', details: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

