export class BinauralBeatGenerator {
  constructor(scene) {
    this.scene = scene;
    this.audioContext = null;
    this.oscLeft = null;
    this.oscRight = null;
    this.gainNode = null;
    this.isPlaying = false;

    this.baseFreq = 200; // Hz
    this.binauralFreq = 7; // Hz (Theta)
    this.volume = 0.5;
  }

  initAudioContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Binaural beats AudioContext created.');
      } catch (e) {
        console.error('Web Audio API is not supported in this browser.');
        return false;
      }
    }
    if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
    }
    return true;
  }

  start() {
    if (this.isPlaying) return;
    if (!this.initAudioContext()) return;
    // Create gain node first
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    
    // Set volume (ignore mute for binaural beats - they have their own control)
    this.gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime); // Lower default volume
    // Left ear oscillator
    this.oscLeft = this.audioContext.createOscillator();
    const pannerLeft = this.audioContext.createStereoPanner();
    pannerLeft.pan.value = -1; // Full left
    this.oscLeft.frequency.setValueAtTime(this.baseFreq, this.audioContext.currentTime);
    this.oscLeft.type = 'sine';
    
    // Connect: oscillator -> panner -> gain -> destination
    this.oscLeft.connect(pannerLeft);
    pannerLeft.connect(this.gainNode);
    this.oscLeft.start();
    // Right ear oscillator
    this.oscRight = this.audioContext.createOscillator();
    const pannerRight = this.audioContext.createStereoPanner();
    pannerRight.pan.value = 1; // Full right
    this.oscRight.frequency.setValueAtTime(this.baseFreq + this.binauralFreq, this.audioContext.currentTime);
    this.oscRight.type = 'sine';
    
    // Connect: oscillator -> panner -> gain -> destination
    this.oscRight.connect(pannerRight);
    pannerRight.connect(this.gainNode);
    this.oscRight.start();
    this.isPlaying = true;
    console.log(`Binaural beats started: ${this.baseFreq}Hz (L) + ${this.baseFreq + this.binauralFreq}Hz (R) = ${this.binauralFreq}Hz beat`);
  }

  stop() {
    if (!this.isPlaying || !this.gainNode) return;
    const fadeOutTime = 0.5;
    const now = this.audioContext.currentTime;
    // Check if gainNode exists before trying to ramp down
    if (this.gainNode && this.gainNode.gain) {
        this.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutTime);
    }
    if(this.oscLeft) this.oscLeft.stop(now + fadeOutTime);
    if(this.oscRight) this.oscRight.stop(now + fadeOutTime);
    this.isPlaying = false;
    // We don't null out the oscillators here to prevent errors if stop is called multiple times
  }

  setFrequencies(baseFreq, binauralFreq) {
    this.baseFreq = baseFreq;
    this.binauralFreq = binauralFreq;

    if (this.isPlaying) {
      const now = this.audioContext.currentTime;
      this.oscLeft.frequency.setValueAtTime(this.baseFreq, now);
      this.oscRight.frequency.setValueAtTime(this.baseFreq + this.binauralFreq, now);
    }
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.isPlaying && this.gainNode) {
      // Set volume independently of master mute (binaural beats have their own on/off)
      this.gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
    }
  }

  destroy() {
    if (this.isPlaying) {
      this.stop();
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}