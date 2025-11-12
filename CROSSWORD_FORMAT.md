# Crossword Puzzle Format Specification

This document describes the CSV-based format for creating crossword puzzles. The format consists of two CSV files: `clues.csv` for clue definitions and `grid.csv` for the grid structure.

## Overview

A crossword puzzle requires two CSV files:
1. **clues.csv** - Defines all clues (hints) for across and down words
2. **grid.csv** - Defines the grid layout, cell positions, and letter solutions

## File 1: clues.csv

### Format
```csv
direction,number,text
across,1,First clue text
across,2,Second clue text
down,1,First down clue
down,2,Second down clue
```

### Fields
- **direction** (required): Either `across` or `down` (case-insensitive)
- **number** (required): Integer representing the clue number (must match grid numbering)
- **text** (required): The clue/hint text for the word

### Rules
- Each clue must have a unique combination of `direction` and `number`
- Clue numbers should start at 1 and increment sequentially
- Across and down clues can share the same number if they intersect at that numbered cell
- Clue text should be clear and descriptive

### Example
```csv
direction,number,text
across,1,Process of determining company worth
across,2,Earnings metric: Earnings Before Interest Tax Depreciation Amortization
down,1,Investment funding stage like Series A or B
down,2,Earnings metric: Earnings Before Interest Tax Depreciation Amortization
```

## File 2: grid.csv

### Format
```csv
row,col,number,across,down,solution
0,0,1,1,1,V
0,1,,1,,A
0,2,,1,,L
0,3,,1,,U
0,4,,1,,A
0,5,,1,,T
0,6,,1,,I
0,7,,1,,O
0,8,,1,,N
0,9,,,,,
1,0,,,1,E
```

### Fields
- **row** (required): Integer, 0-based row index (top to bottom)
- **col** (required): Integer, 0-based column index (left to right)
- **number** (optional): Integer, clue number if this cell starts a word (null/empty otherwise)
- **across** (optional): Integer, clue number for the across word this cell belongs to (null/empty if not part of an across word)
- **down** (optional): Integer, clue number for the down word this cell belongs to (null/empty if not part of a down word)
- **solution** (required for letter cells): Single uppercase letter, or empty/null for blocked cells

### Cell Types

1. **Starting Cell** (has a number):
   - Must have both `across` and/or `down` set
   - `number` indicates the clue number displayed in the grid
   - Example: `0,0,1,1,1,V` - Cell at (0,0) starts both clue 1 across and clue 1 down

2. **Continuation Cell** (no number, but part of a word):
   - Has `across` and/or `down` set to indicate which word it belongs to
   - Example: `0,1,,1,,A` - Cell at (0,1) continues clue 1 across

3. **Blocked Cell** (empty solution):
   - All fields except row/col are empty
   - Represents a black square in traditional crosswords
   - Example: `0,9,,,,,`

### Rules

1. **Grid Structure**:
   - Grid is 0-indexed (starts at row 0, col 0)
   - Every cell must be defined (even blocked cells)
   - Grid should be rectangular (all rows have same number of columns)

2. **Word Continuity**:
   - Cells in the same word must be consecutive (no gaps)
   - Across words: same row, consecutive columns
   - Down words: same column, consecutive rows

3. **Numbering**:
   - Starting cells must have a `number` that matches a clue in clues.csv
   - The same number can appear in both `across` and `down` if a cell starts both words
   - Number should only appear on the first cell of each word

4. **Intersections**:
   - When words intersect, the `solution` letter must be the same
   - **CRITICAL: Intersecting words must be DIFFERENT words**
   - If "VENTURE" goes across, the down word intersecting at 'V' must be a different word starting with 'V' (e.g., "VALUATION", "VALUE", "VENDOR"), NOT "VENTURE" again
   - The intersecting cell should have both `across` and `down` set appropriately
   - Each direction (across/down) should have unique words - no word should appear in both directions

5. **Solution Letters**:
   - Must be single uppercase letters (A-Z)
   - Blocked cells have empty/null solution
   - All cells in a word must have solution letters

## Creating a Crossword from Content

### Step-by-Step Process

1. **Extract Key Terms and Concepts**
   - Identify important words/phrases from your content
   - Choose words of varying lengths (3-15 letters work well)
   - Ensure words can intersect (share common letters)

2. **Design the Grid Layout**
   - Start with a target grid size (e.g., 15x15)
   - Place the longest/most important word first (typically across)
   - Add intersecting words that share letters with existing words
   - Fill in remaining words to create a connected puzzle

3. **Number the Starting Cells**
   - Assign sequential numbers starting from 1
   - Number cells where words begin (top-leftmost cell of each word)
   - If a cell starts both across and down words, it gets one number for both

4. **Create clues.csv**
   - For each numbered word, write a clue
   - Clues should be hints, not direct definitions
   - Make clues specific enough to be solvable but not too obvious

5. **Create grid.csv**
   - For each cell in your grid:
     - Set `row` and `col` (0-indexed)
     - If starting a word: set `number`, `across`, and/or `down`
     - If continuing a word: set `across` and/or `down` (no number)
     - If blocked: leave number/across/down empty
     - Set `solution` to the letter (uppercase) or leave empty for blocked cells

### Example: Creating a Simple Crossword

**Content**: "Tech companies use SaaS and AI. Valuation matters."

**Step 1: Extract Terms**
- SAAS (4 letters)
- AI (2 letters - too short, use OPENAI: 6 letters)
- VALUATION (9 letters)

**Step 2: Design Grid**
```
V A L U A T I O N . . . . .
. . . . . . . . . . . . . .
. . . . . . . . . . . . . .
```

**Step 3: Add Intersecting Word**
Find where words can intersect. "SAAS" and "VALUATION" share "A" at position (0,1).

```
V A L U A T I O N . . . . .
. . . . . . . . . . . . . .
. . . . . . . . . . . . . .
```

Actually, let's place OPENAI vertically to intersect:
```
V A L U A T I O N . . . . .
. . . . . . . . . . . . . .
. . . . . . . . . . . . . .
```

**Step 4: Create clues.csv**
```csv
direction,number,text
across,1,Process of determining company worth
down,1,Investment funding stage like Series A or B
```

**Step 5: Create grid.csv**
```csv
row,col,number,across,down,solution
0,0,1,1,1,V
0,1,,1,,A
0,2,,1,,L
0,3,,1,,U
0,4,,1,,A
0,5,,1,,T
0,6,,1,,I
0,7,,1,,O
0,8,,1,,N
0,9,,,,,
1,0,,,1,E
1,1,,,,,
...
```

## Validation Rules

When creating a crossword, ensure:

1. **Completeness**: Every clue in clues.csv has a corresponding word in grid.csv
2. **Consistency**: All cells in a word have the same `across` or `down` number
3. **Continuity**: Words have no gaps (consecutive cells)
4. **Intersections**: 
   - Intersecting words share the same letter at intersection points
   - **Intersecting words must be DIFFERENT words** - if "VENTURE" is across, the down word at the intersection must be a different word (e.g., "VALUATION", "VALUE", "VENDOR"), not "VENTURE" again
5. **Uniqueness**: Each word should appear only once in the puzzle - across words and down words should be different from each other
6. **Numbering**: Starting cells have numbers that match clues
7. **Blocking**: Blocked cells are properly marked (empty solution, no across/down)

## Common Patterns

### Pattern 1: Simple Intersection
```
V A L U A T I O N
E
N
T
U
R
E
```
- VALUATION (across 1) intersects VENTURE (down 1) at (0,0)

### Pattern 2: Multiple Intersections
```
V A L U A T I O N . E B I T D A
E               . . . . . . . .
N               . . . . . . . .
```
- VALUATION (across 1) intersects VENTURE (down 1) - **different words sharing 'V'**
- EBITDA (across 2) is separate
- Note: VALUATION ≠ VENTURE (they are different words intersecting at 'V')

### Pattern 3: Shared Starting Cell
```
V A L U A T I O N
E
N
T
```
- Cell (0,0) starts both VALUATION (across 1) and VENTURE (down 1)
- In grid.csv: `0,0,1,1,1,V` (number=1, across=1, down=1)

## Tips for LLM Implementation

1. **Start Simple**: Begin with 2-3 intersecting words
2. **Use Common Letters**: Words with A, E, I, O, U, R, S, T, N, L are easier to intersect
3. **Vary Lengths**: Mix short (3-5) and long (8-12) words
4. **Check Intersections**: 
   - Verify shared letters match at intersection points
   - **CRITICAL: Ensure intersecting words are DIFFERENT** - if you place "VENTURE" across, find a different word starting with 'V' for the down direction (e.g., "VALUATION", "VALUE", "VENDOR")
5. **Word Uniqueness**: Never use the same word in both across and down directions - each word should be unique to its direction
6. **Test Connectivity**: Ensure all words are connected (no isolated words)
7. **Validate**: Check that every clue has a word and every word has a clue

## Example: Complete Mini Crossword

**clues.csv:**
```csv
direction,number,text
across,1,Process of determining company worth
across,2,Earnings metric abbreviation
down,1,Investment funding stage
down,2,Earnings metric abbreviation
```

**grid.csv:**
```csv
row,col,number,across,down,solution
0,0,1,1,1,V
0,1,,1,,A
0,2,,1,,L
0,3,,1,,U
0,4,,1,,A
0,5,,1,,T
0,6,,1,,I
0,7,,1,,O
0,8,,1,,N
0,9,,,,,
0,10,2,2,2,E
0,11,,2,,B
0,12,,2,,I
0,13,,2,,T
0,14,,2,,D
1,0,,,1,E
1,1,,,,,
1,2,,,,,
1,3,,,,,
1,4,,,,,
1,5,,,,,
1,6,,,,,
1,7,,,,,
1,8,,,,,
1,9,,,,,
1,10,,,2,A
1,11,,,,,
1,12,,,,,
1,13,,,,,
1,14,,,,,
2,0,,,1,N
2,1,,,,,
2,2,,,,,
2,3,,,,,
2,4,,,,,
2,5,,,,,
2,6,,,,,
2,7,,,,,
2,8,,,,,
2,9,,,,,
2,10,,,2,P
2,11,,,,,
2,12,,,,,
2,13,,,,,
2,14,,,,,
3,0,,,1,T
3,1,,,,,
3,2,,,,,
3,3,,,,,
3,4,,,,,
3,5,,,,,
3,6,,,,,
3,7,,,,,
3,8,,,,,
3,9,,,,,
3,10,,,2,I
3,11,,,,,
3,12,,,,,
3,13,,,,,
3,14,,,,,
4,0,,,1,U
4,1,,,,,
4,2,,,,,
4,3,,,,,
4,4,,,,,
4,5,,,,,
4,6,,,,,
4,7,,,,,
4,8,,,,,
4,9,,,,,
4,10,,,2,T
4,11,,,,,
4,12,,,,,
4,13,,,,,
4,14,,,,,
5,0,,,1,R
5,1,,,,,
5,2,,,,,
5,3,,,,,
5,4,,,,,
5,5,,,,,
5,6,,,,,
5,7,,,,,
5,8,,,,,
5,9,,,,,
5,10,,,2,A
5,11,,,,,
5,12,,,,,
5,13,,,,,
5,14,,,,,
6,0,,,1,E
6,1,,,,,
6,2,,,,,
6,3,,,,,
6,4,,,,,
6,5,,,,,
6,6,,,,,
6,7,,,,,
6,8,,,,,
6,9,,,,,
6,10,,,,,
6,11,,,,,
6,12,,,,,
6,13,,,,,
6,14,,,,,
```

This creates:
- **VALUATION** (across 1, row 0, cols 0-8) intersecting with **VENTURE** (down 1, col 0, rows 0-6) at (0,0)
  - Note: VALUATION ≠ VENTURE - they are different words sharing the letter 'V' at the intersection
- **EBITDA** (across 2, row 0, cols 10-14) intersecting with **EBITDA** (down 2, col 10, rows 0-4) at (0,10)
  - ⚠️ **WARNING**: This example shows the same word in both directions, which violates the rule. In a proper crossword, EBITDA across should intersect with a DIFFERENT word down (e.g., "EARNINGS", "EQUITY", "EXPENSE")

## Summary

The crossword format uses two CSV files:
- **clues.csv**: Maps clue numbers to hint text for across/down directions
- **grid.csv**: Defines the grid structure with row/col positions, clue numbers, word memberships, and solution letters

Key principles:
- Words must be continuous (no gaps)
- **Intersecting words must be DIFFERENT words** - if "VENTURE" goes across, the down word at the intersection must be a different word (e.g., "VALUATION", "VALUE", "VENDOR"), not "VENTURE" again
- Each word should be unique - no word should appear in both across and down directions
- Intersecting words share letters at intersection points
- Starting cells are numbered and match clues
- Blocked cells are empty
- All cells must be explicitly defined

### Critical Rule for LLMs

**When creating intersecting words:**
- If word A goes ACROSS and intersects with word B going DOWN at position (row, col)
- Word A and Word B must be **DIFFERENT words**
- They share the same letter at the intersection point
- Example: "VENTURE" (across) can intersect with "VALUATION" (down) at 'V', but NOT with "VENTURE" (down)
- Each direction should have its own unique set of words

