import Phaser from 'phaser';
import { GlobalTrendsPanel } from './GlobalTrendsPanel.js';

// Lightweight replacement panels to streamline the bottom menu behavior
// EmptyHomePanel: keeps the Home tab functional without showing the old dashboard UI
// JournalBridgePanel: opens the external QuantumSense AI Journal overlay via JournalBridge
class EmptyHomePanel {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
  }
  show() {
    this.visible = true;
    // Do NOT auto-open the journal overlay on game start.
    // Home panel should remain neutral unless the user explicitly opens Journal.
  }
  hide() {
    this.visible = false;
    // Nothing to close here because Home does not open overlays by default.
  }
  isVisible() { return this.visible; }
  destroy() {}
}

// Embedded onboarding dash panel: mounts the Quantum Sense AI Journal onboarding flow
// inside the game area (same dimensions as the Phaser canvas), preserving the bottom menu.
// OnboardingDashPanel: embeds the QuantumSense Journal dashboard (AI Dash)
// We support two instances: Home Dash and AI Dash. To avoid ID collisions,
// each instance gets a unique mount id while sharing common CSS via a class.
class OnboardingDashPanel {
  constructor(scene, instanceName = 'home') {
    this.scene = scene;
    // instanceName can be 'home' or 'ai' to help identify which panel this is
    this.instanceName = instanceName;
    this.visible = false;
    this.mountEl = null;
    this.manager = null; // legacy onboarding manager (not used when JournalApp is embedded)
    this.chat = null;    // legacy ChatAI (no longer used for AI Dash)
    this.journalApp = null; // preferred embedded Journal dashboard/app
    this._onResize = this.updateLayout.bind(this);
    this._ensureMount();
  }

  async _ensureMount() {
    try {
      // Mount directly inside the Phaser game container to avoid sizing mismatches
      const parent = document.getElementById('phaser-game-container') || document.body;
      if (!this.mountEl) {
        this.mountEl = document.createElement('div');
        // Use a shared class for styles and a unique id per instance
        this.mountEl.className = 'onboarding-embedded';
        this.mountEl.id = `onboarding-embedded-${this.instanceName}`;
        this.mountEl.style.cssText = `
          position: absolute;
          left: 0; top: 0; width: 100%; height: 100%;
          display: none;
          /* Allow canvas/menu to receive clicks outside the content area */
          pointer-events: none;
          z-index: 15000; /* raise above DOM badges/tooltips */
          /* Transparent root so the menu area is NOT visually dimmed */
          background: transparent;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          overscroll-behavior: contain;
        `;
        // Ensure parent can properly position absolute children
        try { if (parent && getComputedStyle(parent).position === 'static') parent.style.position = 'relative'; } catch {}
        parent.appendChild(this.mountEl);

        // Prevent duplicate #journalInterface from index.html from stealing focus
        const globalJI = document.getElementById('journalInterface');
        if (globalJI && globalJI !== this.mountEl && !this.mountEl.contains(globalJI)) {
          globalJI.id = 'journalInterface-global';
          globalJI.style.display = 'none';
        }

        // Override onboarding CSS to fit within the embedded region (match canvas size)
        if (!document.getElementById('embeddedOnboardingStyles')) {
          const styles = document.createElement('style');
          styles.id = 'embeddedOnboardingStyles';
          styles.textContent = `
            .onboarding-embedded { cursor: default; }
            /* Make embedded root fill container but leave space for the bottom menu */
            .onboarding-embedded .embedded-journal-root { position: absolute; left:0; right:0; top:0; bottom: var(--bottom-menu-height, 100px) !important; overflow: auto; pointer-events: auto; background: #000; }
            /* Ensure the Journal content starts at the very top; avoid vertical centering */
            .onboarding-embedded #journalInterface { position: absolute; inset: 0; display: flex; align-items: flex-start !important; justify-content: center !important; pointer-events: auto; }
            .onboarding-embedded #journalInterface > * { margin-top: 0 !important; }
            /* Keep onboarding width comfortable if fallback is used */
            .onboarding-embedded .onboarding-container { min-height: 100% !important; height: 100% !important; padding: 0.25rem 0.5rem !important; box-sizing: border-box !important; }
            .onboarding-embedded .onboarding-content { max-width: 560px !important; width: 100% !important; margin: 0 auto !important; margin-top: 0 !important; max-height: calc(100% - 8px) !important; overflow: auto !important; padding: 0.75rem !important; box-sizing: border-box !important; }
            /* Compact scaling for shorter canvases */
            .onboarding-embedded .ai-avatar-container { width: 140px !important; height: 140px !important; margin-bottom: 1rem !important; }
            .onboarding-embedded .welcome-title { font-size: 2rem !important; }
            .onboarding-embedded .welcome-message { font-size: 1rem !important; }
            .onboarding-embedded .cosmic-button { font-size: 0.95rem !important; padding: 0.6rem 0.9rem !important; }
          `;
          document.head.appendChild(styles);
        }

        // Allow events to propagate normally so buttons inside the overlay remain clickable.
        // Keep layout in sync with canvas size
        try { window.addEventListener('resize', this._onResize, { passive: true }); } catch {}
        // Initial layout after mount
        this.updateLayout();
      }
    } catch (e) {
      console.warn('OnboardingDashPanel: failed to create mount element', e);
    }
  }

  updateLayout() {
    try {
      if (!this.mountEl) return;
      // Position overlay to exactly cover the Phaser canvas bounds
      const canvas = (this.scene && this.scene.sys && this.scene.sys.game && this.scene.sys.game.canvas) || document.querySelector('#phaser-game-container canvas');
      const parent = this.mountEl.parentElement || document.getElementById('phaser-game-container') || document.body;
      if (!canvas || !parent) return;
      const canvasRect = canvas.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();

      const left = Math.max(0, canvasRect.left - parentRect.left);
      const top = Math.max(0, canvasRect.top - parentRect.top);
      const width = Math.max(0, canvasRect.width);
      const height = Math.max(0, canvasRect.height);

      this.mountEl.style.left = `${left}px`;
      this.mountEl.style.top = `${top}px`;
      this.mountEl.style.width = `${width}px`;
      this.mountEl.style.height = `${height}px`;
      this.mountEl.style.borderRadius = getComputedStyle(canvas).borderRadius || '0px';

      // Ensure the onboarding content's top is visible and scale down if canvas height is short
      try {
        const contentEl = this.mountEl.querySelector('.onboarding-content');
        const containerEl = this.mountEl.querySelector('.onboarding-container');
        if (containerEl) {
          containerEl.scrollTop = 0; // always start at top
          containerEl.style.overscrollBehavior = 'contain';
        }
        if (contentEl) {
          const BASE_H = 720; // designed height for comfortable layout
          const scale = Math.min(1, Math.max(0.8, height / BASE_H));
          if (scale < 1) {
            contentEl.style.transformOrigin = 'top center';
            contentEl.style.transform = `scale(${scale})`;
          } else {
            contentEl.style.transform = '';
          }
        }
      } catch {}
    } catch (e) {
      console.warn('OnboardingDashPanel: updateLayout failed', e);
    }
  }

  async show() {
    this.visible = true;
    await this._ensureMount();
    this.updateLayout();

    if (this.mountEl) {
      this.mountEl.style.display = 'block';
      // Make sure the overlay starts at the top and is fully visible
      try {
        this.mountEl.scrollTop = 0;
        const root = this.mountEl.querySelector('.embedded-journal-root');
        if (root) root.scrollTop = 0;
        const container = this.mountEl.querySelector('.onboarding-container');
        if (container) container.scrollTop = 0;
      } catch {}
    }

    // Preferred behavior: embed the existing JournalApp dashboard (AI Dash)
    // JournalApp internally decides whether to show onboarding or the dashboard
    try {
      await this._renderJournalApp();
    } catch (e) {
      console.warn('OnboardingDashPanel: failed to render JournalApp, falling back to onboarding', e);
      // Fallback to onboarding if JournalApp fails
      try {
        const mod = await import('components/OnboardingManager.js');
        const onComplete = () => { try { localStorage.setItem('quantumsense-onboarding-complete', 'true'); } catch {}; this._renderJournalApp(); };
        this.manager = new mod.OnboardingManager(this.mountEl, onComplete);
      } catch (err) {
        console.warn('OnboardingDashPanel: onboarding fallback also failed', err);
      }
    }

    window.addEventListener('resize', this._onResize);
  }

  hide() {
    this.visible = false;
    if (this.mountEl) {
      this.mountEl.style.display = 'none';
    }
    window.removeEventListener('resize', this._onResize);
  }

  _loadUser() {
    try {
      return JSON.parse(localStorage.getItem('quantumsense-user-data') || '{}');
    } catch {
      return {};
    }
  }

  _isOnboardingComplete(user) {
    try {
      const flag = localStorage.getItem('quantumsense-onboarding-complete');
      if (flag === 'true') return true;
    } catch {}
    return !!(user && user.hasCompletedOnboarding);
  }

  async _renderJournalApp() {
    if (!this.mountEl) return;
    // Clear any existing content
    this.mountEl.innerHTML = '';

    // Ensure only THIS panel has the #journalInterface id to avoid collisions
    // When multiple embedded dashboards exist (Home Dash + AI Dash), JournalApp
    // looks up document.getElementById('journalInterface'). If another panel
    // already mounted its interface, rename and hide it so our instance attaches
    // to the correct container.
    try {
      document.querySelectorAll('#journalInterface').forEach((el, i) => {
        // Skip if it will be inside our mount (we haven't created it yet)
        el.id = `journalInterface-preserved-${i}`;
        el.style.display = 'none';
      });
    } catch {}

    // Backdrop: visually unify with other panels without feeling like a modal overlay.
    // Reserve space for a lightweight header at the top and the bottom menu at the bottom.
    const bgOverlay = document.createElement('div');
    bgOverlay.style.cssText = 'position:absolute; left:0; right:0; top: var(--menu-header-height, 60px); bottom: var(--bottom-menu-height, 100px) !important; pointer-events:none; z-index:0; background: rgba(6, 8, 18, 0.92);';
    this.mountEl.appendChild(bgOverlay);

    // Simple header bar to visually align the embedded dash with other tab sections
    const headerBar = document.createElement('div');
    headerBar.className = 'embedded-header';
    headerBar.style.cssText = 'position:absolute; left:0; right:0; top:0; height: var(--menu-header-height, 60px); display:flex; align-items:center; padding: 0 16px; box-sizing:border-box; background: rgba(12, 14, 26, 0.96); border-bottom: 1px solid rgba(138,43,226,0.35); color:#c9c9ff; font-family: Arial, sans-serif; font-weight:600; letter-spacing:0.3px; z-index:2; pointer-events:none;';
    headerBar.textContent = (this.instanceName === 'ai') ? 'Infinity AI' : 'Home';
    this.mountEl.appendChild(headerBar);

    // Create required containers for JournalApp
    const root = document.createElement('div');
    root.className = 'embedded-journal-root';
    // Leave bottom 100px clear for the Phaser bottom menu and allow inner content to capture input
    // Root remains transparent; black backdrop above ensures no bleed-through
    root.style.cssText = 'position:absolute; left:0; right:0; top: var(--menu-header-height, 60px); bottom: var(--bottom-menu-height, 100px) !important; overflow:auto; pointer-events:auto; background: rgba(10, 12, 24, 0.98); z-index:1; outline: 1px solid rgba(0,255,136,0.25);';
    // Mark AI Dash instances so JournalApp can tailor layout (skip onboarding, reorder sections)
    if (this.instanceName === 'ai') {
      try { root.setAttribute('data-ai-dash', 'true'); window.__AI_DASH__ = true; } catch {}
    }

    // Remove optional header in embedded mode to ensure the true dashboard top is visible

    const journalInterface = document.createElement('div');
    // Give this instance the canonical id so JournalApp targets it
    journalInterface.id = 'journalInterface';
    root.appendChild(journalInterface);

    const calendarContainer = document.createElement('div');
    calendarContainer.id = 'calendarContainer';
    calendarContainer.style.display = 'none';
    root.appendChild(calendarContainer);

    this.mountEl.appendChild(root);

    // Load and initialize JournalApp (it will show onboarding or the dashboard as needed)
    try {
      const mod = await import('components/JournalApp.js');
      // NOTE: JournalApp attaches to #journalInterface internally.
      // Because we renamed any other existing IDs above, it will bind to THIS instance.
      this.journalApp = new mod.JournalApp();
    } catch (err) {
      console.warn('OnboardingDashPanel: JournalApp import failed, falling back to embedded onboarding', err);
      // If JournalApp fails to load (e.g., module mapping not available), mount onboarding inside the same container
      try {
        const mod = await import('components/OnboardingManager.js');
        const onComplete = () => {
          try { localStorage.setItem('quantumsense-onboarding-complete', 'true'); } catch {}
          // Retry JournalApp after onboarding completes
          this._renderJournalApp();
        };
        // Prefer rendering inside the journalInterface so styles apply correctly
        const mountTarget = this.mountEl.querySelector('#journalInterface') || this.mountEl;
        this.manager = new mod.OnboardingManager(mountTarget, onComplete);
      } catch (fallbackErr) {
        console.error('OnboardingDashPanel: fallback onboarding also failed', fallbackErr);
        // Last resort: show a minimal message so the area isn’t blank
        try {
          const msg = document.createElement('div');
          msg.style.cssText = 'position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#c9c9ff; font-family: Arial, sans-serif;';
          msg.textContent = 'We’re loading your dashboard… Please refresh if it doesn’t appear.';
          this.mountEl.appendChild(msg);
        } catch {}
      }
    }
  }

  isVisible() { return this.visible; }

  destroy() {
    try {
      window.removeEventListener('resize', this._onResize);
      if (this.mountEl && this.mountEl.parentNode) {
        this.mountEl.parentNode.removeChild(this.mountEl);
      }
    } catch {}
    this.mountEl = null;
    this.manager = null;
    this.scene = null;
  }
}

class JournalBridgePanel {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
  }
  show() {
    this.visible = true; // immediately reflect active state
    try { window.JournalBridge && window.JournalBridge.open(); } catch (_) {}
  }
  hide() {
    this.visible = false;
    try { window.JournalBridge && window.JournalBridge.close(); } catch (_) {}
  }
  isVisible() {
    try { return this.visible || (window.JournalBridge && !!window.JournalBridge.isOpen); } catch (_) { return this.visible; }
  }
  destroy() {}
}

export class BottomMenuManager {
  constructor(scene, statsTracker, psychicTrainer, modalManager, uiCallbacks) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.psychicTrainer = psychicTrainer;
    this.modalManager = modalManager;
    this.uiCallbacks = uiCallbacks || {};
    this.wheelEventManager = scene.uiManager?.wheelEventManager; // Reference to centralized wheel event manager
    this.currentPanel = null;
    this.activeTab = 'home';

    this.createBottomMenu();
    this.createPanels();

    // Keep HTML overlays in sync on resize & scene lifecycle
    this._onResize = () => {
      if (this.homePanel && this.homePanel.updateDashboardAvatarPosition) {
        this.homePanel.updateDashboardAvatarPosition();
      }
    };
    window.addEventListener('resize', this._onResize);

    // Handle JournalApp CTA: start gameplay directly when user clicks "Play in the Quantum Field"
    try {
      window.addEventListener('quantum-field-play', (evt) => {
        try {
          const stats = this.statsTracker?.getStats?.() || {};
          const tutorialSeen = localStorage.getItem('tutorialSeen') === 'true';
          const desiredLevelRaw = (evt?.detail?.level) || (localStorage.getItem('lastPlayedLevel') || '1');
          const desiredLevel = parseInt(desiredLevelRaw, 10);
          // Dice fallback for first-time users or during tutorial
          const fallbackLevel = 1; // Level 1 = Coin Flip Oracle (dice/coin)
          const clampedLevel = stats.psychicLevel
            ? Math.max(1, Math.min(desiredLevel || fallbackLevel, stats.psychicLevel))
            : Math.max(1, (desiredLevel || fallbackLevel));
          const levelToSet = tutorialSeen ? clampedLevel : fallbackLevel;

          // Persist for GameScene boot logic
          try { localStorage.setItem('lastPlayedLevel', String(levelToSet)); } catch {}
          // Ensure resume flag so GameScene picks it up if we need to switch scenes
          try { localStorage.setItem('resumeGameOnLoad', '1'); } catch {}
          // Avoid any tab auto-switches
          try { localStorage.removeItem('openTabOnLoad'); } catch {}

          // Ensure we are in GameScene; if not, route to it (GameScene will read lastPlayedLevel)
          try {
            const currentKey = this.scene?.sys?.settings?.key;
            if (currentKey !== 'GameScene') {
              this.scene?.scene?.start('GameScene');
            }
          } catch (_) {}

          // Close any journal overlays and embedded dashboards
          try { this.homePanel?.hide?.(); } catch {}
          try { this.journalPanel?.hide?.(); } catch {}
          try { window.JournalBridge?.close?.(); } catch {}

          // If we are already in GameScene, start immediately
          try { this.scene?.setActiveLevel?.(levelToSet); } catch {}
          try { this.scene?.startNewRound?.(); } catch {}
        } catch (err) {
          console.warn('BottomMenuManager: quantum-field-play handler failed', err);
        }
      });
    } catch {}

    scene.events.on('shutdown', this.destroy, this);
    scene.events.on('destroy', this.destroy, this);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    if (this.homePanel && this.homePanel.destroyHtmlOverlays) {
      this.homePanel.destroyHtmlOverlays();
    }
    if (this.gamesPanel) this.gamesPanel.destroy();
    if (this.globalTrendsPanel) this.globalTrendsPanel.destroy?.(); // Updated reference
    this.scene = null;
  }


  // --- Shared helper from second version (for fallback initials avatar) ---
  createInitialsAvatar(avatarContainer, playerData) {
    const initials = (playerData.name || 'Player').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const initialsAvatar = this.scene.add.graphics();
    initialsAvatar.fillStyle(0x1a2c3d, 0.9);
    initialsAvatar.fillCircle(0, 0, 40);
    initialsAvatar.lineStyle(2, 0x00e5ff, 0.8);
    initialsAvatar.strokeCircle(0, 0, 40);

    const initialsText = this.scene.add.text(0, 0, initials, {
      fontFamily: '"Nunito", sans-serif',
      fontSize: '24px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    avatarContainer.add([initialsAvatar, initialsText]);
    avatarContainer.setVisible(true).setAlpha(1);
  }

  createBottomMenu() {
    const { width, height } = this.scene.sys.game.config;

    this.menuContainer = this.scene.add.container(0, height - 100);
    this.menuContainer.setDepth(5000);

    const menuBg = this.scene.add.graphics();
    menuBg.fillStyle(0x0c0114, 0.95);
    menuBg.fillRect(0, 0, width, 100);
    menuBg.lineStyle(2, 0x8a2be2, 0.5);
    menuBg.strokeRect(0, 0, width, 2);

    // Five equally spaced tabs with Infinity AI centered
    const tabWidth = width / 5;
    this.tabs = {};
    // Left-most
    this.tabs.home    = this.createTab('home',    '🏠', 'Home',            tabWidth * 0.5, () => this.switchTab('home'));
    // Left-center
    this.tabs.games   = this.createTab('games',   '🎮', 'Games',           tabWidth * 1.5, () => this.switchTab('games'));
    // Center button: Infinity AI (opens Phaser-native JournalPanel)
    this.tabs.journal = this.createTab('journal', '♾️', 'Infinity AI',     width / 2,      () => this.switchTab('journal'));
    // Right-center: Live Mode (between Infinity AI and Leaderboard)
    this.tabs.live    = this.createTab('live',    '🔴', 'Live Mode',       tabWidth * 3.5, () => this.switchTab('live'));
    // Right-most
    this.tabs.stats   = this.createTab('stats',   '📊', 'Leaderboard',     tabWidth * 4.5, () => this.switchTab('stats'));

    this.menuContainer.add([menuBg, ...Object.values(this.tabs)]);
    this.updateTabStates();

    // Expose the bottom menu height to CSS so embedded overlays align precisely.
    try {
      const menuHeightPx = 100; // Keep in sync with fillRect/menuContainer positioning
      document.documentElement.style.setProperty('--bottom-menu-height', `${menuHeightPx}px`);
    } catch {}
  }

  createTab(id, icon, label, x, callback) {
    const container = this.scene.add.container(x, 50);

    const tabBg = this.scene.add.graphics();
    tabBg.fillStyle(0x8a2be2, 0.3);
    tabBg.fillRoundedRect(-40, -30, 80, 60, 15);
    tabBg.setVisible(false);

    const iconText = this.scene.add.text(0, -8, icon, { fontFamily: 'Arial, sans-serif', fontSize: '24px' }).setOrigin(0.5);
    const labelText = this.scene.add.text(0, 12, label, { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#c9c9c9', fontStyle: 'bold' }).setOrigin(0.5);
    const notificationDot = this.scene.add.circle(20, -15, 4, 0xff4444).setVisible(false);

    container.add([tabBg, iconText, labelText, notificationDot]);
    container.setSize(80, 60).setInteractive({ useHandCursor: true });

    container.tabBg = tabBg;
    container.iconText = iconText;
    container.labelText = labelText;
    container.notificationDot = notificationDot;
    container.tabId = id;

    container.on('pointerdown', () => {
      this.scene.playSound?.('button_hover_click');
      this.scene.tweens.add({
        targets: container,
        scale: 0.9,
        duration: 100,
        yoyo: true,
        onComplete: callback
      });
    });

    container.on('pointerover', () => {
      this.scene.tweens.add({ targets: container, scale: 1.05, duration: 200, ease: 'Power2' });
    });

    container.on('pointerout', () => {
      this.scene.tweens.add({ targets: container, scale: 1, duration: 200, ease: 'Power2' });
    });

    return container;
  }

  createPanels() {
    // Home tab hosts the embedded onboarding dash with AI assistant (preserve existing onboarding flow)
    this.homePanel    = new OnboardingDashPanel(this.scene, 'home');
    this.gamesPanel   = new GamesPanel(this.scene, this.statsTracker);
    // Infinity AI tab duplicates the embedded Journal dashboard (OnboardingDashPanel)
    // This mirrors the Home tab’s embedded journal while keeping Home intact
    this.journalPanel = new OnboardingDashPanel(this.scene, 'ai');
    this.globalTrendsPanel = new GlobalTrendsPanel(this.scene, this.statsTracker); // Replaced StatsPanel with GlobalTrendsPanel
    // New Live Mode panel (styled similar to AI Dash, shows a COMING SOON message)
    this.livePanel = new LiveModePanel(this.scene);

    // Open preferred tab on load if specified (e.g., set by JournalApp "Play" CTA)
    // But if the tutorial hasn't been seen yet, force Home so gameplay (dice) remains the background
    const tutorialSeen = (typeof localStorage !== 'undefined' && localStorage.getItem('tutorialSeen') === 'true');
    const requestedTab = (typeof localStorage !== 'undefined' && localStorage.getItem('openTabOnLoad'));
    const initialTab = tutorialSeen ? (requestedTab || 'home') : 'home';
    try { localStorage.removeItem('openTabOnLoad'); } catch {}
    this.switchTab(initialTab);
  }

  switchTab(tabId) {
    // Block opening the Games panel during tutorial so the dice scene remains the background
    try {
      const tutorialSeen = localStorage.getItem('tutorialSeen') === 'true';
      if ((this.scene?.isTutorialActive || !tutorialSeen) && tabId === 'games') {
        console.debug('BottomMenuManager: Blocking Games tab while tutorial is active/first run');
        return;
      }
    } catch (_) {}
    // Toggle behavior: clicking same active tab hides its panel and clears activeTab
    if (this.activeTab === tabId && this.currentPanel && this.currentPanel.isVisible()) {
      this.hideCurrentPanel();
      this.activeTab = null;
      this.updateTabStates();
      return;
    }

    // Hide any open panel
    if (this.currentPanel && this.currentPanel.isVisible()) {
      this.hideCurrentPanel();
    }

    // Activate new panel
    this.activeTab = tabId;
    switch (tabId) {
      case 'home':    this.currentPanel = this.homePanel;    break;
      case 'games':   this.currentPanel = this.gamesPanel;   break;
      case 'journal': this.currentPanel = this.journalPanel; break;
      case 'live':    this.currentPanel = this.livePanel;    break;
      case 'stats':   this.currentPanel = this.globalTrendsPanel;   break; // Updated to use globalTrendsPanel
      default: this.currentPanel = null;
    }

    // Safety check: ensure panel exists and has required methods before calling show
    if (this.currentPanel && typeof this.currentPanel.show === 'function') {
      this.currentPanel.show();
    } else if (this.currentPanel) {
      console.warn(`Panel for tab '${tabId}' exists but doesn't have a show method`);
    } else {
      console.warn(`No panel found for tab '${tabId}'`);
    }

    // Ensure no other panels remain visible to prevent overlays covering gameplay UI
    [this.homePanel, this.gamesPanel, this.journalPanel, this.livePanel, this.globalTrendsPanel].forEach(panel => { // Updated reference
      if (panel && panel !== this.currentPanel && typeof panel.isVisible === 'function' && panel.isVisible()) {
        if (typeof panel.hide === 'function') {
          panel.hide();
        }
      }
    });

    // Hide daily check-in overlay when switching away from home tab
    // No longer needed - daily check-in is now part of HomePanel

    this.updateTabStates();
  }

  hideCurrentPanel() {
    if (this.currentPanel && typeof this.currentPanel.hide === 'function') {
      this.currentPanel.hide();
    } else if (this.currentPanel) {
      console.warn('Current panel exists but does not have a hide method');
    }
  }

  updateTabStates() {
    Object.entries(this.tabs).forEach(([id, tab]) => {
      const isActive = id === this.activeTab && this.currentPanel && this.currentPanel.isVisible();
      tab.tabBg.setVisible(isActive);
      tab.iconText.setTint(isActive ? 0x00e5ff : 0xffffff);
      tab.labelText.setColor(isActive ? '#00e5ff' : '#c9c9c9');
    });
  }

  hideAll() {
    // Hide the tracked panel first
    this.hideCurrentPanel();

    // Also hide any other panel that might have been left visible
    [this.homePanel, this.gamesPanel, this.journalPanel, this.livePanel, this.globalTrendsPanel].forEach(panel => {
      if (panel && typeof panel.isVisible === 'function' && panel.isVisible()) {
        panel.hide();
      }
    });

    // Hide daily check-in overlay when hiding all panels
    // No longer needed - daily check-in is now part of HomePanel

    this.activeTab = null;
    this.updateTabStates();
  }

  updateNotifications() {
    const stats = this.statsTracker.getStats();
    if (stats.newAchievements > 0) {
      if (this.tabs?.stats?.notificationDot && typeof this.tabs.stats.notificationDot.setVisible === 'function') {
        this.tabs.stats.notificationDot.setVisible(true);
      }
    }
    if (typeof this.updateLevelBar === 'function') {
      this.updateLevelBar();
    }
  }

  createLevelTransition(levelData, onComplete) {
    const { width, height } = this.scene.sys.game.config;

    const transitionContainer = this.scene.add.container(0, 0).setDepth(5000);
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.8).fillRect(0, 0, width, height);

    const levelIcon = this.scene.add.text(width / 2, height / 2 - 50, levelData.emoji, {
      fontFamily: 'Arial, sans-serif', fontSize: '100px'
    }).setOrigin(0.5).setAlpha(0);

    const levelTitle = this.scene.add.text(width / 2, height / 2 + 30, `Entering ${levelData.name}`, {
      fontFamily: '"Arial Black", Arial, sans-serif', fontSize: '24px', color: '#00e5ff', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    transitionContainer.add([overlay, levelIcon, levelTitle]);

    this.scene.tweens.add({
      targets: [levelIcon, levelTitle],
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(800, () => {
          this.scene.tweens.add({
            targets: transitionContainer,
            alpha: 0,
            duration: 300,
            onComplete: () => { transitionContainer.destroy(); onComplete?.(); }
          });
        });
      }
    });
  }
}

/* ---------------------- LiveModePanel ---------------------- */
class LiveModePanel {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.mountEl = null;
    this._onResize = this.updateLayout.bind(this);
    this._ensureMount();
  }

  async _ensureMount() {
    try {
      const parent = document.getElementById('phaser-game-container') || document.body;
      if (!this.mountEl) {
        this.mountEl = document.createElement('div');
        this.mountEl.className = 'onboarding-embedded';
        this.mountEl.id = 'live-mode-embedded';
        this.mountEl.style.cssText = `
          position: absolute;
          left: 0; top: 0; width: 100%; height: 100%;
          display: none;
          pointer-events: none;
          z-index: 15000;
          background: transparent;
        `;
        try { if (parent && getComputedStyle(parent).position === 'static') parent.style.position = 'relative'; } catch {}
        parent.appendChild(this.mountEl);

        // Inject minimal styles once
        if (!document.getElementById('liveModeEmbeddedStyles')) {
          const styles = document.createElement('style');
          styles.id = 'liveModeEmbeddedStyles';
          styles.textContent = `
            #live-mode-embedded .live-mode-root { position:absolute; left:0; right:0; top:0; bottom:95px !important; display:flex; align-items:center; justify-content:center; pointer-events:auto; background:#000; }
            #live-mode-embedded .card { max-width: 640px; margin: 0 auto; padding: 24px 28px; border-radius: 16px; background: rgba(18,18,28,0.85); box-shadow: 0 12px 32px rgba(0,0,0,0.35); border: 1px solid rgba(138,43,226,0.35); color:#e6e6f9; text-align:center; }
            #live-mode-embedded .title { font-family: 'Arial Black', Arial, sans-serif; font-size: 28px; color:#8a2be2; letter-spacing:0.5px; margin-bottom: 10px; }
            #live-mode-embedded .desc { font-family: Arial, sans-serif; font-size: 16px; color:#c9c9ff; }
          `;
          document.head.appendChild(styles);
        }

        // Build content once
        const root = document.createElement('div');
        root.className = 'live-mode-root';
        const card = document.createElement('div');
        card.className = 'card';
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = 'COMING SOON';
        const desc = document.createElement('div');
        desc.className = 'desc';
        desc.textContent = 'Play live with others across the globe, enhancing our quantum connection.';
        card.appendChild(title);
        card.appendChild(desc);
        root.appendChild(card);
        this.mountEl.appendChild(root);

        try { window.addEventListener('resize', this._onResize, { passive: true }); } catch {}
        this.updateLayout();
      }
    } catch (e) {
      console.warn('LiveModePanel: failed to create mount element', e);
    }
  }

  updateLayout() {
    try {
      if (!this.mountEl) return;
      const canvas = (this.scene && this.scene.sys && this.scene.sys.game && this.scene.sys.game.canvas) || document.querySelector('#phaser-game-container canvas');
      const parent = this.mountEl.parentElement || document.getElementById('phaser-game-container') || document.body;
      if (!canvas || !parent) return;
      const canvasRect = canvas.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();

      const left = Math.max(0, canvasRect.left - parentRect.left);
      const top = Math.max(0, canvasRect.top - parentRect.top);
      const width = Math.max(0, canvasRect.width);
      const height = Math.max(0, canvasRect.height);

      this.mountEl.style.left = `${left}px`;
      this.mountEl.style.top = `${top}px`;
      this.mountEl.style.width = `${width}px`;
      this.mountEl.style.height = `${height}px`;
      this.mountEl.style.borderRadius = getComputedStyle(canvas).borderRadius || '0px';
    } catch (e) {
      console.warn('LiveModePanel: updateLayout failed', e);
    }
  }

  async show() {
    this.visible = true;
    await this._ensureMount();
    this.updateLayout();
    if (this.mountEl) this.mountEl.style.display = 'block';
  }

  hide() {
    this.visible = false;
    if (this.mountEl) this.mountEl.style.display = 'none';
  }

  isVisible() { return this.visible; }
}

/* ---------------------- HomePanel ---------------------- */
class HomePanel {
  constructor(scene, statsTracker, psychicTrainer, createInitialsAvatarFn, uiCallbacks) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.psychicTrainer = psychicTrainer;
    this.createInitialsAvatar = createInitialsAvatarFn;
    this.uiCallbacks = uiCallbacks || {};
    this.visible = false;
    this.dashboardAvatarElement = null;
    this.dashboardLevelElement = null;

    this.createPanel();
  }

  createPanel() {
    const { width, height } = this.scene.sys.game.config;

    this.container = this.scene.add.container(0, 0).setDepth(10000).setVisible(false);

    // Theme (light, warm, modern)
    const THEME = {
      bg: 0xF2ECE6,               // soft beige background
      textPrimary: '#1f1f1f',
      textSecondary: '#7a7a7a',
      cardBg: 0xFFFFFF,
      cardStroke: 0xE8DCD2,
      accent: 0xFF7A00,           // warm orange accent
      accentDark: 0xCC6200,
      neutralStroke: 0xDDDDDD,
      selectedCircle: 0x2C2C2C
    };

    // Removed click-blocker - it was interfering with other UI elements

    const bg = this.scene.add.graphics();
    bg.fillStyle(THEME.bg, 1).fillRect(0, 0, width, height - 80);
    bg.lineStyle(2, THEME.cardStroke, 1).strokeRect(0, 0, width, 2);

    const closeBtn = this.scene.add.text(width - 30, 30, '×', { fontFamily: 'Arial, sans-serif', fontSize: '32px', color: THEME.textSecondary })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.setScrollFactor(0);
    closeBtn.on('pointerdown', () => this.hide());

    // Header: Greeting + Date (aligned with reference style)
    const playerDataHeader = (() => {
      try { return JSON.parse(localStorage.getItem('divineSensePlayer') || '{}'); } catch { return {}; }
    })();
    const playerName = playerDataHeader?.name || 'Player';
    const now = new Date();
    const greeting = this.getTimeOfDayGreeting(now);
    const formattedDate = this.formatFullDate(now);

    const greetingText = this.scene.add.text(20, 40, `${greeting}, ${playerName}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '28px', color: THEME.textPrimary, fontStyle: 'bold'
    }).setOrigin(0, 0.5).setScrollFactor(0);

    const dateText = this.scene.add.text(20, 78, formattedDate, {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: THEME.textSecondary
    }).setOrigin(0, 0.5).setScrollFactor(0);

    // Avatar sits on the right of header (reference style)
    const avatarContainer = this.scene.add.container(width - 60, 60);

    // Try HTML avatar overlay; fallback to initials if none
    try {
      const playerData = JSON.parse(localStorage.getItem('divineSensePlayer') || '{}');
      if (playerData.avatar) {
        if (!this.dashboardAvatarElement) {
          this.dashboardAvatarElement = document.createElement('img');
          this.dashboardAvatarElement.style.cssText = `
            position:absolute;width:120px;height:120px;border-radius:50%;border:4px solid #FF7A00;
            object-fit:cover;z-index:1000;box-shadow:0 8px 24px rgba(0,0,0,0.12);display:none;pointer-events:none;
          `;
          document.body.appendChild(this.dashboardAvatarElement);
        }

        this.dashboardAvatarElement.src = playerData.avatar;
        this.updateDashboardAvatarPosition();
      } else {
        this.createInitialsAvatar(avatarContainer, playerData || { name: 'Player' });
      }
    } catch (e) {
      console.warn('Could not load player avatar:', e);
      this.createInitialsAvatar(avatarContainer, { name: 'Player' });
    }

    // Level indicator removed - using larger text elsewhere
    avatarContainer.setVisible(true).setAlpha(1);

    // Weekday strip aligned to reference UI
    const weekdayStrip = this.createWeekdayStrip(width);

    // Reminder CTA removed per request (not implemented). This also frees space to reduce vertical gaps.

    // Get stats from statsTracker
    const stats = this.statsTracker.getStats();

    // Daily streak - now interactive
    const streakContainer = this.scene.add.container(width / 2, 320);
    const streakBg = this.scene.add.graphics();
    streakBg.fillStyle(THEME.cardBg, 0.95).fillRoundedRect(-160, -55, 320, 110, 18);
    streakBg.lineStyle(2, THEME.cardStroke, 1).strokeRoundedRect(-160, -55, 320, 110, 18);
    const streakTitle = this.scene.add.text(0, -30, 'Daily Check-in', { fontFamily: 'Arial, sans-serif', fontSize: '16px', color: THEME.textSecondary }).setOrigin(0.5);
    const streakValue = this.scene.add.text(0, -5, `🔥 ${stats.dailyCheckInStreak || 0}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#FF7A00', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.streakValue = streakValue;

    // Add 7-day progress dots (larger and brighter for visibility)
    this.checkInDots = [];
    for (let i = 0; i < 7; i++) {
      const dotX = -135 + i * 45;
      const dot = this.scene.add.circle(dotX, 35, 9, 0xffffff, 1);
      dot.setStrokeStyle(2, THEME.neutralStroke, 1);
      this.checkInDots.push(dot);
    }

    // Current position indicator (ring around the next dot to check-in)
    this.currentDotIndicator = this.scene.add.circle(0, 35, 12, 0x000000, 0);
    this.currentDotIndicator.setStrokeStyle(2, THEME.accent, 1);

    // Label for day progress under dots
    this.dayProgressLabel = this.scene.add.text(0, 72, 'Day 1 of 7', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#c9c9c9'
    }).setOrigin(0.5);

    // Add "Tap to Check In" text
    const checkInPrompt = this.scene.add.text(0, 55, 'Tap to Check In', { 
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#FF7A00', fontStyle: 'italic' 
    }).setOrigin(0.5);

    streakContainer.add([streakBg, streakTitle, streakValue, checkInPrompt, ...this.checkInDots, this.currentDotIndicator, this.dayProgressLabel]);

    // Make the streak container interactive
    streakContainer.setSize(320, 110);
    streakContainer.setInteractive(new Phaser.Geom.Rectangle(-160, -55, 320, 110), Phaser.Geom.Rectangle.Contains);
    
    // Add hover effects
    streakContainer.on('pointerover', () => {
      this.scene.tweens.add({ targets: streakContainer, scale: 1.05, duration: 200, ease: 'Power2' });
      streakBg.clear();
      streakBg.fillStyle(THEME.cardBg, 1).fillRoundedRect(-120, -40, 240, 80, 15);
      streakBg.lineStyle(3, THEME.cardStroke, 1).strokeRoundedRect(-120, -40, 240, 80, 15);
    });
    
    streakContainer.on('pointerout', () => {
      this.scene.tweens.add({ targets: streakContainer, scale: 1, duration: 200, ease: 'Power2' });
      streakBg.clear();
      streakBg.fillStyle(THEME.cardBg, 0.95).fillRoundedRect(-160, -55, 320, 110, 18);
      streakBg.lineStyle(2, THEME.cardStroke, 1).strokeRoundedRect(-160, -55, 320, 110, 18);
    });
    
    // Add click handler to show daily check-in
    streakContainer.on('pointerdown', () => {
      this.scene.playSound?.('button_ambience');
      // Show a simple notification instead of overlay
      this.showCheckInNotification();
    });

    // Initial render of dot progress
    this.updateCheckInProgress();
    // Metrics
    const metricsContainer = this.scene.add.container(0, 400);
    const accContainer = this.createMetricCard(width * 0.25, 0, 'Accuracy', `${stats.accuracy.toFixed(1)}%`, '🎯');
    const currentStreakContainer = this.createMetricCard(width * 0.75, 0, 'Current Streak', `${stats.currentStreak}`, '⚡');
    metricsContainer.add([accContainer, currentStreakContainer]);

    // Today activity
    const activityContainer = this.scene.add.container(width / 2, 520);
    const activityBg = this.scene.add.graphics();
    activityBg.fillStyle(THEME.cardBg, 0.95).fillRoundedRect(-150, -60, 300, 120, 15);
    activityBg.lineStyle(2, THEME.cardStroke, 1).strokeRoundedRect(-150, -60, 300, 120, 15);
    const activityTitle = this.scene.add.text(0, -40, "Today's Progress", {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: THEME.textPrimary, fontStyle: 'bold'
    }).setOrigin(0.5);
    const todayPredictions = this.scene.add.text(0, -15, `Predictions: ${stats.totalRolls}`, { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: THEME.textSecondary }).setOrigin(0.5);
    const todayCoherence = this.scene.add.text(0, 5, `Coherence Time: ${Math.floor(stats.totalCoherenceTime)} min`, { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: THEME.textSecondary }).setOrigin(0.5);
    const zenScore = this.scene.calculateZenScore(stats);
    const todayZen = this.scene.add.text(0, 25, `Q-Score: ${zenScore.toFixed(1)}`, { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#FF7A00', fontStyle: 'bold' }).setOrigin(0.5);
    activityContainer.add([activityBg, activityTitle, todayPredictions, todayCoherence, todayZen]);

    // Start button (uses lastPlayedLevel)
    const startButton = this.scene.add.container(width / 2, height - 160);
    const lastPlayedLevel = localStorage.getItem('lastPlayedLevel') || 1;
    const startBtnBg = this.scene.add.graphics();
    startBtnBg.fillStyle(THEME.accent, 1).fillRoundedRect(-100, -20, 200, 40, 20);
    startBtnBg.lineStyle(2, THEME.accentDark, 1).strokeRoundedRect(-100, -20, 200, 40, 20);
    const startText = this.scene.add.text(0, 0, `▶ Starting Level ${lastPlayedLevel}`, {
      fontFamily: '"Arial Black", Arial, sans-serif', fontSize: '16px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    startButton.add([startBtnBg, startText]);
    startButton.setInteractive(new Phaser.Geom.Rectangle(-100, -20, 200, 40), Phaser.Geom.Rectangle.Contains);
    this.startButton = startButton;
    this.isStarting = false;

    startButton.on('pointerdown', () => {
      if (this.isStarting) return;
      const lp = parseInt(localStorage.getItem('lastPlayedLevel') || '1', 10);
      const s = this.statsTracker.getStats();
      if (lp <= s.psychicLevel) {
        this.isStarting = true;
        this.scene.playSound?.('button_ambience');
        const levelData = this.getLevelData(lp);
        if (levelData) {
          this.scene.setActiveLevel?.(levelData.level);
          this.hide();
          this.scene.time.delayedCall(100, () => {
            this.scene.startNewRound?.();
            this.isStarting = false;
          });
        } else {
          this.isStarting = false;
        }
      }
    });

    startButton.on('pointerover', () => {
      this.scene.tweens.add({ targets: startButton, scale: 1.05, duration: 200, ease: 'Power2' });
      startBtnBg.clear();
      startBtnBg.fillStyle(THEME.accent, 1).fillRoundedRect(-100, -20, 200, 40, 20);
      startBtnBg.lineStyle(3, THEME.accentDark, 1).strokeRoundedRect(-100, -20, 200, 40, 20);
    });

    startButton.on('pointerout', () => {
      this.scene.tweens.add({ targets: startButton, scale: 1, duration: 200, ease: 'Power2' });
      startBtnBg.clear();
      startBtnBg.fillStyle(THEME.accent, 1).fillRoundedRect(-100, -20, 200, 40, 20);
      startBtnBg.lineStyle(2, THEME.accentDark, 1).strokeRoundedRect(-100, -20, 200, 40, 20);
    });

    this.container.add([bg, greetingText, dateText, avatarContainer, weekdayStrip, streakContainer, metricsContainer, activityContainer, startButton, closeBtn]);
  }

  getLevelData(level) {
    // Use the level manager if available for consistent level data
    if (this.scene.predictionSystem && this.scene.predictionSystem.getLevelManager) {
      const levelManager = this.scene.predictionSystem.getLevelManager();
      const levelComponent = levelManager.getLevel(level);
      if (levelComponent) {
        return levelComponent.getLevelData();
      }
    }
    
    // Fallback to static data for backward compatibility
    const gameLevels = [
      { level: 1, title: 'Coin Flip Oracle',       subtitle: 'Master the ancient art of coin divination', icon: 'coin_icon',      locked: false, psychicLevelRequired: 1, gameScene: 'CoinFlipGame' },
      { level: 2, title: "Cat in a Box",          subtitle: 'Find the hidden feline in quantum space', icon: 'cat_icon',       locked: false, psychicLevelRequired: 2, gameScene: 'SchrodingerGame' },
      { level: 3, title: 'Emotional Intuition',   subtitle: 'Sense the emotional energy of an unseen image', icon: 'emotion_icon',  locked: false, psychicLevelRequired: 3, gameScene: 'EmotionalGame' },
      { level: 4, title: 'Mystic Tetrahedron',    subtitle: 'Command the 4-sided sacred geometry',       icon: 'tetrahedron_icon', locked: false, psychicLevelRequired: 4, gameScene: 'TetrahedronGame' },
      { level: 5, title: 'Pentagon Portal',       subtitle: 'Unlock the secrets of 5-dimensional space', icon: 'pentagon_icon',  locked: false, psychicLevelRequired: 5, gameScene: 'PentagonGame' },
      { level: 6, title: 'Hexagon Harmony',       subtitle: 'Achieve mastery over the perfect cube',     icon: 'hexagon_icon',   locked: false, psychicLevelRequired: 6, gameScene: 'HexagonGame' }
    ];
    return gameLevels.find(l => l.level === parseInt(level, 10));
  }

  createMetricCard(x, y, title, value, icon) {
    const container = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xFFFFFF, 0.95).fillRoundedRect(-60, -40, 120, 80, 15);
    bg.lineStyle(1, 0xE8DCD2, 1).strokeRoundedRect(-60, -40, 120, 80, 15);
    const iconText = this.scene.add.text(0, -20, icon, { fontFamily: 'Arial, sans-serif', fontSize: '20px' }).setOrigin(0.5);
    const valueText = this.scene.add.text(0, 0, value, { fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#FF7A00', fontStyle: 'bold' }).setOrigin(0.5);
    const titleText = this.scene.add.text(0, 20, title, { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#7a7a7a' }).setOrigin(0.5);
    container.add([bg, iconText, valueText, titleText]);
    return container;
  }

  updateDashboardAvatarPosition() {
    if (!this.dashboardAvatarElement) return;
    const canvas = this.scene.sys.game.canvas;
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);

    const avatarSize = 64; // smaller, per reference
    const avatarX = bounds.left + bounds.width - (avatarSize + 24);
    const avatarY = bounds.top + (60 * scale) - (avatarSize / 2);

    this.dashboardAvatarElement.style.left = `${avatarX}px`;
    this.dashboardAvatarElement.style.top  = `${avatarY}px`;
    this.dashboardAvatarElement.style.width  = `${avatarSize}px`;
    this.dashboardAvatarElement.style.height = `${avatarSize}px`;
    this.dashboardAvatarElement.style.display = 'block';
  }

  destroyHtmlOverlays() {
    if (this.dashboardAvatarElement?.parentNode) this.dashboardAvatarElement.parentNode.removeChild(this.dashboardAvatarElement);
    this.dashboardAvatarElement = null;
  }

  show() {
    this.visible = true;
    if (this.container) {
      this.container.setVisible(true).setAlpha(0);
    } else {
      console.warn('HomePanel: Container not initialized in show()');
      return;
    }

    if (this.dashboardAvatarElement) this.updateDashboardAvatarPosition();
    if (this.startButton && typeof this.startButton.setVisible === 'function') {
      this.startButton.setVisible(true);
    }

    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 300, ease: 'Power2' });
  }

  hide() {
    this.visible = false;

    if (this.dashboardAvatarElement) this.dashboardAvatarElement.style.display = 'none';
    if (this.startButton && typeof this.startButton.setVisible === 'function') {
      this.startButton.setVisible(false);
    }

    if (!this.container) {
      console.warn('HomePanel: Container not initialized in hide()');
      return;
    }

    // Kill any existing tweens on this container to prevent race conditions
    this.scene.tweens.killTweensOf(this.container);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        // Additional safety check: ensure container still exists and hasn't been destroyed
        if (this.container && this.container.scene && typeof this.container.setVisible === 'function') {
          this.container.setVisible(false);
        }
      }
    });
  }

  isVisible() { 
    return this.visible && this.container && this.container.visible; 
  }

  showCheckInNotification() {
    // Simple notification for daily check-in
    const stats = this.statsTracker.getStats();
    const streak = stats.dailyCheckInStreak || 0;
    
    // Perform daily check-in
    this.statsTracker.performDailyCheckIn();
    // Update streak display and dot progress
    this.updateCheckInProgress();
    
    // Show simple text notification
    const { width } = this.scene.sys.game.config;
    const notification = this.scene.add.text(width / 2, 200, `Daily Check-in Complete! Streak: ${streak + 1}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#00ff00',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(15000);

    // Fade out after 2 seconds
    this.scene.tweens.add({
      targets: notification,
      alpha: 0,
      duration: 2000,
      onComplete: () => notification.destroy()
    });
  }

  updateCheckInProgress() {
    const stats = this.statsTracker.getStats();
    const streak = stats.dailyCheckInStreak || 0;
    const completed = streak >= 7 ? 7 : (streak % 7);
    if (this.streakValue) {
      this.streakValue.setText(`🔥 ${streak}`);
    }
    if (this.checkInDots && this.checkInDots.length === 7) {
      for (let i = 0; i < 7; i++) {
        const dot = this.checkInDots[i];
        if (!dot) continue;
        if (i < completed) {
          dot.setFillStyle(0x00e5ff, 1);
          dot.setStrokeStyle(2, 0x00e5ff, 1);
        } else {
          dot.setFillStyle(0x3a2b55, 1);
          dot.setStrokeStyle(2, 0x8a2be2, 0.9);
        }
      }

      // Highlight the current position (next dot to check-in)
      const activeIndex = completed % 7; // next dot
      const activeDot = this.checkInDots[activeIndex];
      if (activeDot && this.currentDotIndicator) {
        this.currentDotIndicator.setVisible(true);
        this.currentDotIndicator.x = activeDot.x;
        this.currentDotIndicator.y = activeDot.y;

        // Subtle pulse to draw attention
        this.scene.tweens.add({
          targets: this.currentDotIndicator,
          alpha: { from: 0.5, to: 1 },
          duration: 800,
          yoyo: true,
          repeat: 2
        });
      }

      // Update day progress text label
      if (this.dayProgressLabel) {
        if (streak >= 7) {
          this.dayProgressLabel.setText('Week Complete!');
          this.dayProgressLabel.setColor('#00e5ff');
        } else {
          this.dayProgressLabel.setText(`Day ${activeIndex + 1} of 7`);
          this.dayProgressLabel.setColor('#c9c9c9');
        }
      }
    }
  }

  // Helpers for header
  getTimeOfDayGreeting(date) {
    const h = date.getHours();
    if (h < 12) return 'Morning';
    if (h < 18) return 'Afternoon';
    return 'Evening';
  }

  formatFullDate(date) {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dname = days[date.getDay()];
    const mname = months[date.getMonth()];
    return `${dname}, ${date.getDate()} ${mname}, ${date.getFullYear()}`;
  }

  // Weekday strip implementation (interactive)
  createWeekdayStrip(screenWidth) {
    const container = this.scene.add.container(screenWidth / 2, 160);

    // Day labels (Mon..Sun)
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const labelY = -30;
    dayNames.forEach((dn, i) => {
      const x = -160 + i * 53;
      const t = this.scene.add.text(x, labelY, dn, {
        fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#7a7a7a'
      }).setOrigin(0.5);
      container.add(t);
    });

    // Compute dates for current week (Mon start)
    const now = new Date();
    const day = now.getDay(); // 0=Sun..6=Sat
    const daysFromMonday = (day + 6) % 7; // convert so 0=Mon
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);

    this.weekdayDots = [];
    this.selectedDayIndex = ((now.getDay() + 6) % 7);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dayNum = d.getDate();
      const x = -160 + i * 53;

      // Background circle
      const circle = this.scene.add.circle(x, 0, 18, 0xffffff, 0.95);
      circle.setStrokeStyle(2, 0xDDDDDD, 1);

      // Day number text
      const numText = this.scene.add.text(x, 0, `${dayNum}`, {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#ffffff'
      }).setOrigin(0.5);

      // Selected state indicator
      const selectedRing = this.scene.add.circle(x, 0, 20, 0x000000, 0);
      selectedRing.setStrokeStyle(3, 0x2C2C2C, 0.9);

      const idx = i;
      const hitArea = new Phaser.Geom.Circle(x, 0, 22);
      const interactiveZone = this.scene.add.zone(x, 0, 44, 44).setInteractive(hitArea, Phaser.Geom.Circle.Contains);
      interactiveZone.on('pointerdown', () => {
        this.selectedDayIndex = idx;
        this.scene.playSound?.('button_hover_click', { volume: 0.3 });
        this.refreshWeekdayStripSelection();
      });

      container.add([circle, selectedRing, numText, interactiveZone]);
      this.weekdayDots.push({ circle, selectedRing, numText });
    }

    this.refreshWeekdayStripSelection();
    return container;
  }

  refreshWeekdayStripSelection() {
    if (!this.weekdayDots) return;
    for (let i = 0; i < this.weekdayDots.length; i++) {
      const { circle, selectedRing, numText } = this.weekdayDots[i];
      const isSelected = i === this.selectedDayIndex;
      if (isSelected) {
        circle.setFillStyle(0x2C2C2C, 1);
        circle.setStrokeStyle(2, 0x2C2C2C, 1);
        numText.setColor('#ffffff');
        selectedRing.setVisible(true);
      } else {
        circle.setFillStyle(0xffffff, 0.95);
        circle.setStrokeStyle(2, 0xDDDDDD, 1);
        numText.setColor('#7a7a7a');
        selectedRing.setVisible(false);
      }
    }
  }

  // Reminder CTA card
  createReminderCard(centerX, y) {
    const container = this.scene.add.container(centerX, y);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xFFF3E6, 1).fillRoundedRect(-170, -55, 340, 110, 18);
    bg.lineStyle(2, 0xFFE0BF, 1).strokeRoundedRect(-170, -55, 340, 110, 18);

    const title = this.scene.add.text(-140, -30, 'Set the reminder', {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#1f1f1f', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    const copy = this.scene.add.text(-140, -5, 'Never miss your morning routine!\nSet a reminder to stay on track', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#7a7a7a'
    }).setOrigin(0, 0.5);

    // Bell icon (emoji for simplicity)
    const bell = this.scene.add.text(120, -15, '🔔', {
      fontFamily: 'Arial, sans-serif', fontSize: '36px'
    }).setOrigin(0.5);

    // Set Now button
    const btn = this.scene.add.container( -120, 30 );
    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0x8A4A00, 1).fillRoundedRect(0, 0, 110, 34, 18);
    const btnText = this.scene.add.text(55, 17, 'Set Now', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    btn.add([btnBg, btnText]);
    btn.setSize(110, 34);
    // Use correct Phaser hit area callback (capitalized Contains)
    btn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 110, 34), Phaser.Geom.Rectangle.Contains);
    btn.on('pointerdown', () => {
      this.scene.playSound?.('button_ambience');
      if (this.uiCallbacks?.onSetReminder) {
        this.uiCallbacks.onSetReminder();
      } else {
        const { width } = this.scene.sys.game.config;
        const note = this.scene.add.text(width / 2, y + 80, 'Reminder settings coming soon', {
          fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#1f1f1f'
        }).setOrigin(0.5).setDepth(15000);
        this.scene.tweens.add({ targets: note, alpha: 0, duration: 1800, onComplete: () => note.destroy() });
      }
    });

    container.add([bg, title, copy, bell, btn]);
    return container;
  }
}

// Journal Panel - Modern diary with mood tracking, calendar, and tags
class JournalPanel {
  constructor(scene, statsTracker) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.wheelEventManager = scene.uiManager?.wheelEventManager; // Reference to centralized wheel event manager
    this.visible = false;
    this.container = null;
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.currentView = 'today'; // 'today', 'calendar', 'entries'
    this.selectedDate = new Date();
    this.moodData = this.loadMoodData();
    this.journalEntries = this.loadJournalEntries();
    this.availableTags = ['work', 'personal', 'health', 'goals', 'gratitude', 'reflection'];
    this.selectedTags = [];
    this.currentAnnotation = ''; // Initialize annotation text
    
    this.createPanel();
  }

  loadMoodData() {
    const saved = localStorage.getItem('journalMoodData');
    return saved ? JSON.parse(saved) : {};
  }

  saveMoodData() {
    localStorage.setItem('journalMoodData', JSON.stringify(this.moodData));
  }

  loadJournalEntries() {
    const saved = localStorage.getItem('journalEntries');
    return saved ? JSON.parse(saved) : {};
  }

  // Enhanced save method with validation and backup
  saveJournalEntriesWithValidation() {
    try {
      // Create backup before saving
      const currentData = localStorage.getItem('journalEntries');
      if (currentData) {
        localStorage.setItem('journalEntries_backup', currentData);
      }

      // Validate data before saving
      if (typeof this.journalEntries !== 'object' || this.journalEntries === null) {
        throw new Error('Invalid journal entries data structure');
      }

      // Save with timestamp
      const dataToSave = {
        entries: this.journalEntries,
        lastSaved: new Date().toISOString(),
        version: '1.0'
      };

      localStorage.setItem('journalEntries', JSON.stringify(dataToSave));
      
      // Verify save was successful
      const savedData = localStorage.getItem('journalEntries');
      if (!savedData) {
        throw new Error('Failed to verify data was saved');
      }

    } catch (error) {
      console.error('Error saving journal entries:', error);
      
      // Attempt to restore from backup if save failed
      try {
        const backup = localStorage.getItem('journalEntries_backup');
        if (backup) {
          localStorage.setItem('journalEntries', backup);
        }
      } catch (restoreError) {
        console.error('Failed to restore backup:', restoreError);
      }
      
      throw error; // Re-throw to be handled by caller
    }
  }

  // Enhanced load method with migration support
  loadJournalEntries() {
    try {
      const saved = localStorage.getItem('journalEntries');
      if (!saved) {
        return {};
      }

      const parsedData = JSON.parse(saved);
      
      // Handle new format with metadata
      if (parsedData.entries && parsedData.version) {
        return parsedData.entries;
      }
      
      // Handle legacy format - migrate to new format
      if (typeof parsedData === 'object' && parsedData !== null) {
        // This is legacy format, migrate it
        this.migrateToNewFormat(parsedData);
        return parsedData;
      }

      return {};
    } catch (error) {
      console.error('Error loading journal entries:', error);
      
      // Try to load from backup
      try {
        const backup = localStorage.getItem('journalEntries_backup');
        if (backup) {
          const backupData = JSON.parse(backup);
          console.log('Restored from backup');
          return backupData.entries || backupData;
        }
      } catch (backupError) {
        console.error('Failed to load backup:', backupError);
      }
      
      return {};
    }
  }

  // Migrate legacy data format to new format
  migrateToNewFormat(legacyData) {
    try {
      const migratedData = {
        entries: {},
        lastSaved: new Date().toISOString(),
        version: '1.0'
      };

      // Convert legacy entries to new format with metadata
      Object.keys(legacyData).forEach(dateKey => {
        const entry = legacyData[dateKey];
        if (typeof entry === 'object' && entry.text) {
          migratedData.entries[dateKey] = {
            ...entry,
            createdAt: entry.createdAt || new Date().toISOString(),
            lastModified: entry.lastModified || new Date().toISOString(),
            wordCount: entry.wordCount || (entry.text ? entry.text.split(/\s+/).filter(word => word.length > 0).length : 0),
            characterCount: entry.characterCount || (entry.text ? entry.text.length : 0)
          };
        }
      });

      // Save migrated data
      localStorage.setItem('journalEntries', JSON.stringify(migratedData));
      console.log('Successfully migrated journal data to new format');
      
    } catch (error) {
      console.error('Failed to migrate data:', error);
    }
  }

  saveJournalEntries() {
    // Redirect to enhanced save method
    this.saveJournalEntriesWithValidation();
  }

  createPanel() {
    const { width, height } = this.scene.scale;
    const panelHeight = height - 100; // Reserve space for the bottom menu

    this.container = this.scene.add.container(0, 0);
    this.container.setVisible(false);
    // Increase depth to 15000 to sit above debug buttons (9999) and other UI elements
    this.container.setDepth(12000);

    // Create click-blocking overlay to prevent interactions with underlying elements
    // Disabled to prevent interference with profile page
    // this.clickBlocker = this.scene.add.rectangle(width / 2, panelHeight / 2, width, panelHeight, 0x000000, 0);
    // this.clickBlocker.setInteractive();
    // this.clickBlocker.setDepth(11999); // Just below the journal panel
    // this.clickBlocker.setVisible(false);

    // A light, clean background that matches the new style
    const bg = this.scene.add.rectangle(width / 2, panelHeight / 2, width, panelHeight);
    bg.setFillStyle(0xf7f7f7);
    this.container.add(bg);

    // Add a subtle top border for separation
    const border = this.scene.add.graphics();
    border.fillStyle(0xe0e0e0, 0.8);
    border.fillRect(0, 0, width, 1);
    this.container.add(border);

    // Header
    this.createHeader();

    // Navigation tabs
    this.createNavigationTabs();

    // Content area
    this.contentContainer = this.scene.add.container(0, 0);
    this.container.add(this.contentContainer);

    this.updateView();
    this.setupScrolling();
  }

  createHeader() {
    const { width } = this.scene.scale;
    
    const headerBg = this.scene.add.graphics();
    headerBg.fillStyle(0xf7f7f7);
    headerBg.fillRect(0, 0, width, 120);
    this.container.add(headerBg);
    
    const title = this.scene.add.text(width/2, 60, 'Mood History', {
      fontSize: '24px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(title);
    
    const dateStr = this.selectedDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
    });
    const dateText = this.scene.add.text(width/2, 95, dateStr, {
      fontSize: '16px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#888888',
    }).setOrigin(0.5);
    this.container.add(dateText);
    this.dateText = dateText;
  }

  createNavigationTabs() {
    const { width } = this.scene.scale;
    const tabY = 150;

    const tabs = [
      { id: 'today', label: 'Today' },
      { id: 'calendar', label: 'Calendar' },
      { id: 'entries', label: 'Entries' }
    ];

    const tabWidth = 120;
    const tabHeight = 40;
    const spacing = 10;
    const totalWidth = (tabs.length * tabWidth) + ((tabs.length - 1) * spacing);
    let startX = (width - totalWidth) / 2;

    this.navTabs = {};

    tabs.forEach((tab, index) => {
      const x = startX + (index * (tabWidth + spacing)) + (tabWidth / 2);

      const tabBg = this.scene.add.graphics();
      const tabText = this.scene.add.text(x, tabY, tab.label, {
        fontSize: '16px',
        fontFamily: '"Nunito", sans-serif',
        fill: '#000000'
      }).setOrigin(0.5);

      const hitArea = this.scene.add.rectangle(x, tabY, tabWidth, tabHeight).setInteractive();
      hitArea.on('pointerdown', () => {
        this.currentView = tab.id;
        this.updateNavigationTabs();
        this.updateView();
      });

      this.container.add([tabBg, tabText, hitArea]);
      this.navTabs[tab.id] = { bg: tabBg, text: tabText };
    });

    this.updateNavigationTabs();
  }

  updateNavigationTabs() {
    const tabWidth = 120;
    const tabHeight = 40;

    Object.entries(this.navTabs).forEach(([id, tab]) => {
      const isActive = id === this.currentView;
      tab.bg.clear();
      if (isActive) {
        // Selected tab style from the image
        tab.bg.fillStyle(0x2c3e50, 1); // Dark blue-gray
        tab.bg.fillRoundedRect(-(tabWidth/2), -(tabHeight/2), tabWidth, tabHeight, 8);
        tab.bg.lineStyle(2, 0x3498db, 1); // Blue border
        tab.bg.strokeRoundedRect(-(tabWidth/2), -(tabHeight/2), tabWidth, tabHeight, 8);
        tab.text.setFill('#FFFFFF');
      } else {
        // Unselected tab style from the image
        tab.bg.fillStyle(0xecf0f1, 1); // Light gray
        tab.bg.fillRoundedRect(-(tabWidth/2), -(tabHeight/2), tabWidth, tabHeight, 8);
        tab.text.setFill('#888888');
      }
      // Position the graphics relative to the text
      tab.bg.x = tab.text.x;
      tab.bg.y = tab.text.y;
    });
  }

  updateView() {
    // Clear content
    this.contentContainer.removeAll(true);
    this.scrollY = 0;
    
    switch (this.currentView) {
      case 'today':
        this.createTodayView();
        break;
      case 'calendar':
        this.createCalendarView();
        break;
      case 'entries':
        this.createEntriesView();
        break;
    }
  }

  // Selective refresh that preserves text input state
  refreshMoodDisplay() {
    // Only refresh mood display without destroying text input
    if (this.currentView === 'today') {
      // Find and update mood buttons to show current selection
      // Use the same date key format as createMoodCheckIn to keep selection in sync
      const todayKey = this.selectedDate.toDateString();
      const selectedMood = this.moodData[todayKey];
      
      // Update mood button visual states without recreating the entire view
      // Guard against cases where the panel hasn't finished initializing
      // or the container was destroyed/cleared and list is not available yet.
      if (!this.contentContainer || !Array.isArray(this.contentContainer.list)) {
        return;
      }
      this.contentContainer.list.forEach(child => {
        if (child.moodValue !== undefined && child.isMoodButtonGraphics) {
          // Redraw the mood button graphics to reflect selection
          const isSelected = child.moodValue === selectedMood;
          const radius = child.moodRadius || 25;
          const fillColor = child.moodColor || 0xADB5BD;

          // Clear previous drawing and redraw base circle
          child.clear();
          child.fillStyle(fillColor, 1);
          child.fillCircle(0, 0, radius);

          // Draw selection ring if selected
          if (isSelected) {
            child.lineStyle(3, 0x3498db, 1);
            child.strokeCircle(0, 0, radius);
          }
        }
      });
    }
  }

  createTodayView() {
    const { width } = this.scene.scale;
    let yPos = 180;
    
    // Mood check-in section
    yPos = this.createMoodCheckIn(yPos);
    
    // Today's entry section
    yPos = this.createTodayEntry(yPos);
    
    // Performance tracker
    yPos = this.createPerformanceTracker(yPos);
    
    this.maxScrollY = Math.max(0, yPos - this.scene.scale.height + 100);
  }

  createMoodCheckIn(startY) {
    const { width } = this.scene.scale;
    let yPos = startY;

    const header = this.scene.add.text(width / 2, yPos, 'How are you feeling today?', {
      fontSize: '20px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.contentContainer.add(header);
    yPos += 60;

    const moods = [
      { emoji: '😔', label: 'Sad', value: 1, color: 0xDEE2E6 },
      { emoji: '😐', label: 'Okay', value: 2, color: 0xCED4DA },
      { emoji: '🙂', label: 'Good', value: 3, color: 0xADB5BD },
      { emoji: '😊', label: 'Happy', value: 4, color: 0x868E96 },
      { emoji: '🤩', label: 'Amazing', value: 5, color: 0x495057 }
    ];

    const todayKey = this.selectedDate.toDateString();
    const currentMood = this.moodData[todayKey] || 0;
    const moodButtonSize = 50;
    const spacing = (width - (moods.length * moodButtonSize)) / (moods.length + 1);


    moods.forEach((mood, index) => {
      const x = spacing + (index * (moodButtonSize + spacing)) + (moodButtonSize / 2);
      const y = yPos;

      const moodBtn = this.scene.add.graphics();
      moodBtn.fillStyle(mood.color, 1);
      moodBtn.fillCircle(0, 0, moodButtonSize / 2);
      
      if (currentMood === mood.value) {
        moodBtn.lineStyle(3, 0x3498db, 1);
        moodBtn.strokeCircle(0, 0, moodButtonSize / 2);
      }
      
      moodBtn.x = x;
      moodBtn.y = y;
      
      // Add moodValue property for selective refresh
      moodBtn.moodValue = mood.value;
      moodBtn.isMoodButtonGraphics = true;
      moodBtn.moodRadius = moodButtonSize / 2;
      moodBtn.moodColor = mood.color;
      
      const moodEmoji = this.scene.add.text(x, y, mood.emoji, {
        fontSize: '28px'
      }).setOrigin(0.5);

      const moodLabel = this.scene.add.text(x, y + 45, mood.label, {
        fontSize: '14px',
        fontFamily: '"Nunito", sans-serif',
        fill: '#888888',
      }).setOrigin(0.5);

      const hitArea = this.scene.add.circle(x, y, moodButtonSize / 2).setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        this.moodData[todayKey] = mood.value;
        this.saveMoodData();
        // Preserve text input state during mood selection
        this.refreshMoodDisplay();
      });

      this.contentContainer.add([moodBtn, moodEmoji, moodLabel, hitArea]);
    });

    return yPos + 100;
  }

  createTodayEntry(startY) {
    const { width } = this.scene.scale;
    let yPos = startY;

    const header = this.scene.add.text(width / 2, yPos, 'Today\'s Entry', {
      fontSize: '20px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.contentContainer.add(header);
    yPos += 40;

    // Store the entry container position for consistent layout
    this.entryContainerY = yPos;
    this.entryContainerHeight = 80; // Fixed height for consistent layout

    // Get today's entry if it exists
    const today = new Date().toDateString();
    const existingEntry = this.journalEntries[today]?.text || '';

    if (existingEntry) {
      // Display existing entry with fixed dimensions
      this.createExistingEntryDisplay(yPos, width, existingEntry);
      yPos += this.entryContainerHeight + 20; // Consistent spacing
    } else {
      // Show input for new entry with same dimensions
      this.createTodayEntryInput(yPos, width, '');
      yPos += this.entryContainerHeight + 20; // Consistent spacing
    }

    // Tags section - positioned consistently regardless of entry state
    const tagsHeader = this.scene.add.text(width / 2, yPos, 'Tags', {
      fontSize: '18px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.contentContainer.add(tagsHeader);
    yPos += 40;

    const tagContainer = this.scene.add.container(0, yPos);
    this.contentContainer.add(tagContainer);

    let currentX = 30;
    let currentY = 0;
    const rowHeight = 40;

    // Re-add todayKey for tags functionality
    const todayKey = this.selectedDate.toDateString();

    this.availableTags.forEach(tag => {
      const tagText = this.scene.add.text(0, 0, `#${tag}`, {
        fontSize: '14px',
        fontFamily: '"Nunito", sans-serif',
        fill: '#FFFFFF',
        padding: { left: 10, right: 10, top: 5, bottom: 5 },
      });

      const tagBg = this.scene.add.graphics();
      const isSelected = this.journalEntries[todayKey]?.tags?.includes(tag);
      tagBg.fillStyle(isSelected ? 0x3498db : 0x2c3e50, 1);
      tagBg.fillRoundedRect(0, 0, tagText.width, tagText.height, 8);
      
      const tagButton = this.scene.add.container(0, 0, [tagBg, tagText]);
      tagButton.setSize(tagText.width, tagText.height);
      tagButton.setInteractive();

      if (currentX + tagButton.width > width - 30) {
        currentX = 30;
        currentY += rowHeight;
      }

      tagButton.x = currentX;
      tagButton.y = currentY;
      currentX += tagButton.width + 10;

      tagContainer.add(tagButton);

      tagButton.on('pointerdown', () => {
        if (!this.journalEntries[todayKey]) {
          this.journalEntries[todayKey] = { tags: [] };
        }
        if (!this.journalEntries[todayKey].tags) {
          this.journalEntries[todayKey].tags = [];
        }

        const tagIndex = this.journalEntries[todayKey].tags.indexOf(tag);
        if (tagIndex > -1) {
          this.journalEntries[todayKey].tags.splice(tagIndex, 1);
        } else {
          this.journalEntries[todayKey].tags.push(tag);
        }
        this.saveJournalEntries();
        this.updateView();
      });
    });

    return yPos + currentY + rowHeight;
  }

  createExistingEntryDisplay(yPos, width, existingEntry) {
    // Create entry display with fixed dimensions matching input field
    const entryCard = this.scene.add.graphics();
    entryCard.fillStyle(0xFFFFFF, 1);
    entryCard.lineStyle(1, 0xDEE2E6, 1);
    entryCard.fillRoundedRect(30, yPos, width - 60, this.entryContainerHeight, 8);
    entryCard.strokeRoundedRect(30, yPos, width - 60, this.entryContainerHeight, 8);
    this.contentContainer.add(entryCard);

    const entryText = this.scene.add.text(50, yPos + 20, existingEntry, {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#495057',
      wordWrap: { width: width - 140 } // Leave space for edit button
    });
    this.contentContainer.add(entryText);

    // Edit button positioned consistently
    const editBtn = this.scene.add.graphics();
    editBtn.fillStyle(0x6C757D, 1);
    editBtn.fillRoundedRect(width - 120, yPos + (this.entryContainerHeight - 25) / 2, 60, 25, 8);
    this.contentContainer.add(editBtn);

    const editText = this.scene.add.text(width - 90, yPos + this.entryContainerHeight / 2, 'Edit', {
      fontSize: '12px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#FFFFFF'
    }).setOrigin(0.5);
    this.contentContainer.add(editText);

    editBtn.setInteractive(new Phaser.Geom.Rectangle(width - 120, yPos + (this.entryContainerHeight - 25) / 2, 60, 25), Phaser.Geom.Rectangle.Contains);
    editText.setInteractive(new Phaser.Geom.Rectangle(width - 120, yPos + (this.entryContainerHeight - 25) / 2, 60, 25), Phaser.Geom.Rectangle.Contains);

    // Store references for cleanup
    this.currentEntryElements = {
      card: entryCard,
      text: entryText,
      editBtn: editBtn,
      editText: editText
    };

    const editHandler = () => {
      // Clean up existing display elements
      this.cleanupCurrentEntryDisplay();
      // Create input at exact same position with same dimensions
      this.createTodayEntryInput(this.entryContainerY, width, existingEntry);
    };

    editBtn.on('pointerdown', editHandler);
    editText.on('pointerdown', editHandler);
  }

  cleanupCurrentEntryDisplay() {
    if (this.currentEntryElements) {
      Object.values(this.currentEntryElements).forEach(element => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
      this.currentEntryElements = null;
    }
  }

  createTodayEntryInput(yPos, width, initialText = '') {
    // Use consistent dimensions and positioning
    const inputY = this.entryContainerY || yPos;
    const inputHeight = this.entryContainerHeight || 80;
    
    // Input field background - leave room on the right for the Submit button
    const inputBg = this.scene.add.graphics();
    inputBg.fillStyle(0xFFFFFF, 1);
    inputBg.lineStyle(1, 0xDEE2E6, 1);
    // Reserve ~100px on the right for the Submit button so it doesn't overlap the input hit-area
    inputBg.fillRoundedRect(30, inputY, width - 160, inputHeight, 8);
    inputBg.strokeRoundedRect(30, inputY, width - 160, inputHeight, 8);
    this.contentContainer.add(inputBg);
    
    // Store input field properties with consistent positioning
    this.inputField = {
      x: 30,
      y: inputY,
      width: width - 60,
      height: inputHeight,
      background: inputBg
    };
    
    // Placeholder text - positioned consistently within the input area
    this.todayEntryPlaceholder = this.scene.add.text(50, inputY + 20, 'Enter your thoughts about today...', {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#888888',
      fontStyle: 'italic'
    }).setOrigin(0, 0);
    this.contentContainer.add(this.todayEntryPlaceholder);
    
    // Input text - positioned consistently within the input area
    this.todayEntryText = this.scene.add.text(50, inputY + 20, initialText, {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#000000',
      // Match the inputBg width with some padding
      wordWrap: { width: width - 220, useAdvancedWrap: true }
    }).setOrigin(0, 0);
    this.contentContainer.add(this.todayEntryText);
    
    // Text cursor - positioned relative to input area
    this.textCursor = this.scene.add.graphics();
    this.textCursor.lineStyle(1, 0x000000, 1);
    this.textCursor.lineBetween(0, 0, 0, 16);
    this.textCursor.setVisible(false);
    this.contentContainer.add(this.textCursor);
    
    // Submit button - positioned consistently within the input container
    const submitBtn = this.scene.add.graphics();
    submitBtn.fillStyle(0x3498db, 1);
    submitBtn.fillRoundedRect(width - 120, inputY + (inputHeight - 25) / 2, 80, 25, 8);
    this.contentContainer.add(submitBtn);
    
    const submitText = this.scene.add.text(width - 80, inputY + inputHeight / 2, 'Submit', {
      fontSize: '12px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#FFFFFF'
    }).setOrigin(0.5);
    this.contentContainer.add(submitText);
    
    // Make submit button interactive with consistent positioning
    submitBtn.setInteractive(new Phaser.Geom.Rectangle(width - 120, inputY + (inputHeight - 25) / 2, 80, 25), Phaser.Geom.Rectangle.Contains);
    submitText.setInteractive(new Phaser.Geom.Rectangle(width - 120, inputY + (inputHeight - 25) / 2, 80, 25), Phaser.Geom.Rectangle.Contains);
    
    // Input field interaction area - exclude the Submit button region so clicks reach the button
    const inputArea = this.scene.add.rectangle(30 + (width - 160) / 2, inputY + inputHeight / 2, width - 160, inputHeight, 0x000000, 0);
    inputArea.setInteractive();
    this.contentContainer.add(inputArea);
    
    // Store current entry input and cursor position
    this.currentTodayEntry = initialText;
    this.cursorPosition = initialText.length;
    this.isInputActive = false;
    
    // Update placeholder visibility
    this.updateTodayEntryDisplay();
    
    // Handle input field click
    inputArea.on('pointerdown', (pointer) => {
      // Only activate if not already active to prevent interference
      if (!this.isInputActive) {
        this.activateTodayEntryInput();
        // Calculate cursor position based on click location
        this.setCursorFromPointer(pointer);
      } else {
        // If already active, just update cursor position
        this.setCursorFromPointer(pointer);
      }
    });
    
    // Handle submit button click with hover effects
    const submitHandler = () => {
      // Directly submit; Phaser pointer events don't use DOM bubbling
      this.submitTodayEntry();
    };
    
    submitBtn.on('pointerdown', submitHandler);
    submitText.on('pointerdown', submitHandler);
    
    // Also add click handlers for better compatibility
    // Remove pointerup duplicate submissions to avoid double save and false validation errors
    // (pointerdown is sufficient for Phaser interactions)
    
    // Add hover effects
    submitBtn.on('pointerover', () => {
      submitBtn.clear();
      submitBtn.fillStyle(0x2980b9, 1);
      submitBtn.fillRoundedRect(width - 120, inputY + (inputHeight - 25) / 2, 80, 25, 8);
    });
    
    submitBtn.on('pointerout', () => {
      submitBtn.clear();
      submitBtn.fillStyle(0x3498db, 1);
      submitBtn.fillRoundedRect(width - 120, inputY + (inputHeight - 25) / 2, 80, 25, 8);
    });
  }

  activateTodayEntryInput() {
    // Create invisible HTML input for keyboard capture
    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.currentTodayEntry;
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    document.body.appendChild(input);
    
    // Set cursor position in hidden input
    input.setSelectionRange(this.cursorPosition, this.cursorPosition);
    input.focus();
    
    // Activate input state
    this.isInputActive = true;
    // Track when a submit is in progress to avoid interfering blur behavior
    this.isSubmitting = this.isSubmitting === true ? true : false;
    this.showTextCursor();
    this.startCursorBlink();
    
    // Handle keyboard input
    input.addEventListener('input', (e) => {
      // Store the new value and cursor position immediately
      const newValue = e.target.value;
      const newCursorPos = e.target.selectionStart;
      
      // Update our internal state
      this.currentTodayEntry = newValue;
      this.cursorPosition = newCursorPos;
      
      // Update the display
      this.updateTodayEntryDisplay();
      this.updateCursorPosition();
      
      // Ensure hidden input cursor stays in sync without interfering with emoji input
      requestAnimationFrame(() => {
        if (document.body.contains(input) && input.value === newValue) {
          input.setSelectionRange(this.cursorPosition, this.cursorPosition);
        }
      });
    });

    input.addEventListener('keydown', (e) => {
      switch(e.key) {
        case 'ArrowLeft':
          if (this.cursorPosition > 0) {
            this.cursorPosition--;
            this.updateCursorPosition();
          }
          break;
        case 'ArrowRight':
          if (this.cursorPosition < this.currentTodayEntry.length) {
            this.cursorPosition++;
            this.updateCursorPosition();
          }
          break;
        case 'Home':
          this.cursorPosition = 0;
          this.updateCursorPosition();
          break;
        case 'End':
          this.cursorPosition = this.currentTodayEntry.length;
          this.updateCursorPosition();
          break;
        case 'Backspace':
          if (this.cursorPosition > 0) {
            this.currentTodayEntry = this.currentTodayEntry.slice(0, this.cursorPosition - 1) + 
                                   this.currentTodayEntry.slice(this.cursorPosition);
            this.cursorPosition--;
            this.updateTodayEntryDisplay();
            this.updateCursorPosition();
          }
          break;
        case 'Delete':
          if (this.cursorPosition < this.currentTodayEntry.length) {
            this.currentTodayEntry = this.currentTodayEntry.slice(0, this.cursorPosition) + 
                                   this.currentTodayEntry.slice(this.cursorPosition + 1);
            this.updateTodayEntryDisplay();
            this.updateCursorPosition();
          }
          break;
        case 'Enter':
          e.preventDefault(); // Prevent form submission or other default behavior
          this.submitTodayEntry();
          // Keep input active; do not remove or recreate the hidden input
          return; // Exit early to prevent cursor update
        case 'Escape':
          this.deactivateTodayEntryInput();
          document.body.removeChild(input);
          break;
      }
      
      // Update hidden input cursor position to match our cursor
      requestAnimationFrame(() => {
        if (document.body.contains(input) && input.value === this.currentTodayEntry) {
          input.setSelectionRange(this.cursorPosition, this.cursorPosition);
        }
      });
    });

    input.addEventListener('blur', () => {
      // Add a small delay to prevent immediate deactivation during text editing
      // This allows the user to continue editing without the input disappearing
      setTimeout(() => {
        // If we're actively submitting, maintain focus; otherwise allow deactivation
        if (!input.matches(':focus') && this.isInputActive) {
          if (this.isSubmitting) {
            input.focus();
            requestAnimationFrame(() => {
              if (document.body.contains(input)) {
                input.setSelectionRange(this.cursorPosition, this.cursorPosition);
              }
            });
          } else {
            this.deactivateTodayEntryInput();
            if (document.body.contains(input)) {
              document.body.removeChild(input);
            }
          }
        }
      }, 100);
    });
    
    // Store reference for cleanup
    this.hiddenInput = input;
  }

  updateTodayEntryDisplay() {
    // Update text content whenever elements exist; don't depend on input focus state
    if (this.todayEntryText && this.todayEntryPlaceholder) {
      this.todayEntryText.setText(this.currentTodayEntry);
      if (typeof this.todayEntryPlaceholder.setVisible === 'function') {
        this.todayEntryPlaceholder.setVisible(this.currentTodayEntry.length === 0);
      }
    }
  }

  // Cursor and text selection methods
  setCursorFromPointer(pointer) {
    if (!this.inputField || !this.todayEntryText) return;
    
    // Calculate relative position within the input field
    const relativeX = pointer.x - this.inputField.x - 10; // 10px padding
    
    // Create a single measurement text object with exact same style
    const measurementText = this.scene.add.text(0, 0, '', {
      fontSize: this.todayEntryText.style.fontSize,
      fontFamily: this.todayEntryText.style.fontFamily,
      fill: this.todayEntryText.style.fill,
      fontStyle: this.todayEntryText.style.fontStyle,
      fontWeight: this.todayEntryText.style.fontWeight
    });
    
    let bestPosition = 0;
    let minDistance = Infinity;
    
    // Test each character position to find the closest one
    for (let i = 0; i <= this.currentTodayEntry.length; i++) {
      const testText = this.currentTodayEntry.substring(0, i);
      measurementText.setText(testText);
      const textWidth = measurementText.width;
      const distance = Math.abs(textWidth - relativeX);
      
      if (distance < minDistance) {
        minDistance = distance;
        bestPosition = i;
      }
    }
    
    // Clean up measurement text
    measurementText.destroy();
    
    this.cursorPosition = bestPosition;
    this.updateCursorPosition();
  }

  updateCursorPosition() {
    if (!this.textCursor || !this.todayEntryText || !this.inputField) return;
    
    // Calculate cursor x position based on text width up to cursor position
    const textBeforeCursor = this.currentTodayEntry.substring(0, this.cursorPosition);
    
    // Create measurement text with exact same style as display text
    const measurementText = this.scene.add.text(0, 0, textBeforeCursor, {
      fontSize: this.todayEntryText.style.fontSize,
      fontFamily: this.todayEntryText.style.fontFamily,
      fill: this.todayEntryText.style.fill,
      fontStyle: this.todayEntryText.style.fontStyle,
      fontWeight: this.todayEntryText.style.fontWeight
    });
    
    const textWidth = measurementText.width;
    measurementText.destroy();
    
    // Position cursor
    const cursorX = this.inputField.x + 10 + textWidth;
    const cursorY = this.inputField.y + 9; // Center vertically in input field
    
    this.textCursor.setPosition(cursorX, cursorY);
  }

  showTextCursor() {
    if (this.textCursor) {
      this.textCursor.setVisible(true);
      this.updateCursorPosition();
    }
  }

  hideTextCursor() {
    if (this.textCursor) {
      this.textCursor.setVisible(false);
    }
  }

  startCursorBlink() {
    // Stop any existing blink timer
    if (this.cursorBlinkTimer) {
      this.cursorBlinkTimer.remove();
    }
    
    // Start blinking cursor
    this.cursorBlinkTimer = this.scene.time.addEvent({
      delay: 500, // Blink every 500ms
      callback: () => {
        if (this.textCursor && this.isInputActive) {
          this.textCursor.setVisible(!this.textCursor.visible);
        }
      },
      loop: true
    });
  }

  stopCursorBlink() {
    if (this.cursorBlinkTimer) {
      this.cursorBlinkTimer.remove();
      this.cursorBlinkTimer = null;
    }
  }

  deactivateTodayEntryInput() {
    this.isInputActive = false;
    this.hideTextCursor();
    this.stopCursorBlink();
    
    // Clean up hidden input if it exists
    if (this.hiddenInput && document.body.contains(this.hiddenInput)) {
      document.body.removeChild(this.hiddenInput);
      this.hiddenInput = null;
    }
    // Do NOT destroy the visual input UI; keep the field and text so the panel doesn't disappear
    // Just ensure the placeholder reflects current text
    this.updateTodayEntryDisplay();
  }

  // Input validation and sanitization methods
  validateAndSanitizeInput(text) {
    const validation = {
      isValid: true,
      sanitizedText: '',
      errors: []
    };

    // Check if text is a valid string (allow empty string to be handled by length check below)
    if (text === undefined || text === null || typeof text !== 'string') {
      validation.isValid = false;
      validation.errors.push('Entry is invalid');
      return validation;
    }

    // Simplified sanitization: strip HTML tags and trim whitespace
    let sanitized = text
      .replace(/<[^>]*>/g, '')
      .trim();

    // Length validation
    const minLength = 1;
    const maxLength = 5000;
    
    if (sanitized.length < minLength) {
      validation.isValid = false;
      validation.errors.push('Entry must contain at least 1 character');
    }
    
    if (sanitized.length > maxLength) {
      validation.isValid = false;
      validation.errors.push(`Entry cannot exceed ${maxLength} characters (current: ${sanitized.length})`);
    }

    validation.sanitizedText = sanitized;
    return validation;
  }

  // Enhanced data integrity check
  validateDataIntegrity() {
    try {
      // Check localStorage availability
      if (!window.localStorage) {
        throw new Error('Local storage is not available');
      }

      // Test localStorage functionality
      const testKey = 'journal_test_' + Date.now();
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);

      // Validate existing data structure
      const entries = this.loadJournalEntries();
      if (typeof entries !== 'object' || entries === null) {
        throw new Error('Journal entries data is corrupted');
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      return { 
        isValid: false, 
        errors: [`Data integrity check failed: ${error.message}`] 
      };
    }
  }

  submitTodayEntry() {
    // Prevent duplicate submissions (e.g., pointerdown + pointerup or rapid clicks)
    if (this.isSubmitting) {
      return;
    }
    // Mark submission in progress to guide blur behavior
    this.isSubmitting = true;
    // Validate data integrity first
    const integrityCheck = this.validateDataIntegrity();
    if (!integrityCheck.isValid) {
      this.showErrorFeedback(integrityCheck.errors);
      this.isSubmitting = false;
      return;
    }

    // Prefer the visible text as the source of truth, with internal state as backup
    const displayText = (this.todayEntryText && typeof this.todayEntryText.text === 'string')
      ? this.todayEntryText.text
      : '';
    const internalText = (typeof this.currentTodayEntry === 'string')
      ? this.currentTodayEntry
      : '';

    // If internal text appears empty but display shows content, sync from display
    let textToValidate = internalText.trim().length > 0 ? internalText : displayText;
    if (displayText.trim().length > 0 && internalText.trim().length === 0) {
      this.currentTodayEntry = displayText;
      this.cursorPosition = displayText.length;
    }

    // Debug instrumentation to help diagnose input capture issues
    try {
      console.debug('[Journal] submitTodayEntry', {
        internalLen: internalText.length,
        displayLen: displayText.length,
        using: internalText.trim().length > 0 ? 'internal' : 'display'
      });
    } catch (_) { /* no-op for environments without console */ }

    const validation = this.validateAndSanitizeInput(textToValidate);
    
    if (!validation.isValid) {
      this.showErrorFeedback(validation.errors);
      this.isSubmitting = false;
      return;
    }

    try {
      // Determine if we're editing or creating
      const isEditing = this.editingDateKey !== undefined;
      const dateKey = isEditing ? this.editingDateKey : new Date().toDateString();
      
      // Create entry with metadata
      const entryData = {
        text: validation.sanitizedText,
        createdAt: isEditing && this.journalEntries[dateKey] ? this.journalEntries[dateKey].createdAt : new Date().toISOString(),
        lastModified: new Date().toISOString(),
        wordCount: validation.sanitizedText.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: validation.sanitizedText.length,
        version: 2, // New format version
        // Persist mood selection for the day
        mood: this.moodData[dateKey] || 0,
        // Snapshot performance metrics for richer integration
        performanceSnapshot: (() => {
          try {
            const accuracy = (this.statsTracker && typeof this.statsTracker.getAccuracy === 'function')
              ? this.statsTracker.getAccuracy()
              : (this.statsTracker?.stats?.accuracy ?? 0);
            const pValue = this.statsTracker?.stats?.pValue ?? null;
            const totalRolls = this.statsTracker?.stats?.totalRolls ?? null;
            const bestStreak = this.statsTracker?.stats?.bestStreak ?? null;
            const currentStreak = this.statsTracker?.stats?.currentStreak ?? null;
            const modeComparison = (this.statsTracker && typeof this.statsTracker.getModeComparison === 'function')
              ? this.statsTracker.getModeComparison()
              : null;
            const perfLevel = (this.statsTracker && typeof this.statsTracker.getPerformanceLevel === 'function')
              ? this.statsTracker.getPerformanceLevel(accuracy || 0, pValue || 1)
              : null;
            return {
              accuracy,
              pValue,
              totalRolls,
              bestStreak,
              currentStreak,
              performanceLevel: perfLevel,
              recommendation: modeComparison?.recommendation ?? null,
              sense: modeComparison?.sense ?? null,
              influence: modeComparison?.influence ?? null
            };
          } catch (e) {
            console.warn('[Journal] Failed to capture performance snapshot:', e);
            return null;
          }
        })()
      };

      // Initialize date entry if it doesn't exist
      if (!this.journalEntries[dateKey]) {
        this.journalEntries[dateKey] = {};
      }

      this.journalEntries[dateKey] = { ...this.journalEntries[dateKey], ...entryData };
      
      // Save with error handling
      this.saveJournalEntriesWithValidation();
      
      // Clear editing state if we were editing
      if (isEditing) {
        this.editingDateKey = undefined;
        if (this.editModeIndicator) {
          this.editModeIndicator.destroy();
          this.editModeIndicator = null;
        }
      }
      
      // Show success feedback
      this.showTodayEntrySuccess(isEditing ? 'updated' : 'created');
      
      // Reset form content but preserve input elements
      this.currentTodayEntry = '';
      this.cursorPosition = 0;
      
      // Update the display to show empty input instead of destroying elements
      this.updateTodayEntryDisplay();
      
      // Only refresh entries view (not the entire view) to preserve input
      setTimeout(() => {
        if (this.currentView === 'entries') {
          this.createEntriesView();
        }
        // Don't call updateView() to preserve the input elements
      }, 1000);

    } catch (error) {
      console.error('Error saving journal entry:', error);
      this.showErrorFeedback(['Failed to save entry. Please try again.']);
    }
    finally {
      this.isSubmitting = false;
    }
  }

  // Enhanced feedback system for user notifications
  showErrorFeedback(errors) {
    const errorContainer = this.scene.add.container(0, 0);
    this.contentContainer.add(errorContainer);

    const { width } = this.scene.scale;
    const errorBg = this.scene.add.graphics();
    errorBg.fillStyle(0xDC3545, 0.95); // Red background
    errorBg.lineStyle(2, 0xC82333, 1);
    errorBg.fillRoundedRect(30, 120, width - 60, 80, 12);
    errorBg.strokeRoundedRect(30, 120, width - 60, 80, 12);
    errorContainer.add(errorBg);

    // Error icon
    const errorIcon = this.scene.add.text(50, 140, '⚠️', {
      fontSize: '24px'
    });
    errorContainer.add(errorIcon);

    // Error title
    const errorTitle = this.scene.add.text(80, 135, 'Validation Error', {
      fontSize: '16px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#FFFFFF',
      fontStyle: 'bold'
    });
    errorContainer.add(errorTitle);

    // Error messages
    const errorText = errors.join('\n');
    const errorMessage = this.scene.add.text(50, 160, errorText, {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#FFFFFF',
      wordWrap: { width: width - 100 }
    });
    errorContainer.add(errorMessage);

    // Auto-dismiss after 4 seconds
    this.scene.tweens.add({
      targets: errorContainer,
      alpha: 0,
      duration: 600,
      delay: 3400,
      onComplete: () => {
        errorContainer.destroy();
      }
    });
  }

  showWarningFeedback(warnings) {
    const warningContainer = this.scene.add.container(0, 0);
    this.contentContainer.add(warningContainer);

    const { width } = this.scene.scale;
    const warningBg = this.scene.add.graphics();
    warningBg.fillStyle(0xFFC107, 0.95); // Yellow background
    warningBg.lineStyle(2, 0xE0A800, 1);
    warningBg.fillRoundedRect(30, 120, width - 60, 60, 12);
    warningBg.strokeRoundedRect(30, 120, width - 60, 60, 12);
    warningContainer.add(warningBg);

    // Warning icon
    const warningIcon = this.scene.add.text(50, 135, '⚠️', {
      fontSize: '20px'
    });
    warningContainer.add(warningIcon);

    // Warning text
    const warningText = warnings.join(', ');
    const warningMessage = this.scene.add.text(80, 140, `Warning: ${warningText}`, {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#856404',
      wordWrap: { width: width - 110 }
    });
    warningContainer.add(warningMessage);

    // Auto-dismiss after 3 seconds
    this.scene.tweens.add({
      targets: warningContainer,
      alpha: 0,
      duration: 500,
      delay: 2500,
      onComplete: () => {
        warningContainer.destroy();
      }
    });
  }

  showTodayEntrySuccess(action = 'saved') {
    // Create success message
    const successBg = this.scene.add.graphics();
    successBg.fillStyle(0x28a745, 0.9);
    successBg.lineStyle(2, 0x1E7E34, 1);
    successBg.fillRoundedRect(50, 150, this.scene.scale.width - 100, 50, 8);
    successBg.strokeRoundedRect(50, 150, this.scene.scale.width - 100, 50, 8);
    this.contentContainer.add(successBg);
    
    // Success icon
    const successIcon = this.scene.add.text(70, 165, '✅', {
      fontSize: '20px'
    });
    this.contentContainer.add(successIcon);

    const successText = this.scene.add.text(100, 170, `Entry ${action} successfully!`, {
      fontSize: '16px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#FFFFFF',
      fontStyle: 'bold'
    });
    this.contentContainer.add(successText);
    
    // Show entry stats if available
    const today = new Date().toDateString();
    const entry = this.journalEntries[today];
    if (entry && entry.wordCount !== undefined) {
      const statsText = this.scene.add.text(100, 185, `${entry.wordCount} words, ${entry.characterCount} characters`, {
        fontSize: '12px',
        fontFamily: '"Nunito", sans-serif',
        fill: '#D4EDDA'
      });
      this.contentContainer.add(statsText);
    }
    
    // Fade out after 2 seconds
    this.scene.tweens.add({
      targets: [successBg, successIcon, successText],
      alpha: 0,
      duration: 500,
      delay: 1500,
      onComplete: () => {
        successBg.destroy();
        successIcon.destroy();
        successText.destroy();
      }
    });
  }

  createPerformanceTracker(startY) {
    const { width } = this.scene.scale;
    let yPos = startY;

    const header = this.scene.add.text(width / 2, yPos, 'Performance & Mood Tracker', {
      fontSize: '20px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.contentContainer.add(header);
    yPos += 40;

    const chartBg = this.scene.add.graphics();
    chartBg.fillStyle(0xFFFFFF, 1);
    chartBg.fillRoundedRect(30, yPos, width - 60, 280, 8);
    chartBg.lineStyle(1, 0xCED4DA, 1);
    chartBg.strokeRoundedRect(30, yPos, width - 60, 280, 8);
    this.contentContainer.add(chartBg);
    yPos += 10;

    const chartData = this.getMoodTrendData();
    this.drawMoodChart(chartData, 50, yPos + 20, width - 100, 160);
    
    // Removed redundant annotation input - now using the one in Today's Entry section

    return yPos + 100;
  }

  getMoodTrendData() {
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toDateString();
      const mood = this.moodData[dateKey] || 0;
      
      data.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        mood: mood,
        performance: this.getPerformanceForDate(date)
      });
    }
    
    return data;
  }

  getPerformanceForDate(date) {
    // Prefer performance captured with the journal entry for that day
    try {
      const dateKey = date.toDateString();
      const entry = this.journalEntries?.[dateKey];
      const snapAcc = entry?.performanceSnapshot?.accuracy;
      if (typeof snapAcc === 'number' && !Number.isNaN(snapAcc)) {
        // Accuracy is % (0-100). Map to 1-5 scale.
        return Math.min(5, Math.max(1, Math.round(snapAcc / 20)));
      }
    } catch (_) { /* fall through */ }

    // Fallback to current stats when snapshot isn't available
    const accuracy = (this.statsTracker && typeof this.statsTracker.getAccuracy === 'function')
      ? this.statsTracker.getAccuracy()
      : (this.statsTracker?.stats?.accuracy ?? 0);
    return Math.min(5, Math.max(1, Math.round((accuracy || 0) / 20)));
  }

  drawMoodChart(data, x, y, width, height) {
    const pointSpacing = width / (data.length - 1);

    // Build a geometry mask to strictly contain plotted elements within chart bounds
    const maskGfx = this.scene.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(x, y, width, height);
    const chartMask = new Phaser.Display.Masks.GeometryMask(this.scene, maskGfx);
    maskGfx.setVisible(false);

    // Draw horizontal grid lines (not masked so they align with the background box)
    for (let i = 1; i <= 5; i++) {
      const gridY = y + height - (i * height / 5);
      const gridLine = this.scene.add.line(0, 0, x, gridY, x + width, gridY, 0x333333);
      this.contentContainer.add(gridLine);
    }

    // Utility: clamp a point to chart bounds
    const clampX = (px) => Math.max(x, Math.min(x + width, px));
    const clampY = (py) => Math.max(y, Math.min(y + height, py));

    // Draw mood line and points
    const moodPoints = [];
    data.forEach((point, index) => {
      const rawX = x + (index * pointSpacing);
      const rawY = y + height - (point.mood * height / 5);
      const pointX = clampX(rawX);
      const pointY = clampY(rawY);
      moodPoints.push(pointX, pointY);

      // Mood point (masked)
      const moodPoint = this.scene.add.circle(pointX, pointY, 6, 0x007BFF);
      moodPoint.setMask(chartMask);
      this.contentContainer.add(moodPoint);

      // Day label (outside mask so it appears below the chart)
      const dayLabel = this.scene.add.text(pointX, y + height + 15, point.date, {
        fontSize: '12px',
        fontFamily: '"Nunito", sans-serif',
        fill: '#6C757D'
      }).setOrigin(0.5);
      this.contentContainer.add(dayLabel);
    });

    // Connect mood points with enhanced lines (masked)
    for (let i = 0; i < moodPoints.length - 2; i += 2) {
      const line = this.scene.add.line(0, 0,
        moodPoints[i], moodPoints[i + 1],
        moodPoints[i + 2], moodPoints[i + 3],
        0x007BFF
      );
      line.setLineWidth(3);
      line.setAlpha(0.8);
      line.setMask(chartMask);
      this.contentContainer.add(line);
    }

    // Optional second dataset: Performance line based on accuracy scaled to 1–5
    const perfPoints = [];
    data.forEach((point, index) => {
      // performance already mapped to 1–5 by getPerformanceForDate
      const rawX = x + (index * pointSpacing);
      const rawY = y + height - (point.performance * height / 5);
      const px = clampX(rawX);
      const py = clampY(rawY);
      perfPoints.push(px, py);

      const perfDot = this.scene.add.rectangle(px, py, 10, 10, 0x28a745, 1);
      perfDot.setOrigin(0.5);
      perfDot.setMask(chartMask);
      this.contentContainer.add(perfDot);
    });

    for (let i = 0; i < perfPoints.length - 2; i += 2) {
      const line = this.scene.add.line(0, 0,
        perfPoints[i], perfPoints[i + 1],
        perfPoints[i + 2], perfPoints[i + 3],
        0x28a745
      );
      line.setLineWidth(2.5);
      line.setAlpha(0.85);
      line.setMask(chartMask);
      this.contentContainer.add(line);
    }

    // Enhanced chart legend with professional styling
    const legend = this.scene.add.text(x, y - 30, 'Mood (blue) and Performance (green) — 1 to 5 scale', {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#495057',
      fontStyle: 'bold'
    });
    this.contentContainer.add(legend);
  }

  createAnnotationInput(yPos, width) {
    // Annotation input label - matching the existing header style
    const inputLabel = this.scene.add.text(50, yPos, 'Add Chart Annotation:', {
      fontSize: '16px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#000000',
      fontStyle: 'bold'
    });
    this.contentContainer.add(inputLabel);
    
    // Input field background - matching the journal entry style
    const inputBg = this.scene.add.graphics();
    inputBg.fillStyle(0xFFFFFF, 1);
    inputBg.lineStyle(1, 0xCED4DA, 1);
    inputBg.fillRoundedRect(50, yPos + 25, width - 160, 35, 8);
    inputBg.strokeRoundedRect(50, yPos + 25, width - 160, 35, 8);
    this.contentContainer.add(inputBg);
    
    // Placeholder text - matching the journal entry placeholder style
    this.annotationPlaceholder = this.scene.add.text(60, yPos + 42, 'Enter your thoughts about this trend...', {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#888888',
      fontStyle: 'italic'
    }).setOrigin(0, 0.5);
    this.contentContainer.add(this.annotationPlaceholder);
    
    // Input text (initially empty) - matching the journal entry text style
    this.annotationText = this.scene.add.text(60, yPos + 42, '', {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#000000'
    }).setOrigin(0, 0.5);
    this.contentContainer.add(this.annotationText);
    
    // Submit button - matching the tag button style
    const submitBtn = this.scene.add.graphics();
    submitBtn.fillStyle(0x3498db, 1);
    submitBtn.fillRoundedRect(width - 100, yPos + 25, 80, 35, 8);
    this.contentContainer.add(submitBtn);
    
    const submitText = this.scene.add.text(width - 60, yPos + 42, 'Submit', {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#FFFFFF',
      padding: { left: 10, right: 10, top: 5, bottom: 5 },
    }).setOrigin(0.5);
    this.contentContainer.add(submitText);
    
    // Make submit button interactive
    submitBtn.setInteractive(new Phaser.Geom.Rectangle(width - 100, yPos + 25, 80, 35), Phaser.Geom.Rectangle.Contains);
    submitText.setInteractive(new Phaser.Geom.Rectangle(width - 100, yPos + 25, 80, 35), Phaser.Geom.Rectangle.Contains);
    
    // Input field interaction
    const inputArea = this.scene.add.rectangle(50 + (width - 160) / 2, yPos + 42, width - 160, 35, 0x000000, 0);
    inputArea.setInteractive();
    this.contentContainer.add(inputArea);
    
    // Store current annotation input
    this.currentAnnotation = '';
    
    // Handle input field click
    inputArea.on('pointerdown', () => {
      this.activateAnnotationInput();
    });
    
    // Handle submit button click with hover effects - matching the tag button interaction
    const submitHandler = () => {
      this.submitAnnotation();
    };
    
    submitBtn.on('pointerdown', submitHandler);
    submitText.on('pointerdown', submitHandler);
    
    // Add hover effects - matching the tag button style
    submitBtn.on('pointerover', () => {
      submitBtn.clear();
      submitBtn.fillStyle(0x2980b9, 1);
      submitBtn.fillRoundedRect(width - 100, yPos + 25, 80, 35, 8);
    });
    
    submitBtn.on('pointerout', () => {
      submitBtn.clear();
      submitBtn.fillStyle(0x3498db, 1);
      submitBtn.fillRoundedRect(width - 100, yPos + 25, 80, 35, 8);
    });
  }

  activateAnnotationInput() {
    // Create HTML input overlay for better text input experience
    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.placeholder = 'Enter your thoughts about this trend...';
    inputElement.value = this.currentAnnotation;
    inputElement.style.position = 'absolute';
    inputElement.style.left = '50px';
    inputElement.style.top = '400px'; // Approximate position
    inputElement.style.width = `${this.scene.scale.width - 160}px`;
    inputElement.style.height = '35px';
    inputElement.style.fontSize = '12px';
    inputElement.style.fontFamily = '"Nunito", sans-serif';
    inputElement.style.border = '1px solid #CED4DA';
    inputElement.style.borderRadius = '4px';
    inputElement.style.padding = '8px';
    inputElement.style.zIndex = '1000';
    
    document.body.appendChild(inputElement);
    inputElement.focus();
    
    // Handle input changes
    inputElement.addEventListener('input', (e) => {
      this.currentAnnotation = e.target.value;
      this.updateAnnotationDisplay();
    });
    
    // Handle enter key and blur - fix removeChild error
    const cleanup = () => {
      // Check if element still exists and has a parent before removing
      if (inputElement && inputElement.parentNode) {
        inputElement.parentNode.removeChild(inputElement);
      }
      this.updateAnnotationDisplay();
    };
    
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        cleanup();
        this.submitAnnotation();
      }
    });
    
    inputElement.addEventListener('blur', cleanup);
  }

  updateAnnotationDisplay() {
    if (this.currentAnnotation.length > 0) {
      // Guard against undefined elements to avoid TypeError
      if (this.annotationPlaceholder && typeof this.annotationPlaceholder.setVisible === 'function') {
        this.annotationPlaceholder.setVisible(false);
      }
      if (this.annotationText && typeof this.annotationText.setText === 'function') {
        this.annotationText.setText(this.currentAnnotation);
      }
      if (this.annotationText && typeof this.annotationText.setVisible === 'function') {
        this.annotationText.setVisible(true);
      }
    } else {
      if (this.annotationPlaceholder && typeof this.annotationPlaceholder.setVisible === 'function') {
        this.annotationPlaceholder.setVisible(true);
      }
      if (this.annotationText && typeof this.annotationText.setVisible === 'function') {
        this.annotationText.setVisible(false);
      }
    }
  }

  submitAnnotation() {
    if (this.currentAnnotation.trim().length > 0) {
      // Save annotation with current date
      const today = new Date().toDateString();
      const annotations = this.loadAnnotations();
      
      if (!annotations[today]) {
        annotations[today] = [];
      }
      
      annotations[today].push({
        text: this.currentAnnotation.trim(),
        timestamp: Date.now()
      });
      
      this.saveAnnotations(annotations);
      
      // Clear input
      this.currentAnnotation = '';
      this.updateAnnotationDisplay();
      
      // Show success feedback
      this.showAnnotationSuccess();
    }
  }

  loadAnnotations() {
    try {
      return JSON.parse(localStorage.getItem('chartAnnotations') || '{}');
    } catch (e) {
      return {};
    }
  }

  saveAnnotations(annotations) {
    localStorage.setItem('chartAnnotations', JSON.stringify(annotations));
  }

  showAnnotationSuccess() {
    const successText = this.scene.add.text(this.scene.scale.width / 2, 300, 'Annotation saved!', {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#28A745',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.contentContainer.add(successText);
    
    // Fade out after 2 seconds
    this.scene.tweens.add({
      targets: successText,
      alpha: 0,
      duration: 2000,
      onComplete: () => {
        successText.destroy();
      }
    });
  }

  createCalendarView() {
    const { width } = this.scene.scale;
    let yPos = 180;

    // Month navigation
    const prevMonthBtn = this.scene.add.text(40, yPos, '<', { fontSize: '24px', fontFamily: '"Nunito", sans-serif', fill: '#000000' }).setInteractive();
    const nextMonthBtn = this.scene.add.text(width - 40, yPos, '>', { fontSize: '24px', fontFamily: '"Nunito", sans-serif', fill: '#000000' }).setOrigin(1, 0).setInteractive();

    prevMonthBtn.on('pointerdown', () => {
      this.selectedDate.setMonth(this.selectedDate.getMonth() - 1);
      this.updateView();
    });

    nextMonthBtn.on('pointerdown', () => {
      this.selectedDate.setMonth(this.selectedDate.getMonth() + 1);
      this.updateView();
    });

    const monthYear = this.selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const header = this.scene.add.text(width / 2, yPos, monthYear, {
      fontSize: '20px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.contentContainer.add([header, prevMonthBtn, nextMonthBtn]);
    yPos += 50;

    // Day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCellWidth = (width - 80) / 7;
    days.forEach((day, i) => {
      const dayLabel = this.scene.add.text(40 + (i * dayCellWidth) + (dayCellWidth / 2), yPos, day, {
        fontSize: '14px',
        fontFamily: '"Nunito", sans-serif',
        fill: '#888888',
      }).setOrigin(0.5);
      // Ensure day labels are contained within the Journal panel
      this.contentContainer.add(dayLabel);
    });
    yPos += 30;

    // Calendar grid
    const firstDay = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), 1);
    const lastDay = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const col = i % 7;
      const row = Math.floor(i / 7);
      const x = 40 + (col * dayCellWidth) + (dayCellWidth / 2);
      const y = yPos + (row * 50);

      const dayText = this.scene.add.text(x, y, date.getDate(), {
        fontSize: '16px',
        fontFamily: '"Nunito", sans-serif',
        fill: date.getMonth() === this.selectedDate.getMonth() ? '#000000' : '#CED4DA',
      }).setOrigin(0.5);

      const dateKey = date.toDateString();
      const mood = this.moodData[dateKey];
      if (mood) {
        const moodColors = [0, 0xDEE2E6, 0xCED4DA, 0xADB5BD, 0x868E96, 0x495057];
        const moodIndicator = this.scene.add.circle(x, y, 18, moodColors[mood], 0.5);
        this.contentContainer.add(moodIndicator);
      }

      if (date.toDateString() === new Date().toDateString()) {
        const todayCircle = this.scene.add.graphics();
        todayCircle.lineStyle(2, 0x3498db, 1);
        todayCircle.strokeCircle(x, y, 18);
        this.contentContainer.add(todayCircle);
      }

      this.contentContainer.add(dayText);
    }

    this.maxScrollY = 0;
  }

  createEntriesView() {
    const { width } = this.scene.scale;
    let yPos = 180;

    const entries = Object.entries(this.journalEntries);

    if (entries.length === 0) {
      const emptyText = this.scene.add.text(width / 2, yPos + 100, 'No journal entries yet.\nStart writing in the Today tab!', {
        fontSize: '18px',
        fontFamily: '"Nunito", sans-serif',
        fill: '#868E96',
        align: 'center',
      }).setOrigin(0.5);
      // Ensure placeholder message is scoped to the Journal panel
      this.contentContainer.add(emptyText);
      this.maxScrollY = 0;
      return;
    }

    entries.reverse().forEach(([dateKey, entry]) => {
      const cardHeight = 180; // Increased height for action buttons
      const card = this.scene.add.graphics();
      card.fillStyle(0xFFFFFF, 1);
      card.lineStyle(1, 0xDEE2E6, 1);
      card.fillRoundedRect(30, yPos, width - 60, cardHeight, 15);
      card.strokeRoundedRect(30, yPos, width - 60, cardHeight, 15);
      this.contentContainer.add(card);

      const date = new Date(dateKey);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const dateText = this.scene.add.text(50, yPos + 20, dateStr, {
        fontSize: '16px',
        fontFamily: '"Nunito", sans-serif',
        fill: '#495057',
        fontStyle: 'bold',
      });
      this.contentContainer.add(dateText);

      const mood = this.moodData[dateKey];
      if (mood) {
        const moodEmojis = ['', '😢', '😐', '🙂', '😊', '🤩'];
        const moodIcon = this.scene.add.text(width - 70, yPos + 20, moodEmojis[mood], { fontSize: '24px' }).setOrigin(0.5);
        this.contentContainer.add(moodIcon);
      }

      const preview = entry.text ? entry.text.substring(0, 100) + (entry.text.length > 100 ? '...' : '') : 'No content';
      const entryText = this.scene.add.text(50, yPos + 50, preview, {
        fontSize: '14px',
        fontFamily: '"Nunito", sans-serif',
        fill: '#495057',
        wordWrap: { width: width - 100 },
      });
      this.contentContainer.add(entryText);

      // Entry metadata
      if (entry.wordCount !== undefined) {
        const metaText = `${entry.wordCount} words • ${entry.characterCount} chars`;
        const metadata = this.scene.add.text(50, yPos + 90, metaText, {
          fontSize: '12px',
          fontFamily: '"Nunito", sans-serif',
          fill: '#6C757D',
          fontStyle: 'italic'
        });
        this.contentContainer.add(metadata);
      }

      if (entry.tags && entry.tags.length > 0) {
        const tagsText = entry.tags.map(tag => `#${tag}`).join(' ');
        const tagsDisplay = this.scene.add.text(50, yPos + 110, tagsText, {
          fontSize: '12px',
          fontFamily: '"Nunito", sans-serif',
          fill: '#007BFF',
          fontStyle: 'italic',
        });
        this.contentContainer.add(tagsDisplay);
      }

      // Action buttons
      this.createEntryActionButtons(dateKey, entry, yPos + cardHeight - 40, width);

      yPos += cardHeight + 20;
    });

    this.maxScrollY = Math.max(0, yPos - this.scene.scale.height + 100);
  }

  // Create action buttons for each entry (Edit, Delete)
  createEntryActionButtons(dateKey, entry, yPos, screenWidth) {
    const buttonWidth = 80;
    const buttonHeight = 30;
    const buttonSpacing = 10;
    const startX = screenWidth - 200;

    // Edit button
    const editBg = this.scene.add.graphics();
    editBg.fillStyle(0x007BFF, 1);
    editBg.fillRoundedRect(startX, yPos, buttonWidth, buttonHeight, 6);
    this.contentContainer.add(editBg);

    const editText = this.scene.add.text(startX + buttonWidth/2, yPos + buttonHeight/2, 'Edit', {
      fontSize: '12px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.contentContainer.add(editText);

    // Make edit button interactive
    editBg.setInteractive(new Phaser.Geom.Rectangle(startX, yPos, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
    editBg.on('pointerdown', () => {
      this.editEntry(dateKey, entry);
    });

    // Delete button
    const deleteBg = this.scene.add.graphics();
    deleteBg.fillStyle(0xDC3545, 1);
    deleteBg.fillRoundedRect(startX + buttonWidth + buttonSpacing, yPos, buttonWidth, buttonHeight, 6);
    this.contentContainer.add(deleteBg);

    const deleteText = this.scene.add.text(startX + buttonWidth + buttonSpacing + buttonWidth/2, yPos + buttonHeight/2, 'Delete', {
      fontSize: '12px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.contentContainer.add(deleteText);

    // Make delete button interactive
    deleteBg.setInteractive(new Phaser.Geom.Rectangle(startX + buttonWidth + buttonSpacing, yPos, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
    deleteBg.on('pointerdown', () => {
      this.confirmDeleteEntry(dateKey, entry);
    });

    // Hover effects
    editBg.on('pointerover', () => {
      editBg.clear();
      editBg.fillStyle(0x0056B3, 1);
      editBg.fillRoundedRect(startX, yPos, buttonWidth, buttonHeight, 6);
    });

    editBg.on('pointerout', () => {
      editBg.clear();
      editBg.fillStyle(0x007BFF, 1);
      editBg.fillRoundedRect(startX, yPos, buttonWidth, buttonHeight, 6);
    });

    deleteBg.on('pointerover', () => {
      deleteBg.clear();
      deleteBg.fillStyle(0xC82333, 1);
      deleteBg.fillRoundedRect(startX + buttonWidth + buttonSpacing, yPos, buttonWidth, buttonHeight, 6);
    });

    deleteBg.on('pointerout', () => {
      deleteBg.clear();
      deleteBg.fillStyle(0xDC3545, 1);
      deleteBg.fillRoundedRect(startX + buttonWidth + buttonSpacing, yPos, buttonWidth, buttonHeight, 6);
    });
  }

  // Edit entry functionality
  editEntry(dateKey, entry) {
    // Switch to Today tab and populate with existing entry
    this.currentView = 'today';
    this.editingDateKey = dateKey; // Store which entry we're editing
    this.currentTodayEntry = entry.text || '';
    this.cursorPosition = this.currentTodayEntry.length;
    
    this.updateNavigationTabs();
    this.updateView();
    
    // Show edit mode indicator
    this.showEditModeIndicator(dateKey);
  }

  // Show indicator that we're in edit mode
  showEditModeIndicator(dateKey) {
    const date = new Date(dateKey);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const editIndicator = this.scene.add.container(0, 0);
    this.contentContainer.add(editIndicator);

    const { width } = this.scene.scale;
    const indicatorBg = this.scene.add.graphics();
    indicatorBg.fillStyle(0x17A2B8, 0.9); // Info blue background
    indicatorBg.lineStyle(2, 0x138496, 1);
    indicatorBg.fillRoundedRect(30, 80, width - 60, 40, 8);
    indicatorBg.strokeRoundedRect(30, 80, width - 60, 40, 8);
    editIndicator.add(indicatorBg);

    const editIcon = this.scene.add.text(50, 95, '✏️', {
      fontSize: '18px'
    });
    editIndicator.add(editIcon);

    const editText = this.scene.add.text(80, 100, `Editing entry from ${dateStr}`, {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#FFFFFF',
      fontStyle: 'bold'
    });
    editIndicator.add(editText);

    // Store reference for cleanup
    this.editModeIndicator = editIndicator;
  }

  // Confirm delete entry with modal
  confirmDeleteEntry(dateKey, entry) {
    const date = new Date(dateKey);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    
    // Create confirmation modal
    const modalContainer = this.scene.add.container(0, 0);
    modalContainer.setDepth(15000); // Above panels but below profile
    this.container.add(modalContainer);

    const { width, height } = this.scene.scale;
    
    // Semi-transparent overlay
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    modalContainer.add(overlay);

    // Modal background
    const modalBg = this.scene.add.graphics();
    modalBg.fillStyle(0xFFFFFF, 1);
    modalBg.lineStyle(2, 0xDEE2E6, 1);
    modalBg.fillRoundedRect(width / 2 - 150, height / 2 - 100, 300, 200, 15);
    modalBg.strokeRoundedRect(width / 2 - 150, height / 2 - 100, 300, 200, 15);
    modalContainer.add(modalBg);

    // Warning icon
    const warningIcon = this.scene.add.text(width / 2, height / 2 - 60, '⚠️', {
      fontSize: '32px'
    }).setOrigin(0.5);
    modalContainer.add(warningIcon);

    // Title
    const title = this.scene.add.text(width / 2, height / 2 - 20, 'Delete Entry?', {
      fontSize: '18px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#495057',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    modalContainer.add(title);

    // Message
    const message = this.scene.add.text(width / 2, height / 2 + 10, `This will permanently delete your entry from ${dateStr}`, {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#6C757D',
      align: 'center',
      wordWrap: { width: 260 }
    }).setOrigin(0.5);
    modalContainer.add(message);

    // Cancel button
    const cancelBg = this.scene.add.graphics();
    cancelBg.fillStyle(0x6C757D, 1);
    cancelBg.fillRoundedRect(width / 2 - 120, height / 2 + 50, 80, 35, 6);
    modalContainer.add(cancelBg);

    const cancelText = this.scene.add.text(width / 2 - 80, height / 2 + 67.5, 'Cancel', {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    modalContainer.add(cancelText);

    // Delete button
    const deleteBg = this.scene.add.graphics();
    deleteBg.fillStyle(0xDC3545, 1);
    deleteBg.fillRoundedRect(width / 2 + 40, height / 2 + 50, 80, 35, 6);
    modalContainer.add(deleteBg);

    const deleteText = this.scene.add.text(width / 2 + 80, height / 2 + 67.5, 'Delete', {
      fontSize: '14px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    modalContainer.add(deleteText);

    // Make buttons interactive
    cancelBg.setInteractive(new Phaser.Geom.Rectangle(width / 2 - 120, height / 2 + 50, 80, 35), Phaser.Geom.Rectangle.Contains);
    cancelBg.on('pointerdown', () => {
      modalContainer.destroy();
    });

    deleteBg.setInteractive(new Phaser.Geom.Rectangle(width / 2 + 40, height / 2 + 50, 80, 35), Phaser.Geom.Rectangle.Contains);
    deleteBg.on('pointerdown', () => {
      this.deleteEntry(dateKey);
      modalContainer.destroy();
    });

    // Hover effects
    cancelBg.on('pointerover', () => {
      cancelBg.clear();
      cancelBg.fillStyle(0x5A6268, 1);
      cancelBg.fillRoundedRect(width / 2 - 120, height / 2 + 50, 80, 35, 6);
    });

    cancelBg.on('pointerout', () => {
      cancelBg.clear();
      cancelBg.fillStyle(0x6C757D, 1);
      cancelBg.fillRoundedRect(width / 2 - 120, height / 2 + 50, 80, 35, 6);
    });

    deleteBg.on('pointerover', () => {
      deleteBg.clear();
      deleteBg.fillStyle(0xC82333, 1);
      deleteBg.fillRoundedRect(width / 2 + 40, height / 2 + 50, 80, 35, 6);
    });

    deleteBg.on('pointerout', () => {
      deleteBg.clear();
      deleteBg.fillStyle(0xDC3545, 1);
      deleteBg.fillRoundedRect(width / 2 + 40, height / 2 + 50, 80, 35, 6);
    });
  }

  // Delete entry with data integrity checks
  deleteEntry(dateKey) {
    try {
      // Validate data integrity before deletion
      const integrityCheck = this.validateDataIntegrity();
      if (!integrityCheck.isValid) {
        this.showErrorFeedback(['Cannot delete entry: ' + integrityCheck.errors.join(', ')]);
        return;
      }

      // Check if entry exists
      if (!this.journalEntries[dateKey]) {
        this.showErrorFeedback(['Entry not found or already deleted']);
        return;
      }

      // Create backup before deletion
      const backupKey = `deleted_entry_${dateKey}_${Date.now()}`;
      const entryBackup = {
        dateKey: dateKey,
        entry: { ...this.journalEntries[dateKey] },
        deletedAt: new Date().toISOString()
      };
      localStorage.setItem(backupKey, JSON.stringify(entryBackup));

      // Delete the entry
      delete this.journalEntries[dateKey];
      
      // Also delete associated mood data
      if (this.moodData[dateKey]) {
        delete this.moodData[dateKey];
        this.saveMoodData();
      }

      // Save changes
      this.saveJournalEntriesWithValidation();

      // Show success feedback
      this.showDeleteSuccess(dateKey);

      // Refresh the view
      setTimeout(() => {
        this.updateView();
      }, 1000);

    } catch (error) {
      console.error('Error deleting entry:', error);
      this.showErrorFeedback(['Failed to delete entry. Please try again.']);
    }
  }

  // Show delete success feedback
  showDeleteSuccess(dateKey) {
    const date = new Date(dateKey);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const successBg = this.scene.add.graphics();
    successBg.fillStyle(0x28a745, 0.9);
    successBg.lineStyle(2, 0x1E7E34, 1);
    successBg.fillRoundedRect(50, 150, this.scene.scale.width - 100, 50, 8);
    successBg.strokeRoundedRect(50, 150, this.scene.scale.width - 100, 50, 8);
    this.contentContainer.add(successBg);
    
    const successIcon = this.scene.add.text(70, 165, '🗑️', {
      fontSize: '20px'
    });
    this.contentContainer.add(successIcon);

    const successText = this.scene.add.text(100, 175, `Entry from ${dateStr} deleted successfully`, {
      fontSize: '16px',
      fontFamily: '"Nunito", sans-serif',
      fill: '#FFFFFF',
      fontStyle: 'bold'
    });
    this.contentContainer.add(successText);
    
    // Fade out after 2 seconds
    this.scene.tweens.add({
      targets: [successBg, successIcon, successText],
      alpha: 0,
      duration: 500,
      delay: 1500,
      onComplete: () => {
        successBg.destroy();
        successIcon.destroy();
        successText.destroy();
      }
    });
  }

  setupScrolling() {
    const { height } = this.scene.scale;
    
    // Remove any existing wheel event listener to prevent conflicts
    if (this.journalScrollHandler) {
      this.scene.input.off('wheel', this.journalScrollHandler);
    }
    
    this.journalScrollHandler = (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.visible) return;
      
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, this.maxScrollY);
      this.contentContainer.y = -this.scrollY;
    };
    
    // Use WheelEventManager instead of direct wheel event listener
    if (this.wheelEventManager) {
      this.wheelEventManager.unregisterHandler('journalScroll');
      this.wheelEventManager.registerHandler('journalScroll', this.journalScrollHandler);
    }
  }

  show() {
    this.visible = true;
    if (!this.container) {
      console.warn('JournalPanel: Container not initialized in show()');
      return;
    }
    this.container.setVisible(true).setAlpha(0);
    if (this.clickBlocker && typeof this.clickBlocker.setVisible === 'function') {
      this.clickBlocker.setVisible(true); // Show click blocker
    }
    
    // Hide debug buttons to prevent overlay conflicts
    if (this.scene.toggleDebugButtons) {
      this.scene.toggleDebugButtons(false);
    }
    
    this.scene.tweens.add({ 
      targets: this.container, 
      alpha: 1, 
      duration: 300, 
      ease: 'Power2' 
    });
    
    // Update date display
    const dateStr = this.selectedDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    this.dateText.setText(dateStr);
  }

  hide() {
    this.visible = false;
    // Guard against undefined clickBlocker to avoid TypeError when panel hides
    if (this.clickBlocker && typeof this.clickBlocker.setVisible === 'function') {
      this.clickBlocker.setVisible(false); // Hide click blocker
    }
    
    // Unregister wheel handler when hiding
    if (this.wheelEventManager) {
      this.wheelEventManager.unregisterHandler('journalScroll');
    }
    
    // Show debug buttons again when journal closes
    if (this.scene.toggleDebugButtons) {
      this.scene.toggleDebugButtons(true);
    }
    
    // Kill any existing tweens on this container to prevent race conditions
    this.scene.tweens.killTweensOf(this.container);
    
    this.scene.tweens.add({ 
      targets: this.container, 
      alpha: 0, 
      duration: 200, 
      onComplete: () => {
        // Additional safety check: ensure container still exists and hasn't been destroyed
        if (this.container && this.container.scene && typeof this.container.setVisible === 'function') {
          this.container.setVisible(false);
        }
      }
    });
  }

  isVisible() { 
    return this.visible && this.container && this.container.visible; 
  }
}

/* ---------------------- GamesPanel ---------------------- */
class GamesPanel {
  constructor(scene, statsTracker) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.wheelEventManager = scene.uiManager?.wheelEventManager;
    this.visible = false;
    this.scrollHandler = null;
    this.totalContentHeight = 0;
    this.container = null;
    this.scrollContainer = null;
    this.createPanel();
  }

  destroy() {
    if (this.wheelEventManager) {
      this.wheelEventManager.unregisterHandler('gamesScroll');
    }
    this.scrollHandler = null;
    this.container?.destroy();
    this.scrollContainer?.destroy();
    this.container = null;
    this.scrollContainer = null;
    this.visible = false;
  }

  createPanel() {
    const { width, height } = this.scene.sys.game.config;
    this.safeBottomPadding = 140; 

    this.container = this.scene.add.container(0, 0).setDepth(4000).setVisible(false);
    this.scrollContainer = this.scene.add.container(0, 0);

    const bg = this.scene.add.graphics();
    bg.fillGradientStyle(0x0c0114, 0x0c0114, 0x1a0238, 0x1a0238, 1).fillRect(0, 0, width, height);
    
    const inputBlocker = this.scene.add.graphics();
    inputBlocker.fillStyle(0x000000, 0);
    inputBlocker.fillRect(0, 0, width, height);
    inputBlocker.setInteractive();
    
    this.container.add(inputBlocker);
    this.container.add(bg);

    const headerContainer = this.scene.add.container(0, 0);
    const closeBtn = this.scene.add.text(width - 30, 30, '×', { fontFamily: 'Arial, sans-serif', fontSize: '32px', color: '#ffffff' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());

    const title = this.scene.add.text(width / 2, 50, '🎮 PSYCHIC GAMES ARCADE', {
      fontFamily: '"Arial Black", Arial, sans-serif', fontSize: '24px', color: '#00e5ff', fontStyle: 'bold',
      shadow: { color: '#00e5ff', blur: 10, stroke: true, fill: true }
    }).setOrigin(0.5);

    const subtitle = this.scene.add.text(width / 2, 75, 'Choose Your Psychic Challenge', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#c9c9c9', fontStyle: 'italic'
    }).setOrigin(0.5);

    headerContainer.add([closeBtn, title, subtitle]);

    const stats = this.statsTracker.getStats();
    const maxLevel = stats.psychicLevel;

    const basicGames = [
      { level: 1, name: 'Coin Flip Oracle', emoji: '🪙', description: 'Master the ancient art of coin divination', difficulty: 'Beginner', color: 0x4169e1 },
      { level: 2, name: "Schrödinger's Mystery", emoji: '🐈', description: 'Solve the quantum cat puzzle', difficulty: 'Novice', color: 0x9932cc }
    ];
    const advancedGames = [
      { level: 4, name: 'Mystic Tetrahedron', emoji: '🔮', description: 'Command the 4-sided sacred geometry', difficulty: 'Adept', color: 0x8b008b },
      { level: 5, name: 'Pentagon Portal', emoji: '💎', description: 'Unlock the secrets of 5-dimensional space', difficulty: 'Expert', color: 0x4b0082 },
      { level: 6, name: 'Hexagon Harmony', emoji: '👑', description: 'Achieve mastery over the perfect cube', difficulty: 'Master', color: 0x2e0854 }
    ];
    const intuitiveGames = [
      { level: 3, name: 'Emotional Intuition', emoji: '🧘', description: 'Sense the emotional energy of an unseen image.', difficulty: 'Transcendent', color: 0x48D1CC }
    ];

    let currentY = 120;

    // Move OVERALL PROGRESS to the top of the Games page, just below the header
    this.createStatsOverview(currentY);
    currentY += 150;

    const section = (titleText, glowColor, bgGrad, strokeColor) => {
      const t = this.scene.add.text(width / 2, currentY, titleText, {
        fontFamily: '"Arial Black", Arial, sans-serif', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
        shadow: { color: glowColor, blur: 12, stroke: true, fill: true }
      }).setOrigin(0.5);

      const g = this.scene.add.graphics();
      g.fillGradientStyle(...bgGrad, 0.8).fillRoundedRect(width / 2 - 180, currentY - 20, 360, 40, 20);
      g.lineStyle(3, strokeColor, 0.8).strokeRoundedRect(width / 2 - 180, currentY - 20, 360, 40, 20);
      const g2 = this.scene.add.graphics();
      g2.fillGradientStyle(strokeColor, strokeColor, strokeColor, strokeColor, 0.4);
      g2.fillTriangle(width / 2 - 200, currentY, width / 2 - 185, currentY - 10, width / 2 - 185, currentY + 10);
      const g3 = this.scene.add.graphics();
      g3.fillGradientStyle(strokeColor, strokeColor, strokeColor, strokeColor, 0.4);
      g3.fillTriangle(width / 2 + 200, currentY, width / 2 + 185, currentY - 10, width / 2 + 185, currentY + 10);

      this.scrollContainer.add([g, t, g2, g3]);
      currentY += 30;
    };

    section('🌟 BASIC TRAINING', '#00e5ff', [0x003366, 0x001a33, 0x004d7a, 0x002952], 0x00e5ff);
    basicGames.forEach(ld => { this.createEnhancedLevelCard(ld, currentY + 80, ld.level <= maxLevel); currentY += 180; });

    currentY += 25;
    section('🧘 INTUITIVE ARTS', '#48D1CC', [0x004242, 0x002121, 0x006666, 0x003333], 0x48D1CC);
    intuitiveGames.forEach(ld => { this.createEnhancedLevelCard(ld, currentY + 80, ld.level <= maxLevel); currentY += 180; });

    // Separator between Intuitive Arts and Advanced Mastery
    currentY += 4;
    const sep = this.scene.add.graphics();
    sep.fillGradientStyle(0x8a2be2, 0x4b0082, 0x8a2be2, 0x4b0082, 0.6).fillRoundedRect(width / 2 - 150, currentY - 10, 300, 4, 2);
    const sepGlow = this.scene.add.graphics();
    sepGlow.lineStyle(2, 0x8a2be2, 0.4).strokeRoundedRect(width / 2 - 152, currentY - 12, 304, 8, 4).setBlendMode(Phaser.BlendModes.ADD);
    this.scrollContainer.add([sep, sepGlow]);
    currentY += 5;

    section('⚡ ADVANCED MASTERY', '#ff6b35', [0x664400, 0x331a00, 0x995500, 0x4d2200], 0xff6b35);
    advancedGames.forEach(ld => { this.createEnhancedLevelCard(ld, currentY + 80, ld.level <= maxLevel); currentY += 180; });

    // OVERALL PROGRESS moved to the top; remove the lower separator and duplicate overview

    const bottomSpacer = this.scene.add.rectangle(width / 2, currentY + (this.safeBottomPadding / 2), width, this.safeBottomPadding, 0x000000, 0);
    this.scrollContainer.add(bottomSpacer);
    currentY += this.safeBottomPadding;

    this.totalContentHeight = currentY;
    
    this.container.add(this.scrollContainer);
    this.container.add(headerContainer);
    
    this.setupScrolling();
    this.hide();
  }

  createEnhancedLevelCard(levelData, y, isUnlocked) {
    const { width } = this.scene.sys.game.config;
    const container = this.scene.add.container(width / 2, y);
    container.setDepth(1);

    const cardBg = this.scene.add.graphics();
    if (isUnlocked) {
      cardBg.fillGradientStyle(levelData.color, levelData.color, 0x1a0238, 0x1a0238, 0.8);
      cardBg.fillRoundedRect(-170, -80, 340, 160, 20);
      cardBg.lineStyle(3, levelData.color, 0.8).strokeRoundedRect(-170, -80, 340, 160, 20);
      cardBg.lineStyle(1, 0xffffff, 0.3).strokeRoundedRect(-168, -78, 336, 156, 18);
    } else {
      cardBg.fillStyle(0x1a1a1a, 0.6).fillRoundedRect(-170, -80, 340, 160, 20);
      cardBg.lineStyle(2, 0x444444, 0.8).strokeRoundedRect(-170, -80, 340, 160, 20);
    }

    const levelBadge = this.scene.add.graphics();
    const badgeColor = isUnlocked ? levelData.color : 0x444444;
    levelBadge.fillStyle(badgeColor, 1).fillCircle(-140, -60, 15);
    levelBadge.lineStyle(2, 0xffffff, 0.8).strokeCircle(-140, -60, 15);
    const levelNumber = this.scene.add.text(-140, -60, String(levelData.level), {
      fontFamily: '"Arial Black", Arial, sans-serif', fontSize: '16px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    const gameIcon = this.scene.add.text(-140, 0, levelData.emoji, { fontFamily: 'Arial, sans-serif', fontSize: '40px', alpha: isUnlocked ? 1 : 0.4 }).setOrigin(0.5);

    const gameName = this.scene.add.text(-90, -60, levelData.name, {
      fontFamily: '"Arial Black", Arial, sans-serif', fontSize: '20px', color: isUnlocked ? '#ffffff' : '#666666', fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    const difficulty = this.scene.add.text(-90, -40, `⚡ ${levelData.difficulty}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: isUnlocked ? levelData.color : '#666666', fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    const description = this.scene.add.text(-90, -5, levelData.description, {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: isUnlocked ? '#c9c9c9' : '#444444', wordWrap: { width: 200 }
    }).setOrigin(0, 0.5);

    container.add([cardBg, levelBadge, levelNumber, gameIcon, gameName, difficulty, description]);

    if (isUnlocked) {
      const levelStats = this.statsTracker.getStatsForLevel(levelData.level - 1) || {};
      const accuracy = levelStats.accuracy || 0;
      const predictions = levelStats.predictions || 0;
      const bestStreak = levelStats.bestStreak || 0;

      const statsContainer = this.scene.add.container(50, 15);
      const accuracyText = this.scene.add.text(0, 0, `🎯 ${accuracy.toFixed(1)}%`, { fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#00ff00', fontStyle: 'bold' }).setOrigin(0, 0.5);
      const playsText = this.scene.add.text(0, 15, `🎮 ${predictions} plays`, { fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#00e5ff', fontStyle: 'bold' }).setOrigin(0, 0.5);
      const streakText = this.scene.add.text(0, 30, `🔥 ${bestStreak} streak`, { fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#ffaa00', fontStyle: 'bold' }).setOrigin(0, 0.5);
      statsContainer.add([accuracyText, playsText, streakText]);

      const playButton = this.scene.add.graphics();
      playButton.fillStyle(0x00ff00, 0.8).fillRoundedRect(80, -35, 60, 25, 12);
      playButton.lineStyle(2, 0x00ff00, 1).strokeRoundedRect(80, -35, 60, 25, 12);
      const playText = this.scene.add.text(110, -22, 'PLAY', { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

      container.add([statsContainer, playButton, playText]);

      container.setInteractive(new Phaser.Geom.Rectangle(-170, -80, 340, 160), Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
      container.on('pointerdown', () => {
        this.scene.playSound?.('button_ambience');
        this.scene.setActiveLevel?.(levelData.level);
        this.hide();
        this.scene.startNewRound?.();
      });

      container.on('pointerover', () => {
        this.scene.playSound?.('button_hover_click', { volume: 0.3 });
        this.scene.tweens.add({ targets: container, scale: 1.02, duration: 200, ease: 'Power2' });
        cardBg.clear();
        cardBg.fillGradientStyle(levelData.color, levelData.color, 0x1a0238, 0x1a0238, 0.9).fillRoundedRect(-170, -80, 340, 160, 20);
        cardBg.lineStyle(4, levelData.color, 1).strokeRoundedRect(-170, -80, 340, 160, 20);
      });

      container.on('pointerout', () => {
        this.scene.tweens.add({ targets: container, scale: 1, duration: 200, ease: 'Power2' });
        cardBg.clear();
        cardBg.fillGradientStyle(levelData.color, levelData.color, 0x1a0238, 0x1a0238, 0.8).fillRoundedRect(-170, -80, 340, 160, 20);
        cardBg.lineStyle(3, levelData.color, 0.8).strokeRoundedRect(-170, -80, 340, 160, 20);
      });
    } else {
      const lockIcon = this.scene.add.text(120, 0, '🔒', { fontFamily: 'Arial, sans-serif', fontSize: '24px', alpha: 0.6 }).setOrigin(0.5);
      const unlockText = this.scene.add.text(120, 25, `Reach Level ${levelData.level}`, { fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#666666', align: 'center' }).setOrigin(0.5);
      container.add([lockIcon, unlockText]);
    }

    this.scrollContainer.add(container);
  }

  createStatsOverview(y) {
    const { width } = this.scene.sys.game.config;
    const stats = this.statsTracker.getStats();

    const overviewContainer = this.scene.add.container(width / 2, y + 50);
    const overviewBg = this.scene.add.graphics();
    overviewBg.fillGradientStyle(0x2d0b4b, 0x1a0733, 0x4b1373, 0x2d0b4b, 0.8).fillRoundedRect(-150, -40, 300, 80, 15);
    overviewBg.lineStyle(2, 0x8a2be2, 0.9).strokeRoundedRect(-150, -40, 300, 80, 15);
    overviewBg.lineStyle(1, 0xaa88ff, 0.4).strokeRoundedRect(-148, -38, 296, 76, 13);

    const cornerAccents = this.scene.add.graphics();
    cornerAccents.fillStyle(0xffaa00, 0.6);
    cornerAccents.fillCircle(-135, -25, 3);
    cornerAccents.fillCircle(135, -25, 3);
    cornerAccents.fillCircle(-135, 25, 3);
    cornerAccents.fillCircle(135, 25, 3);

    const overviewTitle = this.scene.add.text(0, -25, '🏆 OVERALL PROGRESS', {
      fontFamily: '"Arial Black", Arial, sans-serif', fontSize: '16px', color: '#ffaa00', fontStyle: 'bold'
    }).setOrigin(0.5);

    const totalStats = this.scene.add.text(0, -5, `Total Games: ${stats.totalRolls} | Accuracy: ${stats.accuracy.toFixed(1)}%`, {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#ffffff'
    }).setOrigin(0.5);

    const zenScore = this.scene.calculateZenScore(stats);
    const zenText = this.scene.add.text(0, 15, `Q-Score: ${zenScore.toFixed(1)} | Best Streak: ${stats.bestStreak}`, {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#00e5ff', fontStyle: 'bold'
    }).setOrigin(0.5);

    overviewContainer.add([overviewBg, cornerAccents, overviewTitle, totalStats, zenText]);
    this.scrollContainer.add(overviewContainer);
  }

  setupScrolling() {
    const { height } = this.scene.sys.game.config;
    const safePad = this.safeBottomPadding || 100;
    const visibleHeight = height - safePad;
    const contentHeight = this.totalContentHeight || (this.scrollContainer?.getBounds()?.height || 0);

    if (contentHeight > visibleHeight) {
      if (this.wheelEventManager) {
        this.wheelEventManager.unregisterHandler('gamesScroll');
      }
      
      this.scrollHandler = (pointer, gameObjects, deltaX, deltaY) => {
        if (this.isVisible()) {
          const scrollSpeed = 30;
          const currentY = this.scrollContainer.y;
          const minY = -(contentHeight - visibleHeight);
          const maxY = 0;
          
          const newY = Phaser.Math.Clamp(currentY - (deltaY * scrollSpeed / 100), minY, maxY);
          this.scrollContainer.setY(newY);
        }
      };
      
      if (this.wheelEventManager) {
        this.wheelEventManager.registerHandler('gamesScroll', this.scrollHandler, this);
      }
    }
  }

  show() {
    if (!this.container) {
      this.createPanel();
    }
    this.container.setVisible(true);
    this.visible = true;
    this.scrollContainer.y = 0;
    // Recompute and ensure wheel handler is bound when shown
    this.setupScrolling();
  }

  hide() {
    this.visible = false;
    if (this.container) {
      this.container.setVisible(false);
    }
  }

  isVisible() { 
    return this.visible;
  }
}