import { JournalApp } from './components/JournalApp.js';
// Initialize the journal application
class App {
    constructor() {
        this.mainContainer = document.getElementById('mainContainer');
        this.journalApp = null;
        
        this.init();
    }
    
    async init() {
        // Initialize journal app immediately (preserve onboarding data set previously)
        this.initJournalApp();
    }
    
    initJournalApp() {
        this.journalApp = new JournalApp();
    }
}
// Start the application
new App();