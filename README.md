# 📊 Survey Analytics Dashboard

A production-grade, client-side survey analytics platform with rich data visualization and multi-format export. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no dependencies.

> **Live Demo:** [View on GitHub Pages](#) *(update with your URL after deployment)*

---

## ✨ Features

### Primary — Analytics
- **Overview Dashboard** — Key metrics at a glance: total responses, completion rate, average time, NPS score
- **Response Trend** — Line chart tracking responses over time with smooth bezier curves
- **Satisfaction Donut** — Donut chart showing overall satisfaction distribution
- **Question Analysis** — Per-question breakdown with bar charts and statistics
- **Demographics** — Cross-tabulation by age, department, location, tenure, and role
- **Individual Responses** — Searchable, sortable table with pagination

### Secondary — Export
- **CSV Export** — Full dataset or filtered subset, Excel-compatible (BOM encoded)
- **JSON Export** — Structured data with survey metadata
- **PDF Export** — Print-optimized stylesheet via browser print
- **Chart PNG** — Download individual charts as PNG images

### UI
- **Floating Navigation** — Pill-shaped top nav for seamless view switching
- **Floating Action Bar** — Bottom bar with filter controls and export button
- **Empty State** — Illustrated fallback when filters return zero results
- **Responsive** — Adapts to mobile (360px), tablet (768px), and desktop (1280px+)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 (semantic, accessible) |
| Styling | Vanilla CSS (custom properties, grid, flexbox) |
| Logic | Vanilla JavaScript (ES6+, modules via IIFE) |
| Charts | Canvas 2D API (no libraries) |
| Fonts | [Fraunces](https://fonts.google.com/specimen/Fraunces) + [DM Sans](https://fonts.google.com/specimen/DM+Sans) |
| Data | Static JSON files fetched at runtime |

**Zero dependencies. No build step. No framework.**

---

## 📁 Project Structure

```
survey-analytics/
├── index.html                # Entry point — layout, navigation, semantic HTML
├── css/
│   └── style.css             # Design system — variables, layout, typography, print
├── js/
│   ├── app.js                # Main orchestrator — init, view switching, rendering
│   ├── analytics.js          # Analytics engine — pure calculation functions
│   ├── charts.js             # Chart renderer — Canvas 2D (bar, line, donut)
│   ├── export.js             # Export module — CSV, JSON, PDF, PNG
│   └── state.js              # State store — pub/sub event bus, filters
├── data/
│   ├── surveys.json          # Survey definitions (questions, types, options)
│   ├── responses.json        # Mock response data (716 entries)
│   └── demographics.json     # Demographic segment definitions
├── assets/
│   ├── favicon.svg           # Site favicon
│   └── empty-state.png       # Empty state illustration
├── .gitignore
└── README.md
```

> **Data is fully external.** All survey content lives in `data/*.json` — the code fetches these via `fetch()` at runtime. Swap the JSON files to change the survey without touching any code.

---

## 🚀 Getting Started

### Prerequisites
Any static file server. The app uses `fetch()` for data loading, so opening `index.html` directly via `file://` won't work — you need a server.

### Run Locally

**Option 1 — Python** (built-in on most systems)
```bash
cd survey-analytics
python -m http.server 3000
# Open http://localhost:3000
```

**Option 2 — Node.js**
```bash
npx serve . -l 3000
# Open http://localhost:3000
```

**Option 3 — VS Code**
Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension → right-click `index.html` → "Open with Live Server"

### Deploy to GitHub Pages
1. Push to a public GitHub repository
2. Go to **Settings → Pages → Source → Deploy from branch**
3. Select `main` branch, `/ (root)` folder
4. Your site will be live at `https://username.github.io/repo-name/`

---

## 🎨 Design Direction

**Aesthetic: "Editorial Data Studio"** — warm, editorial, magazine-inspired. Intentionally avoids generic dashboard aesthetics.

| Element | Value |
|---------|-------|
| Background | `#1C1714` (warm espresso-black) |
| Surface | `#2A2320` (warm dark brown) |
| Accent | `#C2553A` (terracotta) |
| Secondary | `#D4913B` (amber) |
| Tertiary | `#7A8B6F` (sage green) |
| Display Font | Fraunces (variable serif) |
| Body Font | DM Sans (geometric sans-serif) |
| Type Scale | 3:4 ratio (12 → 16 → 21 → 28 → 37 → 50px) |

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                          │
│                                                      │
│  ┌──────────┐   fetch()    ┌──────────────────────┐ │
│  │  /data/   │ ──────────→ │  state.js            │ │
│  │  *.json   │             │  (Event Bus + Store)  │ │
│  └──────────┘              └─────────┬────────────┘ │
│   (external)                         │              │
│                          ┌───────────┼──────────┐   │
│                          ↓           ↓          ↓   │
│                   ┌───────────┐ ┌────────┐ ┌───────┐│
│                   │analytics  │ │charts  │ │export ││
│                   │.js        │ │.js     │ │.js    ││
│                   └───────────┘ └────────┘ └───────┘│
│                          ↓           ↓          ↓   │
│                   ┌──────────────────────────────┐  │
│                   │       index.html (DOM)        │  │
│                   └──────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

- **`state.js`** — Pub/sub event bus. Holds loaded data, active filters, current view.
- **`analytics.js`** — Pure functions. Take data in, return computed results. No side effects.
- **`charts.js`** — Canvas 2D rendering. Bar, line, and donut charts with DPR-aware sizing.
- **`export.js`** — Client-side file generation. CSV, JSON, PDF (print), PNG (canvas blob).
- **`app.js`** — Orchestrator. Wires everything together on page load.

---

## 📄 License

This project is for educational purposes.
