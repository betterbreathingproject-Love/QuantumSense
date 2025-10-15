/**
 * Dynamic Scaling Utilities for QuantumSense
 * Provides responsive scaling functions for fonts, positioning, and dimensions
 */

class ScalingUtils {
    constructor(scene) {
        this.scene = scene;
        this.baseWidth = 576;  // Base design width
        this.baseHeight = 1024; // Base design height
        this.minScale = 0.5;   // Minimum scale factor
        this.maxScale = 2.0;   // Maximum scale factor
        
        this.updateScaleFactors();
    }
    
    /**
     * Update scaling factors based on current viewport
     */
    updateScaleFactors() {
        if (!this.scene || !this.scene.sys || !this.scene.sys.game) {
            return;
        }
        
        const { width, height } = this.scene.sys.game.config;
        
        // Calculate scale factors with improved responsiveness
        this.scaleX = Math.max(0.4, Math.min(3.0, width / this.baseWidth));
        this.scaleY = Math.max(0.4, Math.min(3.0, height / this.baseHeight));
        
        // Enhanced uniform scale calculation for better balance
        this.uniformScale = Math.max(0.4, Math.min(2.5, Math.sqrt(this.scaleX * this.scaleY)));
        
        // Improved text scaling with better readability across devices
        const aspectRatio = width / height;
        const baseAspectRatio = this.baseWidth / this.baseHeight;
        const aspectAdjustment = Math.max(0.8, Math.min(1.2, aspectRatio / baseAspectRatio));
        
        this.textScale = Math.max(0.5, Math.min(2.0, this.uniformScale * aspectAdjustment));
        
        // Add breakpoint-based adjustments for better mobile/desktop experience
        if (width <= 480) {
            // Small mobile screens - prioritize readability
            this.textScale = Math.max(0.7, this.textScale);
            this.uniformScale = Math.max(0.6, this.uniformScale);
        } else if (width <= 768) {
            // Tablet/large mobile - balanced scaling
            this.textScale = Math.max(0.8, this.textScale);
        } else if (width >= 1200) {
            // Large desktop - prevent oversized elements
            this.textScale = Math.min(1.5, this.textScale);
            this.uniformScale = Math.min(1.8, this.uniformScale);
        }
    }
    
    /**
     * Scale font size responsively
     * @param {number} baseFontSize - Base font size in pixels
     * @returns {string} Scaled font size with 'px' suffix
     */
    scaleFontSize(baseFontSize) {
        return Math.round(baseFontSize * this.textScale) + 'px';
    }
    
    /**
     * Scale dimension (width/height) responsively
     * @param {number} baseDimension - Base dimension in pixels
     * @returns {number} Scaled dimension
     */
    scaleDimension(baseDimension) {
        return Math.round(baseDimension * this.uniformScale);
    }
    
    /**
     * Scale X position responsively
     * @param {number} baseX - Base X position
     * @returns {number} Scaled X position
     */
    scaleXCoordinate(baseX) {
        return Math.round(baseX * this.scaleX);
    }
    
    /**
     * Scale Y position responsively
     * @param {number} baseY - Base Y position
     * @returns {number} Scaled Y position
     */
    scaleYCoordinate(baseY) {
        return Math.round(baseY * this.scaleY);
    }
    
    /**
     * Scale position object responsively
     * @param {Object} position - {x, y} position object
     * @returns {Object} Scaled position object
     */
    scalePosition(position) {
        return {
            x: this.scaleXCoordinate(position.x),
            y: this.scaleYCoordinate(position.y)
        };
    }
    
    /**
     * Get responsive text style object
     * @param {Object} baseStyle - Base text style with fontSize in pixels
     * @returns {Object} Scaled text style
     */
    getResponsiveTextStyle(baseStyle) {
        const scaledStyle = { ...baseStyle };
        
        if (baseStyle.fontSize) {
            // Extract numeric value from fontSize (remove 'px' if present)
            const fontSize = typeof baseStyle.fontSize === 'string' 
                ? parseInt(baseStyle.fontSize.replace('px', ''))
                : baseStyle.fontSize;
            scaledStyle.fontSize = this.scaleFontSize(fontSize);
        }
        
        return scaledStyle;
    }
    
    /**
     * Get responsive dimensions for UI elements
     * @param {Object} baseDimensions - {width, height} object
     * @returns {Object} Scaled dimensions
     */
    getResponsiveDimensions(baseDimensions) {
        return {
            width: this.scaleDimension(baseDimensions.width),
            height: this.scaleDimension(baseDimensions.height)
        };
    }
    
    /**
     * Get current viewport-relative units for CSS
     * @returns {Object} CSS scaling variables
     */
    getCSSScalingVars() {
        return {
            '--scale-factor': this.uniformScale,
            '--text-scale': this.textScale,
            '--base-font-size': `${16 * this.textScale}px`,
            '--small-font-size': `${12 * this.textScale}px`,
            '--large-font-size': `${24 * this.textScale}px`,
            '--xlarge-font-size': `${32 * this.textScale}px`
        };
    }
    
    /**
     * Apply responsive scaling to existing text object
     * @param {Phaser.GameObjects.Text} textObject - Phaser text object
     * @param {number} baseFontSize - Original font size
     */
    applyResponsiveText(textObject, baseFontSize) {
        textObject.setFontSize(this.scaleFontSize(baseFontSize));
    }
    
    /**
     * Create responsive text with automatic scaling and resize handling
     * @param {number} x - X position
     * @param {number} y - Y position  
     * @param {string} text - Text content
     * @param {Object} style - Text style object
     * @returns {Phaser.GameObjects.Text} Scaled text object
     */
    createResponsiveText(x, y, text, style) {
        const scaledStyle = this.getResponsiveTextStyle(style);
        const scaledX = this.scaleXCoordinate(x);
        const scaledY = this.scaleYCoordinate(y);
        
        const textObject = this.scene.add.text(scaledX, scaledY, text, scaledStyle);
        
        // Store original values for resize handling
        textObject.setData('responsive', true);
        textObject.setData('originalFontSize', style.fontSize || 16);
        textObject.setData('originalX', x);
        textObject.setData('originalY', y);
        
        return textObject;
    }
    
    /**
     * Create responsive UI container with automatic scaling
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Phaser.GameObjects.Container} Scaled container
     */
    createResponsiveContainer(x, y) {
        const scaledX = this.scaleXCoordinate(x);
        const scaledY = this.scaleYCoordinate(y);
        
        const container = this.scene.add.container(scaledX, scaledY);
        container.setData('responsive', true);
        container.setData('originalX', x);
        container.setData('originalY', y);
        
        return container;
    }
    
    /**
     * Create responsive button with automatic scaling
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Button text
     * @param {Object} style - Button style
     * @param {Function} callback - Click callback
     * @returns {Phaser.GameObjects.Text} Responsive button
     */
    createResponsiveButton(x, y, text, style, callback) {
        const button = this.createResponsiveText(x, y, text, {
            ...style,
            backgroundColor: style.backgroundColor || '#2d0b4b',
            padding: {
                x: this.scaleSpacing(style.padding?.x || 20),
                y: this.scaleSpacing(style.padding?.y || 10)
            }
        });
        
        button.setInteractive({ useHandCursor: true });
        
        // Add responsive hover effects
        button.on('pointerover', () => {
            this.scene.tweens.add({
                targets: button,
                scale: 1.05,
                duration: 200,
                ease: 'Sine.easeOut'
            });
        });
        
        button.on('pointerout', () => {
            this.scene.tweens.add({
                targets: button,
                scale: 1,
                duration: 200,
                ease: 'Sine.easeIn'
            });
        });
        
        button.on('pointerdown', () => {
            this.scene.tweens.add({
                targets: button,
                scale: 0.95,
                duration: 100,
                ease: 'Sine.easeIn',
                yoyo: true,
                onComplete: callback
            });
        });
        
        return button;
    }
    
    /**
     * Update scaling when screen size changes
     */
    onResize() {
        this.updateScaleFactors();
        
        // Update CSS variables if available
        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            const cssVars = this.getCSSScalingVars();
            
            Object.entries(cssVars).forEach(([key, value]) => {
                root.style.setProperty(key, value);
            });
            
            // Trigger a custom event for other components to respond to scaling changes
            const scalingEvent = new CustomEvent('scalingUpdated', {
                detail: {
                    scaleX: this.scaleX,
                    scaleY: this.scaleY,
                    uniformScale: this.uniformScale,
                    textScale: this.textScale
                }
            });
            document.dispatchEvent(scalingEvent);
        }
        
        // Update Phaser game objects that use scaling
        if (this.scene && this.scene.children) {
            this.updateExistingGameObjects();
        }
    }
    
    /**
     * Update existing game objects with new scaling
     */
    updateExistingGameObjects() {
        // This method can be called to update existing text objects and UI elements
        // when the screen size changes
        try {
            const textObjects = this.scene.children.list.filter(child => 
                child.type === 'Text' && child.getData && child.getData('responsive')
            );
            
            textObjects.forEach(textObj => {
                const originalFontSize = textObj.getData('originalFontSize');
                if (originalFontSize) {
                    textObj.setFontSize(this.scaleFontSize(originalFontSize));
                }
            });
        } catch (error) {
            console.warn('Error updating existing game objects:', error);
        }
    }
    
    /**
     * Get responsive padding/margin values
     * @param {number} baseValue - Base padding/margin value
     * @returns {number} Scaled value
     */
    scaleSpacing(baseValue) {
        return Math.round(baseValue * this.uniformScale);
    }
    
    /**
     * Get responsive border radius
     * @param {number} baseRadius - Base border radius
     * @returns {number} Scaled border radius
     */
    scaleBorderRadius(baseRadius) {
        return Math.round(baseRadius * this.uniformScale);
    }
}

// Global scaling utility instance
let globalScalingUtils = null;

/**
 * Initialize global scaling utils
 * @param {Phaser.Scene} scene - Current scene
 */
function initializeScaling(scene) {
    globalScalingUtils = new ScalingUtils(scene);
    return globalScalingUtils;
}

/**
 * Get global scaling utils instance
 * @returns {ScalingUtils} Global scaling utils
 */
function getScalingUtils() {
    return globalScalingUtils;
}

/**
 * Quick scaling functions for common use cases
 */
const Scale = {
    font: (size) => globalScalingUtils ? globalScalingUtils.scaleFontSize(size) : size + 'px',
    dim: (size) => globalScalingUtils ? globalScalingUtils.scaleDimension(size) : size,
    x: (x) => globalScalingUtils ? globalScalingUtils.scaleXCoordinate(x) : x,
    y: (y) => globalScalingUtils ? globalScalingUtils.scaleYCoordinate(y) : y,
    pos: (x, y) => globalScalingUtils ? globalScalingUtils.scalePosition({x, y}) : {x, y},
    spacing: (value) => globalScalingUtils ? globalScalingUtils.scaleSpacing(value) : value,
    radius: (value) => globalScalingUtils ? globalScalingUtils.scaleBorderRadius(value) : value
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScalingUtils, initializeScaling, getScalingUtils, Scale };
}

// ES6 exports for modern modules
export { ScalingUtils, initializeScaling, getScalingUtils, Scale };