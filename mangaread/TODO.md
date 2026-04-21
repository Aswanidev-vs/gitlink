# MangaRead Updates - Mangafire Scraper

## Status: Planning ✅ Confirmed

### 1. [PENDING] Fix 404 - Create manga.html
   - mangaread/frontend/manga.html (details page)
   - Use existing API.getMangaDetails/chapters

### 2. [PENDING] Add Mangafire Scraper to Backend  
   - Update main.go: /api/manga/{id}, /api/manga/{id}/chapters
   - Parse https://mangafire.to 
   - Add deps: go get github.com/gocolly/colly

### 3. [PENDING] Create manga.js
   - Frontend logic for details/reader

### 4. [PENDING] Test 
   - http://localhost:8080/manga.html?id=13
   - Backend restart: Ctrl+C then rerun

Current: Backend running (terminal active)
