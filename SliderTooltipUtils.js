export class SliderTooltipUtils {
  constructor(scene) {
    this.scene = scene;
  }

  createVolumeSlider(y, label, initialVolume, callback, containerWidth = 400) {
    const sliderWidth = containerWidth - 80;
    const sliderX = containerWidth / 2;
    const volumeLabel = this.scene.add.text(sliderX, y - 25, label, {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#c9c9c9'
    }).setOrigin(0.5);
    
    const track = this.scene.add.graphics();
    track.fillStyle(0x2d0b4b, 1);
    track.fillRoundedRect(sliderX - sliderWidth / 2, y - 5, sliderWidth, 10, 5);
    
    const fill = this.scene.add.graphics();
    
    const handle = this.scene.add.circle(0, y, 10, 0x00e5ff);
    handle.setStrokeStyle(2, 0xffffff);
    handle.setInteractive({ useHandCursor: true, draggable: true });
    
    const valueDisplay = this.scene.add.text(sliderX, y + 25, `${Math.round(initialVolume * 100)}%`, {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#00e5ff', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const updateSlider = (volume) => {
      const handleX = (sliderX - sliderWidth / 2) + (volume * sliderWidth);
      handle.x = handleX;
      
      fill.clear();
      fill.fillStyle(0x8a2be2, 1);
      const fillWidth = handleX - (sliderX - sliderWidth / 2);
      if (fillWidth > 0) {
        fill.fillRoundedRect(sliderX - sliderWidth / 2, y - 5, fillWidth, 10, 5);
      }
    };
    
    handle.on('drag', (pointer, dragX) => {
      const newX = Phaser.Math.Clamp(dragX, sliderX - sliderWidth / 2, sliderX + sliderWidth / 2);
      const volume = (newX - (sliderX - sliderWidth / 2)) / sliderWidth;
      
      updateSlider(volume);
      valueDisplay.setText(`${Math.round(volume * 100)}%`);
      callback(volume);
    });
    
    updateSlider(initialVolume);
    return [volumeLabel, track, fill, handle, valueDisplay];
  }

  createBinauralSlider(y, label, initialVolume, callback, panelWidth, showFrequency = false) {
    const sliderWidth = panelWidth - 80;
    const sliderX = panelWidth / 2;
    const volumeLabel = this.scene.add.text(sliderX, y - 25, label, {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#c9c9c9'
    }).setOrigin(0.5);
    
    const track = this.scene.add.graphics();
    track.fillStyle(0x2d0b4b, 1);
    track.fillRoundedRect(sliderX - sliderWidth / 2, y - 5, sliderWidth, 10, 5);
    
    const fill = this.scene.add.graphics();
    
    const handle = this.scene.add.circle(0, y, 10, 0x00e5ff);
    handle.setStrokeStyle(2, 0xffffff);
    handle.setInteractive({ useHandCursor: true, draggable: true });
    
    let displayValue;
    if (showFrequency) {
      if (label.includes('Base')) {
        displayValue = `${Math.round(100 + initialVolume * 400)} Hz`;
      } else if (label.includes('Binaural')) {
        displayValue = `${Math.round(initialVolume * 100)} Hz`;
      }
    } else {
      displayValue = `${Math.round(initialVolume * 100)}%`;
    }
    
    const valueDisplay = this.scene.add.text(sliderX, y + 25, displayValue, {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#00e5ff', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const sliderElements = [volumeLabel, track, fill, handle, valueDisplay];
    
    const updateSlider = (volume) => {
      const handleX = (sliderX - sliderWidth / 2) + (volume * sliderWidth);
      handle.x = handleX;
      
      fill.clear();
      fill.fillStyle(0x8a2be2, 1);
      const fillWidth = handleX - (sliderX - sliderWidth / 2);
      if (fillWidth > 0) {
        fill.fillRoundedRect(sliderX - sliderWidth / 2, y - 5, fillWidth, 10, 5);
      }
    };
    
    handle.on('drag', (pointer, dragX) => {
      const newX = Phaser.Math.Clamp(dragX, sliderX - sliderWidth / 2, sliderX + sliderWidth / 2);
      const volume = (newX - (sliderX - sliderWidth / 2)) / sliderWidth;
      updateSlider(volume);
      callback(volume);
    });
    
    updateSlider(initialVolume);
    return sliderElements;
  }

  updateSliderUI(sliderElements, value) {
    if (!sliderElements || sliderElements.length < 5 || !sliderElements[1] || !sliderElements[1].geom) {
      return;
    }
    
    const [label, track, fill, handle, valueDisplay] = sliderElements;
    const sliderWidth = track.geom.width;
    const sliderX = label.x;
    
    const handleX = (sliderX - sliderWidth / 2) + (value * sliderWidth);
    handle.x = Phaser.Math.Clamp(handleX, sliderX - sliderWidth / 2, sliderX + sliderWidth / 2);
    
    fill.clear();
    fill.fillStyle(0x8a2be2, 1);
    const fillWidth = handle.x - (sliderX - sliderWidth / 2);
    if (fillWidth > 0) {
      fill.fillRoundedRect(sliderX - sliderWidth / 2, handle.y - 5, fillWidth, 10, 5);
    }
    
    if (label.text.toLowerCase().includes('freq')) {
      let freqValue;
      if (label.text.includes('Base')) {
        freqValue = 100 + value * 400;
      } else {
        freqValue = value * 100;
      }
      valueDisplay.setText(`${Math.round(freqValue)} Hz`);
    } else {
      valueDisplay.setText(`${Math.round(value * 100)}%`);
    }
  }

  updateBinauralSliderPosition(sliderElements, value) {
    const [label, track, fill, handle, valueDisplay] = sliderElements;
    const panelWidth = 400;
    const sliderWidth = panelWidth - 80;
    const sliderX = panelWidth / 2;
    const newX = (sliderX - sliderWidth / 2) + (value * sliderWidth);
    handle.x = Phaser.Math.Clamp(newX, sliderX - sliderWidth / 2, sliderX + sliderWidth / 2);
    
    fill.clear();
    fill.fillStyle(0x8a2be2, 1);
    const fillWidth = handle.x - (sliderX - sliderWidth / 2);
    if (fillWidth > 0) {
      fill.fillRoundedRect(sliderX - sliderWidth / 2, handle.y - 5, fillWidth, 10, 5);
    }
  }

  createStatTooltip(text, parent) {
    if (parent.tooltip) {
      document.body.removeChild(parent.tooltip);
      parent.tooltip = null;
    }
    
    const canvas = this.scene.sys.game.canvas;
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);
    
    const parentGlobalPos = parent.getWorldTransformMatrix().transformPoint(0, 0);
    const canvasX = bounds.left + (parentGlobalPos.x * scale);
    const canvasY = bounds.top + (parentGlobalPos.y * scale);
    
    const tooltip = document.createElement('div');
    tooltip.innerHTML = text;
    
    const tooltipWidth = 180;
    const tooltipHeight = 80;
    
    let tooltipX = canvasX - tooltipWidth / 2;
    let tooltipY = canvasY + 55;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (tooltipX < 10) {
      tooltipX = 10;
    } else if (tooltipX + tooltipWidth > viewportWidth - 10) {
      tooltipX = viewportWidth - tooltipWidth - 10;
    }
    
    if (tooltipY < 10) {
      tooltipY = canvasY - tooltipHeight - 10;
    } else if (tooltipY + tooltipHeight > viewportHeight - 10) {
      tooltipY = canvasY - tooltipHeight - 10;
    }
    
    tooltip.style.cssText = `
      position: absolute;
      left: ${tooltipX}px;
      top: ${tooltipY}px;
      width: ${tooltipWidth}px;
      background: rgba(12, 1, 20, 0.98);
      color: #c9c9c9;
      font-family: Arial, sans-serif;
      font-size: 14px;
      padding: 10px;
      border-radius: 8px;
      border: 1.5px solid #00e5ff;
      z-index: 10000;
      pointer-events: none;
      box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
    `;
    
    document.body.appendChild(tooltip);
    parent.tooltip = tooltip;
  }

  createBadgeTooltip(achievement, badge) {
    if (badge.tooltip) {
      document.body.removeChild(badge.tooltip);
      badge.tooltip = null;
    }
    
    const canvas = this.scene.sys.game.canvas;
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);
    
    const badgeGlobalPos = badge.getWorldTransformMatrix().transformPoint(0, 0);
    const canvasX = bounds.left + (badgeGlobalPos.x * scale);
    const canvasY = bounds.top + (badgeGlobalPos.y * scale);
    
    const tooltip = document.createElement('div');
    tooltip.innerHTML = `
      <div style="font-weight: bold; font-size: 16px; color: #ffffff; margin-bottom: 8px;">
        ${achievement.title}
      </div>
      <div style="font-size: 14px; color: #c9c9c9;">
        ${achievement.description}
      </div>
    `;
    
    const tooltipWidth = 220;
    const tooltipHeight = 100;
    
    let tooltipX = canvasX + 45;
    let tooltipY = canvasY - 40;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (tooltipX + tooltipWidth > viewportWidth - 10) {
      tooltipX = canvasX - tooltipWidth - 45;
      if (tooltipX < 10) {
        tooltipX = viewportWidth - tooltipWidth - 10;
      }
    }
    
    if (tooltipX < 10) {
      tooltipX = 10;
    }
    
    if (tooltipY < 10) {
      tooltipY = 10;
    } else if (tooltipY + tooltipHeight > viewportHeight - 10) {
      tooltipY = viewportHeight - tooltipHeight - 10;
    }
    
    tooltip.style.cssText = `
      position: absolute;
      left: ${tooltipX}px;
      top: ${tooltipY}px;
      width: ${tooltipWidth}px;
      background: rgba(12, 1, 20, 0.98);
      font-family: Arial, sans-serif;
      padding: 15px;
      border-radius: 10px;
      border: 2px solid #00e5ff;
      z-index: 10000;
      pointer-events: none;
      box-shadow: 0 0 20px rgba(0, 229, 255, 0.4);
    `;
    
    document.body.appendChild(tooltip);
    badge.tooltip = tooltip;
  }
}