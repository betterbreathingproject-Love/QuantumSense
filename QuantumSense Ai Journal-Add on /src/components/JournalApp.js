import { aiHelper } from 'utils/AIHelper.js';
import { OnboardingManager } from 'components/OnboardingManager.js';
export class JournalApp {
    constructor() {
        this.calendarContainer = document.getElementById('calendarContainer');
        this.journalInterface = document.getElementById('journalInterface');
        this.currentDate = new Date();
        this.entries = this.loadEntries();
        this.connectionsViewData = this.loadConnectionsViewData();
        this.insights = this.loadInsights();
        this.userData = this.loadUserData();
        
        this.init();
        this.addDebugKeyListener();
    }
    
    init() {
        this.renderSettingsButton();
        
        // Detect AI Dash embedding (Infinity AI tab) scoped to THIS instance only
        // We must NOT scan the whole DOM because other hidden panels may exist.
        const currentRoot = this.journalInterface?.closest('.embedded-journal-root');
        const isAiDash = !!(currentRoot && currentRoot.getAttribute('data-ai-dash') === 'true');
        if (isAiDash) {
            // Ensure onboarding is considered complete and persist this state
            this.userData.hasCompletedOnboarding = true;
            this.saveUserData();
            this.showDashboard();
            return;
        }
        
        // Otherwise, respect normal onboarding flow when not in AI Dash
        if (this.userData.hasCompletedOnboarding) {
            this.showDashboard();
        } else {
            this.startOnboarding();
        }
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
    
    startOnboarding() {
        this.calendarContainer.style.display = 'none';
        new OnboardingManager(this.journalInterface, (initialEntry) => {
            this.userData = this.loadUserData(); // Reload user data
            if (initialEntry.text || initialEntry.mood) {
                this.entries[initialEntry.date] = {
                    text: initialEntry.text,
                    mood: initialEntry.mood,
                    timestamp: Date.now(),
                    date: initialEntry.date,
                    isInitialIntention: true
                };
                this.saveEntries();
            }
            this.showDashboard();
        });
    }
    addDebugKeyListener() {
        document.addEventListener('keydown', (event) => {
            // Debug key: Cmd+Shift+, (Mac) or Ctrl+Shift+, (Windows/Linux) to clear all journal data
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === ',') {
                event.preventDefault();
                this.clearAllData();
            }
        });
    }
    
    renderSettingsButton() {
        const header = document.querySelector('.header');
        if (!header) return;
        const settingsButton = document.createElement('button');
        settingsButton.className = 'settings-button';
        settingsButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
        `;
        settingsButton.title = 'Clear all journal data';
        settingsButton.addEventListener('click', () => this.clearAllData());
        
        header.appendChild(settingsButton);
        this.addSettingsButtonStyles();
    }
    addSettingsButtonStyles() {
        if (document.getElementById('settingsButtonStyles')) return;
        const styles = document.createElement('style');
        styles.id = 'settingsButtonStyles';
        styles.textContent = `
            .header {
                position: relative;
            }
            .settings-button {
                position: absolute;
                top: -2rem;
                left: 0;
                background: none;
                border: none;
                color: #555555;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 50%;
                transition: all 0.2s ease;
            }
            .settings-button:hover {
                color: #ffffff;
                background: #1a1a1a;
            }
            .settings-button svg {
                display: block;
            }
        `;
        document.head.appendChild(styles);
    }
    
    clearAllData() {
        this.showDebugConfirmModal();
    }
    
    showDebugConfirmModal() {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #1a1a1a;
            border: 1px solid #333333;
            border-radius: 12px;
            padding: 2rem;
            max-width: 400px;
            margin: 1rem;
            text-align: center;
            transform: scale(0.9);
            transition: transform 0.3s ease;
        `;
        
        const title = document.createElement('h3');
        title.textContent = '🧹 Clear All Journal Data?';
        title.style.cssText = `
            color: #ffffff;
            font-size: 1.2rem;
            margin-bottom: 1rem;
            font-weight: 500;
        `;
        
        const message = document.createElement('p');
        message.innerHTML = `This will delete all journal entries and connections data.<br><br><strong>This action cannot be undone.</strong>`;
        message.style.cssText = `
            color: #cccccc;
            font-size: 0.95rem;
            line-height: 1.5;
            margin-bottom: 2rem;
        `;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 1rem;
            justify-content: center;
        `;
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            background: #2a2a2a;
            color: #ffffff;
            border: 1px solid #444444;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-family: inherit;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear Data';
        clearButton.style.cssText = `
            background: #d32f2f;
            color: #ffffff;
            border: 1px solid #f44336;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-family: inherit;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        // Add hover effects
        cancelButton.addEventListener('mouseenter', () => {
            cancelButton.style.background = '#3a3a3a';
        });
        cancelButton.addEventListener('mouseleave', () => {
            cancelButton.style.background = '#2a2a2a';
        });
        
        clearButton.addEventListener('mouseenter', () => {
            clearButton.style.background = '#f44336';
        });
        clearButton.addEventListener('mouseleave', () => {
            clearButton.style.background = '#d32f2f';
        });
        
        // Add event listeners
        cancelButton.addEventListener('click', () => {
            this.closeDebugModal(modalOverlay);
        });
        
        clearButton.addEventListener('click', () => {
            this.performDataClear();
            this.closeDebugModal(modalOverlay);
        });
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.closeDebugModal(modalOverlay);
            }
        });
        
        // Assemble modal
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(clearButton);
        modal.appendChild(title);
        modal.appendChild(message);
        modal.appendChild(buttonContainer);
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);
        
        // Animate in
        setTimeout(() => {
            modalOverlay.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        }, 10);
    }
    
    closeDebugModal(modalOverlay) {
        modalOverlay.style.opacity = '0';
        modalOverlay.querySelector('div').style.transform = 'scale(0.9)';
        setTimeout(() => {
            if (modalOverlay.parentNode) {
                modalOverlay.parentNode.removeChild(modalOverlay);
            }
        }, 300);
    }
    
    performDataClear() {
        // Clear localStorage
        localStorage.removeItem('rosebud-ai-journal-entries');
        localStorage.removeItem('rosebud-ai-connections-view');
        localStorage.removeItem('quantumsense-user-data');
        localStorage.removeItem('quantumsense-insights');
        
        // Reset instance data
        this.entries = {};
        this.connectionsViewData = {};
        this.insights = [];
        this.userData = {};
        
        // Restart onboarding
        this.startOnboarding();
        
        // Log success
        console.log('🧹 Debug: All journal data cleared successfully');
        
        // Show temporary visual feedback
        this.showDebugMessage('All data cleared - restarting onboarding');
    }
    
    showDashboard() {
        this.calendarContainer.style.display = 'none';
        this.journalInterface.innerHTML = '';
        
        // Reload insights to ensure we have the latest data
        this.insights = this.loadInsights();
        
        const dashboardContainer = this.createDashboardInterface();
        this.journalInterface.appendChild(dashboardContainer);
        this.addDashboardStyles();
    }
    
    createDashboardInterface() {
        const container = document.createElement('div');
        container.className = 'dashboard-container';
        
        // Dashboard header
        const header = document.createElement('div');
        header.className = 'dashboard-header';
        
        const containerRoot = document.getElementById('journalInterface')?.closest('.embedded-journal-root');
        const isAiDash = !!(containerRoot && containerRoot.getAttribute('data-ai-dash') === 'true');
        
        // When in AI Dash, show the AI avatar we used in onboarding at the top
        if (isAiDash) {
            const avatarContainer = document.createElement('div');
            avatarContainer.className = 'ai-avatar-container';

            // Optional avatar configuration via localStorage
            const cfg = {
                src: (typeof localStorage !== 'undefined' ? localStorage.getItem('aiAvatarSrc') : null),
                type: (typeof localStorage !== 'undefined' ? localStorage.getItem('aiAvatarType') : null),
                size: (typeof localStorage !== 'undefined' ? parseInt(localStorage.getItem('aiAvatarSize') || '120', 10) : 120),
                shape: (typeof localStorage !== 'undefined' ? localStorage.getItem('aiAvatarShape') || 'circle' : 'circle')
            };
            try {
                avatarContainer.style.width = `${cfg.size}px`;
                avatarContainer.style.height = `${cfg.size}px`;
                avatarContainer.style.borderRadius = (cfg.shape === 'rounded') ? '16px' : '50%';
            } catch {}

            const isImageSrc = cfg.src && (/\.(gif|png|jpg|jpeg|svg)$/i.test(cfg.src) || (cfg.type || '').toLowerCase() === 'image');
            if (isImageSrc && cfg.src) {
                const img = new Image();
                img.className = 'ai-avatar-image';
                img.src = cfg.src;
                img.onerror = () => {
                    console.warn('AI avatar image failed to load, falling back to video');
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
            header.appendChild(avatarContainer);
        }
        
        const welcomeBack = document.createElement('h1');
        welcomeBack.className = 'dashboard-title';
        welcomeBack.innerHTML = `
            <span class="cosmic-spark">🌟</span>
            Welcome back, ${this.userData.name}
            <span class="cosmic-spark">✨</span>
        `;
        header.appendChild(welcomeBack);
        
        const subtitle = document.createElement('p');
        subtitle.className = 'dashboard-subtitle';
        subtitle.textContent = 'Your quantum consciousness journey continues...';
        header.appendChild(subtitle);
        
        container.appendChild(header);
        
        if (isAiDash) {
            // AI Dash layout: Insights (default size), then Today's Journal, then All Entries
            const insightsSection = this.createInsightsSection(false);
            container.appendChild(insightsSection);
            const journalSection = this.createJournalAccessSection();
            container.appendChild(journalSection);
            const allEntriesSection = this.createAllEntriesSection();
            container.appendChild(allEntriesSection);
            return container;
        }
        
        // Default dashboard layout
        // Weekly check-in section
        const weeklySection = this.createWeeklyCheckInSection();
        container.appendChild(weeklySection);

        // Player performance section (placed directly under 7-Day Quantum Streak)
        const performanceSection = this.createPlayerPerformanceSection();
        container.appendChild(performanceSection);

        // Home dash action: Play Now button (separate from AI Dash)
        // Placed directly under performance tiles for quick access
        const homeActions = document.createElement('div');
        homeActions.className = 'home-bottom-actions';
        // Inline styles to ensure visibility even if global styles are missing
        homeActions.style.display = 'flex';
        homeActions.style.justifyContent = 'center';
        homeActions.style.alignItems = 'center';
        homeActions.style.marginTop = '16px';

        const playNowButton = document.createElement('button');
        playNowButton.className = 'cosmic-button primary play-now-button';
        playNowButton.textContent = 'Play Now';
        // Minimal inline styling for consistent UI
        playNowButton.style.padding = '14px 20px';
        playNowButton.style.borderRadius = '12px';
        playNowButton.style.background = 'linear-gradient(90deg, #6b46c1, #3182ce)';
        playNowButton.style.color = '#ffffff';
        playNowButton.style.fontWeight = '600';
        playNowButton.style.border = 'none';
        playNowButton.style.cursor = 'pointer';
        playNowButton.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
        playNowButton.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
        playNowButton.addEventListener('mouseenter', () => {
            playNowButton.style.transform = 'translateY(-1px)';
            playNowButton.style.boxShadow = '0 12px 24px rgba(0,0,0,0.3)';
        });
        playNowButton.addEventListener('mouseleave', () => {
            playNowButton.style.transform = 'translateY(0)';
            playNowButton.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
        });

        playNowButton.addEventListener('click', () => {
            try {
                // Determine target level from last play or player stats
                let lastLevel = parseInt(localStorage.getItem('lastPlayedLevel') || '0', 10);
                if (!lastLevel || Number.isNaN(lastLevel)) {
                    try {
                        const stats = JSON.parse(localStorage.getItem('divineSenseGameStats') || '{}');
                        lastLevel = parseInt(stats?.psychicLevel || '1', 10);
                    } catch {}
                }
                localStorage.setItem('lastPlayedLevel', String(lastLevel || 1));

                // If embedded inside the game, signal to start immediately
                const isEmbeddedInGame = !!(window.JournalBridge) || !!document.querySelector('#phaser-game-container canvas');
                if (isEmbeddedInGame) {
                    try { window.JournalBridge && window.JournalBridge.close(); } catch {}
                    try {
                        window.dispatchEvent(new CustomEvent('quantum-field-play', { detail: { level: lastLevel || 1 } }));
                    } catch {}
                    return;
                }

                // Otherwise navigate to the main game page at root
                try { localStorage.setItem('openJournalOnGameLoad', 'false'); } catch {}
                try { localStorage.setItem('resumeGameOnLoad', '1'); } catch {}
                try { localStorage.setItem('openTabOnLoad', 'games'); } catch {}
                window.location.href = '/index.html';
            } catch (err) {
                console.warn('Play Now: Failed to launch game', err);
                this.showDebugMessage('Unable to open the game.');
            }
        });

        homeActions.appendChild(playNowButton);
        container.appendChild(homeActions);
        
        // Removed Insights section from Home Dash per request
        // Previously: createInsightsSection(true) appended here
        
        return container;
    }
    
    createWeeklyCheckInSection() {
        const section = document.createElement('div');
        section.className = 'weekly-checkin-section';
        
        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'section-title';
        sectionTitle.innerHTML = `
            <span class="section-icon">🔥</span>
            7-Day Quantum Streak
        `;
        section.appendChild(sectionTitle);
        const streakSubtitle = document.createElement('p');
        streakSubtitle.className = 'streak-subtitle';
        streakSubtitle.textContent = 'Complete 7 days to earn a Streak Shield 🛡️';
        section.appendChild(streakSubtitle);
        
        const weekGrid = document.createElement('div');
        weekGrid.className = 'week-grid streak-grid';
        
        // Create 7-day progression starting from today
        const today = new Date();
        const todayKey = this.formatDate(today);
        const hasCompletedToday = this.entries[todayKey];
        
        for (let dayNum = 1; dayNum <= 7; dayNum++) {
            const dayCard = this.createStreakDayCard(dayNum, hasCompletedToday);
            weekGrid.appendChild(dayCard);
        }
        
        section.appendChild(weekGrid);
        return section;
    }

    // Player Performance section styled similarly to the 7-Day Quantum Streak
    createPlayerPerformanceSection() {
        const section = document.createElement('div');
        section.className = 'player-performance-section';

        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'section-title';
        sectionTitle.innerHTML = `
            <span class="section-icon">🏆</span>
            Player Performance
        `;
        section.appendChild(sectionTitle);

        const stats = (() => {
            try {
                return JSON.parse(localStorage.getItem('divineSenseGameStats') || '{}');
            } catch {
                return {};
            }
        })();

        const qScore = Math.round(Number(stats.qScore ?? stats.zenScore ?? 0));
        const accuracy = Number(stats.accuracy ?? 0);
        const totalRolls = Number(stats.totalRolls ?? 0);
        const currentStreak = Number(stats.currentStreak ?? 0);
        const dailyCoherenceTime = Number(stats.dailyCoherenceTime ?? 0);
        const totalCoherenceTime = Number(stats.totalCoherenceTime ?? 0);
        const shieldsOwned = Number(stats.streakShields ?? 0);

        const formatMinutes = (min) => {
            const m = Math.floor(Number(min) || 0);
            if (m < 60) return `${m}m`;
            const h = Math.floor(m / 60);
            const rem = m % 60;
            return `${h}h ${rem}m`;
        };

        const grid = document.createElement('div');
        grid.className = 'performance-grid';

        const makeItem = (icon, label, value, accentClass = '') => {
            const item = document.createElement('div');
            item.className = `performance-item ${accentClass}`;

            const iconEl = document.createElement('div');
            iconEl.className = 'performance-icon';
            iconEl.textContent = icon;
            item.appendChild(iconEl);

            const valueEl = document.createElement('div');
            valueEl.className = 'performance-value';
            valueEl.textContent = value;
            item.appendChild(valueEl);

            const labelEl = document.createElement('div');
            labelEl.className = 'performance-label';
            labelEl.textContent = label;
            item.appendChild(labelEl);

            return item;
        };

        grid.appendChild(makeItem('📈', 'Q-SCORE', `${qScore}`));
        grid.appendChild(makeItem('🎯', 'ACCURACY', `${accuracy.toFixed(1)}%`, 'accent-accuracy'));
        grid.appendChild(makeItem('🌀', 'COHERENCE', `${formatMinutes(dailyCoherenceTime)} today · ${formatMinutes(totalCoherenceTime)} total`));
        grid.appendChild(makeItem('🛡️', 'SHIELDS OWNED', `${shieldsOwned}`));
        grid.appendChild(makeItem('🔥', 'CURRENT STREAK', `${currentStreak}`));
        grid.appendChild(makeItem('🎲', 'TOTAL PREDICTIONS', `${totalRolls}`));

        section.appendChild(grid);
        return section;
    }
    
    createStreakDayCard(dayNum, hasCompletedToday) {
        const card = document.createElement('div');
        const isCurrentDay = dayNum === 1;
        const isUnlocked = dayNum === 1 && hasCompletedToday;
        const isShieldDay = dayNum === 7;
        
        let cardClass = 'day-card streak-day';
        if (isCurrentDay) {
            cardClass += hasCompletedToday ? ' current-completed' : ' current-active';
        } else {
            cardClass += ' future-locked';
        }
        if (isShieldDay) {
            cardClass += ' shield-day';
        }
        
        card.className = cardClass;
        
        const dayLabel = document.createElement('div');
        dayLabel.className = 'day-label';
        // Emphasize labels to match design: TODAY / DAY N
        dayLabel.textContent = isCurrentDay ? 'TODAY' : `DAY ${dayNum}`;
        card.appendChild(dayLabel);
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = dayNum;
        card.appendChild(dayNumber);
        
        const statusIcon = document.createElement('div');
        statusIcon.className = 'day-status';
        
        if (isShieldDay) {
            statusIcon.textContent = '🛡️';
            statusIcon.className += ' shield-icon';
        } else if (isCurrentDay) {
            if (hasCompletedToday) {
                statusIcon.textContent = '✅';
                statusIcon.className += ' completed-icon';
            } else {
                statusIcon.textContent = '📝';
                statusIcon.className += ' active-icon';
            }
        } else {
            statusIcon.textContent = '🔒';
            statusIcon.className += ' locked-icon';
        }
        
        card.appendChild(statusIcon);
        
        // Only allow clicking on current day
        if (isCurrentDay) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                const todayKey = this.formatDate(new Date());
                this.openJournalEntry(todayKey, false);
            });
        } else {
            card.style.cursor = 'default';
            card.title = isShieldDay ? 'Complete 7 days to unlock Shield' : 'Complete previous days first';
        }
        
        // Animation delay
        card.style.animationDelay = `${(dayNum - 1) * 0.1}s`;
        
        return card;
    }
    
    createJournalAccessSection() {
        const section = document.createElement('div');
        section.className = 'journal-access-section';
        
        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'section-title';
        sectionTitle.innerHTML = `
            <span class="section-icon">📝</span>
            Today's Journal
        `;
        section.appendChild(sectionTitle);
        
        const todayKey = this.formatDate(new Date());
        const hasEntry = this.entries[todayKey];
        
        const journalCard = document.createElement('div');
        journalCard.className = 'journal-access-card';
        
        const journalIcon = document.createElement('div');
        journalIcon.className = 'journal-access-icon';
        journalIcon.textContent = hasEntry ? '📖' : '✍️';
        journalCard.appendChild(journalIcon);
        
        const journalContent = document.createElement('div');
        journalContent.className = 'journal-access-content';
        
        const journalTitle = document.createElement('h3');
        journalTitle.textContent = hasEntry ? 'Continue Today\'s Entry' : 'Start Today\'s Journal';
        journalContent.appendChild(journalTitle);
        
        const journalDescription = document.createElement('p');
        journalDescription.textContent = hasEntry 
            ? 'Review or update your thoughts and reflections for today.'
            : 'Capture your thoughts, feelings, and insights from today.';
        journalContent.appendChild(journalDescription);
        
        journalCard.appendChild(journalContent);
        
        const journalArrow = document.createElement('div');
        journalArrow.className = 'journal-access-arrow';
        journalArrow.innerHTML = '→';
        journalCard.appendChild(journalArrow);
        
        // Make the card clickable
        journalCard.style.cursor = 'pointer';
        journalCard.addEventListener('click', () => {
            this.openJournalEntry(todayKey, false);
        });
        
        section.appendChild(journalCard);
        return section;
    }
    
    createAllEntriesSection() {
        const section = document.createElement('div');
        section.className = 'all-entries-section';
        
        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'section-title';
        sectionTitle.innerHTML = `
            <span class="section-icon">📚</span>
            All Journal Entries
        `;
        section.appendChild(sectionTitle);
        
        const entryCount = Object.keys(this.entries).length;
        
        const entriesCard = document.createElement('div');
        entriesCard.className = 'all-entries-card';
        
        const entriesIcon = document.createElement('div');
        entriesIcon.className = 'all-entries-icon';
        entriesIcon.textContent = entryCount > 0 ? '📖' : '📝';
        entriesCard.appendChild(entriesIcon);
        
        const entriesContent = document.createElement('div');
        entriesContent.className = 'all-entries-content';
        
        const entriesTitle = document.createElement('h3');
        entriesTitle.textContent = entryCount > 0 ? 'Browse All Entries' : 'No Entries Yet';
        entriesContent.appendChild(entriesTitle);
        
        const entriesDescription = document.createElement('p');
        entriesDescription.textContent = entryCount > 0 
            ? `View and explore all ${entryCount} of your journal entries in chronological order.`
            : 'Start journaling to build your collection of thoughts and reflections.';
        entriesContent.appendChild(entriesDescription);
        
        entriesCard.appendChild(entriesContent);
        
        const entriesArrow = document.createElement('div');
        entriesArrow.className = 'all-entries-arrow';
        entriesArrow.innerHTML = '→';
        entriesCard.appendChild(entriesArrow);
        
        // Make the card clickable if there are entries
        if (entryCount > 0) {
            entriesCard.style.cursor = 'pointer';
            entriesCard.addEventListener('click', () => {
                this.showAllEntries();
            });
        } else {
            entriesCard.style.cursor = 'default';
            entriesCard.style.opacity = '0.6';
        }
        
        section.appendChild(entriesCard);
        return section;
    }
    
    createInsightsSection(compact = false) {
        const section = document.createElement('div');
        section.className = 'insights-section' + (compact ? ' compact' : '');
        
        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'section-title';
        sectionTitle.innerHTML = `
            <span class="section-icon">🔮</span>
            Psychic & Intuition Insights
        `;
        section.appendChild(sectionTitle);
        
        const insightsContent = document.createElement('div');
        insightsContent.className = 'insights-content';
        
        const entryCount = Object.keys(this.entries).length;
        
        if (entryCount < 3) {
            // Not enough data message
            const noDataCard = document.createElement('div');
            noDataCard.className = 'insights-card no-data';
            noDataCard.innerHTML = `
                <div class="insights-icon">🌱</div>
                <h3>Your Quantum Insights are Growing</h3>
                <p>Continue journaling for 3+ days to unlock powerful insights about your psychic patterns, intuitive development, and quantum consciousness expansion.</p>
                <div class="insights-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(entryCount / 3) * 100}%"></div>
                    </div>
                    <span class="progress-text">${entryCount}/3 entries</span>
                </div>
            `;
            insightsContent.appendChild(noDataCard);
        } else {
            // Show insights preview
            const insightsPreview = document.createElement('div');
            insightsPreview.className = 'insights-card ready';
            insightsPreview.innerHTML = `
                <div class="insights-icon">✨</div>
                <h3>Your Quantum Patterns are Ready</h3>
                <p>Based on your ${entryCount} entries, I've detected patterns in your consciousness, intuitive flows, and energetic signatures. Ready to explore your psychic development insights?</p>
            `;
            insightsContent.appendChild(insightsPreview);
        }
        
        // Insights button
        const insightsButton = document.createElement('button');
        insightsButton.className = `cosmic-button ${entryCount >= 3 ? 'primary' : 'disabled'}`;
        insightsButton.disabled = entryCount < 3;
        insightsButton.innerHTML = `
            <span>Generate Quantum Insights</span>
            <span class="button-spark">🔮</span>
        `;
        insightsButton.addEventListener('click', () => {
            if (entryCount >= 3) {
                this.generateQuantumInsights();
            }
        });
        insightsContent.appendChild(insightsButton);
        const quantumFieldButton = document.createElement('button');
        quantumFieldButton.className = 'cosmic-button secondary';
        quantumFieldButton.innerHTML = `
            <span>Play in the Quantum Field</span>
            <span class="button-spark">🌌</span>
        `;
        quantumFieldButton.addEventListener('click', () => {
            try {
                // Stop any ongoing audio/video to avoid aborted network requests on navigation
                try {
                    document.querySelectorAll('audio,video').forEach(el => {
                        try {
                            el.pause();
                            const src = el.currentSrc || el.src;
                            if (src && src.startsWith('blob:')) {
                                URL.revokeObjectURL(src);
                            }
                            // Clear source to stop network activity
                            el.removeAttribute('src');
                            el.load();
                        } catch {}
                    });
                } catch {}
                // Determine target level
                let lastLevel = parseInt(localStorage.getItem('lastPlayedLevel') || '0', 10);
                if (!lastLevel || Number.isNaN(lastLevel)) {
                    try {
                        const stats = JSON.parse(localStorage.getItem('divineSenseGameStats') || '{}');
                        lastLevel = parseInt(stats?.psychicLevel || '1', 10);
                    } catch {}
                }
                localStorage.setItem('lastPlayedLevel', String(lastLevel || 1));

                // If embedded inside the game, close the overlay and start immediately
                const isEmbeddedInGame = !!(window.JournalBridge) || !!document.querySelector('#phaser-game-container canvas');
                if (isEmbeddedInGame) {
                    try { window.JournalBridge && window.JournalBridge.close(); } catch {}
                    try {
                        // Signal the game to start at the desired level
                        window.dispatchEvent(new CustomEvent('quantum-field-play', { detail: { level: lastLevel || 1 } }));
                    } catch {}
                    return;
                }

                // Otherwise navigate to the main game page (absolute path to root)
                // Ensure the game does NOT reopen the journal on load
                try { localStorage.setItem('openJournalOnGameLoad', 'false'); } catch {}
                try { localStorage.setItem('resumeGameOnLoad', '1'); } catch {}
                // Land on the Games tab when the game loads
                try { localStorage.setItem('openTabOnLoad', 'games'); } catch {}
                // Use absolute path so we don't accidentally reload the add-on page
                window.location.href = '/index.html';
            } catch (err) {
                console.warn('Failed to launch Quantum Field:', err);
                this.showDebugMessage('Unable to open the Quantum Field.');
            }
        });
        insightsContent.appendChild(quantumFieldButton);
        
        // Past Insights button - always show, but indicate if empty
        const pastInsightsButton = document.createElement('button');
        pastInsightsButton.className = 'past-insights-button';
        
        if (this.insights.length > 0) {
            pastInsightsButton.innerHTML = `
                <span>📜</span> Past Insights (${this.insights.length})
            `;
        } else {
            pastInsightsButton.innerHTML = `
                <span>📜</span> Past Insights
            `;
            pastInsightsButton.style.opacity = '0.6';
        }
        
        pastInsightsButton.addEventListener('click', () => {
            this.showPastInsights();
        });
        insightsContent.appendChild(pastInsightsButton);
        
        section.appendChild(insightsContent);
        return section;
    }
    
    viewEntry(dateKey) {
        const entry = this.entries[dateKey];
        if (!entry) return;
        
        // Create a simple modal to view the entry
        const modal = document.createElement('div');
        modal.className = 'entry-view-modal';
        modal.innerHTML = `
            <div class="entry-view-content">
                <div class="entry-view-header">
                    <h3>${new Date(dateKey).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</h3>
                    <button class="close-modal">×</button>
                </div>
                <div class="entry-view-body">
                    ${entry.mood ? `<div class="entry-mood">${this.getMoodEmoji(entry.mood)} ${this.getMoodLabel(entry.mood)}</div>` : ''}
                    <div class="entry-text">${entry.text || 'No text entry for this day.'}</div>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('close-modal')) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }
    
    getMoodEmoji(mood) {
        const moods = {
            vibrant: '✨',
            insightful: '👁️',
            grounded: '🧘',
            foggy: '🌫️',
            heavy: '😩'
        };
        return moods[mood] || '📝';
    }
    
    getMoodLabel(mood) {
        const labels = {
            vibrant: 'Vibrant',
            insightful: 'Insightful',
            grounded: 'Grounded',
            foggy: 'Foggy',
            heavy: 'Heavy'
        };
        return labels[mood] || 'Unknown';
    }
    
    async generateQuantumInsights() {
        // Create insights loading interface
        this.journalInterface.innerHTML = '';
        const loadingInterface = this.createQuantumInsightsLoading();
        this.journalInterface.appendChild(loadingInterface);
        
        try {
            const allEntries = Object.values(this.entries);
            const insights = await aiHelper.getScalableInsights(allEntries, 'psychic_intuition_development');
            
            if (insights) {
                this.displayQuantumInsights(insights);
            } else {
                this.displayQuantumInsightsFallback();
            }
        } catch (error) {
            console.error('Quantum insights generation failed:', error);
            this.displayQuantumInsightsFallback();
        }
    }
    
    createQuantumInsightsLoading() {
        const container = document.createElement('div');
        container.className = 'quantum-insights-loading';
        container.innerHTML = `
            <div class="quantum-loading-animation">
                <div class="quantum-core">🔮</div>
                <div class="quantum-rings">
                    <div class="quantum-ring"></div>
                    <div class="quantum-ring"></div>
                    <div class="quantum-ring"></div>
                </div>
            </div>
            <h2>Channeling Your Quantum Insights...</h2>
            <p>Analyzing your consciousness patterns, intuitive development, and psychic signatures...</p>
        `;
        return container;
    }
    
    displayQuantumInsights(insights) {
        this.journalInterface.innerHTML = '';
        // Save the generated insight
        this.saveInsight(insights);
        const insightsContainer = document.createElement('div');
        insightsContainer.className = 'quantum-insights-display';
        insightsContainer.innerHTML = `
            <div class="insights-header">
                <h1>🌟 Your Quantum Consciousness Report 🔮</h1>
                <p>Personalized insights from your journey with ${this.userData.name}</p>
            </div>
            <div class="insights-content">
                <div class="insights-text">${insights}</div>
            </div>
            <button class="cosmic-button primary back-to-dashboard">
                <span>Return to Dashboard</span>
                <span class="button-spark">🏠</span>
            </button>
        `;
        
        insightsContainer.querySelector('.back-to-dashboard').addEventListener('click', () => {
            this.showDashboard();
        });
        
        this.journalInterface.appendChild(insightsContainer);
    }
    
    displayQuantumInsightsFallback() {
        this.journalInterface.innerHTML = '';
        const fallbackContainer = document.createElement('div');
        fallbackContainer.className = 'quantum-insights-display';
        fallbackContainer.innerHTML = `
            <div class="insights-header">
                <h1>🌟 Your Quantum Journey 🔮</h1>
                <p>Insights from your consciousness exploration</p>
            </div>
            <div class="insights-content">
                <div class="insights-text">
                    Your dedication to regular consciousness exploration shows remarkable commitment to inner growth. Each entry represents a step deeper into understanding your intuitive nature and psychic potential. The patterns in your thoughts reveal the beautiful complexity of expanding awareness and the value of consistent practice in developing your quantum consciousness.
                </div>
            </div>
            <button class="cosmic-button primary back-to-dashboard">
                <span>Return to Dashboard</span>
                <span class="button-spark">🏠</span>
            </button>
        `;
        
        fallbackContainer.querySelector('.back-to-dashboard').addEventListener('click', () => {
            this.showDashboard();
        });
        
        this.journalInterface.appendChild(fallbackContainer);
    }
    
    showDebugMessage(message) {
        const debugAlert = document.createElement('div');
        debugAlert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2a2a2a;
            color: #88ffaa;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            font-family: inherit;
            font-size: 0.9rem;
            z-index: 9999;
            opacity: 0;
            transform: translateX(100px);
            transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
            border: 1px solid #444444;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        `;
        debugAlert.textContent = `🧹 ${message}`;
        
        document.body.appendChild(debugAlert);
        
        // Animate in
        setTimeout(() => {
            debugAlert.style.opacity = '1';
            debugAlert.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            debugAlert.style.opacity = '0';
            debugAlert.style.transform = 'translateX(100px)';
            setTimeout(() => {
                if (debugAlert.parentNode) {
                    debugAlert.parentNode.removeChild(debugAlert);
                }
            }, 300);
        }, 3000);
    }
    showPastInsights() {
        this.journalInterface.innerHTML = '';
        const pastInsightsPage = this.createPastInsightsPage();
        this.journalInterface.appendChild(pastInsightsPage);
    }
    createPastInsightsPage() {
        const container = document.createElement('div');
        container.className = 'past-insights-container';
        container.innerHTML = `
            <div class="past-insights-header">
                <button class="cosmic-button secondary back-to-dashboard">
                    <span>🏠</span> Return to Dashboard
                </button>
                <h1>📜 Past Quantum Insights</h1>
                <p>A log of all your channeled psychic and intuition reports.</p>
            </div>
        `;
        const insightsList = document.createElement('div');
        insightsList.className = 'past-insights-list';
        if (this.insights.length === 0) {
            insightsList.innerHTML = `<p class="no-insights-message">You haven't generated any quantum insights yet.</p>`;
        } else {
            [...this.insights].reverse().forEach((insight, index) => {
                const insightCard = document.createElement('div');
                insightCard.className = 'past-insight-card';
                insightCard.style.animationDelay = `${index * 0.1}s`;
                const insightDate = new Date(insight.timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric'
                });
                insightCard.innerHTML = `
                    <div class="past-insight-card-header">
                        <span class="insight-card-date">${insightDate}</span>
                    </div>
                    <div class="past-insight-card-body">
                        ${insight.text}
                    </div>
                `;
                insightsList.appendChild(insightCard);
            });
        }
        container.appendChild(insightsList);
        
        container.querySelector('.back-to-dashboard').addEventListener('click', () => {
            this.showDashboard();
        });
        return container;
    }
    
    showAllEntries() {
        this.journalInterface.innerHTML = '';
        const allEntriesPage = this.createAllEntriesPage();
        this.journalInterface.appendChild(allEntriesPage);
    }
    
    createAllEntriesPage() {
        const container = document.createElement('div');
        container.className = 'all-entries-container';
        
        // Header
        const header = document.createElement('div');
        header.className = 'all-entries-header';
        
        const backButton = document.createElement('button');
        backButton.className = 'cosmic-button secondary back-to-dashboard';
        backButton.innerHTML = `
            <span>🏠</span> Return to Dashboard
        `;
        backButton.addEventListener('click', () => {
            this.showDashboard();
        });
        header.appendChild(backButton);
        
        const title = document.createElement('h1');
        title.textContent = '📚 All Journal Entries';
        header.appendChild(title);
        
        const subtitle = document.createElement('p');
        const entryCount = Object.keys(this.entries).length;
        subtitle.textContent = `${entryCount} entries in your quantum consciousness journey`;
        header.appendChild(subtitle);
        
        container.appendChild(header);
        
        // Entries list
        const entriesList = document.createElement('div');
        entriesList.className = 'all-entries-list';
        
        // Sort entries by date (newest first)
        const sortedEntries = Object.entries(this.entries)
            .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA));
        
        if (sortedEntries.length === 0) {
            const noEntriesMessage = document.createElement('div');
            noEntriesMessage.className = 'no-entries-message';
            noEntriesMessage.innerHTML = `
                <div class="no-entries-icon">📝</div>
                <h3>No entries yet</h3>
                <p>Start your quantum consciousness journey by writing your first journal entry.</p>
            `;
            entriesList.appendChild(noEntriesMessage);
        } else {
            sortedEntries.forEach(([dateKey, entry], index) => {
                const entryCard = this.createEntryCard(dateKey, entry, index);
                entriesList.appendChild(entryCard);
            });
        }
        
        container.appendChild(entriesList);
        return container;
    }
    
    createEntryCard(dateKey, entry, index) {
        const card = document.createElement('div');
        card.className = 'entry-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        // Entry header
        const entryHeader = document.createElement('div');
        entryHeader.className = 'entry-card-header';
        
        const entryDate = document.createElement('div');
        entryDate.className = 'entry-card-date';
        const formattedDate = new Date(dateKey).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        entryDate.textContent = formattedDate;
        entryHeader.appendChild(entryDate);
        
        if (entry.mood) {
            const moodIndicator = document.createElement('div');
            moodIndicator.className = 'entry-card-mood';
            moodIndicator.innerHTML = `${this.getMoodEmoji(entry.mood)} ${this.getMoodLabel(entry.mood)}`;
            entryHeader.appendChild(moodIndicator);
        }
        
        card.appendChild(entryHeader);
        
        // Entry preview
        const entryPreview = document.createElement('div');
        entryPreview.className = 'entry-card-preview';
        
        const previewText = entry.text.length > 200 
            ? entry.text.substring(0, 200) + '...' 
            : entry.text;
        entryPreview.textContent = previewText || 'No text content';
        
        card.appendChild(entryPreview);
        
        // Entry actions
        const entryActions = document.createElement('div');
        entryActions.className = 'entry-card-actions';
        
        const viewButton = document.createElement('button');
        viewButton.className = 'entry-action-button view';
        viewButton.textContent = 'View';
        viewButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.viewEntry(dateKey);
        });
        
        const editButton = document.createElement('button');
        editButton.className = 'entry-action-button edit';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openJournalEntry(dateKey, false);
        });
        
        entryActions.appendChild(viewButton);
        entryActions.appendChild(editButton);
        card.appendChild(entryActions);
        
        // Make entire card clickable to view
        card.addEventListener('click', () => {
            this.viewEntry(dateKey);
        });
        
        return card;
    }
    
    loadEntries() {
        try {
            return JSON.parse(localStorage.getItem('rosebud-ai-journal-entries') || '{}');
        } catch {
            return {};
        }
    }
    
    loadConnectionsViewData() {
        try {
            return JSON.parse(localStorage.getItem('rosebud-ai-connections-view') || '{}');
        } catch {
            return {};
        }
    }
    
    saveConnectionsViewData(data) {
        localStorage.setItem('rosebud-ai-connections-view', JSON.stringify(data));
    }
    loadInsights() {
        try {
            return JSON.parse(localStorage.getItem('quantumsense-insights') || '[]');
        } catch {
            return [];
        }
    }
    saveInsight(insightText) {
        const newInsight = {
            text: insightText,
            timestamp: Date.now()
        };
        this.insights.push(newInsight);
        this.saveInsights();
        console.log('Insight saved. Total insights:', this.insights.length);
    }
    
    saveInsights() {
        localStorage.setItem('quantumsense-insights', JSON.stringify(this.insights));
    }
    
    saveEntries() {
        localStorage.setItem('rosebud-ai-journal-entries', JSON.stringify(this.entries));
    }
    
    renderCalendar() {
        const calendar = this.createCalendarElement();
        this.calendarContainer.innerHTML = '';
        this.calendarContainer.appendChild(calendar);
        this.addCalendarStyles();
    }
    
    createCalendarElement() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        // Create calendar container
        const calendar = document.createElement('div');
        calendar.className = 'calendar';
        
        // Create month/year header
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.textContent = now.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
        calendar.appendChild(header);
        
        // Create days of week
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekHeader = document.createElement('div');
        weekHeader.className = 'calendar-week-header';
        
        daysOfWeek.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day-header';
            dayElement.textContent = day;
            weekHeader.appendChild(dayElement);
        });
        calendar.appendChild(weekHeader);
        
        // Create calendar grid
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const lastDay = new Date(year, month + 1, 0).getDate();
        const today = now.getDate();
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            grid.appendChild(emptyDay);
        }
        
        // Add days of the month
        const todayDate = new Date();
        todayDate.setHours(23, 59, 59, 999); // Set to end of today
        
        for (let day = 1; day <= lastDay; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            const dayDate = new Date(year, month, day);
            const formattedDate = this.formatDate(dayDate);
            
            // Check if this day is in the future
            const isFutureDate = dayDate > todayDate;
            
            // Highlight current day
            if (day === today && month === todayDate.getMonth() && year === todayDate.getFullYear()) {
                dayElement.classList.add('current-day');
            }
            
            // Check if this day has a journal entry and add mood indicator
            if (this.entries[formattedDate]) {
                dayElement.classList.add('has-entry');
                
                // Add mood indicator if available
                const mood = this.entries[formattedDate].mood;
                if (mood) {
                    dayElement.classList.add(`mood-${mood}`);
                    dayElement.setAttribute('data-mood', mood);
                }
            }
            
            // Disable future dates
            if (isFutureDate) {
                dayElement.classList.add('future-date');
                dayElement.title = 'Future dates are not available for journaling';
            } else {
                // Add click handler for day selection (only for past/present dates)
                dayElement.addEventListener('click', () => {
                    this.selectDate(dayDate);
                });
            }
            
            grid.appendChild(dayElement);
        }
        
        calendar.appendChild(grid);
        return calendar;
    }
    
    addCalendarStyles() {
        if (!document.getElementById('calendarStyles')) {
            const styles = document.createElement('style');
            styles.id = 'calendarStyles';
            styles.textContent = `
                .calendar {
                    width: 100%;
                    max-width: 100vw;
                    margin: 0 auto;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: calendarFadeIn 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
                    padding: 0 0.5rem;
                    box-sizing: border-box;
                }
                
                @keyframes calendarFadeIn {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .calendar-header {
                    text-align: center;
                    font-size: clamp(1rem, 4vw, 1.1rem);
                    font-weight: 500;
                    margin-bottom: 1rem;
                    color: #ffffff;
                    letter-spacing: -0.01em;
                    padding: 0 0.5rem;
                }
                
                .calendar-week-header {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: clamp(1px, 1vw, 3px);
                    margin-bottom: 0.5rem;
                }
                
                .calendar-day-header {
                    text-align: center;
                    font-size: clamp(0.7rem, 3vw, 0.8rem);
                    font-weight: 400;
                    color: #666666;
                    padding: clamp(0.3rem, 2vw, 0.5rem);
                }
                
                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: clamp(1px, 1vw, 3px);
                }
                
                .calendar-day {
                    aspect-ratio: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: clamp(0.8rem, 3.5vw, 0.9rem);
                    border-radius: clamp(6px, 2vw, 8px);
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                    position: relative;
                    background: transparent;
                    color: #cccccc;
                    min-height: 44px;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                }
                
                .calendar-day:not(.empty):hover {
                    background: #1a1a1a;
                    color: #ffffff;
                    transform: scale(1.1);
                }
                
                .calendar-day.current-day {
                    background: linear-gradient(135deg, #333333, #444444);
                    color: #ffffff;
                    font-weight: 500;
                    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
                }
                
                .calendar-day.current-day:hover {
                    background: linear-gradient(135deg, #444444, #555555);
                    transform: scale(1.1);
                }
                
                .calendar-day.has-entry {
                    background: #0a2a1a;
                    color: #66ff99;
                }
                
                .calendar-day.has-entry:hover {
                    background: #0f3a2f;
                    color: #88ffaa;
                }
                
                .calendar-day.current-day.has-entry {
                    background: linear-gradient(135deg, #1a3a2a, #2a4a3a);
                    color: #88ffaa;
                }
                
                .calendar-day.empty {
                    cursor: default;
                    pointer-events: none;
                }
                
                .calendar-day.future-date {
                    color: #444444;
                    cursor: not-allowed;
                    pointer-events: none;
                }
                
                .calendar-day.future-date:hover {
                    background: transparent;
                    color: #444444;
                    transform: none;
                }
                
                .calendar-day.mood-vibrant {
                    background: linear-gradient(135deg, #4c1d95, #5b21b6);
                    color: #c084fc;
                    box-shadow: 0 0 8px rgba(192, 132, 252, 0.3);
                }
                
                .calendar-day.mood-insightful {
                    background: linear-gradient(135deg, #312e81, #4338ca);
                    color: #a5b4fc;
                    box-shadow: 0 0 8px rgba(165, 180, 252, 0.3);
                }
                
                .calendar-day.mood-grounded {
                    background: linear-gradient(135deg, #052e16, #14532d);
                    color: #4ade80;
                    box-shadow: 0 0 8px rgba(74, 222, 128, 0.3);
                }
                
                .calendar-day.mood-foggy {
                    background: linear-gradient(135deg, #334155, #475569);
                    color: #94a3b8;
                    box-shadow: 0 0 8px rgba(148, 163, 184, 0.2);
                }
                
                .calendar-day.mood-heavy {
                    background: linear-gradient(135deg, #450a0a, #7f1d1d);
                    color: #fca5a5;
                    box-shadow: 0 0 8px rgba(252, 165, 165, 0.2);
                }
                
                .calendar-day.mood-vibrant:hover,
                .calendar-day.mood-insightful:hover,
                .calendar-day.mood-grounded:hover,
                .calendar-day.mood-foggy:hover,
                .calendar-day.mood-heavy:hover {
                    transform: scale(1.15);
                    filter: brightness(1.2);
                }
                
                @media (min-width: 480px) {
                    .calendar {
                        max-width: 400px;
                        padding: 0;
                    }
                    
                    .calendar-header {
                        margin-bottom: 1.5rem;
                    }
                    
                    .calendar-grid {
                        gap: 3px;
                    }
                }
                
                @media (min-width: 768px) {
                    .calendar {
                        max-width: 450px;
                    }
                    
                    .calendar-header {
                        font-size: 1.2rem;
                        margin-bottom: 2rem;
                    }
                    
                    .calendar-day-header {
                        font-size: 0.85rem;
                        padding: 0.75rem;
                    }
                    
                    .calendar-day {
                        font-size: 1rem;
                        border-radius: 8px;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    selectDate(date) {
        // Prevent selecting future dates
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Set to end of today
        
        if (date > today) {
            return; // Don't allow selection of future dates
        }
        
        this.currentDate = date;
        this.renderJournalButton();
        
        // Update calendar to reflect new selection
        const formattedDate = this.formatDate(date);
        this.openJournalEntry(formattedDate);
    }
    
    renderJournalButton() {
        const today = this.formatDate(new Date()); // Always use actual today, not selected date
        const hasEntry = this.entries[today];
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        
        // Create journal button
        const journalButton = document.createElement('button');
        journalButton.className = 'journal-button';
        journalButton.textContent = hasEntry ? 'Adjust journal entry' : "Write down today's thoughts";
        journalButton.addEventListener('click', () => this.openJournalEntry(today));
        buttonContainer.appendChild(journalButton);
        
        // Check if current month has any entries
        const monthlyEntries = this.getMonthlyEntries(this.currentDate);
        if (monthlyEntries.length > 0) {
            const connectionsButton = document.createElement('button');
            connectionsButton.className = 'connections-button';
            
            // Check if there are new entries since last connections view
            const hasNewEntries = this.hasNewEntriesSinceLastView();
            if (hasNewEntries) {
                connectionsButton.classList.add('has-notification');
            }
            
            // Create button content with notification indicator
            const buttonContent = document.createElement('div');
            buttonContent.className = 'connections-button-content';
            buttonContent.textContent = 'View Connections';
            
            if (hasNewEntries) {
                const indicator = document.createElement('div');
                indicator.className = 'notification-indicator';
                buttonContent.appendChild(indicator);
            }
            
            connectionsButton.appendChild(buttonContent);
            connectionsButton.addEventListener('click', () => this.showMonthlyConnections());
            buttonContainer.appendChild(connectionsButton);
        }
        
        this.journalInterface.innerHTML = '';
        this.journalInterface.appendChild(buttonContainer);
        
        // Add button styles
        this.addJournalButtonStyles();
    }
    
    addJournalButtonStyles() {
        if (!document.getElementById('journalButtonStyles')) {
            const styles = document.createElement('style');
            styles.id = 'journalButtonStyles';
            styles.textContent = `
                .button-container {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 1rem;
                    margin-top: 1.5rem;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: buttonContainerFadeIn 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) 0.2s forwards;
                    width: 100%;
                    padding: 0 0.5rem;
                    box-sizing: border-box;
                }
                
                @keyframes buttonContainerFadeIn {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .journal-button, .connections-button {
                    background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
                    color: #ffffff;
                    border: 1px solid #333333;
                    padding: clamp(0.9rem, 3vw, 1.2rem) clamp(1.5rem, 4vw, 2rem);
                    border-radius: clamp(10px, 3vw, 12px);
                    font-family: inherit;
                    font-size: clamp(0.9rem, 3.5vw, 1rem);
                    font-weight: 400;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                    text-align: center;
                    white-space: normal;
                    line-height: 1.3;
                    width: 100%;
                    box-sizing: border-box;
                    min-height: 44px;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                }
                
                .journal-button:hover, .connections-button:hover {
                    background: linear-gradient(135deg, #2a2a2a, #3a3a3a);
                    border-color: #444444;
                    transform: translateY(-2px);
                }
                
                .journal-button:active, .connections-button:active {
                    transform: translateY(0);
                }
                
                .connections-button {
                    background: linear-gradient(135deg, #1a2a1a, #2a3a2a);
                    border-color: #2a4a2a;
                    color: #88ffaa;
                    position: relative;
                    overflow: hidden;
                }
                
                .connections-button:hover {
                    background: linear-gradient(135deg, #2a3a2a, #3a4a3a);
                    border-color: #3a5a3a;
                }
                
                .connections-button-content {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }
                
                .connections-button.has-notification {
                    animation: connectionsPulse 2s ease-in-out infinite;
                }
                
                @keyframes connectionsPulse {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(136, 255, 170, 0.4);
                    }
                    50% {
                        box-shadow: 0 0 0 8px rgba(136, 255, 170, 0);
                    }
                }
                
                .notification-indicator {
                    width: 8px;
                    height: 8px;
                    background: #ff6b6b;
                    border-radius: 50%;
                    position: relative;
                    animation: indicatorPulse 1.5s ease-in-out infinite;
                }
                
                @keyframes indicatorPulse {
                    0%, 100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.6;
                        transform: scale(1.2);
                    }
                }
                
                @media (min-width: 480px) {
                    .button-container {
                        padding: 0;
                        align-items: center;
                        max-width: 400px;
                        margin-left: auto;
                        margin-right: auto;
                    }
                    
                    .journal-button, .connections-button {
                        max-width: 380px;
                    }
                }
                
                @media (min-width: 768px) {
                    .button-container {
                        flex-direction: row;
                        justify-content: center;
                        gap: 1.5rem;
                        margin-top: 2rem;
                    }
                    
                    .journal-button, .connections-button {
                        width: auto;
                        min-width: 260px;
                        max-width: 320px;
                        white-space: nowrap;
                        font-size: 1rem;
                        padding: 1rem 2rem;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    openJournalEntry(date, isInitialLoad = false) {
        const existingEntry = this.entries[date];
        const entryInterface = this.createJournalEntryInterface(date, existingEntry, isInitialLoad);
        
        if (isInitialLoad) {
            this.calendarContainer.style.display = 'none';
            this.journalInterface.innerHTML = '';
            this.journalInterface.appendChild(entryInterface);
            this.addJournalEntryStyles();
            
            // Initial fade-in for the whole interface
            this.journalInterface.style.opacity = '1';
            this.journalInterface.style.transform = 'translateY(0)';
        } else {
            // Smooth transition out of calendar view
            this.calendarContainer.style.transition = 'all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
            this.calendarContainer.style.opacity = '0';
            this.calendarContainer.style.transform = 'translateY(-20px)';
            
            this.journalInterface.style.transition = 'all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
            this.journalInterface.style.opacity = '0';
            this.journalInterface.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                this.calendarContainer.style.display = 'none';
                this.journalInterface.innerHTML = '';
                this.journalInterface.appendChild(entryInterface);
                this.addJournalEntryStyles();
                
                // Smooth transition into journal entry view
                setTimeout(() => {
                    this.journalInterface.style.opacity = '1';
                    this.journalInterface.style.transform = 'translateY(0)';
                    
                    // Focus the text area after transition
                    setTimeout(() => {
                        const textarea = entryInterface.querySelector('.journal-textarea');
                        if (textarea && !existingEntry) {
                            textarea.focus();
                        }
                    }, 200);
                }, 50);
            }, 500);
        }
    }
    
    createJournalEntryInterface(date, existingEntry = null, isInitialLoad = false) {
        const container = document.createElement('div');
        container.className = 'journal-entry-container';
        
        // Create header with date and back button
        const header = document.createElement('div');
        header.className = 'journal-entry-header';
        
        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        backButton.innerHTML = '← Dashboard';
        backButton.addEventListener('click', () => this.showDashboard());
        
        // Don't show the back button on the very first load
        if (isInitialLoad) {
            backButton.style.display = 'none';
        }
        
        const dateTitle = document.createElement('h2');
        dateTitle.className = 'journal-date-title';
        dateTitle.textContent = new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        header.appendChild(backButton);
        header.appendChild(dateTitle);
        container.appendChild(header);
        
        // Create main content area
        const content = document.createElement('div');
        content.className = 'journal-content';
        
        // Create mood tracker section
        const moodSection = document.createElement('div');
        moodSection.className = 'mood-tracker-section';
        
        const moodLabel = document.createElement('label');
        moodLabel.className = 'mood-label';
        moodLabel.textContent = 'How are you feeling today?';
        moodSection.appendChild(moodLabel);
        
        const moodOptions = document.createElement('div');
        moodOptions.className = 'mood-options';
        
        const moods = [
            { id: 'vibrant', emoji: '✨', label: 'Vibrant', color: '#c026d3' },
            { id: 'insightful', emoji: '👁️', label: 'Insightful', color: '#4f46e5' },
            { id: 'grounded', emoji: '🧘', label: 'Grounded', color: '#16a34a' },
            { id: 'foggy', emoji: '🌫️', label: 'Foggy', color: '#64748b' },
            { id: 'heavy', emoji: '😩', label: 'Heavy', color: '#b91c1c' }
        ];
        
        let selectedMood = existingEntry?.mood || null;
        
        moods.forEach(mood => {
            const moodButton = document.createElement('button');
            moodButton.type = 'button';
            moodButton.className = 'mood-option';
            moodButton.setAttribute('data-mood', mood.id);
            
            if (selectedMood === mood.id) {
                moodButton.classList.add('selected');
            }
            
            const emoji = document.createElement('span');
            emoji.className = 'mood-emoji';
            emoji.textContent = mood.emoji;
            
            const label = document.createElement('span');
            label.className = 'mood-label-text';
            label.textContent = mood.label;
            
            moodButton.appendChild(emoji);
            moodButton.appendChild(label);
            moodButton.title = mood.label; // Set tooltip for accessibility
            
            moodButton.addEventListener('click', () => {
                // Remove selected class from all mood options
                moodOptions.querySelectorAll('.mood-option').forEach(option => {
                    option.classList.remove('selected');
                });
                
                // Add selected class to clicked option
                moodButton.classList.add('selected');
                selectedMood = mood.id;
                
                // Update complete button visibility
                const hasText = textarea.value.trim().length > 0;
                const hasMood = selectedMood !== null;
                completeButton.style.opacity = (hasText || hasMood) ? '1' : '0';
                completeButton.style.transform = (hasText || hasMood) ? 'translateY(0)' : 'translateY(20px)';
            });
            
            moodOptions.appendChild(moodButton);
        });
        
        moodSection.appendChild(moodOptions);
        content.appendChild(moodSection);
        
        // Create text area
        const textarea = document.createElement('textarea');
        textarea.className = 'journal-textarea';
        textarea.placeholder = existingEntry ? '' : 'What\'s on your mind today? Let your thoughts flow freely...';
        textarea.value = existingEntry?.text || '';
        textarea.setAttribute('rows', '12');
        
        content.appendChild(textarea);
        
        // Create complete button (only show if there's text or mood)
        const completeButton = document.createElement('button');
        completeButton.className = 'complete-button';
        completeButton.textContent = existingEntry ? 'Update journal entry' : 'I\'ve completed this journal entry';
        
        const hasInitialContent = existingEntry || textarea.value.trim() || selectedMood;
        completeButton.style.opacity = hasInitialContent ? '1' : '0';
        completeButton.style.transform = hasInitialContent ? 'translateY(0)' : 'translateY(20px)';
        
        completeButton.addEventListener('click', () => this.completeJournalEntry(date, textarea.value, selectedMood));
        
        // Monitor text changes to show/hide complete button
        textarea.addEventListener('input', () => {
            const hasText = textarea.value.trim().length > 0;
            const hasMood = selectedMood !== null;
            completeButton.style.opacity = (hasText || hasMood) ? '1' : '0';
            completeButton.style.transform = (hasText || hasMood) ? 'translateY(0)' : 'translateY(20px)';
        });
        
        content.appendChild(completeButton);
        container.appendChild(content);
        const bottomNav = document.createElement('div');
        bottomNav.className = 'journal-bottom-nav';
        const quantumFieldButton = document.createElement('button');
        quantumFieldButton.className = 'cosmic-button secondary';
        quantumFieldButton.innerHTML = `
            <span>Play in the Quantum Field</span>
            <span class="button-spark">🌌</span>
        `;
        quantumFieldButton.addEventListener('click', () => {
            try {
                // Stop any ongoing audio/video to avoid aborted network requests on navigation
                try {
                    document.querySelectorAll('audio,video').forEach(el => {
                        try {
                            el.pause();
                            const src = el.currentSrc || el.src;
                            if (src && src.startsWith('blob:')) {
                                URL.revokeObjectURL(src);
                            }
                            // Clear source to stop network activity
                            el.removeAttribute('src');
                            el.load();
                        } catch {}
                    });
                } catch {}
                // Determine target level
                let lastLevel = parseInt(localStorage.getItem('lastPlayedLevel') || '0', 10);
                if (!lastLevel || Number.isNaN(lastLevel)) {
                    try {
                        const stats = JSON.parse(localStorage.getItem('divineSenseGameStats') || '{}');
                        lastLevel = parseInt(stats?.psychicLevel || '1', 10);
                    } catch {}
                }
                localStorage.setItem('lastPlayedLevel', String(lastLevel || 1));

                // If embedded inside the game, close the overlay and start immediately
                const isEmbeddedInGame = !!(window.JournalBridge) || !!document.querySelector('#phaser-game-container canvas');
                if (isEmbeddedInGame) {
                    try { window.JournalBridge && window.JournalBridge.close(); } catch {}
                    try {
                        window.dispatchEvent(new CustomEvent('quantum-field-play', { detail: { level: lastLevel || 1 } }));
                    } catch {}
                    return;
                }

                // Otherwise navigate to the main game page (absolute path to root)
                // Ensure the game does NOT reopen the journal on load
                try { localStorage.setItem('openJournalOnGameLoad', 'false'); } catch {}
                try { localStorage.setItem('resumeGameOnLoad', '1'); } catch {}
                // Land on the Games tab when the game loads
                try { localStorage.setItem('openTabOnLoad', 'games'); } catch {}
                // Use absolute path so we don't accidentally reload the add-on page
                window.location.href = '/index.html';
            } catch (err) {
                console.warn('Failed to launch Quantum Field:', err);
                this.showDebugMessage('Unable to open the Quantum Field.');
            }
        });
        bottomNav.appendChild(quantumFieldButton);
        container.appendChild(bottomNav);
        
        return container;
    }
    
    addJournalEntryStyles() {
        if (!document.getElementById('journalEntryStyles')) {
            const styles = document.createElement('style');
            styles.id = 'journalEntryStyles';
            styles.textContent = `
                .journal-entry-container {
                    width: 100%;
                    max-width: 100vw;
                    margin: 0;
                    padding: 0 1rem;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: journalEntryFadeIn 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) 0.1s forwards;
                    box-sizing: border-box;
                }
                
                .mood-tracker-section {
                    display: flex;
                    align-items: center;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    padding: 1.5rem;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                }
                
                .mood-tracker-section:hover {
                    background: rgba(255, 255, 255, 0.03);
                    border-color: rgba(255, 255, 255, 0.12);
                }
                
                .mood-label {
                    font-size: 1rem;
                    font-weight: 500;
                    color: #ffffff;
                    letter-spacing: -0.01em;
                    flex-shrink: 0;
                    margin-bottom: 0.5rem;
                }
                
                .mood-options {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
                    gap: clamp(0.5rem, 2vw, 0.75rem);
                    width: 100%;
                    justify-items: stretch;
                }
                
                .mood-option {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: clamp(0.3rem, 2vw, 0.5rem);
                    padding: clamp(0.75rem, 3vw, 1rem) clamp(0.5rem, 2vw, 0.75rem);
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: clamp(8px, 2vw, 12px);
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                    font-family: inherit;
                    color: #cccccc;
                    min-height: 44px;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                    box-sizing: border-box;
                }
                
                .mood-option:hover {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateY(-2px);
                    color: #ffffff;
                }
                
                .mood-option.selected {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.3);
                    color: #ffffff;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }
                
                .mood-emoji {
                    font-size: clamp(1.2rem, 4vw, 1.5rem);
                    line-height: 1;
                }
                
                .mood-label-text {
                    font-size: clamp(0.7rem, 2.5vw, 0.8rem);
                    font-weight: 400;
                    text-align: center;
                    color: #bbbbbb;
                    transition: color 0.3s ease;
                    line-height: 1.2;
                }
                
                .mood-option:hover .mood-label-text,
                .mood-option.selected .mood-label-text {
                    color: #ffffff;
                }
                
                @keyframes journalEntryFadeIn {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .journal-entry-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    margin-bottom: 1.5rem;
                    padding: 0;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                
                .back-button {
                    background: none;
                    border: none;
                    color: #888888;
                    font-family: inherit;
                    font-size: clamp(0.85rem, 3.5vw, 0.9rem);
                    cursor: pointer;
                    padding: clamp(0.5rem, 2vw, 0.75rem);
                    border-radius: 8px;
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    z-index: 10;
                    min-height: 44px;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                    flex-shrink: 0;
                }
                
                .back-button:hover {
                    background: #1a1a1a;
                    color: #ffffff;
                }
                
                .journal-date-title {
                    font-size: clamp(0.9rem, 3.5vw, 1.1rem);
                    font-weight: 500;
                    color: #ffffff;
                    text-align: left;
                    letter-spacing: -0.01em;
                    margin: 0;
                    line-height: 1.3;
                    flex: 1;
                    min-width: 0;
                }
                
                .journal-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }
                
                .journal-textarea {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.01);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    outline: none;
                    color: #ffffff;
                    font-family: inherit;
                    font-size: clamp(0.9rem, 3.5vw, 1rem);
                    line-height: 1.6;
                    resize: none;
                    padding: clamp(1rem, 4vw, 2rem);
                    border-radius: clamp(12px, 3vw, 16px);
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                    min-height: clamp(300px, 50vh, 400px);
                    box-sizing: border-box;
                    -webkit-appearance: none;
                    -webkit-border-radius: clamp(12px, 3vw, 16px);
                }
                
                .journal-textarea:focus {
                    background: rgba(255, 255, 255, 0.03);
                    border-color: rgba(255, 255, 255, 0.15);
                    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 4px 20px rgba(0, 0, 0, 0.3);
                }
                
                .journal-textarea::placeholder {
                    color: #666666;
                    font-style: italic;
                }
                
                .complete-button {
                    background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
                    color: #ffffff;
                    border: 1px solid #333333;
                    padding: clamp(0.9rem, 3vw, 1.2rem) clamp(1.5rem, 4vw, 2rem);
                    border-radius: clamp(10px, 3vw, 12px);
                    font-family: inherit;
                    font-size: clamp(0.9rem, 3.5vw, 1rem);
                    font-weight: 400;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                    align-self: stretch;
                    width: 100%;
                    min-height: 44px;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                    box-sizing: border-box;
                }
                
                .complete-button:hover {
                    background: linear-gradient(135deg, #2a2a2a, #3a3a3a);
                    border-color: #444444;
                    transform: translateY(-2px);
                }
                
                .complete-button:active {
                    transform: translateY(0);
                }
                
                @media (min-width: 480px) {
                    .journal-entry-container {
                        padding: 0 1.5rem;
                        max-width: 480px;
                        margin: 0 auto;
                    }
                    
                    .complete-button {
                        align-self: center;
                        max-width: 350px;
                    }
                }
                
                @media (min-width: 768px) {
                    .journal-entry-container {
                        max-width: 700px;
                        padding: 0 2rem;
                    }
                    
                    .journal-entry-header {
                        margin-bottom: 2rem;
                        align-items: center;
                    }
                    
                    .journal-date-title {
                        text-align: center;
                        font-size: 1.1rem;
                    }
                    
                    .journal-textarea {
                        font-size: 1.1rem;
                        padding: 2.5rem;
                        min-height: 450px;
                    }
                    
                    .complete-button {
                        max-width: 300px;
                        font-size: 1rem;
                        padding: 1rem 2rem;
                    }
                }
                
                @media (min-width: 1024px) {
                    .journal-entry-container {
                        max-width: 800px;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    closeJournalEntry() {
        // Smooth transition back to calendar view
        this.journalInterface.style.transition = 'all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        this.journalInterface.style.opacity = '0';
        this.journalInterface.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            const mainContainer = document.getElementById('mainContainer');
            mainContainer.innerHTML = `
                <div id="calendarContainer"></div>
                <div id="journalInterface"></div>
            `;
            this.calendarContainer = document.getElementById('calendarContainer');
            this.journalInterface = document.getElementById('journalInterface');
            
            this.calendarContainer.style.display = 'block';
            this.renderCalendar();
            this.renderJournalButton();
            
            // Smooth transition back into calendar
            setTimeout(() => {
                this.calendarContainer.style.opacity = '1';
                this.calendarContainer.style.transform = 'translateY(0)';
                this.journalInterface.style.opacity = '1';
                this.journalInterface.style.transform = 'translateY(0)';
            }, 50);
        }, 500);
    }
    
    async completeJournalEntry(date, text, mood = null) {
        if (!text.trim() && !mood) return;
        
        // Additional check: prevent saving entries for future dates
        const entryDate = new Date(date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        if (entryDate > today) {
            console.warn('Cannot save journal entry for future date');
            return;
        }
        
        // Save entry
        this.entries[date] = {
            text: text.trim(),
            mood: mood,
            timestamp: Date.now(),
            date: date
        };
        this.saveEntries();
        // Go back to the dashboard
        this.showDashboard();
    }
    
    async showAIAnalysis(currentDate, currentText) {
        // Create AI analysis interface
        const analysisInterface = this.createAIAnalysisInterface();
        
        // Smooth transition to analysis view
        this.journalInterface.style.transition = 'all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        this.journalInterface.style.opacity = '0';
        this.journalInterface.style.transform = 'translateY(-20px)';
        
        setTimeout(async () => {
            const mainContainer = document.getElementById('mainContainer');
            mainContainer.innerHTML = ''; // Clear previous content
            mainContainer.appendChild(analysisInterface);
            this.addAIAnalysisStyles();
            
            // Smooth transition into analysis view
            setTimeout(() => {
                analysisInterface.style.opacity = '1';
                analysisInterface.style.transform = 'translateY(0)';
            }, 50);
            
            // Generate AI insights
            await this.generateAIInsights(currentDate, currentText, analysisInterface);
        }, 500);
    }
    
    createAIAnalysisInterface() {
        const container = document.createElement('div');
        container.className = 'ai-analysis-container';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'ai-analysis-header';
        
        const title = document.createElement('h2');
        title.className = 'ai-analysis-title';
        title.textContent = 'Reflecting on your thoughts...';
        header.appendChild(title);
        
        const subtitle = document.createElement('p');
        subtitle.className = 'ai-analysis-subtitle';
        subtitle.textContent = 'AI is analyzing your recent entries to provide gentle insights';
        header.appendChild(subtitle);
        
        container.appendChild(header);
        
        // Create enhanced loading indicator
        const loadingSection = document.createElement('div');
        loadingSection.className = 'ai-loading-section';
        
        // Create main loading animation container
        const loadingAnimation = document.createElement('div');
        loadingAnimation.className = 'ai-loading-animation';
        
        // Create central brain/AI core
        const aiCore = document.createElement('div');
        aiCore.className = 'ai-core';
        
        // Create pulsing rings around the core
        for (let i = 0; i < 3; i++) {
            const ring = document.createElement('div');
            ring.className = 'ai-ring';
            ring.style.animationDelay = `${i * 0.6}s`;
            aiCore.appendChild(ring);
        }
        
        // Create floating particles
        const particleContainer = document.createElement('div');
        particleContainer.className = 'ai-particles';
        
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'ai-particle';
            particle.style.animationDelay = `${i * 0.2}s`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particleContainer.appendChild(particle);
        }
        
        // Create data streams
        const streamContainer = document.createElement('div');
        streamContainer.className = 'ai-streams';
        
        for (let i = 0; i < 4; i++) {
            const stream = document.createElement('div');
            stream.className = 'ai-stream';
            stream.style.animationDelay = `${i * 0.4}s`;
            stream.style.transform = `rotate(${i * 90}deg)`;
            streamContainer.appendChild(stream);
        }
        
        loadingAnimation.appendChild(aiCore);
        loadingAnimation.appendChild(particleContainer);
        loadingAnimation.appendChild(streamContainer);
        loadingSection.appendChild(loadingAnimation);
        
        // Create dynamic loading text
        const loadingText = document.createElement('div');
        loadingText.className = 'ai-loading-text';
        
        const loadingMessages = [
            'Weaving wisdom from your words...',
            'Discovering hidden patterns...',
            'Channeling deeper insights...',
            'Conjuring gentle reflections...'
        ];
        
        let messageIndex = 0;
        loadingText.textContent = loadingMessages[0];
        
        // Cycle through loading messages
        const messageInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            loadingText.style.opacity = '0';
            setTimeout(() => {
                loadingText.textContent = loadingMessages[messageIndex];
                loadingText.style.opacity = '1';
            }, 300);
        }, 2000);
        
        // Store interval for cleanup
        loadingSection.messageInterval = messageInterval;
        
        loadingSection.appendChild(loadingText);
        
        container.appendChild(loadingSection);
        
        // Create insights section (initially empty)
        const insightsSection = document.createElement('div');
        insightsSection.className = 'ai-insights-section';
        insightsSection.style.display = 'none';
        container.appendChild(insightsSection);
        
        // Create continue button (initially hidden)
        const continueButton = document.createElement('button');
        continueButton.className = 'continue-button';
        continueButton.textContent = 'Continue to calendar';
        continueButton.style.display = 'none';
        continueButton.addEventListener('click', () => this.closeJournalEntry());
        container.appendChild(continueButton);
        
        return container;
    }
    
    async generateAIInsights(currentDate, currentText, analysisInterface) {
        try {
            // Get recent entries for context (last 7 days)
            const recentEntries = this.getRecentEntries(currentDate, 7);
            
            console.log('Requesting AI analysis with optimized data handling...');
            
            // Prepare entry data for scalable processing
            const currentEntry = {
                date: currentDate,
                text: currentText,
                timestamp: Date.now()
            };
            
            const allEntries = [currentEntry, ...recentEntries];
            
            // Use scalable insights processing for better performance
            const insights = await Promise.race([
                aiHelper.getScalableInsights(allEntries, 'daily_reflection'),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('AI request timeout')), 18000)
                )
            ]);
            
            if (insights && insights.trim().length > 0) {
                console.log('AI insights received successfully');
                this.displayAIInsights(insights, analysisInterface);
            } else {
                console.log('AI returned empty response, showing fallback');
                this.displayFallbackMessage(analysisInterface);
            }
        } catch (error) {
            console.error('AI analysis failed:', error);
            this.displayFallbackMessage(analysisInterface);
        }
    }
    
    getRecentEntries(currentDate, days) {
        const entries = [];
        const current = new Date(currentDate);
        
        for (let i = 1; i <= days; i++) {
            const pastDate = new Date(current);
            pastDate.setDate(pastDate.getDate() - i);
            const dateKey = this.formatDate(pastDate);
            
            if (this.entries[dateKey]) {
                entries.push({
                    date: dateKey,
                    text: this.entries[dateKey].text,
                    daysAgo: i
                });
            }
        }
        
        return entries;
    }
    
    createAnalysisPrompt(currentText, recentEntries) {
        let prompt = `As an AI companion, you are a calm, insightful, and gentle listener. Your role is to help the user explore their thoughts by asking open-ended questions.
Today's journal entry:
"${currentText}"
`;
        
        if (recentEntries.length > 0) {
            prompt += `For context, here are some recent entries from the past week:\n`;
            recentEntries.forEach(entry => {
                prompt += `${entry.daysAgo} days ago: "${entry.text.substring(0, 200)}${entry.text.length > 200 ? '...' : ''}"\n`;
            });
            prompt += '\n';
        }
        
        prompt += `Your task:
1. **Listen and Reflect**: Start by acknowledging a key theme or feeling from their entry. Use phrases like, "It sounds like you're navigating..." or "I hear you exploring the idea of..."
2. **Be Gently Curious**: Ask one or two thoughtful, open-ended questions that invite them to look deeper into their own words. For example: "What did that feel like for you?" or "I wonder what that brings up for you?"
3. **Subtly Reference, Don't Quote**: Allude to their specific words (like 'luxurious' or 'grounding') to show you're paying attention, but avoid putting them in quotation marks.
4. **Avoid Praise and Advice**: Do not praise them or tell them what to do. Your job is to ask, not to answer.
Write a response between 150-200 words that feels like a calm, therapeutic conversation, guiding them to their own insights.`;
        
        return prompt;
    }
    
    displayAIInsights(insights, analysisInterface) {
        const loadingSection = analysisInterface.querySelector('.ai-loading-section');
        const insightsSection = analysisInterface.querySelector('.ai-insights-section');
        const continueButton = analysisInterface.querySelector('.continue-button');
        const title = analysisInterface.querySelector('.ai-analysis-title');
        
        // Clean up loading message interval
        if (loadingSection.messageInterval) {
            clearInterval(loadingSection.messageInterval);
        }
        
        // Update title
        title.textContent = 'Your reflection insights';
        
        // Hide loading with fade out, show insights
        loadingSection.style.transition = 'all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        loadingSection.style.opacity = '0';
        loadingSection.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            loadingSection.style.display = 'none';
        }, 500);
        
        // Create insights content
        const insightsText = document.createElement('div');
        insightsText.className = 'insights-text';
        insightsText.textContent = insights;
        insightsSection.appendChild(insightsText);
        
        // Show with animation
        insightsSection.style.display = 'block';
        insightsSection.style.opacity = '0';
        insightsSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            insightsSection.style.transition = 'all 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)';
            insightsSection.style.opacity = '1';
            insightsSection.style.transform = 'translateY(0)';
            
            // Show continue button after insights appear
            setTimeout(() => {
                continueButton.style.display = 'block';
                continueButton.style.opacity = '0';
                continueButton.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    continueButton.style.transition = 'all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)';
                    continueButton.style.opacity = '1';
                    continueButton.style.transform = 'translateY(0)';
                }, 100);
            }, 800);
        }, 100);
    }
    
    displayFallbackMessage(analysisInterface) {
        const loadingSection = analysisInterface.querySelector('.ai-loading-section');
        const insightsSection = analysisInterface.querySelector('.ai-insights-section');
        const continueButton = analysisInterface.querySelector('.continue-button');
        const title = analysisInterface.querySelector('.ai-analysis-title');
        
        // Clean up loading message interval
        if (loadingSection.messageInterval) {
            clearInterval(loadingSection.messageInterval);
        }
        
        title.textContent = 'Thank you for sharing';
        
        // Hide loading with fade out
        loadingSection.style.transition = 'all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        loadingSection.style.opacity = '0';
        loadingSection.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            loadingSection.style.display = 'none';
        }, 500);
        
        const fallbackText = document.createElement('div');
        fallbackText.className = 'insights-text';
        fallbackText.textContent = 'Your thoughts have been safely saved. Taking time to reflect through writing is a meaningful practice for understanding yourself better. Each entry is a step in your journey of self-discovery.';
        insightsSection.appendChild(fallbackText);
        
        insightsSection.style.display = 'block';
        continueButton.style.display = 'block';
    }
    
    addAIAnalysisStyles() {
        if (!document.getElementById('aiAnalysisStyles')) {
            const styles = document.createElement('style');
            styles.id = 'aiAnalysisStyles';
            styles.textContent = `
                .ai-analysis-container {
                    width: 100%;
                    max-width: 600px;
                    margin: 0 auto;
                    text-align: center;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: aiAnalysisFadeIn 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) 0.1s forwards;
                }
                
                @keyframes aiAnalysisFadeIn {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .ai-analysis-header {
                    margin-bottom: 3rem;
                }
                
                .ai-analysis-title {
                    font-size: 1.5rem;
                    font-weight: 500;
                    color: #ffffff;
                    margin-bottom: 0.5rem;
                    letter-spacing: -0.01em;
                }
                
                .ai-analysis-subtitle {
                    font-size: 0.9rem;
                    color: #888888;
                    font-weight: 300;
                    margin: 0;
                }
                
                .ai-loading-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 3rem;
                    margin: 3rem 0;
                    padding: 2rem 0;
                }
                
                .ai-loading-animation {
                    position: relative;
                    width: 200px;
                    height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .ai-core {
                    position: relative;
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #1e3a8a, #3730a3);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 25px rgba(59, 130, 246, 0.4);
                    animation: aiCorePulse 2s ease-in-out infinite;
                    z-index: 3;
                }
                
                .ai-core::before {
                    content: '🔮';
                    font-size: 1.2rem;
                    animation: aiCoreRotate 8s linear infinite;
                }
                
                @keyframes aiCorePulse {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 0 25px rgba(59, 130, 246, 0.4);
                    }
                    50% {
                        transform: scale(1.1);
                        box-shadow: 0 0 40px rgba(147, 51, 234, 0.6);
                    }
                }
                
                @keyframes aiCoreRotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .ai-ring {
                    position: absolute;
                    border: 2px solid rgba(59, 130, 246, 0.2);
                    border-top: 2px solid rgba(147, 51, 234, 0.7);
                    border-right: 2px solid rgba(236, 72, 153, 0.5);
                    border-radius: 50%;
                    animation: aiRingRotate 3s linear infinite;
                }
                
                .ai-ring:nth-child(1) {
                    width: 60px;
                    height: 60px;
                    top: 50%;
                    left: 50%;
                    margin: -30px 0 0 -30px;
                }
                
                .ai-ring:nth-child(2) {
                    width: 80px;
                    height: 80px;
                    top: 50%;
                    left: 50%;
                    margin: -40px 0 0 -40px;
                    animation-direction: reverse;
                    animation-duration: 4s;
                }
                
                .ai-ring:nth-child(3) {
                    width: 100px;
                    height: 100px;
                    top: 50%;
                    left: 50%;
                    margin: -50px 0 0 -50px;
                    animation-duration: 5s;
                }
                
                @keyframes aiRingRotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .ai-particles {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }
                
                .ai-particle {
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: linear-gradient(45deg, #fbbf24, #f59e0b);
                    border-radius: 50%;
                    animation: aiParticleFloat 4s ease-in-out infinite;
                    opacity: 0;
                    box-shadow: 0 0 6px rgba(251, 191, 36, 0.6);
                }
                
                @keyframes aiParticleFloat {
                    0%, 100% {
                        opacity: 0;
                        transform: translateY(0) scale(0.3) rotate(0deg);
                    }
                    25% {
                        opacity: 0.8;
                        transform: translateY(-15px) scale(1) rotate(90deg);
                    }
                    50% {
                        opacity: 1;
                        transform: translateY(-25px) scale(1.2) rotate(180deg);
                    }
                    75% {
                        opacity: 0.6;
                        transform: translateY(-30px) scale(0.8) rotate(270deg);
                    }
                }
                
                .ai-streams {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                }
                
                .ai-stream {
                    position: absolute;
                    width: 3px;
                    height: 60px;
                    background: linear-gradient(180deg, transparent, rgba(168, 85, 247, 0.7), rgba(59, 130, 246, 0.5), transparent);
                    top: 50%;
                    left: 50%;
                    margin: -30px 0 0 -1.5px;
                    animation: aiStreamFlow 2s ease-in-out infinite;
                    opacity: 0;
                    transform-origin: center bottom;
                    filter: blur(0.5px);
                }
                
                @keyframes aiStreamFlow {
                    0%, 100% {
                        opacity: 0;
                        transform: scaleY(0.2) scaleX(0.5);
                        filter: blur(1px);
                    }
                    50% {
                        opacity: 0.9;
                        transform: scaleY(1.2) scaleX(1);
                        filter: blur(0px);
                    }
                }
                
                .ai-loading-text {
                    font-size: 1.1rem;
                    color: #aaaaaa;
                    text-align: center;
                    font-weight: 300;
                    margin: 0;
                    transition: opacity 0.3s ease;
                    min-height: 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .ai-insights-section {
                    margin: 2rem 0;
                    text-align: left;
                }
                
                .insights-text {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 2rem;
                    font-size: 1rem;
                    line-height: 1.7;
                    color: #e0e0e0;
                    font-weight: 300;
                }
                
                .continue-button {
                    background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
                    color: #ffffff;
                    border: 1px solid #333333;
                    padding: 1rem 2rem;
                    border-radius: 12px;
                    font-family: inherit;
                    font-size: 1rem;
                    font-weight: 400;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                    margin-top: 2rem;
                    min-width: 200px;
                }
                
                .continue-button:hover {
                    background: linear-gradient(135deg, #2a2a2a, #3a3a3a);
                    border-color: #444444;
                    transform: translateY(-2px);
                }
                
                .continue-button:active {
                    transform: translateY(0);
                }
                
                @media (min-width: 768px) {
                    .ai-analysis-title {
                        font-size: 1.8rem;
                    }
                    
                    .ai-analysis-subtitle {
                        font-size: 1rem;
                    }
                    
                    .ai-loading-animation {
                        width: 240px;
                        height: 240px;
                    }
                    
                    .ai-core {
                        width: 48px;
                        height: 48px;
                    }
                    
                    .ai-core::before {
                        font-size: 1.4rem;
                    }
                    
                    .ai-loading-text {
                        font-size: 1.2rem;
                    }
                    
                    .insights-text {
                        font-size: 1.1rem;
                        padding: 2.5rem;
                    }
                }
                
                @media (max-width: 480px) {
                    .ai-loading-section {
                        gap: 2rem;
                        margin: 2rem 0;
                        padding: 1rem 0;
                    }
                    
                    .ai-loading-animation {
                        width: 160px;
                        height: 160px;
                    }
                    
                    .ai-core {
                        width: 32px;
                        height: 32px;
                    }
                    
                    .ai-core::before {
                        font-size: 1rem;
                    }
                    
                    .ai-ring:nth-child(1) {
                        width: 48px;
                        height: 48px;
                        margin: -24px 0 0 -24px;
                    }
                    
                    .ai-ring:nth-child(2) {
                        width: 64px;
                        height: 64px;
                        margin: -32px 0 0 -32px;
                    }
                    
                    .ai-ring:nth-child(3) {
                        width: 80px;
                        height: 80px;
                        margin: -40px 0 0 -40px;
                    }
                    
                    .ai-loading-text {
                        font-size: 1rem;
                    }
                    
                    .insights-text {
                        padding: 1.5rem;
                    }
                    
                    .continue-button {
                        min-width: 100%;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    hasNewEntriesSinceLastView() {
        const currentMonth = `${this.currentDate.getFullYear()}-${this.currentDate.getMonth()}`;
        const lastViewTime = this.connectionsViewData[currentMonth] || 0;
        
        // Get monthly entries and check if any are newer than last view
        const monthlyEntries = this.getMonthlyEntries(this.currentDate);
        return monthlyEntries.some(entry => entry.timestamp > lastViewTime);
    }
    
    getMonthlyEntries(date) {
        const entries = [];
        const year = date.getFullYear();
        const month = date.getMonth();
        
        // Get all entries for the current month
        Object.keys(this.entries).forEach(dateKey => {
            const entryDate = new Date(dateKey);
            if (entryDate.getFullYear() === year && entryDate.getMonth() === month) {
            entries.push({
                date: dateKey,
                text: this.entries[dateKey].text,
                mood: this.entries[dateKey].mood,
                timestamp: this.entries[dateKey].timestamp
            });
            }
        });
        
        // Sort by date (oldest first)
        entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        return entries;
    }
    
    async showMonthlyConnections() {
        const monthlyEntries = this.getMonthlyEntries(this.currentDate);
        
        // Mark connections as viewed for current month
        const currentMonth = `${this.currentDate.getFullYear()}-${this.currentDate.getMonth()}`;
        this.connectionsViewData[currentMonth] = Date.now();
        this.saveConnectionsViewData(this.connectionsViewData);
        
        // Create connections interface
        const connectionsInterface = this.createConnectionsInterface();
        
        // Smooth transition to connections view
        this.calendarContainer.style.transition = 'all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        this.calendarContainer.style.opacity = '0';
        this.calendarContainer.style.transform = 'translateY(-20px)';
        
        this.journalInterface.style.transition = 'all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        this.journalInterface.style.opacity = '0';
        this.journalInterface.style.transform = 'translateY(-20px)';
        
        setTimeout(async () => {
            this.calendarContainer.style.display = 'none';
            this.journalInterface.innerHTML = '';
            this.journalInterface.appendChild(connectionsInterface);
            this.addConnectionsStyles();
            
            // Smooth transition into connections view
            setTimeout(() => {
                this.journalInterface.style.opacity = '1';
                this.journalInterface.style.transform = 'translateY(0)';
            }, 50);
            
            // Generate mood trends first
            this.generateMoodTrends(monthlyEntries, connectionsInterface);
            
            // Generate AI connections analysis
            await this.generateConnectionsAnalysis(monthlyEntries, connectionsInterface);
        }, 500);
    }
    
    createConnectionsInterface() {
        const container = document.createElement('div');
        container.className = 'connections-interface-container';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'connections-header';
        
        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        backButton.innerHTML = '← Back to calendar';
        backButton.addEventListener('click', () => this.closeConnectionsView());
        header.appendChild(backButton);
        
        const title = document.createElement('h2');
        title.className = 'connections-title';
        title.textContent = 'Discovering your patterns...';
        header.appendChild(title);
        
        const subtitle = document.createElement('p');
        subtitle.className = 'connections-subtitle';
        const monthName = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        subtitle.textContent = `Analyzing patterns and mood trends across your ${monthName} journal entries`;
        header.appendChild(subtitle);
        
        container.appendChild(header);
        
        // Create mood trends section
        const moodTrendsSection = document.createElement('div');
        moodTrendsSection.className = 'mood-trends-section';
        moodTrendsSection.style.display = 'none';
        container.appendChild(moodTrendsSection);
        
        // Create loading section
        const loadingSection = document.createElement('div');
        loadingSection.className = 'connections-loading-section';
        
        const loadingAnimation = document.createElement('div');
        loadingAnimation.className = 'connections-loading-animation';
        
        // Create animated connection nodes
        for (let i = 0; i < 5; i++) {
            const node = document.createElement('div');
            node.className = 'connection-node';
            node.style.animationDelay = `${i * 0.2}s`;
            loadingAnimation.appendChild(node);
        }
        
        // Create connecting lines
        for (let i = 0; i < 4; i++) {
            const line = document.createElement('div');
            line.className = 'connection-line';
            line.style.animationDelay = `${0.5 + i * 0.15}s`;
            loadingAnimation.appendChild(line);
        }
        
        loadingSection.appendChild(loadingAnimation);
        
        const loadingText = document.createElement('p');
        loadingText.className = 'connections-loading-text';
        loadingText.textContent = 'Finding meaningful patterns in your thoughts...';
        loadingSection.appendChild(loadingText);
        
        container.appendChild(loadingSection);
        
        // Create insights section (initially hidden)
        const insightsSection = document.createElement('div');
        insightsSection.className = 'connections-insights-section';
        insightsSection.style.display = 'none';
        container.appendChild(insightsSection);
        
        // Create continue button (initially hidden)
        const continueButton = document.createElement('button');
        continueButton.className = 'connections-continue-button';
        continueButton.textContent = 'Return to calendar';
        continueButton.style.display = 'none';
        continueButton.addEventListener('click', () => this.closeConnectionsView());
        container.appendChild(continueButton);
        
        return container;
    }
    
    closeConnectionsView() {
        // Smooth transition back to calendar view
        this.journalInterface.style.transition = 'all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        this.journalInterface.style.opacity = '0';
        this.journalInterface.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            this.calendarContainer.style.display = 'block';
            this.renderCalendar();
            this.renderJournalButton();
            
            // Smooth transition back into calendar
            setTimeout(() => {
                this.calendarContainer.style.opacity = '1';
                this.calendarContainer.style.transform = 'translateY(0)';
                this.journalInterface.style.opacity = '1';
                this.journalInterface.style.transform = 'translateY(0)';
            }, 50);
        }, 500);
    }
    
    addConnectionsStyles() {
        if (!document.getElementById('connectionsStyles')) {
            const styles = document.createElement('style');
            styles.id = 'connectionsStyles';
            styles.textContent = `
                .connections-interface-container {
                    width: 100%;
                    max-width: 100vw;
                    margin: 0;
                    padding: 0 1rem;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: connectionsInterfaceFadeIn 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) 0.1s forwards;
                    box-sizing: border-box;
                }
                
                @keyframes connectionsInterfaceFadeIn {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .connections-header {
                    text-align: center;
                    margin-bottom: 3rem;
                    padding-top: 3rem;
                    position: relative;
                }
                
                .connections-header .back-button {
                    position: absolute;
                    left: 0;
                    top: 0;
                    background: none;
                    border: none;
                    color: #888888;
                    font-family: inherit;
                    font-size: 0.9rem;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 8px;
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    z-index: 10;
                }
                
                .connections-header .back-button:hover {
                    background: #1a1a1a;
                    color: #ffffff;
                }
                
                .connections-title {
                    font-size: 1.6rem;
                    font-weight: 500;
                    color: #ffffff;
                    margin: 0 0 0.5rem 0;
                    letter-spacing: -0.01em;
                    position: relative;
                }
                
                .connections-subtitle {
                    font-size: 0.95rem;
                    color: #888888;
                    font-weight: 300;
                    margin: 0;
                    max-width: 500px;
                    margin-left: auto;
                    margin-right: auto;
                }
                
                .connections-loading-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2rem;
                    margin: 4rem 0;
                }
                
                .connections-loading-animation {
                    position: relative;
                    width: 200px;
                    height: 120px;
                    margin: 0 auto;
                }
                
                .connection-node {
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    background: linear-gradient(45deg, #88ffaa, #66dd88);
                    border-radius: 50%;
                    animation: nodeFloat 2s ease-in-out infinite;
                    box-shadow: 0 0 15px rgba(136, 255, 170, 0.3);
                }
                
                .connection-node:nth-child(1) {
                    top: 20px;
                    left: 30px;
                }
                
                .connection-node:nth-child(2) {
                    top: 10px;
                    right: 40px;
                }
                
                .connection-node:nth-child(3) {
                    bottom: 30px;
                    left: 20px;
                }
                
                .connection-node:nth-child(4) {
                    bottom: 20px;
                    right: 30px;
                }
                
                .connection-node:nth-child(5) {
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                
                @keyframes nodeFloat {
                    0%, 100% {
                        transform: translateY(0) scale(1);
                        opacity: 0.7;
                    }
                    50% {
                        transform: translateY(-8px) scale(1.1);
                        opacity: 1;
                    }
                }
                
                .connection-line {
                    position: absolute;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, #88ffaa, transparent);
                    animation: lineGlow 2.5s ease-in-out infinite;
                    opacity: 0;
                }
                
                .connection-line:nth-child(6) {
                    top: 25px;
                    left: 42px;
                    right: 52px;
                    transform: rotate(-5deg);
                }
                
                .connection-line:nth-child(7) {
                    top: 60px;
                    left: 32px;
                    right: 45px;
                    transform: rotate(15deg);
                }
                
                .connection-line:nth-child(8) {
                    bottom: 35px;
                    left: 32px;
                    right: 42px;
                    transform: rotate(-10deg);
                }
                
                .connection-line:nth-child(9) {
                    top: 35px;
                    bottom: 50px;
                    left: 90px;
                    width: 1px;
                    height: auto;
                    background: linear-gradient(180deg, transparent, #88ffaa, transparent);
                    transform: rotate(0deg);
                }
                
                @keyframes lineGlow {
                    0%, 100% {
                        opacity: 0;
                        filter: blur(1px);
                    }
                    50% {
                        opacity: 0.6;
                        filter: blur(0px);
                    }
                }
                
                .connections-loading-text {
                    font-size: 1rem;
                    color: #aaaaaa;
                    text-align: center;
                    font-weight: 300;
                    margin: 0;
                    animation: textPulse 2s ease-in-out infinite;
                }
                
                @keyframes textPulse {
                    0%, 100% {
                        opacity: 0.7;
                    }
                    50% {
                        opacity: 1;
                    }
                }
                
                .connections-insights-section {
                    margin: 2rem 0;
                    text-align: left;
                }
                
                .connections-insights-text {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 2rem;
                    font-size: 1rem;
                    line-height: 1.7;
                    color: #e0e0e0;
                    font-weight: 300;
                    margin: 0;
                }
                
                .connections-continue-button {
                    background: linear-gradient(135deg, #1a2a1a, #2a3a2a);
                    color: #88ffaa;
                    border: 1px solid #2a4a2a;
                    padding: 1rem 2rem;
                    border-radius: 12px;
                    font-family: inherit;
                    font-size: 1rem;
                    font-weight: 400;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                    margin: 2rem auto 0;
                    min-width: 200px;
                    display: block;
                }
                
                .connections-continue-button:hover {
                    background: linear-gradient(135deg, #2a3a2a, #3a4a3a);
                    border-color: #3a5a3a;
                    transform: translateY(-2px);
                }
                
                .connections-continue-button:active {
                    transform: translateY(0);
                }
                
                @media (min-width: 480px) {
                    .connections-interface-container {
                        max-width: 480px;
                        margin: 0 auto;
                        padding: 0 1.5rem;
                    }
                }
                
                @media (min-width: 768px) {
                    .connections-interface-container {
                        max-width: 700px;
                        padding: 0 2rem;
                    }
                    
                    .connections-title {
                        font-size: 1.9rem;
                    }
                    
                    .connections-subtitle {
                        font-size: 1.05rem;
                    }
                    
                    .connections-loading-animation {
                        width: 250px;
                        height: 140px;
                    }
                    
                    .connection-node {
                        width: 14px;
                        height: 14px;
                    }
                    
                    .connections-loading-text {
                        font-size: 1.1rem;
                    }
                    
                    .connections-insights-text {
                        font-size: 1.1rem;
                        padding: 2.5rem;
                    }
                }
                
                @media (min-width: 1024px) {
                    .connections-interface-container {
                        max-width: 800px;
                    }
                }
                
                .connections-header .back-button {
                    min-height: 44px;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                }
                
                .connections-continue-button {
                    min-height: 44px;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                    width: 100%;
                    box-sizing: border-box;
                }
                
                @media (min-width: 480px) {
                    .connections-continue-button {
                        max-width: 350px;
                        margin-left: auto;
                        margin-right: auto;
                    }
                }
                
                @media (min-width: 768px) {
                    .connections-continue-button {
                        width: auto;
                        min-width: 200px;
                        max-width: 300px;
                    }
                }
                
                .mood-trends-section {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    padding: 2rem;
                    margin-bottom: 3rem;
                }
                
                .mood-trends-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                
                .mood-trends-title {
                    font-size: 1.3rem;
                    font-weight: 500;
                    color: #ffffff;
                    margin: 0 0 0.5rem 0;
                    letter-spacing: -0.01em;
                }
                
                .mood-trends-subtitle {
                    font-size: 0.9rem;
                    color: #888888;
                    margin: 0;
                    font-weight: 300;
                }
                
                .no-mood-data {
                    text-align: center;
                    color: #666666;
                    font-style: italic;
                    padding: 2rem;
                }
                
                .mood-timeline-container {
                    margin-bottom: 2.5rem;
                }
                
                .mood-timeline-title {
                    font-size: 1.1rem;
                    font-weight: 500;
                    color: #ffffff;
                    margin: 0 0 1.5rem 0;
                    text-align: center;
                }
                
                .mood-timeline-track {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1rem;
                    justify-content: center;
                    position: relative;
                    padding: 1rem 0;
                }
                
                .mood-timeline-point {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    opacity: 0;
                    transform: translateY(10px);
                    animation: timelinePointFadeIn 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
                }
                
                @keyframes timelinePointFadeIn {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .mood-timeline-emoji {
                    font-size: 1.5rem;
                    padding: 0.5rem;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;
                }
                
                .mood-timeline-point:hover .mood-timeline-emoji {
                    transform: scale(1.1);
                    background: rgba(255, 255, 255, 0.1);
                }
                
                .mood-timeline-label {
                    text-align: center;
                    font-size: 0.8rem;
                }
                
                .timeline-day {
                    display: block;
                    color: #aaaaaa;
                    font-weight: 500;
                }
                
                .timeline-mood {
                    display: block;
                    color: #666666;
                    font-size: 0.75rem;
                    margin-top: 0.2rem;
                }
                
                .mood-timeline-empty {
                    text-align: center;
                    color: #666666;
                    font-style: italic;
                    padding: 1rem;
                }
                
                .mood-summary-container {
                    margin-top: 1.5rem;
                }
                
                .mood-summary-title {
                    font-size: 1.1rem;
                    font-weight: 500;
                    color: #ffffff;
                    margin: 0 0 1.5rem 0;
                    text-align: center;
                }
                
                .mood-summary-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }
                
                .mood-summary-card {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 1rem;
                    opacity: 0;
                    transform: translateX(-20px);
                    animation: summaryCardFadeIn 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
                    transition: all 0.3s ease;
                }
                
                .mood-summary-card:hover {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: rgba(255, 255, 255, 0.15);
                    transform: translateX(0);
                }
                
                @keyframes summaryCardFadeIn {
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                .mood-summary-emoji {
                    font-size: 1.5rem;
                    padding: 0.75rem;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.05);
                    flex-shrink: 0;
                }
                
                .mood-summary-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .mood-summary-label {
                    font-size: 0.95rem;
                    font-weight: 500;
                    color: #ffffff;
                    margin-bottom: 0.3rem;
                }
                
                .mood-summary-stats {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }
                
                .mood-count {
                    font-weight: 500;
                    color: #cccccc;
                }
                
                .mood-percentage {
                    color: #888888;
                    font-size: 0.9rem;
                }
                
                .mood-progress-bar {
                    height: 4px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 2px;
                    overflow: hidden;
                }
                
                .mood-progress-fill {
                    height: 100%;
                    width: 0%;
                    border-radius: 2px;
                    animation: progressFillGrow 0.8s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
                    opacity: 0.8;
                }
                
                @keyframes progressFillGrow {
                    from {
                        width: 0%;
                    }
                }
                
                .mood-summary-empty {
                    text-align: center;
                    color: #666666;
                    font-style: italic;
                    padding: 1rem;
                }
                
                .mood-trends-section {
                    padding: clamp(1.5rem, 4vw, 2rem);
                    margin-bottom: clamp(2rem, 5vw, 3rem);
                }
                
                .mood-trends-title {
                    font-size: clamp(1.2rem, 4vw, 1.3rem);
                }
                
                .mood-trends-subtitle {
                    font-size: clamp(0.85rem, 3vw, 0.9rem);
                }
                
                .mood-timeline-track {
                    gap: clamp(0.75rem, 3vw, 1rem);
                    padding: clamp(1rem, 3vw, 1rem) 0;
                }
                
                .mood-timeline-emoji {
                    font-size: clamp(1.25rem, 4vw, 1.5rem);
                    padding: clamp(0.4rem, 2vw, 0.5rem);
                }
                
                .mood-timeline-label {
                    font-size: clamp(0.75rem, 2.5vw, 0.8rem);
                }
                
                .timeline-mood {
                    font-size: clamp(0.7rem, 2vw, 0.75rem);
                }
                
                .mood-summary-card {
                    padding: clamp(0.875rem, 3vw, 1rem);
                    gap: clamp(0.75rem, 2vw, 1rem);
                }
                
                .mood-summary-emoji {
                    font-size: clamp(1.25rem, 4vw, 1.5rem);
                    padding: clamp(0.5rem, 2vw, 0.75rem);
                }
                
                .mood-summary-label {
                    font-size: clamp(0.9rem, 2.5vw, 0.95rem);
                }
                
                @media (min-width: 768px) {
                    .mood-trends-section {
                        padding: 2.5rem;
                    }
                    
                    .mood-trends-title {
                        font-size: 1.5rem;
                    }
                    
                    .mood-timeline-track {
                        gap: 1.5rem;
                        padding: 1.5rem 0;
                    }
                    
                    .mood-timeline-emoji {
                        font-size: 1.8rem;
                        padding: 0.75rem;
                    }
                    
                    .mood-timeline-label {
                        font-size: 0.85rem;
                    }
                    
                    .timeline-mood {
                        font-size: 0.8rem;
                    }
                    
                    .mood-summary-grid {
                        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                        gap: 1.5rem;
                    }
                    
                    .mood-summary-card {
                        padding: 1.25rem;
                    }
                    
                    .mood-summary-emoji {
                        font-size: 1.8rem;
                        padding: 1rem;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    generateMoodTrends(monthlyEntries, connectionsInterface) {
        const moodTrendsSection = connectionsInterface.querySelector('.mood-trends-section');
        
        // Create mood trends header
        const trendsHeader = document.createElement('div');
        trendsHeader.className = 'mood-trends-header';
        
        const trendsTitle = document.createElement('h3');
        trendsTitle.className = 'mood-trends-title';
        trendsTitle.textContent = 'Your Emotional Journey';
        trendsHeader.appendChild(trendsTitle);
        
        const trendsSubtitle = document.createElement('p');
        trendsSubtitle.className = 'mood-trends-subtitle';
        trendsSubtitle.textContent = 'Mood patterns throughout the month';
        trendsHeader.appendChild(trendsSubtitle);
        
        moodTrendsSection.appendChild(trendsHeader);
        
        // Process mood data
        const moodData = this.processMoodData(monthlyEntries);
        
        if (moodData.totalEntries === 0) {
            const noMoodData = document.createElement('div');
            noMoodData.className = 'no-mood-data';
            noMoodData.textContent = 'Add mood tags to your entries to see emotional trends here.';
            moodTrendsSection.appendChild(noMoodData);
        } else {
            // Create mood timeline
            const timeline = this.createMoodTimeline(moodData.timeline);
            moodTrendsSection.appendChild(timeline);
            
            // Create mood summary
            const summary = this.createMoodSummary(moodData.summary);
            moodTrendsSection.appendChild(summary);
        }
        
        // Show mood trends section with animation
        moodTrendsSection.style.display = 'block';
        moodTrendsSection.style.opacity = '0';
        moodTrendsSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            moodTrendsSection.style.transition = 'all 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)';
            moodTrendsSection.style.opacity = '1';
            moodTrendsSection.style.transform = 'translateY(0)';
        }, 300);
    }
    
    processMoodData(monthlyEntries) {
        const moods = {
            vibrant: { emoji: '✨', label: 'Vibrant', color: '#c026d3', count: 0 },
            insightful: { emoji: '👁️', label: 'Insightful', color: '#4f46e5', count: 0 },
            grounded: { emoji: '🧘', label: 'Grounded', color: '#16a34a', count: 0 },
            foggy: { emoji: '🌫️', label: 'Foggy', color: '#64748b', count: 0 },
            heavy: { emoji: '😩', label: 'Heavy', color: '#b91c1c', count: 0 }
        };
        
        const timeline = [];
        let totalEntries = 0;
        let entriesWithMood = 0;
        
        monthlyEntries.forEach(entry => {
            totalEntries++;
            const entryDate = new Date(entry.date);
            const dayOfMonth = entryDate.getDate();
            
            if (entry.mood && moods[entry.mood]) {
                moods[entry.mood].count++;
                entriesWithMood++;
                timeline.push({
                    day: dayOfMonth,
                    mood: entry.mood,
                    emoji: moods[entry.mood].emoji,
                    color: moods[entry.mood].color,
                    label: moods[entry.mood].label
                });
            }
        });
        
        // Sort timeline by day
        timeline.sort((a, b) => a.day - b.day);
        
        // Create summary data
        const summary = Object.entries(moods)
            .filter(([_, mood]) => mood.count > 0)
            .map(([key, mood]) => ({
                id: key,
                ...mood,
                percentage: Math.round((mood.count / entriesWithMood) * 100)
            }))
            .sort((a, b) => b.count - a.count);
        
        return {
            timeline,
            summary,
            totalEntries,
            entriesWithMood
        };
    }
    
    createMoodTimeline(timeline) {
        const timelineContainer = document.createElement('div');
        timelineContainer.className = 'mood-timeline-container';
        
        const timelineTitle = document.createElement('h4');
        timelineTitle.className = 'mood-timeline-title';
        timelineTitle.textContent = 'Daily Mood Flow';
        timelineContainer.appendChild(timelineTitle);
        
        if (timeline.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'mood-timeline-empty';
            emptyMessage.textContent = 'No mood data available for timeline.';
            timelineContainer.appendChild(emptyMessage);
            return timelineContainer;
        }
        
        const timelineTrack = document.createElement('div');
        timelineTrack.className = 'mood-timeline-track';
        
        timeline.forEach((entry, index) => {
            const timelinePoint = document.createElement('div');
            timelinePoint.className = 'mood-timeline-point';
            timelinePoint.style.animationDelay = `${index * 0.1}s`;
            
            const pointEmoji = document.createElement('span');
            pointEmoji.className = 'mood-timeline-emoji';
            pointEmoji.textContent = entry.emoji;
            pointEmoji.style.color = entry.color;
            
            const pointLabel = document.createElement('div');
            pointLabel.className = 'mood-timeline-label';
            pointLabel.innerHTML = `<span class="timeline-day">${entry.day}</span><span class="timeline-mood">${entry.label}</span>`;
            
            timelinePoint.appendChild(pointEmoji);
            timelinePoint.appendChild(pointLabel);
            timelineTrack.appendChild(timelinePoint);
        });
        
        timelineContainer.appendChild(timelineTrack);
        return timelineContainer;
    }
    
    createMoodSummary(summary) {
        const summaryContainer = document.createElement('div');
        summaryContainer.className = 'mood-summary-container';
        
        const summaryTitle = document.createElement('h4');
        summaryTitle.className = 'mood-summary-title';
        summaryTitle.textContent = 'Mood Distribution';
        summaryContainer.appendChild(summaryTitle);
        
        if (summary.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'mood-summary-empty';
            emptyMessage.textContent = 'No mood data available for summary.';
            summaryContainer.appendChild(emptyMessage);
            return summaryContainer;
        }
        
        const summaryGrid = document.createElement('div');
        summaryGrid.className = 'mood-summary-grid';
        
        summary.forEach((mood, index) => {
            const moodCard = document.createElement('div');
            moodCard.className = 'mood-summary-card';
            moodCard.style.animationDelay = `${index * 0.15}s`;
            
            const moodEmoji = document.createElement('div');
            moodEmoji.className = 'mood-summary-emoji';
            moodEmoji.textContent = mood.emoji;
            
            const moodInfo = document.createElement('div');
            moodInfo.className = 'mood-summary-info';
            
            const moodLabel = document.createElement('div');
            moodLabel.className = 'mood-summary-label';
            moodLabel.textContent = mood.label;
            
            const moodStats = document.createElement('div');
            moodStats.className = 'mood-summary-stats';
            moodStats.innerHTML = `<span class="mood-count">${mood.count}</span> <span class="mood-percentage">(${mood.percentage}%)</span>`;
            
            const progressBar = document.createElement('div');
            progressBar.className = 'mood-progress-bar';
            
            const progressFill = document.createElement('div');
            progressFill.className = 'mood-progress-fill';
            progressFill.style.backgroundColor = mood.color;
            progressFill.style.width = `${mood.percentage}%`;
            progressFill.style.animationDelay = `${0.5 + index * 0.15}s`;
            
            progressBar.appendChild(progressFill);
            
            moodInfo.appendChild(moodLabel);
            moodInfo.appendChild(moodStats);
            moodInfo.appendChild(progressBar);
            
            moodCard.appendChild(moodEmoji);
            moodCard.appendChild(moodInfo);
            summaryGrid.appendChild(moodCard);
        });
        
        summaryContainer.appendChild(summaryGrid);
        return summaryContainer;
    }
    
    async generateConnectionsAnalysis(monthlyEntries, connectionsInterface) {
        try {
            if (monthlyEntries.length === 0) {
                this.displayConnectionsFallback(connectionsInterface);
                return;
            }
            
            console.log('Requesting AI connections analysis with scalable data handling...');
            
            // Use scalable insights for large datasets or fallback to standard approach
            const insights = await Promise.race([
                aiHelper.getScalableInsights(monthlyEntries, 'monthly_connections'),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('AI request timeout')), 25000)
                )
            ]);
            
            if (insights && insights.trim().length > 0) {
                console.log('AI connections analysis received successfully');
                this.displayConnectionsInsights(insights, connectionsInterface);
            } else {
                console.log('AI returned empty response for connections, showing fallback');
                this.displayConnectionsFallback(connectionsInterface);
            }
        } catch (error) {
            console.error('AI connections analysis failed:', error);
            this.displayConnectionsFallback(connectionsInterface);
        }
    }
    
    createConnectionsPrompt(monthlyEntries, entriesWithMoods) {
        const monthName = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        let prompt = `As an AI companion, you are a calm, insightful, and gentle listener. You are reviewing a person's journal entries for a month to help them see their own journey.
Here are the entries for ${monthName} (${monthlyEntries.length} entries):
`;
        
        monthlyEntries.forEach((entry, index) => {
            const entryDate = new Date(entry.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            const excerpt = entry.text.length > 300 ? entry.text.substring(0, 300) + '...' : entry.text;
            const moodInfo = entry.mood ? ` [Mood: ${entry.mood}]` : '';
            prompt += `\n${entryDate}${moodInfo}: "${excerpt}"\n`;
        });
        
        if (entriesWithMoods.length > 0) {
            prompt += `\nMood patterns: ${entriesWithMoods.length} of ${monthlyEntries.length} entries included mood data.\n`;
        }
        
        prompt += `
Your task is to act as a thoughtful mirror.
1. **Identify a Core Theme**: Read through the entries and find a central theme, feeling, or journey that emerges over the month.
2. **Reflect it Back**: Begin by stating what you've noticed. For example, "Reading through your month, I see a thread about you creating more intentional space for yourself..."
3. **Ask a Gentle, Open-Ended Question**: Pose a single, thoughtful question that invites them to reflect on this theme. For instance, "Looking back, what do you think was the most significant part of that journey for you?" or "How does seeing that pattern now land with you?"
4. **Be Subtle**: Allude to their experiences and feelings without excessive quoting. Let your reflection show you've listened, rather than proving it with quotes.
5. **No Praise, No Advice**: Your role is to be an observant, curious partner. Do not praise their progress or offer solutions.
Please write a calm, reflective response of 150-200 words that helps them see the patterns in their own thoughts.`;
        
        return prompt;
    }
    
    displayConnectionsInsights(insights, connectionsInterface) {
        const loadingSection = connectionsInterface.querySelector('.connections-loading-section');
        const insightsSection = connectionsInterface.querySelector('.connections-insights-section');
        const continueButton = connectionsInterface.querySelector('.connections-continue-button');
        const title = connectionsInterface.querySelector('.connections-title');
        
        // Update title
        const monthName = this.currentDate.toLocaleDateString('en-US', { month: 'long' });
        title.textContent = `Your ${monthName} patterns`;
        
        // Hide loading, show insights
        loadingSection.style.display = 'none';
        
        // Create insights content
        const insightsText = document.createElement('div');
        insightsText.className = 'connections-insights-text';
        insightsText.textContent = insights;
        insightsSection.appendChild(insightsText);
        
        // Show with animation
        insightsSection.style.display = 'block';
        insightsSection.style.opacity = '0';
        insightsSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            insightsSection.style.transition = 'all 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)';
            insightsSection.style.opacity = '1';
            insightsSection.style.transform = 'translateY(0)';
            
            // Show continue button after insights appear
            setTimeout(() => {
                continueButton.style.display = 'block';
                continueButton.style.opacity = '0';
                continueButton.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    continueButton.style.transition = 'all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)';
                    continueButton.style.opacity = '1';
                    continueButton.style.transform = 'translateY(0)';
                }, 100);
            }, 1000);
        }, 100);
    }
    
    displayConnectionsFallback(connectionsInterface) {
        const loadingSection = connectionsInterface.querySelector('.connections-loading-section');
        const insightsSection = connectionsInterface.querySelector('.connections-insights-section');
        const continueButton = connectionsInterface.querySelector('.connections-continue-button');
        const title = connectionsInterface.querySelector('.connections-title');
        
        const monthName = this.currentDate.toLocaleDateString('en-US', { month: 'long' });
        title.textContent = `Your ${monthName} reflection journey`;
        loadingSection.style.display = 'none';
        
        const fallbackText = document.createElement('div');
        fallbackText.className = 'connections-insights-text';
        fallbackText.textContent = `Your commitment to regular journaling this month shows meaningful self-reflection. Each entry represents a moment of mindfulness and personal growth. The patterns in your thoughts and feelings, while unique to you, demonstrate the beautiful complexity of human experience and the value of taking time to understand yourself better.`;
        insightsSection.appendChild(fallbackText);
        
        insightsSection.style.display = 'block';
        continueButton.style.display = 'block';
    }
    
    addDashboardStyles() {
        if (!document.getElementById('dashboardStyles')) {
            const styles = document.createElement('style');
            styles.id = 'dashboardStyles';
            styles.textContent = `
                .journal-bottom-nav {
                    margin-top: 2rem;
                    display: flex;
                    justify-content: center;
                }
                .dashboard-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 1rem;
                    opacity: 0;
                    animation: dashboardFadeIn 0.8s ease-out forwards;
                }
                
                @keyframes dashboardFadeIn {
                    to {
                        opacity: 1;
                    }
                }
                
                .dashboard-header {
                    text-align: center;
                    margin-bottom: 3rem;
                }
                /* AI Dash avatar header styling */
                .dashboard-header .ai-avatar-container {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    overflow: hidden;
                    margin: 0 auto 0.75rem;
                    background: #0b0b0b;
                    border: 1px solid rgba(255,255,255,0.08);
                    box-shadow: 0 4px 20px rgba(168, 85, 247, 0.25);
                }
                .dashboard-header .ai-avatar-video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: inherit;
                }
                .dashboard-header .ai-avatar-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: inherit;
                    display: block;
                }
                .dashboard-header .avatar-fallback {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    color: #bbb;
                }
                
                .dashboard-title {
                    font-size: 2rem;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                    background: linear-gradient(135deg, #e879f9, #a855f7, #3b82f6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .streak-subtitle {
                    text-align: center;
                    color: #666666;
                    font-size: 0.9rem;
                    margin-bottom: 1.5rem;
                    font-weight: 400;
                }
                
                .dashboard-subtitle {
                    color: #888888;
                    font-size: 1rem;
                    font-weight: 300;
                }
                
                .weekly-checkin-section, .insights-section {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    padding: clamp(1rem, 3vw, 1.5rem);
                    margin-bottom: clamp(1.5rem, 3vw, 2rem);
                    max-width: 576px;
                    margin-left: auto;
                    margin-right: auto;
                    margin-bottom: clamp(1.5rem, 3vw, 2rem);
                    box-sizing: border-box;
                }

                /* Compact variant to reduce the Insights tile size */
                .insights-section.compact {
                    padding: 0.75rem;
                    margin-bottom: 0.75rem;
                    max-width: 520px;
                }
                .insights-section.compact .section-title {
                    font-size: 1.2rem;
                    margin-bottom: 0.5rem;
                }
                .insights-section.compact .insights-card {
                    padding: 0.75rem;
                }
                .insights-section.compact .cosmic-button {
                    padding: 10px 14px;
                    font-size: 0.95rem;
                }

                /* Player Performance card matches section styling */
                .player-performance-section {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    padding: clamp(1rem, 3vw, 1.5rem);
                    margin-bottom: clamp(1.5rem, 3vw, 2rem);
                    max-width: 576px;
                    margin-left: auto;
                    margin-right: auto;
                    box-sizing: border-box;
                }
                
                .section-title {
                    font-size: 1.3rem;
                    font-weight: 500;
                    color: #ffffff;
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .section-icon {
                    font-size: 1.2rem;
                }
                
                .week-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 0.5rem;
                    width: 100%;
                    box-sizing: border-box;
                    padding: 0;
                    max-width: 100%;
                    overflow: visible;
                }
                
                .streak-grid {
                    gap: 0.75rem;
                    padding: 0.5rem;
                }

                .performance-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: clamp(0.6rem, 2vw, 0.9rem);
                    width: 100%;
                    box-sizing: border-box;
                }

                .performance-item {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: clamp(0.75rem, 2vw, 1rem);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.25rem;
                    transition: all 0.25s ease;
                    box-sizing: border-box;
                }

                .performance-item:hover {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateY(-2px);
                }

                .performance-icon {
                    font-size: clamp(1rem, 3vw, 1.2rem);
                }

                .performance-value {
                    font-size: clamp(1rem, 3vw, 1.25rem);
                    font-weight: 600;
                    color: #ffffff;
                    line-height: 1;
                }

                .performance-label {
                    font-size: clamp(0.7rem, 2vw, 0.85rem);
                    color: #9CA3AF;
                    letter-spacing: 0.3px;
                    text-transform: uppercase;
                }

                .performance-item.accent-accuracy .performance-value {
                    color: #22c55e;
                }
                /* Home Dash: scale Player Performance visuals down by ~50% */
                .dashboard-container .player-performance-section {
                    padding: clamp(0.5rem, 1.5vw, 0.75rem);
                    margin-bottom: clamp(0.75rem, 1.5vw, 1rem);
                    max-width: 360px;
                }
                .dashboard-container .player-performance-section .section-title {
                    font-size: 0.75rem;
                    gap: 0.5rem;
                }
                .dashboard-container .performance-grid {
                    gap: clamp(0.3rem, 1vw, 0.45rem);
                }
                .dashboard-container .performance-item {
                    padding: clamp(0.375rem, 1vw, 0.5rem);
                    border-radius: 10px;
                    gap: 0.15rem;
                }
                .dashboard-container .performance-icon {
                    font-size: clamp(0.6rem, 1.5vw, 0.75rem);
                }
                .dashboard-container .performance-value {
                    font-size: clamp(0.6rem, 1.5vw, 0.75rem);
                }
                .dashboard-container .performance-label {
                    font-size: clamp(0.35rem, 1vw, 0.45rem);
                }
                
                .day-card {
                    aspect-ratio: 1;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: clamp(3px, 1vw, 6px);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: clamp(0.1rem, 0.5vw, 0.2rem);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: dayCardFadeIn 0.5s ease-out forwards;
                    min-height: clamp(35px, 10vw, 50px);
                    max-width: 100%;
                    min-width: 0;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                    box-sizing: border-box;
                }
                
                .streak-day {
                    border-radius: 8px;
                    /* Slightly reduce tile size to prevent overlap on tight layouts */
                    min-height: clamp(38px, 11vw, 56px);
                    /* Global downscale for streak tiles */
                    transform: scale(0.95);
                }
                
                .streak-day.current-active {
                    background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.15));
                    border: 2px solid rgba(34, 197, 94, 0.4);
                    box-shadow: 0 0 12px rgba(34, 197, 94, 0.2);
                    animation: currentDayPulse 2s ease-in-out infinite;
                    /* Keep a subtle emphasis without causing overlap */
                    transform: scale(0.98);
                }
                
                .streak-day.current-completed {
                    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.25));
                    border: 2px solid rgba(34, 197, 94, 0.6);
                    box-shadow: 0 0 16px rgba(34, 197, 94, 0.3);
                    /* Reduce scale to avoid overlapping neighboring tiles */
                    transform: scale(0.98);
                }
                
                .streak-day.future-locked {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    opacity: 0.6;
                }
                
                .streak-day.shield-day {
                    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.15));
                    border: 2px solid rgba(251, 191, 36, 0.4);
                    position: relative;
                }
                
                .streak-day.shield-day::before {
                    content: '';
                    position: absolute;
                    top: -2px;
                    left: -2px;
                    right: -2px;
                    bottom: -2px;
                    background: linear-gradient(45deg, #f59e0b, #eab308, #f59e0b);
                    border-radius: 10px;
                    z-index: -1;
                    animation: shieldGlow 3s ease-in-out infinite;
                }
                
                @keyframes currentDayPulse {
                    0%, 100% {
                        box-shadow: 0 0 12px rgba(34, 197, 94, 0.2);
                    }
                    50% {
                        box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
                    }
                }
                
                @keyframes shieldGlow {
                    0%, 100% {
                        opacity: 0.6;
                    }
                    50% {
                        opacity: 1;
                    }
                }
                
                @keyframes dayCardFadeIn {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .day-card:hover {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateY(-2px);
                }
                
                .day-card.today {
                    background: rgba(139, 92, 246, 0.2);
                    border-color: rgba(139, 92, 246, 0.4);
                }
                
                .day-card.has-entry {
                    background: rgba(34, 197, 94, 0.1);
                    border-color: rgba(34, 197, 94, 0.3);
                }
                
                .day-label {
                    font-size: clamp(0.55rem, 1.8vw, 0.65rem);
                    color: #888888;
                    font-weight: 500;
                    text-align: center;
                    line-height: 1.1;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .day-number {
                    font-size: clamp(0.7rem, 2.2vw, 0.9rem);
                    font-weight: 500;
                    color: #ffffff;
                    line-height: 1;
                }
                
                .day-mood {
                    font-size: clamp(0.8rem, 2.5vw, 1rem);
                    line-height: 1;
                }
                
                .day-placeholder {
                    font-size: clamp(0.8rem, 2.5vw, 1rem);
                    color: #666666;
                    line-height: 1;
                }
                
                .day-status {
                    font-size: clamp(0.9rem, 2.8vw, 1.1rem);
                    line-height: 1;
                    margin-top: 0.1rem;
                }
                
                .day-status.completed-icon {
                    color: #22c55e;
                    animation: completedPulse 1s ease-out;
                }
                
                .day-status.active-icon {
                    color: #3b82f6;
                    animation: activeBounce 2s ease-in-out infinite;
                }
                
                .day-status.locked-icon {
                    color: #666666;
                    opacity: 0.7;
                }
                
                .day-status.shield-icon {
                    color: #f59e0b;
                    animation: shieldShine 2s ease-in-out infinite;
                    text-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
                }
                
                @keyframes completedPulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.3); }
                    100% { transform: scale(1); }
                }
                
                @keyframes activeBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                
                @keyframes shieldShine {
                    0%, 100% { 
                        text-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
                        transform: scale(1);
                    }
                    50% { 
                        text-shadow: 0 0 16px rgba(245, 158, 11, 0.8);
                        transform: scale(1.1);
                    }
                }
                
                .day-card.today .day-placeholder {
                    color: #a855f7;
                    font-weight: bold;
                }
                
                .streak-day .day-label {
                    font-size: clamp(0.5rem, 1.5vw, 0.6rem);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .streak-day.current-active .day-label,
                .streak-day.current-completed .day-label {
                    color: #22c55e;
                }
                
                .streak-day.shield-day .day-label {
                    color: #f59e0b;
                }
                
                .streak-day.future-locked .day-label {
                    color: #666666;
                }
                
                .insights-content {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    text-align: center;
                }
                /* Buttons styling to match dashboard design */
                .cosmic-button {
                    background: linear-gradient(135deg, #8b5cf6, #a855f7, #ec4899);
                    color: #ffffff;
                    border: none;
                    padding: 0.9rem 1.4rem;
                    border-radius: 999px;
                    font-family: inherit;
                    font-size: 0.95rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    width: 100%;
                    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.25);
                }

                .cosmic-button.primary {
                    background: linear-gradient(135deg, #3b3b3b, #2b2b2b);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.35);
                }

                .cosmic-button.secondary {
                    background: linear-gradient(135deg, #8b5cf6, #a855f7, #ec4899);
                }

                .cosmic-button:hover:not(.disabled) {
                    transform: translateY(-2px);
                    filter: brightness(1.05);
                }

                .cosmic-button.disabled {
                    background: #444444;
                    cursor: not-allowed;
                    box-shadow: none;
                    opacity: 0.8;
                }

                .button-spark {
                    animation: sparkle 1.5s ease-in-out infinite;
                }
                .past-insights-button {
                    background: transparent;
                    border: none;
                    color: #a855f7;
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    margin-top: 0;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    justify-content: center;
                    width: 100%;
                }
                .past-insights-button:hover {
                    background: rgba(168, 85, 247, 0.1);
                    color: #c084fc;
                }
                
                .insights-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 2rem;
                    margin-bottom: 1.5rem;
                    text-align: center;
                }
                
                .insights-card.no-data {
                    border-color: rgba(251, 191, 36, 0.3);
                    background: rgba(251, 191, 36, 0.05);
                }
                
                .insights-card.ready {
                    border-color: rgba(139, 92, 246, 0.3);
                    background: rgba(139, 92, 246, 0.05);
                }
                
                .insights-icon {
                    font-size: 2.5rem;
                    margin-bottom: 1rem;
                }
                
                .insights-card h3 {
                    font-size: 1.2rem;
                    font-weight: 500;
                    color: #ffffff;
                    margin-bottom: 1rem;
                }
                
                .insights-card p {
                    color: #cccccc;
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                }
                
                .insights-progress {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    justify-content: center;
                }
                
                .progress-bar {
                    flex: 1;
                    max-width: 200px;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    overflow: hidden;
                }
                
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #f59e0b, #eab308);
                    border-radius: 3px;
                    transition: width 0.5s ease;
                }
                
                .progress-text {
                    color: #888888;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                
                .entry-view-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1rem;
                }
                
                .entry-view-content {
                    background: #1a1a1a;
                    border: 1px solid #333333;
                    border-radius: 16px;
                    max-width: 500px;
                    width: 100%;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                
                .entry-view-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid #333333;
                }
                
                .entry-view-header h3 {
                    color: #ffffff;
                    font-size: 1.1rem;
                    font-weight: 500;
                    margin: 0;
                }
                
                .close-modal {
                    background: none;
                    border: none;
                    color: #888888;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }
                
                .close-modal:hover {
                    background: #333333;
                    color: #ffffff;
                }
                
                .entry-view-body {
                    padding: 1.5rem;
                }
                
                .entry-mood {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                    padding: 0.75rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    font-size: 0.9rem;
                    color: #cccccc;
                }
                
                .entry-text {
                    color: #e0e0e0;
                    line-height: 1.6;
                    white-space: pre-wrap;
                }
                
                .quantum-insights-loading {
                    text-align: center;
                    padding: 4rem 2rem;
                }
                
                .quantum-loading-animation {
                    position: relative;
                    width: 120px;
                    height: 120px;
                    margin: 0 auto 2rem;
                }
                
                .quantum-core {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 2rem;
                    animation: quantumPulse 2s ease-in-out infinite;
                }
                
                @keyframes quantumPulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); }
                    50% { transform: translate(-50%, -50%) scale(1.2); }
                }
                
                .quantum-rings {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                }
                
                .quantum-ring {
                    position: absolute;
                    border: 2px solid transparent;
                    border-top: 2px solid rgba(139, 92, 246, 0.6);
                    border-right: 2px solid rgba(236, 72, 153, 0.4);
                    border-radius: 50%;
                    animation: quantumRotate 3s linear infinite;
                }
                
                .quantum-ring:nth-child(1) {
                    width: 60px;
                    height: 60px;
                    top: 30px;
                    left: 30px;
                }
                
                .quantum-ring:nth-child(2) {
                    width: 80px;
                    height: 80px;
                    top: 20px;
                    left: 20px;
                    animation-direction: reverse;
                    animation-duration: 4s;
                }
                
                .quantum-ring:nth-child(3) {
                    width: 100px;
                    height: 100px;
                    top: 10px;
                    left: 10px;
                    animation-duration: 5s;
                }
                
                @keyframes quantumRotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .quantum-insights-display {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 2rem 1rem;
                }
                
                .insights-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                
                .insights-header h1 {
                    font-size: 2rem;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                    background: linear-gradient(135deg, #e879f9, #a855f7, #3b82f6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .insights-header p {
                    color: #888888;
                    font-size: 1rem;
                }
                
                .insights-content .insights-text {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 2rem;
                    color: #e0e0e0;
                    line-height: 1.7;
                    font-size: 1rem;
                    margin-bottom: 2rem;
                }
                
                /* Mobile-first responsive design for 576x1024 canvas */
                @media (max-width: 576px) {
                    .dashboard-container {
                        padding: clamp(0.75rem, 2vw, 1rem);
                        max-width: 576px;
                        margin: 0 auto;
                    }
                    
                    .dashboard-title {
                        font-size: clamp(1.3rem, 4vw, 1.5rem);
                    }
                    
                    .weekly-checkin-section, .insights-section {
                        padding: clamp(0.875rem, 2.5vw, 1rem);
                        margin-left: 0.1rem;
                        margin-right: 0.1rem;
                        max-width: calc(100% - 0.2rem);
                        box-sizing: border-box;
                    }
                    
                    .week-grid {
                        gap: clamp(0.1rem, 0.4vw, 0.2rem);
                        padding: 0 0.05rem;
                        max-width: 100%;
                        margin: 0 auto;
                    }
                    
                    .day-card {
                        min-height: 35px;
                        max-width: none;
                        width: 100%;
                        border-radius: 3px;
                        padding: 0.15rem;
                    }
                    
                    .section-title {
                        font-size: clamp(1.1rem, 3.5vw, 1.25rem);
                        margin-bottom: clamp(0.875rem, 2vw, 1.25rem);
                    }
                    
                    .insights-card {
                        padding: clamp(1rem, 3vw, 1.25rem);
                    }
                }
                
                @media (min-width: 577px) and (max-width: 768px) {
                    .dashboard-container {
                        padding: 1rem;
                        max-width: 576px;
                        margin: 0 auto;
                    }
                    
                    .dashboard-title {
                        font-size: 1.5rem;
                    }
                    
                    .weekly-checkin-section, .insights-section {
                        padding: 1.5rem;
                    }
                    
                    .week-grid {
                        gap: 0.5rem;
                        padding: 0 0.5rem;
                    }
                    
                    .day-card {
                        min-height: 65px;
                        max-width: 75px;
                    }
                    
                    .insights-card {
                        padding: 1.5rem;
                    }
                }
                
                @media (min-width: 769px) {
                    .dashboard-container {
                        max-width: 576px;
                        margin: 0 auto;
                        padding: 1.5rem;
                    }
                    
                    .week-grid {
                        gap: 0.75rem;
                        padding: 0;
                    }
                    
                    .day-card {
                        max-width: 70px;
                        min-height: 70px;
                    }
                }
                .past-insights-container {
                    padding: 1rem;
                    animation: dashboardFadeIn 0.8s ease-out forwards;
                }
                .past-insights-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                .past-insights-header .back-to-dashboard {
                    margin-bottom: 1rem;
                }
                .past-insights-header h1 {
                    font-size: 1.8rem;
                    margin-bottom: 0.5rem;
                    color: #e879f9;
                }
                
                .past-insights-header p {
                    color: #888888;
                }
                .past-insights-list {
                    display: grid;
                    gap: 1.5rem;
                }
                .past-insight-card {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: dayCardFadeIn 0.5s ease-out forwards;
                }
                .past-insight-card-header {
                    padding: 0.75rem 1rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .insight-card-date {
                    font-size: 0.8rem;
                    color: #aaa;
                    font-weight: 500;
                }
                
                .past-insight-card-body {
                    padding: 1.5rem;
                    color: #e0e0e0;
                    line-height: 1.7;
                    font-size: 1rem;
                    white-space: pre-wrap;
                }
                .no-insights-message {
                    text-align: center;
                    color: #888;
                    padding: 3rem;
                    font-style: italic;
                }
                
                .journal-access-section {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    padding: clamp(1rem, 3vw, 1.5rem);
                    margin-bottom: clamp(1.5rem, 3vw, 2rem);
                    max-width: 576px;
                    margin-left: auto;
                    margin-right: auto;
                    margin-bottom: clamp(1.5rem, 3vw, 2rem);
                    box-sizing: border-box;
                }
                
                .journal-access-card {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    background: rgba(59, 130, 246, 0.05);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    border-radius: 12px;
                    padding: 1.5rem;
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                    opacity: 0;
                    transform: translateY(20px);
                    animation: dayCardFadeIn 0.6s ease-out forwards;
                    min-height: 44px;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                }
                
                .journal-access-card:hover {
                    background: rgba(59, 130, 246, 0.1);
                    border-color: rgba(59, 130, 246, 0.4);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
                }
                
                .journal-access-icon {
                    font-size: 2rem;
                    flex-shrink: 0;
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(59, 130, 246, 0.1);
                    border-radius: 50%;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                }
                
                .journal-access-content {
                    flex: 1;
                    min-width: 0;
                }
                
                .journal-access-content h3 {
                    font-size: 1.1rem;
                    font-weight: 500;
                    color: #ffffff;
                    margin: 0 0 0.5rem 0;
                    line-height: 1.3;
                }
                
                .journal-access-content p {
                    font-size: 0.9rem;
                    color: #cccccc;
                    margin: 0;
                    line-height: 1.4;
                }
                
                .journal-access-arrow {
                    font-size: 1.5rem;
                    color: rgba(59, 130, 246, 0.7);
                    flex-shrink: 0;
                    transition: all 0.3s ease;
                }
                
                .journal-access-card:hover .journal-access-arrow {
                    transform: translateX(4px);
                    color: rgba(59, 130, 246, 1);
                }
                
                @media (max-width: 576px) {
                    .journal-access-section {
                        padding: clamp(0.875rem, 2.5vw, 1rem);
                        margin-left: 0.1rem;
                        margin-right: 0.1rem;
                        max-width: calc(100% - 0.2rem);
                    }
                    
                    .journal-access-card {
                        padding: 1rem;
                        gap: 0.75rem;
                    }
                    
                    .journal-access-icon {
                        width: 50px;
                        height: 50px;
                        font-size: 1.5rem;
                    }
                    
                    .journal-access-content h3 {
                        font-size: 1rem;
                    }
                    
                    .journal-access-content p {
                        font-size: 0.85rem;
                    }
                    
                    .journal-access-arrow {
                        font-size: 1.2rem;
                    }
                }
                
                @media (min-width: 577px) and (max-width: 768px) {
                    .journal-access-section {
                        padding: 1.5rem;
                    }
                    
                    .journal-access-card {
                        padding: 1.25rem;
                    }
                }
                
                .all-entries-section {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    padding: clamp(1rem, 3vw, 1.5rem);
                    margin-bottom: clamp(1.5rem, 3vw, 2rem);
                    max-width: 576px;
                    margin-left: auto;
                    margin-right: auto;
                    margin-bottom: clamp(1.5rem, 3vw, 2rem);
                    box-sizing: border-box;
                }
                
                .all-entries-card {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    background: rgba(34, 197, 94, 0.05);
                    border: 1px solid rgba(34, 197, 94, 0.2);
                    border-radius: 12px;
                    padding: 1.5rem;
                    transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                    opacity: 0;
                    transform: translateY(20px);
                    animation: dayCardFadeIn 0.6s ease-out forwards;
                    min-height: 44px;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                }
                
                .all-entries-card:hover {
                    background: rgba(34, 197, 94, 0.1);
                    border-color: rgba(34, 197, 94, 0.4);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 16px rgba(34, 197, 94, 0.2);
                }
                
                .all-entries-icon {
                    font-size: 2rem;
                    flex-shrink: 0;
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(34, 197, 94, 0.1);
                    border-radius: 50%;
                    border: 1px solid rgba(34, 197, 94, 0.3);
                }
                
                .all-entries-content {
                    flex: 1;
                    min-width: 0;
                }
                
                .all-entries-content h3 {
                    font-size: 1.1rem;
                    font-weight: 500;
                    color: #ffffff;
                    margin: 0 0 0.5rem 0;
                    line-height: 1.3;
                }
                
                .all-entries-content p {
                    font-size: 0.9rem;
                    color: #cccccc;
                    margin: 0;
                    line-height: 1.4;
                }
                
                .all-entries-arrow {
                    font-size: 1.5rem;
                    color: rgba(34, 197, 94, 0.7);
                    flex-shrink: 0;
                    transition: all 0.3s ease;
                }
                
                .all-entries-card:hover .all-entries-arrow {
                    transform: translateX(4px);
                    color: rgba(34, 197, 94, 1);
                }
                
                .all-entries-container {
                    padding: 1rem;
                    animation: dashboardFadeIn 0.8s ease-out forwards;
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .all-entries-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                
                .all-entries-header .back-to-dashboard {
                    margin-bottom: 1rem;
                }
                
                .all-entries-header h1 {
                    font-size: 1.8rem;
                    margin-bottom: 0.5rem;
                    color: #22c55e;
                }
                
                .all-entries-header p {
                    color: #888888;
                }
                
                .all-entries-list {
                    display: grid;
                    gap: 1.5rem;
                }
                
                .entry-card {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: dayCardFadeIn 0.5s ease-out forwards;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .entry-card:hover {
                    background: rgba(255, 255, 255, 0.04);
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
                }
                
                .entry-card-header {
                    padding: 1rem 1.5rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                
                .entry-card-date {
                    font-size: 0.9rem;
                    color: #ffffff;
                    font-weight: 500;
                }
                
                .entry-card-mood {
                    font-size: 0.8rem;
                    color: #aaaaaa;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 0.25rem 0.75rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .entry-card-preview {
                    padding: 1.5rem;
                    color: #cccccc;
                    line-height: 1.6;
                    font-size: 0.95rem;
                }
                
                .entry-card-actions {
                    padding: 1rem 1.5rem;
                    background: rgba(255, 255, 255, 0.02);
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    gap: 0.75rem;
                    justify-content: flex-end;
                }
                
                .entry-action-button {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #cccccc;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-family: inherit;
                }
                
                .entry-action-button:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.2);
                    color: #ffffff;
                }
                
                .entry-action-button.view {
                    background: rgba(59, 130, 246, 0.1);
                    border-color: rgba(59, 130, 246, 0.3);
                    color: #93c5fd;
                }
                
                .entry-action-button.view:hover {
                    background: rgba(59, 130, 246, 0.2);
                    border-color: rgba(59, 130, 246, 0.5);
                    color: #dbeafe;
                }
                
                .entry-action-button.edit {
                    background: rgba(34, 197, 94, 0.1);
                    border-color: rgba(34, 197, 94, 0.3);
                    color: #86efac;
                }
                
                .entry-action-button.edit:hover {
                    background: rgba(34, 197, 94, 0.2);
                    border-color: rgba(34, 197, 94, 0.5);
                    color: #dcfce7;
                }
                
                .no-entries-message {
                    text-align: center;
                    padding: 4rem 2rem;
                    color: #888888;
                }
                
                .no-entries-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                
                .no-entries-message h3 {
                    font-size: 1.2rem;
                    margin-bottom: 0.5rem;
                    color: #aaaaaa;
                }
                
                .no-entries-message p {
                    color: #777777;
                    line-height: 1.6;
                }
                
                @media (max-width: 576px) {
                    .all-entries-section {
                        padding: clamp(0.875rem, 2.5vw, 1rem);
                        margin-left: 0.1rem;
                        margin-right: 0.1rem;
                        max-width: calc(100% - 0.2rem);
                    }
                    
                    .all-entries-card {
                        padding: 1rem;
                        gap: 0.75rem;
                    }
                    
                    .all-entries-icon {
                        width: 50px;
                        height: 50px;
                        font-size: 1.5rem;
                    }
                    
                    .all-entries-content h3 {
                        font-size: 1rem;
                    }
                    
                    .all-entries-content p {
                        font-size: 0.85rem;
                    }
                    
                    .all-entries-arrow {
                        font-size: 1.2rem;
                    }
                    
                    .entry-card-header {
                        padding: 0.75rem 1rem;
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .entry-card-preview {
                        padding: 1rem;
                        font-size: 0.9rem;
                    }
                    
                    .entry-card-actions {
                        padding: 0.75rem 1rem;
                        justify-content: center;
                    }
                }
                
                @media (min-width: 577px) and (max-width: 768px) {
                    .all-entries-section {
                        padding: 1.5rem;
                    }
                    
                    .all-entries-card {
                        padding: 1.25rem;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
    }
    
    formatDate(date) {
        // Use local date instead of UTC to prevent timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}