export class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.audioContext = null;
    this.backgroundMusic = null;
    this.currentOmmingSound = null;
    this.ommingVolume = 0;
    
    // Simple initialization
    this.audioSettings = {
      musicVolume: 0.3,
      sfxVolume: 1.0,
      isMuted: false,
    };
    
    this.loadAudioSettings();
    this.initializeAudioContext();
  }
  initializeAudioContext() {
    // Enable audio context on user interaction
    this.scene.input.on('pointerdown', () => {
      if (this.scene.sound.locked) {
        this.scene.sound.unlock();
      }
    });
    
    // Create Web Audio API context for synthesized sounds
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.error('Failed to create Web Audio API context:', error);
    }
    
    // Configure master sound settings
    this.scene.sound.volume = this.audioSettings.sfxVolume;
    this.scene.sound.mute = this.audioSettings.isMuted;
  }
  startBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.destroy();
    }
    
    this.backgroundMusic = this.scene.sound.add('background_music', { 
      loop: true,
      volume: this.audioSettings.musicVolume
    });
    this.backgroundMusic.play();
  }
  updateBackgroundMusicVolume(volume) {
    this.audioSettings.musicVolume = volume;
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = volume;
    }
    this.saveAudioSettings();
  }
  updateSFXVolume(volume) {
    this.audioSettings.sfxVolume = volume;
    this.scene.sound.volume = volume;
    this.saveAudioSettings();
  }
  toggleMute() {
    this.audioSettings.isMuted = !this.audioSettings.isMuted;
    this.scene.sound.mute = this.audioSettings.isMuted;
    this.saveAudioSettings();
  }
  playSound(soundKey, config = {}) {
    try {
      if (this.scene.sound.locked) {
        this.scene.sound.unlock();
      }
      
      if (this.scene.cache.audio.exists(soundKey)) {
        const soundConfig = {
          volume: config.volume || this.audioSettings.sfxVolume,
          ...config
        };
        
        if (soundKey === 'omming') {
          return;
        }
        
        return this.scene.sound.play(soundKey, soundConfig);
      }
    } catch (error) {
      console.error(`Error playing sound ${soundKey}:`, error);
    }
  }
  playMysticalRollSound() {
    try {
      if (this.audioSettings.isMuted || !this.audioContext) return;
      
      const audioCtx = this.audioContext;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      const notes = [261.63, 329.63, 392.00, 440.00, 523.25, 659.25, 783.99];
      const noteDuration = 0.1;
      let startTime = audioCtx.currentTime;
      
      notes.forEach((freq, i) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(freq, startTime);
        
        const peakVolume = 0.2 * this.audioSettings.sfxVolume;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(peakVolume, startTime + noteDuration * 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);
        oscillator.start(startTime);
        oscillator.stop(startTime + noteDuration);
        
        startTime += noteDuration * 0.8; 
      });
    } catch (error) {
      console.error('Error playing mystical roll sound:', error);
    }
  }
  loadAudioSettings() {
    try {
      const savedSettings = localStorage.getItem('divineSenseAudioSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        this.audioSettings = { ...this.audioSettings, ...parsed };
      }
    } catch (e) {
      console.error('Could not load audio settings, using defaults.', e);
    }
  }
  saveAudioSettings() {
    try {
      localStorage.setItem('divineSenseAudioSettings', JSON.stringify(this.audioSettings));
    } catch(e) {
      console.error('Could not save audio settings.', e);
    }
  }
  getAudioSettings() {
    return this.audioSettings;
  }
  destroy() {
    if (this.backgroundMusic) {
      this.backgroundMusic.destroy();
      this.backgroundMusic = null;
    }
    
    if (this.currentOmmingSound) {
      this.currentOmmingSound.destroy();
      this.currentOmmingSound = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}