export class DailyCheckInManager {
    constructor(scene, statsTracker) {
        this.scene = scene;
        this.statsTracker = statsTracker;
        this.container = null;
        this.dayElements = [];
    }

    // Simple show/hide methods that do nothing - daily check-in is now handled by HomePanel streak card
    show() {
        // No-op: Daily check-in functionality is now integrated into HomePanel
    }

    hide() {
        // No-op: Daily check-in functionality is now integrated into HomePanel
    }

    destroy() {
        // No-op: Nothing to destroy
    }
}