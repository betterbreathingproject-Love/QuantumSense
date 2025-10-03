export class ResetManager {
  constructor(scene, statsTracker) {
    this.scene = scene;
    this.statsTracker = statsTracker;
    this.resetModal = null;
  }

  showResetConfirmationModal() {
    // Reset modal will be moved here
    console.log('ResetManager: showResetConfirmationModal - placeholder');
  }

  destroy() {
    if (this.resetModal) {
      this.resetModal.destroy();
    }
  }
}