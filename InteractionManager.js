export class InteractionManager {
  constructor(scene, onMenuInteractionChange = null) {
    this.scene = scene;
    this.interactionsEnabled = true;
    this.onMenuInteractionChange = onMenuInteractionChange;
  }
  updateInteractions() {
    // Enable/disable interactions based on game state and panel states
    const gameState = this.scene.gameState;
    
    // Check if any panels are open
    const isAnyPanelOpen = this.isAnyPanelOpen();
    
    switch (gameState) {
      case 'predicting':
        // Allow interactions only if no panels are open
        this.interactionsEnabled = !isAnyPanelOpen;
        break;
      case 'rolling':
      case 'showing':
        this.interactionsEnabled = false;
        break;
      case 'breathing':
        this.interactionsEnabled = false;
        break;
      case 'waiting':
        this.interactionsEnabled = !isAnyPanelOpen;
        break;
      default:
        this.interactionsEnabled = !isAnyPanelOpen;
        break;
    }
    
    // Update UI elements based on interaction state
    this.updateUIInteractions();
  }
  
  isAnyPanelOpen() {
    // Check various panel states
    const uiManager = this.scene.uiManager;
    if (!uiManager) return false;
    
    // Check menu manager panels
    if (uiManager.menuManager && (
      uiManager.menuManager.menuOpen || 
      uiManager.menuManager.profileOpen || 
      uiManager.menuManager.binauralOpen ||
      uiManager.menuManager.journalOpen
    )) {
      return true;
    }
    
    // Check bottom menu panels
    if (uiManager.bottomMenuManager && uiManager.bottomMenuManager.currentPanel && 
        typeof uiManager.bottomMenuManager.currentPanel.isVisible === 'function' &&
        uiManager.bottomMenuManager.currentPanel.isVisible()) {
      return true;
    }
    
    // Check profile manager
    if (uiManager.profileManager && uiManager.profileManager.isOpen()) {
      return true;
    }
    
    // Check binaural panel
    if (uiManager.binauralPanelManager && uiManager.binauralPanelManager.isOpen) {
      return true;
    }
    
    // Check journal manager
    if (uiManager.journalManager && uiManager.journalManager.journalOpen) {
      return true;
    }
    
    return false;
  }
  updateUIInteractions() {
    // Update prediction system interactions
    if (this.scene.predictionSystem) {
      if (this.interactionsEnabled && this.scene.gameState === 'predicting') {
        // Check if enableInteractions method exists before calling
        if (typeof this.scene.predictionSystem.enableInteractions === 'function') {
          this.scene.predictionSystem.enableInteractions();
        }
        // Keep prediction system fully visible
        if (this.scene.predictionSystem.container) {
          this.scene.predictionSystem.container.setAlpha(1);
        }
      } else {
        // Check if disableInteractions method exists before calling
        if (typeof this.scene.predictionSystem.disableInteractions === 'function') {
          this.scene.predictionSystem.disableInteractions();
        }
        // Do NOT fade the prediction system when interactions are disabled
        if (this.scene.predictionSystem.container) {
          this.scene.predictionSystem.container.setAlpha(1);
        }
      }
    }
    // Update menu interactions
    if (this.onMenuInteractionChange) {
      // Menu should generally be accessible unless in breathing mode
      const menuEnabled = this.scene.gameState !== 'breathing';
      this.onMenuInteractionChange(menuEnabled);
    }
    // Update mode toggle interactions
    if (this.scene.modeToggleContainer) {
      const modeToggleEnabled = this.scene.gameState === 'predicting';
      // Ensure mode toggle is not visually faded
      this.scene.modeToggleContainer.setAlpha(1);
      // Optionally control interactivity if method exists
      if (typeof this.scene.modeToggleContainer.setInteractive === 'function') {
        this.scene.modeToggleContainer.setInteractive(modeToggleEnabled);
      }
    }
  }
  setInteractionsEnabled(enabled) {
    this.interactionsEnabled = enabled;
    this.updateUIInteractions();
  }
  areInteractionsEnabled() {
    return this.interactionsEnabled;
  }
}