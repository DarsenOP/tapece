# TapECE: Circuit Builder MVP

A web-based tool for building and solving simple circuits.

## Stack Choices and Rationale
- **Frontend**: Vite + React 19 (TypeScript) with Konva 10 for canvas UI.
  - Why? Migrated from CRA (deprecated, vulns, slow). Vite is React-official, fast dev server (<1s HMR), clean deps (0 vulns). Konva enables tappable/draggable nodes.
  - Alternatives Considered: CRA (initial proposal)—dropped due to issues; Vue (lighter but less ecosystem for canvas).
- **Backend**: Python 3.13 with SymPy 1.14, NetworkX 3.5, NumPy 2.3.
  - Why? Powerful for symbolic ECE math (KCL/KVL via SymPy equations, graphs via NetworkX). JSON input from frontend parses to graph.
  - Alternatives: JS (math.js)—less capable for symbols.
- **Integration**: Manual JSON export/parse for MVP (frontend console/log → backend script). Future: Axios + Flask API + Vite proxy.
- **Testing**: Pytest backend imports/basics; Vite build for frontend.
- **CI**: GitHub Actions verifies builds/tests on push.
- **Deployment**: Later (GitHub Pages front, Render back).

## Versions (Pinned for Reproducibility)
| Component | Version | Check Command |
|-----------|---------|---------------|
| Node.js | 22.18.0 | `node --version` |
| Vite | 7.1.10 | `npm list vite` |
| React | 19.2.0 | `npm list react` |
| Konva/react-konva | 10.0.2 / 19.0.10 | `npm list konva` |
| TypeScript | 5.9.3 | `npm list typescript` |
| Python | 3.13.7 | `python --version` |
| SymPy | 1.14.0 | `python -c "import sympy; print(sympy.__version__)"` |
| NetworkX | 3.5 | `python -c "import networkx; print(networkx.__version__)"` |
| NumPy | 2.3.4 | `python -c "import numpy; print(numpy.__version__)"` |
| Pytest | 8.4.2 | `pip show pytest` |

## Setup
1. **Frontend**:
```bash
cd frontend
npm install  # Installs React, Vite, Konva
```
2. **Backend**:
```bash
cd backend
python -m venv env
source env/bin/activate
pip install -r requirements.txt
```
