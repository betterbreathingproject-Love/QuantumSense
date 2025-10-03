import Phaser from 'phaser';
import { OnboardingManager } from './QuantumSense Ai Journal-Add on /src/components/OnboardingManager.js';
export class LoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoginScene' });
    this.playerData = null;
  }
  preload() {
    // Load the logo image
    this.load.image('divineSenseLogo', 'https://play.rosebud.ai/assets/065e2161-a443-411d-8174-7563072c54b3.png?pNNq');
  }
  create() {
    // Use non-embedded onboarding on a standalone page. If user already exists, skip.
    let existingUser = {};
    try {
      existingUser = JSON.parse(localStorage.getItem('quantumsense-user-data') || '{}');
    } catch {}

    if (existingUser && (existingUser.name || existingUser.email)) {
      // Proceed directly to game boot for returning users; do not auto-open journal overlay
      this.scene.start('BootScene');
      return;
    }
    // Redirect to standalone onboarding page (not embedded in app)
    window.location.href = './onboarding.html';
    return; // Skip legacy login UI construction
  }

  createLoginForm() {
    const { width, height } = this.sys.game.config;
    
    // Title
    const titleStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      color: '#00e5ff',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4
    };
    
    this.add.image(width / 2, 110, 'divineSenseLogo').setOrigin(0.5).setScale(0.3);
    const subtitleText = 'Your Personal Intuition\n& Psychic Mastery Tracker';
    this.add.text(width / 2, 190, subtitleText, {
      fontFamily: '"Inter", "Roboto", "Segoe UI", Arial, sans-serif',
      fontSize: '24px',
      color: '#00e5ff',
      fontStyle: 'normal',
      fontWeight: '500',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 1,
      shadow: { color: '#00e5ff', blur: 8, stroke: false, fill: true },
      wordWrap: { width: 450, useAdvancedWrap: true }
    }).setOrigin(0.5);
    // Login form background - made taller for avatar
    const formBg = this.add.graphics();
    formBg.fillStyle(0x0c0114, 0.95);
    formBg.fillRoundedRect(width/2 - 200, 320, 400, 390, 20);
    formBg.lineStyle(2, 0x8a2be2, 1);
    formBg.strokeRoundedRect(width/2 - 200, 320, 400, 390, 20);
    // Create HTML form elements
    this.createHTMLForm();
    // Play button - moved down for avatar space
    this.playButton = this.add.text(width/2, 740, 'Align & Enter 🌟', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#00e5ff',
      backgroundColor: '#2d0b4b',
      padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.playButton.on('pointerover', () => {
      this.tweens.add({ targets: this.playButton, scale: 1.05, duration: 200 });
    });

    this.playButton.on('pointerout', () => {
      this.tweens.add({ targets: this.playButton, scale: 1, duration: 200 });
    });

    this.playButton.on('pointerdown', () => {
      this.handleLogin();
    });
  }

  createHTMLForm() {
    // Get game canvas bounds for positioning
    const canvas = this.sys.game.canvas;
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / 576, bounds.height / 1024);
    const top = bounds.top + (bounds.height * 0.45);

    this.formContainer = document.createElement('div');
    this.formContainer.className = 'form-container';
    this.formContainer.style.cssText = `
      position: fixed;
      z-index: 1000;
      background: rgba(12, 1, 20, 0.95);
      border: 2px solid #8a2be2;
      border-radius: 20px;
      padding: 20px;
      width: 360px;
      height: 350px;
      box-shadow: 0 0 30px rgba(138, 43, 226, 0.5);
      backdrop-filter: blur(10px);
    `;
    
    this.formContainer.style.left = `${bounds.left + (bounds.width / 2)}px`;
    this.formContainer.style.top = `${top}px`;
    this.formContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;
    // Update form position on resize
    this.updateFormPosition = () => {
      const bounds = canvas.getBoundingClientRect();
      const scale = bounds.width / canvas.width;
      const top = bounds.top + (510 * scale);
      this.formContainer.style.left = `${bounds.left + (bounds.width / 2)}px`;
      this.formContainer.style.top = `${top}px`;
      this.formContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    window.addEventListener('resize', this.updateFormPosition);
    this.updateFormPosition();
    // Avatar section
    this.avatarContainer = document.createElement('div');
    this.avatarContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    `;
    this.avatarImage = document.createElement('img');
    this.avatarImage.style.cssText = `
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 3px solid #8a2be2;
      cursor: pointer;
      object-fit: cover;
      background: linear-gradient(45deg, #8a2be2, #00e5ff);
    `;
    this.avatarImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzEpIi8+CjxjaXJjbGUgY3g9IjQwIiBjeT0iMzAiIHI9IjEyIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjgiLz4KPGVsbGlwc2UgY3g9IjQwIiBjeT0iNjAiIHJ4PSIxOCIgcnk9IjEyIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjgiLz4KPGR1ZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQwX2xpbmVhcl8xXzEiIHgxPSIwIiB5MT0iMCIgeDI9IjgwIiB5Mj0iODAiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iIzhhMmJlMiIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwMGU1ZmYiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K';
    this.avatarImage.addEventListener('mouseenter', () => {
      this.avatarImage.style.transform = 'scale(1.05)';
      this.avatarImage.style.borderColor = '#00e5ff';
    });
    this.avatarImage.addEventListener('mouseleave', () => {
      this.avatarImage.style.transform = 'scale(1)';
      this.avatarImage.style.borderColor = '#8a2be2';
    });
    this.avatarInput = document.createElement('input');
    this.avatarInput.type = 'file';
    this.avatarInput.accept = 'image/*';
    this.avatarInput.style.display = 'none';
    this.avatarLabel = document.createElement('label');
    this.avatarLabel.textContent = 'Upload Avatar';
    this.avatarLabel.style.cssText = `
      color: #00e5ff;
      font-size: 12px;
      margin-top: 8px;
      cursor: pointer;
      text-decoration: underline;
    `;
    this.avatarLabel.addEventListener('mouseenter', () => {
      this.avatarLabel.style.color = '#00e5ff';
    });
    this.avatarLabel.addEventListener('mouseleave', () => {
      this.avatarLabel.style.color = '#c9c9c9';
    });
    this.avatarContainer.appendChild(this.avatarImage);
    this.avatarContainer.appendChild(this.avatarInput);
    this.avatarContainer.appendChild(this.avatarLabel);

    // Inputs container
    this.inputsContainer = document.createElement('div');
    this.inputsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 15px;
    `;
    // Player name input
    this.nameLabel = document.createElement('label');
    this.nameLabel.textContent = 'Psychic Name:';
    this.nameLabel.style.cssText = `
      color: #00e5ff;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 5px;
    `;
    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.placeholder = 'Enter your psychic name';
    this.nameInput.style.cssText = `
      padding: 12px;
      border: 2px solid #8a2be2;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: #ffffff;
      font-size: 16px;
      outline: none;
      transition: all 0.3s ease;
    `;

    this.nameInput.addEventListener('focus', () => {
      this.nameInput.style.borderColor = '#00e5ff';
      this.nameInput.style.boxShadow = '0 0 10px rgba(0, 229, 255, 0.3)';
    });

    this.nameInput.addEventListener('blur', () => {
      this.nameInput.style.borderColor = '#8a2be2';
      this.nameInput.style.boxShadow = 'none';
    });

    // Email input
    this.emailLabel = document.createElement('label');
    this.emailLabel.textContent = 'Skool Email:';
    this.emailLabel.style.cssText = `
      color: #00e5ff;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 5px;
    `;
    this.emailInput = document.createElement('input');
    this.emailInput.type = 'email';
    this.emailInput.placeholder = 'Enter your Skool email';
    this.emailInput.style.cssText = `
      padding: 12px;
      border: 2px solid #8a2be2;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: #ffffff;
      font-size: 16px;
      outline: none;
      transition: all 0.3s ease;
    `;

    this.emailInput.addEventListener('focus', () => {
      this.emailInput.style.borderColor = '#00e5ff';
      this.emailInput.style.boxShadow = '0 0 10px rgba(0, 229, 255, 0.3)';
    });

    this.emailInput.addEventListener('blur', () => {
      this.emailInput.style.borderColor = '#8a2be2';
      this.emailInput.style.boxShadow = 'none';
    });

    // Add Enter key support
    [this.nameInput, this.emailInput].forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleLogin();
        }
      });
    });

    // Append to inputs container
    this.inputsContainer.appendChild(this.nameLabel);
    this.inputsContainer.appendChild(this.nameInput);
    this.inputsContainer.appendChild(this.emailLabel);
    this.inputsContainer.appendChild(this.emailInput);
    // Append to form container
    this.formContainer.appendChild(this.avatarContainer);
    this.formContainer.appendChild(this.inputsContainer);

    // Add to page
    document.body.appendChild(this.formContainer);
  }

  createLeaderboard() {
    const { width, height } = this.sys.game.config;
    
    // Leaderboard title
    this.add.text(width/2, 800, 'Leaderboard', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    // Leaderboard background
    const leaderboardBg = this.add.graphics();
    leaderboardBg.fillStyle(0x0c0114, 0.95);
    leaderboardBg.fillRoundedRect(width/2 - 250, 830, 500, 160, 20);
    leaderboardBg.lineStyle(2, 0x8a2be2, 1);
    leaderboardBg.strokeRoundedRect(width/2 - 250, 830, 500, 160, 20);
    // Create leaderboard container
    this.leaderboardContainer = this.add.container(width/2, 860);
    
    this.populateLeaderboard();
  }

  populateLeaderboard() {
    // Clear existing leaderboard
    this.leaderboardContainer.removeAll(true);
    
    const leaderboardData = this.getLeaderboardData();
    
    if (leaderboardData.length === 0) {
      const emptyText = this.add.text(0, 50, 'Light up the world!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#c9c9c9',
        fontStyle: 'italic'
      }).setOrigin(0.5);
      this.leaderboardContainer.add(emptyText);
      return;
    }

    // Header
    const headerText = this.add.text(0, 0, 'Rank    Name                     Accuracy    P-Value', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#00e5ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.leaderboardContainer.add(headerText);

    // Add top players
    leaderboardData.slice(0, 3).forEach((player, index) => {
      const rankEmoji = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const displayName = player.name.length > 15 ? player.name.substring(0, 15) + '...' : player.name;
      
      const playerText = this.add.text(0, 30 + (index * 25), 
        `${rankEmoji}      ${displayName.padEnd(20)}   ${player.accuracy.toFixed(1)}%      ${player.pValue.toFixed(3)}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: index < 3 ? '#ffff00' : '#c9c9c9'
      }).setOrigin(0.5);
      
      this.leaderboardContainer.add(playerText);
    });
  }

  loadPlayerData() {
    try {
      const savedPlayer = localStorage.getItem('divineSensePlayer');
      if (savedPlayer) {
        this.playerData = JSON.parse(savedPlayer);
        this.nameInput.value = this.playerData.name || '';
        this.emailInput.value = this.playerData.email || '';
        if (this.playerData.avatar) {
          this.avatarImage.src = this.playerData.avatar;
        }
      }
    } catch (e) {
      console.error('Could not load player data:', e);
    }
  }

  handleLogin() {
    const name = this.nameInput.value.trim();
    const email = this.emailInput.value.trim();

    if (!name) {
      this.showError('Please enter your psychic name');
      this.nameInput.focus();
      return;
    }

    if (!email || !this.isValidEmail(email)) {
      this.showError('Please enter a valid Skool email');
      this.emailInput.focus();
      return;
    }
    // Save player data including avatar
    this.playerData = { 
      name, 
      email, 
      avatar: this.avatarImage.src,
      joinDate: (this.playerData && this.playerData.joinDate) || new Date().toISOString() 
    };
    localStorage.setItem('divineSensePlayer', JSON.stringify(this.playerData));

    // Add to leaderboard if not exists
    this.addToLeaderboard(this.playerData);

    // Clean up form
    this.formContainer.remove();

    // Start the game
    this.scene.start('BootScene');
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showError(message) {
    // Remove existing error
    if (this.errorText) {
      this.errorText.destroy();
    }

    const { width } = this.sys.game.config;
    this.errorText = this.add.text(width/2, 780, message, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#ff4444',
      backgroundColor: 'rgba(255, 68, 68, 0.2)',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5);

    // Auto-remove error after 3 seconds
    this.time.delayedCall(3000, () => {
      if (this.errorText) {
        this.errorText.destroy();
        this.errorText = null;
      }
    });
  }

  getLeaderboardData() {
    try {
      const leaderboard = localStorage.getItem('divineSenseLeaderboard');
      if (leaderboard) {
        const data = JSON.parse(leaderboard);
        // Sort by accuracy (descending), then by p-value (ascending)
        return data.sort((a, b) => {
          if (Math.abs(a.accuracy - b.accuracy) < 0.1) {
            return a.pValue - b.pValue; // Lower p-value is better
          }
          return b.accuracy - a.accuracy; // Higher accuracy is better
        });
      }
      return [];
    } catch (e) {
      console.error('Could not load leaderboard:', e);
      return [];
    }
  }

  addToLeaderboard(playerData) {
    try {
      let leaderboard = this.getLeaderboardData();
      
      // Check if player already exists (by email)
      const existingIndex = leaderboard.findIndex(p => p.email === playerData.email);
      
      if (existingIndex === -1) {
        // New player - add with initial stats
        leaderboard.push({
          name: playerData.name,
          email: playerData.email,
          accuracy: 0,
          pValue: 1.0,
          totalRolls: 0,
          joinDate: playerData.joinDate
        });
      } else {
        // Existing player - update name if changed
        leaderboard[existingIndex].name = playerData.name;
      }
      
      localStorage.setItem('divineSenseLeaderboard', JSON.stringify(leaderboard));
    } catch (e) {
      console.error('Could not update leaderboard:', e);
    }
  }
  setupAvatarHandlers() {
    // Handle avatar image click
    this.avatarImage.addEventListener('click', () => {
      this.avatarInput.click();
    });
    // Handle avatar label click
    this.avatarLabel.addEventListener('click', () => {
      this.avatarInput.click();
    });
    // Handle file selection
    this.avatarInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.avatarImage.src = e.target.result;
          // Immediately save to player data if it exists
          if (this.playerData) {
            this.playerData.avatar = e.target.result;
            localStorage.setItem('divineSensePlayer', JSON.stringify(this.playerData));
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
  destroy() {
    if (this.formContainer && this.formContainer.parentNode) {
      this.formContainer.remove();
    }
    if (this.updateFormPosition) {
      window.removeEventListener('resize', this.updateFormPosition);
    }
  }
}