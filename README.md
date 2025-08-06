
# Geo-Temporal Dashboard (Deliverable)

This project satisfies the problem statement: Next.js + TypeScript dashboard with a timeline slider, Leaflet map with polygon drawing (3-12 pts), polygon editing, Open-Meteo temperature data, per-polygon color rules, and persistence.

## Quick start (Windows + VS Code)
1. Open folder in VS Code.
2. Run in terminal:
   npm install
   npm run dev
3. Open http://localhost:3000

## Notes
- No API keys required (Open-Meteo public archive API used).
- Polygons use centroid to fetch temperature and to match edits/deletes.
