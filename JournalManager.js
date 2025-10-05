export class JournalManager {
  constructor(scene, uiCallbacks) {
    this.scene = scene;
    this.uiCallbacks = uiCallbacks || {};
    this.journalOpen = false;
    this.editingEntryDate = null;
    // Ensure legacy HTML exists and wire events
    this.setupHTMLElements();
    // Create the Phaser-based journal panel UI
    this.createJournalPanel();
  }

  createJournalPanel() {
    const { width, height } = this.scene.sys.game.config;
    const panelWidth = width * 0.95;
    const panelHeight = height * 0.85;
    
    this.journalContainer = this.scene.add.container(width / 2, height / 2);
    this.journalContainer.setDepth(1900).setVisible(false);
    
    // Full screen blocker
    const blocker = this.scene.add.graphics();
    blocker.fillStyle(0x000000, 0.7);
    blocker.fillRect(-width/2, -height/2, width, height);
    blocker.setInteractive();
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0c0114, 0.98);
    bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 20);
    bg.lineStyle(2, 0x00e5ff, 1);
    bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 20);
    
    const title = this.scene.add.text(0, -panelHeight / 2 + 40, 'Training Journal', {
      fontFamily: 'Arial, sans-serif', fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Container for the post-it notes
    this.journalNotesContainer = this.scene.add.container(0, 250);
    
    const closeButton = this.scene.add.text(panelWidth / 2 - 30, -panelHeight / 2 + 30, 'X', {
      fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#c9c9c9', backgroundColor: '#2d0b4b', padding: {x:8, y:2},
    }).setOrigin(0.5).setInteractive({useHandCursor: true});
    
    closeButton.on('pointerdown', () => this.toggleJournalPanel());
    
    this.journalContainer.add([blocker, bg, title, this.journalNotesContainer, closeButton]);
  }

  setupHTMLElements() {
    // Create HTML elements if they don't exist
    if (!document.getElementById('journal-controls')) {
      this.createHTMLElements();
    }
    
    // Get references to HTML elements
    this.journalSearchElement = document.getElementById('journal-search');
    const newEntryButton = document.getElementById('journal-new-entry');
    
    // Editor Modal Elements
    this.journalEditorModalElement = document.getElementById('journal-editor-modal');
    this.journalEditorTextareaElement = document.getElementById('journal-editor-textarea');
    const saveButton = document.getElementById('journal-save');
    const cancelButton = document.getElementById('journal-cancel');
    const deleteButton = document.getElementById('journal-delete');
    
    // Event Listeners
    this.journalSearchElement.onkeyup = (e) => this.populateJournalNotes(e.target.value);
    newEntryButton.onclick = () => this.openJournalEditor(null);
    saveButton.onclick = () => this.handleSaveJournal();
    cancelButton.onclick = () => this.closeJournalEditor();
    deleteButton.onclick = () => this.handleDeleteJournal();
  }

  createHTMLElements() {
    // Create the journal controls HTML structure
    const journalControlsHTML = `
      <div id="journal-controls" style="
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        display: none;
        flex-direction: column;
        gap: 10px;
        z-index: 2000;
        background: rgba(12, 1, 20, 0.95);
        padding: 15px;
        border-radius: 10px;
        border: 2px solid #00e5ff;
        min-width: 300px;
      ">
        <input type="text" id="journal-search" placeholder="Search entries..." style="
          padding: 8px;
          border: 1px solid #00e5ff;
          border-radius: 5px;
          background: rgba(45, 11, 75, 0.8);
          color: #ffffff;
          font-family: Arial, sans-serif;
        ">
        <button id="journal-new-entry" style="
          padding: 10px 15px;
          background: #2d0b4b;
          color: #00e5ff;
          border: 1px solid #00e5ff;
          border-radius: 5px;
          cursor: pointer;
          font-family: Arial, sans-serif;
          font-weight: bold;
        ">New Entry</button>
      </div>
      
      <div id="journal-editor-modal" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 3000;
      ">
        <div style="
          background: rgba(12, 1, 20, 0.98);
          border: 2px solid #00e5ff;
          border-radius: 15px;
          padding: 25px;
          width: 90%;
          max-width: 600px;
          max-height: 80%;
        ">
          <textarea id="journal-editor-textarea" placeholder="Write your thoughts and reflections..." style="
            width: 100%;
            height: 300px;
            padding: 15px;
            border: 1px solid #00e5ff;
            border-radius: 8px;
            background: rgba(45, 11, 75, 0.8);
            color: #ffffff;
            font-family: Arial, sans-serif;
            font-size: 16px;
            resize: vertical;
            margin-bottom: 15px;
          "></textarea>
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="journal-delete" style="
              padding: 10px 20px;
              background: #8b0000;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-family: Arial, sans-serif;
              display: none;
            ">Delete</button>
            <button id="journal-cancel" style="
              padding: 10px 20px;
              background: #666;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-family: Arial, sans-serif;
            ">Cancel</button>
            <button id="journal-save" style="
              padding: 10px 20px;
              background: #2d0b4b;
              color: #00e5ff;
              border: 1px solid #00e5ff;
              border-radius: 5px;
              cursor: pointer;
              font-family: Arial, sans-serif;
              font-weight: bold;
            ">Save</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', journalControlsHTML);
  }

  toggleJournalPanel() {
    this.journalOpen = !this.journalOpen;
    this.journalContainer.setVisible(this.journalOpen);
    document.getElementById('journal-controls').style.display = this.journalOpen ? 'flex' : 'none';
    
    // Notify MenuManager of state change
    if (this.uiCallbacks.setJournalOpen) {
      this.uiCallbacks.setJournalOpen(this.journalOpen);
    }
    
    if (this.journalOpen) {
      // Disable ALL interactions when journal is open
      this.scene.predictionSystem.setInteractive(false);
      this.scene.diceController.resultContainer.setInteractive(false);
      if (this.uiCallbacks.setMenuButtonInteractive) {
        this.uiCallbacks.setMenuButtonInteractive(false);
      }
      this.populateJournalNotes();
    } else {
      // Re-enable interactions only if no other panels are open
      const isMenuOpen = this.uiCallbacks.isMenuOpen ? this.uiCallbacks.isMenuOpen() : false;
      const isBinauralOpen = this.uiCallbacks.isBinauralOpen ? this.uiCallbacks.isBinauralOpen() : false;
      const isProfileOpen = this.uiCallbacks.isProfileOpen ? this.uiCallbacks.isProfileOpen() : false;
      
      if (!isMenuOpen && !isBinauralOpen && !isProfileOpen) {
        if (this.scene.gameState === 'predicting') {
          this.scene.predictionSystem.setInteractive(true);
        }
        this.scene.diceController.resultContainer.setInteractive(true);
      }
      if (!isMenuOpen && !isBinauralOpen && !isProfileOpen) {
        if (this.uiCallbacks.setMenuButtonInteractive) {
          this.uiCallbacks.setMenuButtonInteractive(true);
        }
      }
      this.closeJournalEditor();
    }
  }

  getJournalEntries() {
    try {
      const entries = localStorage.getItem('divineSenseJournalEntries');
      return entries ? JSON.parse(entries) : [];
    } catch (e) {
      console.error("Failed to parse journal entries:", e);
      return [];
    }
  }

  saveJournalEntry(text) {
    const entries = this.getJournalEntries();
    const today = new Date().toISOString().slice(0, 10);
    const existingEntryIndex = entries.findIndex(e => e.date === (this.editingEntryDate || today));
    
    if (existingEntryIndex > -1 && this.editingEntryDate) {
      // Update existing entry being edited
      entries[existingEntryIndex].text = text;
      entries[existingEntryIndex].date = today;
    } else {
      // If not editing, check for an entry from today to append to
      const todayEntryIndex = entries.findIndex(e => e.date === today);
      if (todayEntryIndex > -1 && !this.editingEntryDate) {
        // Append to today's existing entry
        entries[todayEntryIndex].text += `\n\n- ${text}`;
      } else {
        // Create a new entry for a new day or when an old entry is saved
        entries.push({ date: today, text: text });
      }
    }
    
    // Sort by date descending
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem('divineSenseJournalEntries', JSON.stringify(entries));
  }

  openJournalEditor(entryDate) {
    this.editingEntryDate = entryDate;
    const entries = this.getJournalEntries();
    const entry = entryDate ? entries.find(e => e.date === entryDate) : null;
    
    this.journalEditorTextareaElement.value = entry ? entry.text : '';
    this.journalEditorModalElement.style.display = 'flex';
    document.getElementById('journal-delete').style.display = entry ? 'block' : 'none';
  }

  closeJournalEditor() {
    this.journalEditorModalElement.style.display = 'none';
    this.editingEntryDate = null;
  }

  handleSaveJournal() {
    const text = this.journalEditorTextareaElement.value;
    if (text) {
      this.saveJournalEntry(text);
      this.scene.playSound('button_ambience');
    }
    this.closeJournalEditor();
    this.populateJournalNotes(this.journalSearchElement.value);
  }

  handleDeleteJournal() {
    if (this.editingEntryDate) {
      let entries = this.getJournalEntries();
      entries = entries.filter(e => e.date !== this.editingEntryDate);
      localStorage.setItem('divineSenseJournalEntries', JSON.stringify(entries));
      this.scene.playSound('lose');
      this.closeJournalEditor();
      this.populateJournalNotes(this.journalSearchElement.value);
    }
  }

  populateJournalNotes(searchTerm = '') {
    this.journalNotesContainer.removeAll(true);
    const entries = this.getJournalEntries();
    const filteredEntries = searchTerm
      ? entries.filter(e => e.text.toLowerCase().includes(searchTerm.toLowerCase()))
      : entries;
    
    const panelWidth = this.scene.sys.game.config.width * 0.95;
    const hPadding = 40;
    const availableWidth = panelWidth - hPadding * 2;
    const minNoteSize = 140;
    const maxNoteSize = 180;
    
    const idealCols = Math.max(1, Math.floor(availableWidth / (minNoteSize + 20)));
    const noteSize = Phaser.Math.Clamp(Math.floor(availableWidth / idealCols) - 20, minNoteSize, maxNoteSize);
    const notePadding = 20;
    
    const cols = Math.max(1, Math.floor(availableWidth / (noteSize + notePadding)));
    const totalGridWidth = cols * (noteSize + notePadding) - notePadding;
    const startX = -totalGridWidth / 2 + noteSize / 2;
    
    filteredEntries.forEach((entry, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      const x = startX + col * (noteSize + notePadding);
      const y = 80 + row * (noteSize + notePadding);
      const note = this.createNote(entry, noteSize);
      note.setPosition(x, y);
      this.journalNotesContainer.add(note);
    });
  }

  createNote(entry, noteSize) {
    const container = this.scene.add.container(0, 0);
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffcc, 1); // Post-it yellow
    bg.fillRoundedRect(-noteSize/2, -noteSize/2, noteSize, noteSize, 10);
    bg.lineStyle(1, 0x333333, 0.2);
    bg.strokeRoundedRect(-noteSize/2, -noteSize/2, noteSize, noteSize, 10);
    
    const dateText = new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const dateLabel = this.scene.add.text(-noteSize/2 + 15, -noteSize/2 + 15, dateText, {
      fontFamily: 'monospace', fontSize: '16px', color: '#555'
    });
    
    const contentText = this.scene.add.text(-noteSize/2 + 15, -noteSize/2 + 40, entry.text, {
      fontFamily: 'monospace', fontSize: '14px', color: '#333',
      wordWrap: { width: noteSize - 30 },
      lineSpacing: 4
    }).setMaxLines(5);
    
    container.add([bg, dateLabel, contentText]);
    container.setInteractive(new Phaser.Geom.Rectangle(-noteSize/2, -noteSize/2, noteSize, noteSize), Phaser.Geom.Rectangle.Contains, {useHandCursor: true});
    container.setRotation(Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-5, 5)));
    
    container.on('pointerdown', () => {
      this.openJournalEditor(entry.date);
    });
    
    container.on('pointerover', () => this.scene.tweens.add({targets: container, scale: 1.05, duration: 150}));
    container.on('pointerout', () => this.scene.tweens.add({targets: container, scale: 1, duration: 150}));
    
    return container;
  }

  // Mobile-responsive helper methods
  adjustForMobile() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // Adjust panel size for mobile
      const { width, height } = this.scene.sys.game.config;
      const panelWidth = width * 0.98;
      const panelHeight = height * 0.95;
      
      // Update journal controls positioning
      const controls = document.getElementById('journal-controls');
      if (controls) {
        controls.style.position = 'fixed';
        controls.style.top = '5px';
        controls.style.left = '5px';
        controls.style.right = '5px';
        controls.style.transform = 'none';
        controls.style.minWidth = 'auto';
      }
      
      // Adjust editor modal for mobile
      const modal = document.getElementById('journal-editor-modal');
      if (modal) {
        const modalContent = modal.querySelector('div');
        if (modalContent) {
          modalContent.style.width = '95%';
          modalContent.style.margin = '10px';
        }
      }
      
      // Adjust textarea for mobile and enable auto-grow
      const textarea = document.getElementById('journal-editor-textarea');
      if (textarea) {
        textarea.style.fontSize = '14px';
        textarea.style.overflowY = 'hidden';
        textarea.style.resize = 'none';
        const autoGrow = (el) => {
          const lineHeight = parseFloat(getComputedStyle(el).lineHeight || '20');
          const minHeight = Math.max(lineHeight * 3, 80);
          el.style.height = 'auto';
          el.style.height = Math.max(el.scrollHeight, minHeight) + 'px';
        };
        // Initialize and bind
        requestAnimationFrame(() => autoGrow(textarea));
        textarea.addEventListener('input', () => autoGrow(textarea));
      }
    }
  }

  destroy() {
    // Clean up HTML elements
    const controls = document.getElementById('journal-controls');
    const modal = document.getElementById('journal-editor-modal');
    
    if (controls) controls.remove();
    if (modal) modal.remove();
    
    // Clean up Phaser container
    if (this.journalContainer) {
      this.journalContainer.destroy();
    }
  }
}