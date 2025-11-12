# CrosswordCreator

Interactive Crossword Game

A modern, newspaper-styled interactive crossword puzzle built with React. Puzzles are loaded from CSV files, making it easy to create and share custom crosswords.

## Features

- Interactive crossword grid with click-to-select cells
- Keyboard input for entering letters
- Arrow key navigation (Left/Right for across, Up/Down for down)
- Clue navigation (Across/Down)
- Highlighted active word and selected cell
- Modern newspaper aesthetic styling
- Responsive design
- CSV-based puzzle format for easy creation

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

## How to Play

1. Click on any cell in the crossword grid to select it
2. Type letters to fill in answers
3. Use Backspace/Delete to clear a cell
4. Use arrow keys to navigate between cells
5. Click on clues in the sidebar to jump to that word
6. Toggle between "Across" and "Down" clues using the tabs
7. The current word is highlighted in beige, and the selected cell is highlighted in yellow

## Creating Custom Crosswords

The app loads puzzles from CSV files in the `public/` folder:
- `clues.csv` - Contains all clue definitions
- `grid.csv` - Contains the grid structure and solutions

**See [CROSSWORD_FORMAT.md](./CROSSWORD_FORMAT.md) for complete documentation on the CSV format and how to create crosswords from content.**

The format is designed to be LLM-friendly, with clear specifications for generating crossword puzzles programmatically.

## Technologies

- React 18
- Vite
- CSS3

