export class TooltipManager {
  constructor(scene) {
    this.scene = scene;
  }

  showTooltip(parent, content, options = {}) {
    if (parent.tooltip) {
      this.hideTooltip(parent);
    }

    const canvas = this.scene.sys.game.canvas;
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);

    const gameWidth = canvas.width * scale;
    const gameHeight = canvas.height * scale;
    const gameLeft = bounds.left + (bounds.width - gameWidth) / 2;
    const gameTop = bounds.top + (bounds.height - gameHeight) / 2;
    const gameRight = gameLeft + gameWidth;
    const gameBottom = gameTop + gameHeight;

    const parentGlobalPos = parent.getWorldTransformMatrix().transformPoint(parent.input?.hitArea.centerX ?? 0, parent.input?.hitArea.centerY ?? 0);
    const canvasX = gameLeft + (parentGlobalPos.x * scale);
    const canvasY = gameTop + (parentGlobalPos.y * scale);
    
    const tooltip = document.createElement('div');
    tooltip.innerHTML = content;

    const {
      width = 250,
      height = 'auto',
      offsetX = 45,
      offsetY = 0,
      borderColor = '#8a2be2',
      boxShadowColor = 'rgba(138, 43, 226, 0.4)',
    } = options;

    document.body.appendChild(tooltip); // Append to get dimensions
    
    const tooltipHeight = tooltip.offsetHeight;
    
    let tooltipX = canvasX + offsetX;
    let tooltipY = canvasY - (tooltipHeight / 2) + offsetY;

    if (tooltipX + width > gameRight - 10) {
      tooltipX = canvasX - width - offsetX;
    }
    if (tooltipX < gameLeft + 10) {
      tooltipX = gameLeft + 10;
    }
    if (tooltipY < gameTop + 10) {
      tooltipY = gameTop + 10;
    } else if (tooltipY + tooltipHeight > gameBottom - 10) {
      tooltipY = gameBottom - tooltipHeight - 10;
    }
    
    tooltip.style.cssText = `
      position: absolute;
      left: ${tooltipX}px;
      top: ${tooltipY}px;
      width: ${width}px;
      background: rgba(12, 1, 20, 0.98);
      font-family: Arial, sans-serif;
      padding: 15px;
      border-radius: 10px;
      border: 2px solid ${borderColor};
      z-index: 10000;
      pointer-events: none;
      box-shadow: 0 0 20px ${boxShadowColor};
      opacity: 0;
      transform: scale(0.95);
      transition: opacity 200ms ease-out, transform 200ms ease-out;
    `;
    
    parent.tooltip = tooltip;
    
    // Force reflow before adding classes for transition
    void tooltip.offsetHeight; 
    
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'scale(1)';
  }

  hideTooltip(parent) {
    if (parent.tooltip) {
      const tooltip = parent.tooltip;
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'scale(0.95)';
      setTimeout(() => {
        if (tooltip.parentElement) {
          document.body.removeChild(tooltip);
        }
      }, 200);
      parent.tooltip = null;
    }
  }

  createBadgeTooltip(achievement, badge) {
    const content = `
      <div style="font-weight: bold; font-size: 16px; color: #ffffff; margin-bottom: 8px;">
        ${achievement.title}
      </div>
      <div style="font-size: 14px; color: #c9c9c9;">
        ${achievement.description}
      </div>
    `;
    this.showTooltip(badge, content, { width: 220, borderColor: '#00e5ff', boxShadowColor: 'rgba(0, 229, 255, 0.4)' });
  }

  createStatTooltip(text, parent) {
      const content = `
        <div style="font-size: 14px; color: #c9c9c9; line-height: 1.4;">
          ${text}
        </div>
      `;
      this.showTooltip(parent, content, { width: 220 });
  }
  
  createDivineBarTooltip(parent, stats) {
    const levelNames = ['Novice', 'Apprentice', 'Adept', 'Master', 'Transcendent'];
    const currentLevelName = levelNames[stats.psychicLevel - 1] || 'Unknown';
    const content = `
      <div style="font-weight: bold; font-size: 16px; color: #ffffff; margin-bottom: 8px;">
        Divine Power Meter
      </div>
      <div style="font-size: 14px; color: #c9c9c9; line-height: 1.4;">
        Current Level: ${currentLevelName}<br>
        Progress: ${stats.levelProgress}/3<br>
        Power: ${stats.psychicPower}/100<br><br>
        Get 3 correct predictions in a row to level up and unlock new challenges!
      </div>
    `;
    this.showTooltip(parent, content, { width: 280 });
  }
  
  createCoherenceTooltip(parent) {
    const content = `
      <div style="font-weight: bold; font-size: 16px; color: #ffffff; margin-bottom: 8px;">
        Coherence Meter
      </div>
      <div style="font-size: 14px; color: #c9c9c9; line-height: 1.4;">
        Measures your heart-brain coherence during breathing exercises.<br><br>
        Higher coherence improves your intuitive abilities and helps you make better predictions.<br><br>
        Practice breathing exercises to increase coherence!
      </div>
    `;
    this.showTooltip(parent, content, { width: 300 });
  }

  createShieldTooltip(parent, stats) {
    const shieldCount = stats.streakShields || 0;
    const content = `
      <div style="font-weight: bold; font-size: 16px; color: #ffffff; margin-bottom: 8px;">
        Streak Shield (${shieldCount})
      </div>
      <div style="font-size: 14px; color: #c9c9c9; line-height: 1.4;">
        Protects your winning streak from being broken by one wrong prediction.<br><br>
        Earn shields by completing 3+ minute breathing exercises.<br><br>
        ${shieldCount > 0 ? 'Your next wrong answer will use a shield instead of breaking your streak!' : 'Complete a breathing exercise to earn your first shield!'}
      </div>
    `;
    this.showTooltip(parent, content, { width: 320, borderColor: '#ffd700', boxShadowColor: 'rgba(255, 215, 0, 0.4)' });
  }

  updateSliderUI(sliderElements, value) {
    if (!sliderElements || !sliderElements.track) return;
    const { track, fill, thumb } = sliderElements;
    const thumbPos = value * track.width;
    fill.width = thumbPos;
    thumb.x = thumbPos;

    if (thumb.tooltip) {
        thumb.tooltip.innerHTML = `${Math.round(value * 100)}%`;
        const canvas = this.scene.sys.game.canvas;
        const bounds = canvas.getBoundingClientRect();
        const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);
        const thumbGlobalPos = thumb.getWorldTransformMatrix();
        const canvasX = bounds.left + (thumbGlobalPos.tx * scale);
        const canvasY = bounds.top + (thumbGlobalPos.ty * scale);

        thumb.tooltip.style.left = `${canvasX - thumb.tooltip.offsetWidth / 2}px`;
        thumb.tooltip.style.top = `${canvasY - 35}px`;
    }
  }
}