// ============================================
// DrishtiKosh OS - Professional Frontend
// WebSocket + Speech Synthesis
// ============================================

const app = {
    // State
    state: {
        currentView: 'home',
        connected: false,
        ws: null,
        isSpeaking: false,
        currentCourse: null
    },

    // DOM Elements Cache
    elements: {
        // Views
        homeView: document.getElementById('homeView'),
        courseView: document.getElementById('courseView'),
        botView: document.getElementById('botView'),
        redirectView: document.getElementById('redirectView'),

        // Course View
        courseTitle: document.getElementById('courseTitle'),
        courseSummary: document.getElementById('courseSummary'),
        playBtn: document.getElementById('playBtn'),
        pauseBtn: document.getElementById('pauseBtn'),
        stopBtn: document.getElementById('stopBtn'),
        courseBackBtn: document.getElementById('courseBackBtn'),

        // Bot View
        botStatus: document.getElementById('botStatus'),
        micLarge: document.getElementById('micLarge'),
        botBackBtn: document.getElementById('botBackBtn'),

        // Redirect View
        redirectMessage: document.getElementById('redirectMessage'),

        // Navigation
        navItems: document.querySelectorAll('.nav-item'),

        // Status
        connectionText: document.getElementById('connectionText'),
        statusDot: document.getElementById('statusDot'),
        announcer: document.getElementById('announcer')
    },

    // Speech Synthesis
    speech: {
        synth: window.speechSynthesis,
        currentUtterance: null,

        /**
         * Cancel any ongoing speech
         */
        cancel() {
            this.synth.cancel();
            app.state.isSpeaking = false;
        },

        /**
         * Speak text with robust error handling
         */
        speak(text, options = {}) {
            // Always cancel previous speech
            this.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = options.rate || 1.0;
            utterance.pitch = options.pitch || 1.0;
            utterance.volume = options.volume || 1.0;

            utterance.onstart = () => {
                app.state.isSpeaking = true;
                if (options.onStart) options.onStart();
            };

            utterance.onend = () => {
                app.state.isSpeaking = false;
                if (options.onEnd) options.onEnd();
            };

            utterance.onerror = (event) => {
                console.error('Speech error:', event.error);
                app.state.isSpeaking = false;
                if (options.onError) options.onError();
            };

            this.currentUtterance = utterance;
            this.synth.speak(utterance);
        },

        /**
         * Announce text for accessibility
         */
        announce(text) {
            this.elements = document.getElementById('announcer');
            if (this.elements) this.elements.textContent = text;
            this.speak(text);
        }
    },

    // WebSocket Management
    websocket: {
        /**
         * Connect to WebSocket server
         */
        connect() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;

            try {
                app.state.ws = new WebSocket(wsUrl);

                app.state.ws.onopen = () => {
                    console.log('[SUCCESS] WebSocket connected');
                    app.state.connected = true;
                    app.updateConnectionStatus(true);
                    app.speech.announce('DrishtiKosh connected. System online.');
                };

                app.state.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        app.handleMessage(data);
                    } catch (e) {
                        console.error('Failed to parse message:', e);
                    }
                };

                app.state.ws.onerror = (error) => {
                    console.error('[ERROR] WebSocket error:', error);
                    app.updateConnectionStatus(false);
                    app.speech.announce('Connection error. Retrying...');
                };

                app.state.ws.onclose = () => {
                    console.log('[DISCONNECTED] WebSocket disconnected');
                    app.state.connected = false;
                    app.updateConnectionStatus(false);
                    // Auto-reconnect after 3 seconds
                    setTimeout(() => app.websocket.connect(), 3000);
                };
            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                app.updateConnectionStatus(false);
            }
        },

        /**
         * Send card command
         */
        sendCard(cardId) {
            if (!app.state.connected || !app.state.ws) {
                app.speech.announce('Connection lost. Please wait...');
                return;
            }

            try {
                app.state.ws.send(JSON.stringify({ card_id: cardId }));
                console.log(`Card sent: ${cardId}`);
            } catch (error) {
                console.error('Failed to send card:', error);
                app.speech.announce('Failed to process card.');
            }
        }
    },

    // Message Handler
    handleMessage(response) {
        console.log('Message received:', response);

        if (response.status === 'error') {
            app.speech.announce(`Error: ${response.message}`);
            return;
        }

        const { type, view, audio } = response;

        // Handle audio announcement
        if (audio) {
            app.speech.announce(audio);
        }

        // Route by type
        switch (type) {
            case 'nav':
                app.switchView(view);
                break;
            case 'course':
                app.loadCourse(response);
                break;
            case 'redirect':
                app.handleRedirect(response);
                break;
            default:
                console.warn('Unknown type:', type);
        }
    },

    // View Management
    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

        // Show target view
        const viewMap = {
            'home': this.elements.homeView,
            'course': this.elements.courseView,
            'bot': this.elements.botView,
            'redirect': this.elements.redirectView
        };

        const targetView = viewMap[viewName];
        if (targetView) {
            targetView.classList.add('active');
            this.state.currentView = viewName;
            console.log(`Switched to view: ${viewName}`);
        }
    },

    // Load Course
    loadCourse(courseData) {
        this.switchView('course');
        this.elements.courseTitle.textContent = courseData.title;
        this.elements.courseSummary.textContent = courseData.summary;
        this.state.currentCourse = courseData;

        // Auto-play after brief delay
        setTimeout(() => {
            this.playCourse();
        }, 500);
    },

    // Play Course Summary
    playCourse() {
        if (!this.state.currentCourse) return;

        this.speech.speak(this.state.currentCourse.summary, {
            rate: 0.95,
            onStart: () => {
                console.log('Playing course audio');
            },
            onEnd: () => {
                console.log('Course audio finished');
            }
        });
    },

    // Redirect Handler
    handleRedirect(data) {
        this.switchView('redirect');
        const delay = 3000; // 3 seconds
        setTimeout(() => {
            if (data.url) {
                window.location.href = data.url;
            }
        }, delay);
    },

    // UI Updates
    updateConnectionStatus(connected) {
        const statusDot = this.elements.statusDot;
        const connectionText = this.elements.connectionText;

        if (connected) {
            statusDot.classList.add('connected');
            connectionText.textContent = 'Connected';
        } else {
            statusDot.classList.remove('connected');
            connectionText.textContent = 'Disconnected';
        }
    },

    // Event Listeners
    setupEventListeners() {
        // Navigation items
        this.elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const view = item.dataset.view;
                const card = item.dataset.card;

                // Update active state
                this.elements.navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                if (card) {
                    this.websocket.sendCard(card);
                } else if (view) {
                    this.switchView(view);
                }
            });
        });

        // Course Controls
        if (this.elements.playBtn) {
            this.elements.playBtn.addEventListener('click', () => this.playCourse());
        }

        if (this.elements.pauseBtn) {
            this.elements.pauseBtn.addEventListener('click', () => {
                this.speech.cancel();
            });
        }

        if (this.elements.stopBtn) {
            this.elements.stopBtn.addEventListener('click', () => {
                this.speech.cancel();
            });
        }

        // Back buttons
        if (this.elements.courseBackBtn) {
            this.elements.courseBackBtn.addEventListener('click', () => {
                this.speech.cancel();
                this.switchView('home');
                this.elements.navItems.forEach(i => i.classList.remove('active'));
            });
        }

        if (this.elements.botBackBtn) {
            this.elements.botBackBtn.addEventListener('click', () => {
                this.speech.cancel();
                this.switchView('home');
                this.elements.navItems.forEach(i => i.classList.remove('active'));
            });
        }
    },

    // Keyboard Shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+1 to Ctrl+7: Card triggers
            if (e.ctrlKey) {
                const cardMap = {
                    '1': 'CARD_1', '2': 'CARD_2', '3': 'CARD_3',
                    '4': 'CARD_4', '5': 'CARD_5', '6': 'CARD_6',
                    '7': 'CARD_7'
                };

                if (cardMap[e.key]) {
                    e.preventDefault();
                    this.websocket.sendCard(cardMap[e.key]);
                }
            }

            // Space: Play/Pause course
            if (e.code === 'Space' && this.state.currentView === 'course') {
                e.preventDefault();
                if (this.state.isSpeaking) {
                    this.speech.cancel();
                } else {
                    this.playCourse();
                }
            }
        });
    },

    // Initialize
    init() {
        console.log('[START] DrishtiKosh OS Initializing...');

        // Setup event listeners
        this.setupEventListeners();

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Connect WebSocket
        this.websocket.connect();

        // Show home view
        this.switchView('home');
        const homeBtn = document.querySelector('[data-view="home"]');
        if (homeBtn) homeBtn.classList.add('active');

        // Initial greeting
        setTimeout(() => {
            this.speech.announce('DrishtiKosh OS loaded. System ready. Use sidebar or keyboard shortcuts to navigate.');
        }, 1000);

        console.log('[READY] DrishtiKosh OS Ready');
        console.log('Keyboard shortcuts: Ctrl+1-7 for cards, Space for play/pause');
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Graceful shutdown
window.addEventListener('beforeunload', () => {
    if (app.state.ws) app.state.ws.close();
    app.speech.cancel();
});
