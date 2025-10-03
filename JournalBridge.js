// JournalBridge: Lightweight overlay to host the QuantumSense Ai Journal inside the main app
// It mounts the JournalApp from the exported journal package into a fixed DOM overlay
// and coordinates UI blocking with the existing uiManager/journal state.

export class JournalBridge {
  constructor() {
    this.root = document.getElementById('journal-root');
    this.isOpen = false;
    this.app = null;
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
      // Mount to document body (original behavior) so the overlay covers the full viewport
      const host = document.body;
      host.appendChild(this.root);
    }
    // Basic overlay styling aligned to app's global sizing
    // Use fixed so it fills the viewport regardless of game container bounds
    this.root.style.position = 'fixed';
    this.root.style.inset = '0';
    this.root.style.zIndex = '3000';
    this.root.style.display = 'none';
    this.root.style.overflow = 'auto';
    this.root.style.background = 'rgba(12, 1, 20, 0.85)';
    this.root.style.backdropFilter = 'blur(2px)';
  }

  mountMarkup() {
    // Minimal markup expected by JournalApp
    this.root.innerHTML = `
      <div class="journalBridge-wrap" style="min-height:100%;width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:12px;">
        <div class="main-container visible" id="mainContainer" style="width:100%;max-width:720px;margin:0 auto;background:transparent;">
          <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
            <button id="journalBridgeClose" aria-label="Close Journal" style="background:#2d0b4b;color:#00e5ff;border:1px solid #8a2be2;border-radius:8px;padding:8px 12px;cursor:pointer;">Close ✕</button>
          </div>
          <div id="calendarContainer"></div>
          <div id="journalInterface"></div>
        </div>
      </div>
    `;
    // Constrain to app boundaries (derive from existing UI widths)
    this._resizeHandler();
    const closeBtn = this.root.querySelector('#journalBridgeClose');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
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

      if (!this.app) {
        try {
          const { JournalApp } = await import('./QuantumSense Ai Journal-Add on /src/components/JournalApp.js');
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
  }
}

// Optional: auto-register on window for easy access from existing code
if (typeof window !== 'undefined' && !window.JournalBridge) {
  window.JournalBridge = new JournalBridge();
}