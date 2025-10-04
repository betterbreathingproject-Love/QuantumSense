

export class OnboardingManager {
    constructor(journalInterface, onComplete) {
        this.journalInterface = journalInterface;
        // Provide a safe default completion that returns to main page when running standalone
        this.onComplete = typeof onComplete === 'function' ? onComplete : (() => {
            try {
                const user = JSON.parse(localStorage.getItem('quantumsense-user-data') || '{}');
                if (user && (user.name || user.email)) {
                    if (typeof window !== 'undefined' && window.location && /onboarding\.html$/i.test(window.location.pathname)) {
                        window.location.href = './QuantumSense%20Ai%20Journal-Add%20on%20/index.html';
                    }
                }
            } catch {
                if (typeof window !== 'undefined' && window.location && /onboarding\.html$/i.test(window.location.pathname)) {
                    window.location.href = './QuantumSense%20Ai%20Journal-Add%20on%20/index.html';
                }
            }
        });
        this.userData = this.loadUserData();
        this.header = document.querySelector('.header');
        this.start();
    }

    loadUserData() {
        try {
            return JSON.parse(localStorage.getItem('quantumsense-user-data') || '{}');
        } catch {
            return {};
        }
    }

    saveUserData() {
        localStorage.setItem('quantumsense-user-data', JSON.stringify(this.userData));
    }

    start() {
        // Hide the main header during onboarding
        if (this.header) {
            this.header.style.display = 'none';
        }
        this.showWelcomeStep();
    }

    showWelcomeStep() {
        this.journalInterface.innerHTML = '';

        const welcomeContainer = this.createWelcomeInterface();
        this.journalInterface.appendChild(welcomeContainer);
        this.addOnboardingStyles();
    }

    createWelcomeInterface() {
        const container = document.createElement('div');
        container.className = 'onboarding-container welcome-step';

        const cosmicBg = document.createElement('div');
        cosmicBg.className = 'cosmic-background';
        container.appendChild(cosmicBg);

        const content = document.createElement('div');
        content.className = 'onboarding-content';

        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'ai-avatar-container';

        // Read optional avatar configuration so we can support GIF/image as well as video
        const cfg = {
            src: (typeof localStorage !== 'undefined' ? localStorage.getItem('aiAvatarSrc') : null),
            type: (typeof localStorage !== 'undefined' ? localStorage.getItem('aiAvatarType') : null),
            size: (typeof localStorage !== 'undefined' ? parseInt(localStorage.getItem('aiAvatarSize') || '120', 10) : 120),
            shape: (typeof localStorage !== 'undefined' ? localStorage.getItem('aiAvatarShape') || 'circle' : 'circle')
        };
        
        // Default to the infinity GIF in the project root assets if no custom avatar is set
        // Use an absolute path so it works whether this runs from the root index.html or the add-on index.html
        const defaultInfinityPath = '/assets/infinity.gif';
        try {
            if (!cfg.src || cfg.src.trim() === '') {
                cfg.src = defaultInfinityPath;
                cfg.type = 'image';
                // Persist for subsequent loads; safe to ignore errors
                localStorage.setItem('aiAvatarSrc', cfg.src);
                localStorage.setItem('aiAvatarType', 'image');
            }
        } catch {}
        // Apply size/shape preferences to the container
        try {
            avatarContainer.style.width = `${cfg.size}px`;
            avatarContainer.style.height = `${cfg.size}px`;
            if (cfg.shape === 'rounded') {
                avatarContainer.style.borderRadius = '16px';
            } else {
                avatarContainer.style.borderRadius = '50%';
            }
        } catch {}

        const isImageSrc = cfg.src && (/\.(gif|png|jpg|jpeg|svg)$/i.test(cfg.src) || (cfg.type || '').toLowerCase() === 'image');
        if (isImageSrc && cfg.src) {
            const img = new Image();
            img.className = 'ai-avatar-image';
            img.src = cfg.src;
            img.onload = () => {
                // Image loaded successfully; nothing else required
            };
            img.onerror = () => {
                console.warn('AI avatar image failed to load, falling back to video asset');
                avatarContainer.innerHTML = '';
                const fallbackVideo = document.createElement('video');
                fallbackVideo.className = 'ai-avatar-video';
                const localSrc = './QuantumSense%20Ai%20Journal-Add%20on%20/assets/89bb595c589a8797e525e7ae9b04253c.mp4';
                const remoteSrc = 'https://play.rosebud.ai/assets/89bb595c589a8797e525e7ae9b04253c.mp4?i6LY';
                fallbackVideo.src = localSrc;
                fallbackVideo.autoplay = true;
                fallbackVideo.loop = true;
                fallbackVideo.muted = true;
                fallbackVideo.playsInline = true;
                fallbackVideo.preload = 'metadata';
                fallbackVideo.addEventListener('error', () => {
                    try {
                        if (fallbackVideo.src.includes('QuantumSense%20Ai%20Journal-Add%20on%20')) {
                            fallbackVideo.src = remoteSrc;
                            fallbackVideo.load();
                            return;
                        }
                    } catch {}
                    avatarContainer.innerHTML = `
                        <div class="avatar-fallback">
                            <span class="cosmic-spark">🤖</span>
                            <span class="avatar-fallback-text">AI Coach</span>
                        </div>
                    `;
                });
                fallbackVideo.addEventListener('abort', () => {
                    avatarContainer.innerHTML = `
                        <div class="avatar-fallback">
                            <span class="cosmic-spark">🤖</span>
                            <span class="avatar-fallback-text">AI Coach</span>
                        </div>
                    `;
                });
                avatarContainer.appendChild(fallbackVideo);
            };
            avatarContainer.appendChild(img);
        } else {
            // Default: use existing video avatar with robust fallback
            const avatarVideo = document.createElement('video');
            avatarVideo.className = 'ai-avatar-video';
            const localSrc = './QuantumSense%20Ai%20Journal-Add%20on%20/assets/89bb595c589a8797e525e7ae9b04253c.mp4';
            const remoteSrc = 'https://play.rosebud.ai/assets/89bb595c589a8797e525e7ae9b04253c.mp4?i6LY';
            avatarVideo.src = localSrc;
            avatarVideo.autoplay = true;
            avatarVideo.loop = true;
            avatarVideo.muted = true;
            avatarVideo.playsInline = true;
            avatarVideo.preload = 'metadata';
            avatarVideo.addEventListener('error', () => {
                try {
                    if (avatarVideo.src.includes('QuantumSense%20Ai%20Journal-Add%20on%20')) {
                        avatarVideo.src = remoteSrc;
                        avatarVideo.load();
                        return;
                    }
                } catch {}
                console.warn('AI avatar video failed to load, showing fallback');
                avatarContainer.innerHTML = `
                    <div class="avatar-fallback">
                        <span class="cosmic-spark">🤖</span>
                        <span class="avatar-fallback-text">AI Coach</span>
                    </div>
                `;
            });
            avatarVideo.addEventListener('abort', () => {
                console.warn('AI avatar video load aborted, using fallback');
                avatarContainer.innerHTML = `
                    <div class="avatar-fallback">
                        <span class="cosmic-spark">🤖</span>
                        <span class="avatar-fallback-text">AI Coach</span>
                    </div>
                `;
            });
            avatarContainer.appendChild(avatarVideo);
        }
        content.appendChild(avatarContainer);
        const title = document.createElement('h1');
        title.className = 'welcome-title';
        title.innerHTML = `
            <span class="cosmic-spark">✨</span>
            Welcome!
            <span class="cosmic-spark">🔮</span>
        `;
        content.appendChild(title);
        const welcomeMessage = document.createElement('p');
        welcomeMessage.className = 'welcome-message';
        welcomeMessage.textContent = "I'm your personal QuantumSense AI Coach, here to guide your intuition, reveal hidden patterns, and help you weave clarity from the quantum field.";
        content.appendChild(welcomeMessage);

        const features = document.createElement('div');
        features.className = 'welcome-features';
        features.innerHTML = `
            <div class="feature-item">
                <span class="feature-icon">🌟</span>
                <span>Intuitive Pattern Recognition</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">🧘‍♀️</span>
                <span>Psychic Development Insights</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">🌊</span>
                <span>Quantum Field Awareness</span>
            </div>
        `;
        content.appendChild(features);

        const continueButton = document.createElement('button');
        continueButton.className = 'cosmic-button primary';
        continueButton.innerHTML = `
            <span>Begin Your Journey</span>
            <span class="button-spark">✨</span>
        `;
        continueButton.addEventListener('click', () => this.showNameEmailStep());
        content.appendChild(continueButton);

        container.appendChild(content);
        return container;
    }

    showNameEmailStep() {
        this.journalInterface.innerHTML = '';

        const nameEmailContainer = this.createNameEmailInterface();
        this.journalInterface.appendChild(nameEmailContainer);
    }

    createNameEmailInterface() {
        const container = document.createElement('div');
        container.className = 'onboarding-container name-email-step';

        const content = document.createElement('div');
        content.className = 'onboarding-content';

        const title = document.createElement('h2');
        title.className = 'step-title';
        title.innerHTML = `
            <span class="step-number">Step 2</span>
            What is your name, fellow explorer? 🌟
        `;
        content.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.className = 'step-subtitle';
        subtitle.textContent = "Let's personalize your quantum journey together.";
        content.appendChild(subtitle);

        const form = document.createElement('div');
        form.className = 'onboarding-form';

        const nameGroup = document.createElement('div');
        nameGroup.className = 'input-group';
        nameGroup.innerHTML = `
            <label for="userName">Your Name</label>
            <input type="text" id="userName" placeholder="Enter your name" class="cosmic-input">
        `;
        form.appendChild(nameGroup);

        const emailGroup = document.createElement('div');
        emailGroup.className = 'input-group';
        emailGroup.innerHTML = `
            <label for="userEmail">Email (optional)</label>
            <input type="email" id="userEmail" placeholder="your@email.com" class="cosmic-input">
        `;
        form.appendChild(emailGroup);

        const socialSection = document.createElement('div');
        socialSection.className = 'social-login-section';
        socialSection.innerHTML = `
            <div class="login-divider">
                <span>or connect with</span>
            </div>
            <div class="social-buttons">
                <button class="social-button google-button" onclick="alert('Google login integration would go here')">
                    <span>📧</span>
                    <span>Continue with Google</span>
                </button>
                <button class="social-button facebook-button" onclick="alert('Facebook login integration would go here')">
                    <span>📘</span>
                    <span>Continue with Facebook</span>
                </button>
            </div>
        `;
        form.appendChild(socialSection);

        const continueButton = document.createElement('button');
        continueButton.className = 'cosmic-button primary';
        continueButton.innerHTML = `
            <span>Continue to Intention Setting</span>
            <span class="button-spark">🔮</span>
        `;
        continueButton.addEventListener('click', () => this.saveUserInfoAndContinue());
        form.appendChild(continueButton);

        content.appendChild(form);
        container.appendChild(content);
        return container;
    }

    saveUserInfoAndContinue() {
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();

        if (!name) {
            alert('Please enter your name to continue your quantum journey.');
            return;
        }

        this.userData.name = name;
        this.userData.email = email;
        this.saveUserData();

        this.showIntentionStep();
    }

    showIntentionStep() {
        this.journalInterface.innerHTML = '';

        const intentionContainer = this.createIntentionInterface();
        this.journalInterface.appendChild(intentionContainer);
    }

    createIntentionInterface() {
        const container = document.createElement('div');
        container.className = 'onboarding-container intention-step';

        const content = document.createElement('div');
        content.className = 'onboarding-content';

        const title = document.createElement('h2');
        title.className = 'step-title';
        title.innerHTML = `
            <span class="step-number">Step 3</span>
            How are you feeling today, ${this.userData.name}? ✨
        `;
        content.appendChild(title);

        const moodSection = document.createElement('div');
        moodSection.className = 'intention-mood-section';

        const moodLabel = document.createElement('label');
        moodLabel.className = 'mood-label';
        moodLabel.textContent = 'Tune into your current energy:';
        moodSection.appendChild(moodLabel);

        const moodOptions = document.createElement('div');
        moodOptions.className = 'intention-mood-options';

        const moods = [
            { id: 'vibrant', emoji: '✨', label: 'Vibrant', color: '#c026d3' },
            { id: 'insightful', emoji: '👁️', label: 'Insightful', color: '#4f46e5' },
            { id: 'grounded', emoji: '🧘', label: 'Grounded', color: '#16a34a' },
            { id: 'foggy', emoji: '🌫️', label: 'Foggy', color: '#64748b' },
            { id: 'heavy', emoji: '😩', label: 'Heavy', color: '#b91c1c' }
        ];

        let selectedMood = null;

        const continueButton = document.createElement('button');

        moods.forEach(mood => {
            const moodButton = document.createElement('button');
            moodButton.type = 'button';
            moodButton.className = 'intention-mood-option';
            moodButton.setAttribute('data-mood', mood.id);

            const emoji = document.createElement('span');
            emoji.className = 'mood-emoji';
            emoji.textContent = mood.emoji;

            const label = document.createElement('span');
            label.className = 'mood-label-text';
            label.textContent = mood.label;

            moodButton.appendChild(emoji);
            moodButton.appendChild(label);

            moodButton.addEventListener('click', () => {
                moodOptions.querySelectorAll('.intention-mood-option').forEach(option => {
                    option.classList.remove('selected');
                });
                moodButton.classList.add('selected');
                selectedMood = mood.id;
                continueButton.disabled = false;
                continueButton.classList.remove('disabled');
            });

            moodOptions.appendChild(moodButton);
        });

        moodSection.appendChild(moodOptions);
        content.appendChild(moodSection);

        const intentionSection = document.createElement('div');
        intentionSection.className = 'intention-text-section';

        const intentionLabel = document.createElement('label');
        intentionLabel.className = 'intention-label';
        intentionLabel.textContent = 'Before we begin, set your intention:';
        intentionSection.appendChild(intentionLabel);

        const intentionSubtext = document.createElement('p');
        intentionSubtext.className = 'intention-subtext';
        intentionSubtext.textContent = 'Is there something meaningful arising for you today?';
        intentionSection.appendChild(intentionSubtext);

        const intentionTextarea = document.createElement('textarea');
        intentionTextarea.id = 'intentionText';
        intentionTextarea.className = 'intention-textarea';
        intentionTextarea.placeholder = 'Share what feels important or what you\'re seeking guidance on today...';
        intentionTextarea.rows = 4;
        intentionSection.appendChild(intentionTextarea);

        content.appendChild(intentionSection);

        continueButton.className = 'cosmic-button primary disabled';
        continueButton.disabled = true;
        continueButton.innerHTML = `
            <span>Enter Your Quantum Dashboard</span>
            <span class="button-spark">🌟</span>
        `;
        continueButton.addEventListener('click', () => {
            if (selectedMood) {
                this.saveIntentionAndComplete(selectedMood);
            }
        });
        content.appendChild(continueButton);

        container.appendChild(content);
        return container;
    }

    saveIntentionAndComplete(selectedMood) {
        const intentionText = document.getElementById('intentionText').value.trim();

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;

        this.userData.hasCompletedOnboarding = true;
        this.userData.onboardingCompletedAt = Date.now();
        this.saveUserData();
        // Show the header again when onboarding is complete
        if (this.header) {
            this.header.style.display = 'block';
        }
        this.onComplete({
            date: formattedDate,
            text: intentionText,
            mood: selectedMood,
        });
    }

    addOnboardingStyles() {
        if (!document.getElementById('onboardingStyles')) {
            const styles = document.createElement('style');
            styles.id = 'onboardingStyles';
            styles.textContent = `
                .onboarding-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem 1rem;
                    position: relative;
                    overflow-y: auto; /* allow scrolling so buttons are not clipped */
                    box-sizing: border-box;
                    background-color: #000; /* Ensure solid black background to avoid transparency */
                }

                .cosmic-background {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: radial-gradient(circle at 20% 30%, rgba(138, 43, 226, 0.1) 0%, transparent 50%),
                                radial-gradient(circle at 80% 70%, rgba(72, 61, 139, 0.1) 0%, transparent 50%),
                                radial-gradient(circle at 50% 50%, rgba(25, 25, 112, 0.05) 0%, transparent 70%);
                    animation: cosmicPulse 8s ease-in-out infinite;
                }

                @keyframes cosmicPulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.6; }
                }

                .onboarding-content {
                    /* Solid, high-contrast card to ensure text is always readable */
                    background: #000000;
                    border: 1px solid #222222;
                    border-radius: 20px;
                    padding: 2.5rem 1.75rem;
                    max-width: 560px;
                    width: 100%;
                    text-align: center;
                    position: relative;
                    backdrop-filter: none;
                    -webkit-backdrop-filter: none;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                }
                .ai-avatar-container {
                    width: 200px;
                    height: 200px;
                    margin: 0 auto 2rem;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 3px solid rgba(139, 92, 246, 0.3);
                    box-shadow: 0 0 30px rgba(139, 92, 246, 0.2);
                    position: relative;
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1));
                }
                .ai-avatar-video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center;
                    transform: scale(1.15);
                    filter: brightness(1.1) contrast(1.1);
                }
                /* Make the GIF/image slightly smaller so it fits comfortably inside the circle */
                .ai-avatar-image {
                    width: 100%;
                    height: 100%;
                    object-fit: contain; /* prevent cropping */
                    object-position: center;
                    transform: scale(0.9); /* reduce size within the circle */
                    background: #000; /* fill any letterbox area with dark bg */
                    filter: brightness(1.05) contrast(1.1);
                }
                .avatar-fallback {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    background: linear-gradient(135deg, #8b5cf6, #a855f7, #ec4899);
                }
                .avatar-fallback .cosmic-spark {
                    font-size: 4rem;
                    animation: sparkle 2s ease-in-out infinite;
                }
                .avatar-fallback-text {
                    color: white;
                    font-weight: 600;
                    font-size: 1rem;
                }
                @keyframes sparkle {
                    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
                    50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
                }
                .welcome-message {
                    font-size: 1.1rem;
                    color: #e6e6e6; /* brighter text for readability */
                    line-height: 1.7;
                    margin-bottom: 2rem;
                    font-weight: 400;
                    text-align: center;
                    text-shadow: 0 1px 0 rgba(0,0,0,0.6);
                }
                .welcome-title {
                    font-size: 2.5rem;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                    background: linear-gradient(135deg, #e879f9, #a855f7, #3b82f6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    line-height: 1.2;
                }
                .cosmic-spark {
                    display: inline-block;
                    animation: sparkle 2s ease-in-out infinite;
                }

                .welcome-features {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 2.5rem;
                }

                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: #0d0d0d; /* opaque tile for clearer text */
                    border-radius: 12px;
                    border: 1px solid #222222;
                    transition: all 0.3s ease;
                    color: #ffffff; /* Ensure tile text is white for readability */
                }

                .feature-item:hover {
                    background: #151515;
                    border-color: #2e2e2e;
                    transform: translateY(-2px);
                }

                .feature-icon {
                    font-size: 1.5rem;
                }

                /* Ensure inner text nodes render white inside tiles */
                .feature-item span,
                .feature-item p,
                .feature-item div,
                .feature-item .feature-title {
                    color: #ffffff;
                }

                .cosmic-button {
                    background: linear-gradient(135deg, #8b5cf6, #a855f7, #ec4899);
                    color: white;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 50px;
                    font-family: inherit;
                    font-size: 1rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    min-width: 200px;
                    margin: 0 auto;
                }

                .cosmic-button:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4);
                }

                .cosmic-button.disabled {
                    background: #444444;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .button-spark {
                    animation: sparkle 1.5s ease-in-out infinite;
                }

                .step-title {
                    font-size: 1.8rem;
                    font-weight: 500;
                    margin-bottom: 1rem;
                    color: #ffffff;
                }

                .step-number {
                    display: inline-block;
                    background: linear-gradient(135deg, #8b5cf6, #a855f7);
                    color: white;
                    padding: 0.3rem 0.8rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    margin-right: 1rem;
                    vertical-align: middle;
                }

                .step-subtitle {
                    color: #aaaaaa;
                    margin-bottom: 2rem;
                    font-weight: 300;
                }

                .onboarding-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    text-align: left;
                }

                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .input-group label {
                    color: #cccccc;
                    font-weight: 500;
                    font-size: 0.9rem;
                }

                .cosmic-input {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 1rem;
                    color: #ffffff;
                    font-family: inherit;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                }

                .cosmic-input:focus {
                    outline: none;
                    border-color: rgba(139, 92, 246, 0.5);
                    background: rgba(255, 255, 255, 0.08);
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
                }

                .cosmic-input::placeholder {
                    color: #666666;
                }

                .social-login-section {
                    text-align: center;
                }

                .login-divider {
                    position: relative;
                    margin: 1.5rem 0;
                    color: #888888;
                    font-size: 0.9rem;
                }

                .login-divider::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.1);
                    z-index: 1;
                }

                .login-divider span {
                    background: #0a0a0a;
                    padding: 0 1rem;
                    position: relative;
                    z-index: 2;
                }

                .social-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .social-button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    padding: 0.875rem 1.5rem;
                    border-radius: 12px;
                    font-family: inherit;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .google-button {
                    background: rgba(234, 67, 53, 0.1);
                    color: #ffffff;
                }

                .google-button:hover {
                    background: rgba(234, 67, 53, 0.2);
                    border-color: rgba(234, 67, 53, 0.3);
                }

                .facebook-button {
                    background: rgba(24, 119, 242, 0.1);
                    color: #ffffff;
                }

                .facebook-button:hover {
                    background: rgba(24, 119, 242, 0.2);
                    border-color: rgba(24, 119, 242, 0.3);
                }

                .intention-mood-section {
                    margin-bottom: 2rem;
                }

                .intention-mood-options {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                    gap: 1rem;
                    margin-top: 1rem;
                }

                .intention-mood-option {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 1rem 0.5rem;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-family: inherit;
                    color: #cccccc;
                }

                .intention-mood-option:hover {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateY(-2px);
                }

                .intention-mood-option.selected {
                    background: rgba(139, 92, 246, 0.2);
                    border-color: rgba(139, 92, 246, 0.5);
                    color: #ffffff;
                    transform: translateY(-2px);
                }

                .intention-text-section {
                    text-align: left;
                    margin-bottom: 2rem;
                }

                .intention-label {
                    color: #cccccc;
                    font-weight: 500;
                    font-size: 1rem;
                    margin-bottom: 0.5rem;
                    display: block;
                }

                .intention-subtext {
                    color: #888888;
                    font-size: 0.9rem;
                    margin-bottom: 1rem;
                    font-style: italic;
                }

                .intention-textarea {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 1rem;
                    color: #ffffff;
                    font-family: inherit;
                    font-size: 1rem;
                    resize: vertical;
                    min-height: 100px;
                    transition: all 0.3s ease;
                }

                .intention-textarea:focus {
                    outline: none;
                    border-color: rgba(139, 92, 246, 0.5);
                    background: rgba(255, 255, 255, 0.08);
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
                }

                .intention-textarea::placeholder {
                    color: #666666;
                    font-style: italic;
                }

                @media (max-width: 768px) {
                    .onboarding-content {
                        padding: 1.5rem 1.25rem;
                        margin: 1rem;
                    }
                    .ai-avatar-container {
                        width: 140px;
                        height: 140px;
                    }
                    .welcome-message {
                        font-size: 1rem;
                    }
                    .welcome-title {
                        font-size: 2rem;
                    }

                    .social-buttons {
                        flex-direction: column;
                    }

                    .intention-mood-options {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 0.75rem;
                    }
                }
                /* Reduce vertical footprint when screen height is small */
                @media (max-height: 700px) {
                    .onboarding-container { padding: 1rem 0.75rem; }
                    .onboarding-content { padding: 1.25rem 1rem; }
                    .welcome-title { font-size: 1.75rem; }
                    .ai-avatar-container { width: 120px; height: 120px; }
                }
                @media (max-width: 480px) {
                    .ai-avatar-container {
                        width: 120px;
                        height: 120px;
                    }
                    
                    .ai-avatar-video { transform: scale(1.25); }
                    .ai-avatar-image { transform: scale(0.85); }
                    
                    .welcome-message {
                        font-size: 0.95rem;
                        margin-bottom: 1.5rem;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }
}

