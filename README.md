# GRAPHIX — Graph Algorithm Visualizer

A full-stack interactive graph algorithm visualizer.

## Tech Stack

| Layer     | Technology                    |
|-----------|-------------------------------|
| Frontend  | React 18 + TypeScript + Vite  |
| Styling   | Pure CSS   |
| Backend   | Python 3.10+ + FastAPI        |
| Algorithms| BFS, DFS, Dijkstra (Python)   |

## Project Structure

```
graph-algo/
├── backend/
│   ├── main.py           # FastAPI app with all 3 algorithms
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Root app + state management
│   │   ├── index.css                  # Full dark cyberpunk styles
│   │   ├── main.tsx                   # React entry point
│   │   ├── types/index.ts             # TypeScript interfaces
│   │   └── components/
│   │       ├── GraphCanvas.tsx        # SVG graph renderer
│   │       ├── ControlPanel.tsx       # Left sidebar controls
│   │       └── TraversalLog.tsx       # Right sidebar log/results
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── start.sh              # One-command startup script
└── README.md
```

## Quick Start

### Manual
```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Features

### Graph Building
- **Click canvas** to place nodes (auto-labeled A, B, C...)
- **Add Edge mode**: click source → click target (prompts for weight if weighted)
- **Move mode**: drag nodes to reposition
- **Right-click** any node or edge to delete it
- **Load Example**: pre-built 7-node weighted graph

### Graph Configuration
- Toggle **Directed / Undirected**
- Toggle **Weighted / Unweighted** (required for Dijkstra)

### Algorithm Selection
- **BFS** — Breadth-First Search (queue-based level order)
- **DFS** — Depth-First Search (stack-based depth order)
- **Dijkstra** — Shortest weighted path (requires weighted graph)

### Visualization
| Color  | Meaning          |
|--------|-----------------|
| 🟢 Green  | Start node      |
| 🔴 Pink   | End node        |
| 🟠 Orange | Current node    |
| 🔵 Blue   | Frontier/Queue  |
| 🩵 Cyan   | Visited         |
| 🟡 Yellow | Shortest path   |
| ⚫ Dark   | Unvisited       |

### For Dijkstra
- Each node **displays its current tentative distance** (∞ if unreached)
- Yellow path overlay shows the shortest path found

### Controls
- ▶ **Run** — execute the algorithm with animation
- ⏸ **Pause/Resume** — stop/continue playback
- ⏮ ⏭ **Step Back/Forward** — manual step-through
- ↺ **Reset** — clear results, keep graph
- Speed slider (100ms–2000ms per step)

### Traversal Log (right panel)
- Step description
- Current node, visited set, frontier (queue/stack)
- Dijkstra distance table updated live
- Numbered traversal order sequence
- Final path display when complete

