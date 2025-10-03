

export class ProfileManager {
  constructor(scene, statsTracker, tooltipManager) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.tooltipManager = tooltipManager;
    this.profileOpen = false;
    // Don't create panel - let uiManager handle profile
  }
  
  createProfilePanel() {
    // No-op - profile handled by uiManager
  }
  
  toggleProfilePanel() {
    // Delegate to uiManager profile system
    if (this.scene.uiManager && this.scene.uiManager.toggleProfilePanel) {
      this.scene.uiManager.toggleProfilePanel();
    }
  }
  
  isOpen() {
    // Delegate to uiManager
    return this.scene.uiManager ? this.scene.uiManager.profileOpen : false;
  }
  
  updateProfilePanel() {
    // No-op - handled by uiManager
  }
}

