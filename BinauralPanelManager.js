import Phaser from 'phaser';
export class BinauralPanelManager {
  constructor(scene, binauralGenerator, uiManager) {
    this.scene = scene;
    this.binauralGenerator = binauralGenerator;
    this.uiManager = uiManager;
    this.sliderTooltipUtils = this.uiManager.sliderTooltipUtils;
    this.isOpen = false;
    this.createPanel();
  }

  createPanel() {
    const { width, height } = this.scene.sys.game.config;
    const panelWidth = 400;
    this.container = this.scene.add.container(width, height / 2 - 390);
    this.container.setDepth(5500);

    const blocker = this.scene.add.graphics();
    blocker.fillStyle(0x0c0114, 1.0);
    blocker.fillRect(0, 0, panelWidth, 760);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0c0114, 1.0);
    bg.fillRoundedRect(0, 0, panelWidth, 760, 20);
    bg.lineStyle(2, 0x00e5ff, 1);
    bg.strokeRoundedRect(0, 0, panelWidth, 760, 20);

    blocker.setInteractive(new Phaser.Geom.Rectangle(0, 0, panelWidth, 760), Phaser.Geom.Rectangle.Contains);
    blocker.on('pointerdown', (pointer) => {
        pointer.event.stopPropagation();
    });

    const title = this.scene.add.text(panelWidth / 2, 50, 'Binaural Tones', {
        fontFamily: 'Arial, sans-serif', fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.playSwitch = this.createSwitch(panelWidth / 2, 100, 'Power', this.binauralGenerator.isPlaying, (isOn) => {
        if(isOn) {
            this.binauralGenerator.start();
        } else {
            this.binauralGenerator.stop();
        }
    });

    const presets = [
        { label: 'Theta (7Hz)', freq: 7 },
        { label: 'Alpha (10Hz)', freq: 10 },
        { label: 'Gamma (40Hz)', freq: 40 },
    ];

    this.presetButtons = [];
    this.activePresetIndex = -1;

    presets.forEach((preset, i) => {
        const buttonContainer = this.scene.add.container(70 + (i * 120), 160);
        
        const buttonBg = this.scene.add.graphics();
        buttonBg.fillStyle(0x2d0b4b, 1);
        buttonBg.fillRoundedRect(-50, -18, 100, 36, 18);
        buttonBg.lineStyle(2, 0x8a2be2, 0.8);
        buttonBg.strokeRoundedRect(-50, -18, 100, 36, 18);
        
        const buttonText = this.scene.add.text(0, 0, preset.label, {
            fontFamily: 'Arial, sans-serif', 
            fontSize: '15px', 
            color: '#00e5ff',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5);
        buttonContainer.add([buttonBg, buttonText]);
        buttonContainer.setInteractive(new Phaser.Geom.Rectangle(-50, -18, 100, 36), Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
        buttonContainer.presetIndex = i;
        buttonContainer.presetFreq = preset.freq;
        buttonContainer.buttonBg = buttonBg;
        buttonContainer.buttonText = buttonText;
        buttonContainer.on('pointerover', () => {
            if (this.activePresetIndex !== i) {
                this.scene.tweens.add({ targets: buttonContainer, scale: 1.05, duration: 200, ease: 'Sine.easeOut' });
            }
        });
        buttonContainer.on('pointerout', () => {
            if (this.activePresetIndex !== i) {
                this.scene.tweens.add({ targets: buttonContainer, scale: 1, duration: 200, ease: 'Sine.easeIn' });
            }
        });
        buttonContainer.on('pointerdown', () => {
            this.scene.playSound('button_ambience');
            this.binauralGenerator.setFrequencies(this.binauralGenerator.baseFreq, preset.freq);
            
            this.updateSliderPosition(this.binauralBinauralSlider, (preset.freq / 100));
            this.binauralBinauralSlider[4].setText(`${Math.round(preset.freq)} Hz`);
            
            this.setActivePreset(i);
        });
        
        this.presetButtons.push(buttonContainer);
    });

    this.binauralBaseSlider = this.createSlider(240, 'Base Frequency', 0.25, (val) => {
        const baseFreq = 100 + val * 400;
        this.binauralGenerator.setFrequencies(baseFreq, this.binauralGenerator.binauralFreq);
        this.binauralBaseSlider[4].setText(`${Math.round(baseFreq)} Hz`);
    }, panelWidth, true);
    
    this.binauralBinauralSlider = this.createSlider(320, 'Binaural Beat', 0.07, (val) => {
        const binauralFreq = val * 100;
        this.binauralGenerator.setFrequencies(this.binauralGenerator.baseFreq, binauralFreq);
        this.binauralBinauralSlider[4].setText(`${Math.round(binauralFreq)} Hz`);
    }, panelWidth, true);
    
    this.binauralVolumeSlider = this.createSlider(400, 'Binaural Volume', 0.5, (val) => {
        this.binauralGenerator.setVolume(val);
        this.binauralVolumeSlider[4].setText(`${Math.round(val * 100)}%`);
    }, panelWidth, false);

    this.binauralMusicSlider = this.createSlider(480, 'Background Music', this.scene.audioManager.getAudioSettings().musicVolume, (val) => {
        this.uiManager.updateAllMusicSliders(val);
        this.binauralMusicSlider[4].setText(`${Math.round(val * 100)}%`);
    }, panelWidth, false);
    
    const binauralElements = [
        blocker, bg, title, this.playSwitch,
        ...this.presetButtons,
        ...this.binauralBaseSlider, 
        ...this.binauralBinauralSlider, 
        ...this.binauralVolumeSlider,
        ...this.binauralMusicSlider
    ];
    this.container.add(binauralElements);
  }

  togglePanel() {
      this.scene.playSound('button_ambience');
      this.isOpen = !this.isOpen;
      this.uiManager.menuManager.updateIconState();
      const { width } = this.scene.sys.game.config;
      const panelWidth = 400;
      const targetX = this.isOpen ? width - panelWidth : width;

      if (this.isOpen) {
          const switchButton = this.playSwitch.getByName('switchButton');
          const switchBG = this.playSwitch.getByName('switchBG');
          const text = this.playSwitch.getByName('text');
          const isOn = this.binauralGenerator.isPlaying;
          
          text.setText(isOn ? 'ON' : 'OFF');
          switchButton.x = isOn ? 20 : -20;
          switchBG.clear().fillStyle(isOn ? 0x00e5ff : 0x2d0b4b, 1).fillRoundedRect(-40, -16, 80, 32, 16);
          
          this.checkCurrentFrequencyForPreset();
          this.uiManager.updateAllMusicSliders(this.scene.audioManager.getAudioSettings().musicVolume);

          this.scene.interactionManager.updateInteractions();
      } else {
          this.scene.interactionManager.updateInteractions();
      }
      this.scene.tweens.add({
          targets: this.container,
          x: targetX,
          duration: 300,
          ease: 'Cubic.easeInOut'
      });
  }

  createSlider(y, label, initialVolume, callback, panelWidth, showFrequency = false) {
    const sliderElements = this.sliderTooltipUtils.createBinauralSlider(y, label, initialVolume, callback, panelWidth, showFrequency);
    
    const handle = sliderElements[3];
    handle.on('drag', () => {
      if (label.includes('Binaural')) {
        this.checkCurrentFrequencyForPreset();
      }
    });
    
    return sliderElements;
  }
  
  updateSliderPosition(sliderElements, value) {
    this.sliderTooltipUtils.updateBinauralSliderPosition(sliderElements, value);
  }
  
  createSwitch(x, y, label, initialState, callback) {
      const container = this.scene.add.container(x, y);
      
      const labelText = this.scene.add.text(-60, 0, label, {
          fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#c9c9c9'
      }).setOrigin(1, 0.5);
      const switchWidth = 80;
      const switchHeight = 32;
      let isOn = initialState;
      
      const switchBG = this.scene.add.graphics();
      switchBG.fillStyle(isOn ? 0x00e5ff : 0x2d0b4b, 1);
      switchBG.fillRoundedRect(-switchWidth / 2, -switchHeight / 2, switchWidth, switchHeight, 16);
      switchBG.setName('switchBG');
      const switchButton = this.scene.add.circle(isOn ? 20 : -20, 0, 12, 0xffffff);
      switchButton.setName('switchButton');
      const text = this.scene.add.text(isOn ? 20 : -20, 0, isOn ? 'ON' : 'OFF', {
          fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#000000', fontStyle: 'bold'
      }).setOrigin(0.5);
      text.setName('text');
      container.add([labelText, switchBG, switchButton, text]);
      container.setInteractive(new Phaser.Geom.Rectangle(-70, -16, 140, 32), Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
      container.on('pointerdown', () => {
          isOn = !isOn;
          callback(isOn);
          this.scene.playSound('button_hover_click');
          
          text.setText(isOn ? 'ON' : 'OFF');
          switchBG.clear().fillStyle(isOn ? 0x00e5ff : 0x2d0b4b, 1).fillRoundedRect(-switchWidth / 2, -switchHeight / 2, switchWidth, switchHeight, 16);
          this.scene.tweens.add({
              targets: [switchButton, text],
              x: isOn ? 20 : -20,
              duration: 200,
              ease: 'Cubic.easeInOut'
          });
      });
      return container;
  }

  setActivePreset(index) {
      this.presetButtons.forEach((buttonContainer, i) => {
          if (i === this.activePresetIndex) {
              const buttonBg = buttonContainer.buttonBg;
              const buttonText = buttonContainer.buttonText;
              
              buttonBg.clear();
              buttonBg.fillStyle(0x2d0b4b, 1);
              buttonBg.fillRoundedRect(-50, -18, 100, 36, 18);
              buttonBg.lineStyle(2, 0x8a2be2, 0.8);
              buttonBg.strokeRoundedRect(-50, -18, 100, 36, 18);
              
              buttonText.setStyle({ color: '#00e5ff' });
              buttonContainer.setScale(1);
              
              this.scene.tweens.killTweensOf(buttonContainer);
              buttonContainer.setAlpha(1);
          }
      });

      this.activePresetIndex = index;
      if (index >= 0 && index < this.presetButtons.length) {
          const activeButtonContainer = this.presetButtons[index];
          const buttonBg = activeButtonContainer.buttonBg;
          const buttonText = activeButtonContainer.buttonText;
          
          buttonBg.clear();
          buttonBg.fillStyle(0x00e5ff, 1);
          buttonBg.fillRoundedRect(-50, -18, 100, 36, 18);
          buttonBg.lineStyle(2, 0xffffff, 1);
          buttonBg.strokeRoundedRect(-50, -18, 100, 36, 18);
          
          buttonText.setStyle({ color: '#000000' });
          activeButtonContainer.setScale(1.08);

          this.scene.tweens.add({
              targets: activeButtonContainer,
              alpha: { from: 1, to: 0.85 },
              duration: 800,
              ease: 'Sine.easeInOut',
              yoyo: true,
              repeat: -1
          });
      }
  }

  checkCurrentFrequencyForPreset() {
      const currentFreq = Math.round(this.binauralGenerator.binauralFreq);
      const presetFreqs = [7, 10, 40];
      const matchIndex = presetFreqs.indexOf(currentFreq);
      
      if (matchIndex !== -1) {
          this.setActivePreset(matchIndex);
      } else {
          this.setActivePreset(-1);
      }
  }
}