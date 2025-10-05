// JournalBridge: Lightweight overlay to host the QuantumSense Ai Journal inside the main app
// It mounts the JournalApp from the exported journal package into a fixed DOM overlay
// and coordinates UI blocking with the existing uiManager/journal state.

export class JournalBridge {
  constructor() {
    this.root = document.getElementById('journal-root');
    this.isOpen = false;
    this.app = null;
    // Track journal state to decide routing after close
    this._journalSnapshotCount = 0;
    this._skipRequested = false;
    this._escHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    this._resizeHandler = () => {
      const container = this.root?.querySelector('#mainContainer');
        if (container) {
          const w = this.computeAppBoundaryWidth();
          container.style.maxWidth = `${w}px`;
          container.style.width = '100%';
        }
      };
  }

  ensureRoot() {
    if (!this.root) {
      this.root = document.createElement('div');
      this.root.id = 'journal-root';
      // Mount inside the Phaser game container so the journal lives in the same area
      const host = document.getElementById('phaser-game-container') || document.body;
      // Ensure host can position absolute children
      try { if (getComputedStyle(host).position === 'static') host.style.position = 'relative'; } catch {}
      host.appendChild(this.root);
    }
    // Basic overlay styling aligned to app's global sizing
    // Position absolutely within the game container bounds
    this.root.style.position = 'absolute';
    this.root.style.left = '0';
    this.root.style.top = '0';
    this.root.style.right = '0';
    this.root.style.bottom = '0';
    this.root.style.zIndex = '3000';
    this.root.style.display = 'none';
    this.root.style.overflow = 'auto';
    // Make the root transparent so it does NOT visually dim the bottom menu area
    this.root.style.background = 'transparent';
    this.root.style.backdropFilter = 'none';
    // Allow bottom menu to remain clickable by default; inner content will re-enable interactions
    this.root.style.pointerEvents = 'none';
  }

  mountMarkup() {
    // Minimal markup expected by JournalApp
    this.root.innerHTML = `
      <!-- Overlay wrapper fills the game area (except reserved bottom space) and blocks clicks to the scene underneath -->
      <div class="journalBridge-wrap" style="position:absolute;left:0;right:0;top:0;bottom:96px;min-height:auto;width:100%;box-sizing:border-box;display:flex;align-items:flex-start;justify-content:center;padding:12px;overflow:auto;pointer-events:auto;background:rgba(0, 0, 0, 0.9);">
        <div class="main-container visible" id="mainContainer" style="width:100%;max-width:720px;margin:0 auto;background:transparent;">
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:8px;">
            <button id="journalBridgeSkip" aria-label="Skip to Home Dash" style="background:#0c0114;color:#ffaa00;border:1px solid #8a2be2;border-radius:8px;padding:8px 12px;cursor:pointer;">Skip to Home 🏠</button>
            <button id="journalBridgeClose" aria-label="Close Journal" style="background:#2d0b4b;color:#00e5ff;border:1px solid #8a2be2;border-radius:8px;padding:8px 12px;cursor:pointer;">Close ✕</button>
          </div>
          <div id="calendarContainer"></div>
          <!-- Ensure embedded journal starts at the top, not vertically centered -->
          <div id="journalInterface" style="display:flex;align-items:flex-start;justify-content:center;">
          </div>
        </div>
      </div>
    `;
    // Constrain to app boundaries (derive from existing UI widths)
    this._resizeHandler();
    const closeBtn = this.root.querySelector('#journalBridgeClose');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    const skipBtn = this.root.querySelector('#journalBridgeSkip');
    if (skipBtn) skipBtn.addEventListener('click', () => {
      this._skipRequested = true;
      try { this.routeToHomeDash(); } catch {}
      this.close();
    });
  }

  computeAppBoundaryWidth() {
    // Prefer explicit app UI max-widths
    try {
      // Allow an override via CSS var or global
      const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--journal-boundary-width');
      if (cssVar) {
        const v = parseInt(cssVar, 10);
        if (!Number.isNaN(v) && v > 0) return v;
      }
      if (typeof window.JOURNAL_BOUNDARY_PX === 'number' && window.JOURNAL_BOUNDARY_PX > 0) {
        return window.JOURNAL_BOUNDARY_PX;
      }
      const modal = document.getElementById('journal-editor-modal');
      if (modal) {
        const mw = parseInt(getComputedStyle(modal).maxWidth || '0', 10);
        if (!Number.isNaN(mw) && mw > 0) return mw;
      }
      const controls = document.getElementById('journal-controls');
      if (controls) {
        const cs = getComputedStyle(controls);
        const mw2raw = cs.maxWidth || '0';
        const mw2 = parseInt(mw2raw, 10);
        if (!Number.isNaN(mw2) && mw2 > 0) return mw2;
        // If max-width is 'none' under mobile breakpoint, derive from the 85% rule
        const pct = 0.85;
        const derived = Math.floor(window.innerWidth * pct);
        if (derived > 0) return Math.min(Math.max(derived, 340), 460);
      }
      // Fallback to the central canvas width (clamped to typical phone bounds)
      const canvas = document.querySelector('#phaser-game-container canvas');
      if (canvas?.clientWidth) {
        const cw = canvas.clientWidth;
        return Math.min(Math.max(cw, 340), 460);
      }
    } catch (_) {}
    // Default that matches existing app boundaries (journal-controls max 400)
    return 400;
  }

  async open() {
    this.ensureRoot();
    if (!this.isOpen) {
      // Pause interactions in the host app
      try {
        const ui = window.uiManager;
        if (ui?.journalManager) {
          ui.journalManager.journalOpen = true;
        }
        ui?.menuManager?.updateIconState?.();
      } catch (e) {
        console.warn('JournalBridge: could not update uiManager state', e);
      }

      // Mount UI and app
      this.mountMarkup();
      this.root.style.display = 'block';
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', this._escHandler);
      window.addEventListener('resize', this._resizeHandler);

      // Snapshot current journal entry count to detect if user wrote an entry
      this._journalSnapshotCount = this.getJournalEntryCount();
      this._skipRequested = false;

      if (!this.app) {
        try {
          const { JournalApp } = await import('components/JournalApp.js');
          this.app = new JournalApp();
        } catch (err) {
          console.error('JournalBridge failed to load JournalApp:', err);
        }
      }

      this.isOpen = true;
    }
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    // Resume interactions in the host app
    try {
      const ui = window.uiManager;
      if (ui?.journalManager) {
        ui.journalManager.journalOpen = false;
      }
      ui?.menuManager?.updateIconState?.();
    } catch (e) {
      console.warn('JournalBridge: could not update uiManager state on close', e);
    }

    // Unmount UI (keep storage data intact by not destroying the app instance)
    window.removeEventListener('keydown', this._escHandler);
    window.removeEventListener('resize', this._resizeHandler);
    document.body.style.overflow = '';
    if (this.root) {
      this.root.style.display = 'none';
      this.root.innerHTML = '';
    }

    // Decide routing based on whether a new journal entry was added
    try {
      const wroteEntry = this.getJournalEntryCount() > (this._journalSnapshotCount || 0);
      if (this._skipRequested) {
        this.routeToHomeDash();
      } else if (wroteEntry) {
        this.routeToAIDash();
      } else {
        this.routeToHomeDash();
      }
    } catch (_) {}
  }

  // -------- Routing helpers --------
  routeToHomeDash() {
    try {
      if (window.bottomMenuManager && typeof window.bottomMenuManager.switchTab === 'function') {
        window.bottomMenuManager.switchTab('home');
      } else {
        localStorage.setItem('openTabOnLoad', 'home');
      }
    } catch {}
  }

  routeToAIDash() {
    try {
      if (window.bottomMenuManager && typeof window.bottomMenuManager.switchTab === 'function') {
        window.bottomMenuManager.switchTab('journal');
      } else {
        localStorage.setItem('openTabOnLoad', 'journal');
      }
    } catch {}
  }

  // -------- Journal entry counting --------
  getJournalEntryCount() {
    const keys = [
      'divineSenseJournalEntries',
      'rosebud-ai-journal-entries',
      'journalEntries',
      'journalPrimaryKey'
    ];
    let total = 0;
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          total += parsed.length;
        } else if (parsed && Array.isArray(parsed.entries)) {
          total += parsed.entries.length;
        } else if (parsed && typeof parsed === 'object') {
          total += Object.keys(parsed).length;
        }
      } catch {}
    }
    return total;
  }
}

// Optional: auto-register on window for easy access from existing code
if (typeof window !== 'undefined' && !window.JournalBridge) {
  window.JournalBridge = new JournalBridge();
}