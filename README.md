# LifeTracker Chronicles

A personal productivity desktop app. Fully offline. No browser needed.
All data saved locally on your Mac.

---

## Where your data lives

  ~/Library/Application Support/LifeTracker Chronicles/data/lifetracker.json

Plain JSON file. Survives app updates and reboots. ~100-300 KB for a full year.

---

## SETUP (first time only)

### 1. Fix npm permissions (if you saw an EACCES error)
Run this in Terminal:

  sudo chown -R 501:20 "/Users/joeykim/.npm"

Enter your Mac password when asked.

### 2. Install dependencies
In Terminal, navigate to this folder and install:

  cd ~/Documents/lifetracker
  npm install

### 3. Choose how you want to run it:

─────────────────────────────────────────────
OPTION A: Run directly from Terminal each time
─────────────────────────────────────────────
  npm start

This builds the app and opens the desktop window. No browser. Takes ~30 seconds
the first time (compiling), faster after that.

─────────────────────────────────────────────
OPTION B: Build a double-clickable .app icon (recommended)
─────────────────────────────────────────────
  npm run build:mac

This creates:  dist/LifeTracker Chronicles.app

Drag that file to your Applications folder.
From then on, just double-click it like any Mac app — no Terminal needed.

---

## Backing up your data

Copy this file to iCloud, external drive, etc:
  ~/Library/Application Support/LifeTracker Chronicles/data/lifetracker.json

To restore: paste it back to the same path before opening the app.
