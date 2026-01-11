/**
 * Focus Realm - Main Application Logic
 * Manages state, API calls, and UI interactions for the 3D Focus Realm
 */

// Application State
let forestWorld = null;
let focusTimer = null;
let focusStartTime = null;
let currentSessionDuration = 25; // minutes
let forestData = [];
let currentView = 'home'; // 'home', 'dashboard', 'config', 'session'

// API Base URL
const API_BASE = 'http://localhost:8002';

// DOM Elements
const viewHome = document.getElementById('view-home');
const viewFocus = document.getElementById('view-focus');
const enterRealmBtn = document.getElementById('enter-realm-btn');
const dashboardLayer = document.getElementById('dashboard-layer');
const timerConfigLayer = document.getElementById('timer-config-layer');
const sessionLayer = document.getElementById('session-layer');
const startSessionBtn = document.getElementById('start-session-btn');
const confirmSessionBtn = document.getElementById('confirm-session-btn');
const cancelConfigBtn = document.getElementById('cancel-config-btn');
const giveUpBtn = document.getElementById('give-up-btn');
const durationSlider = document.getElementById('duration-slider');
const durationDisplay = document.getElementById('duration-display');
const selectedDuration = document.getElementById('selected-duration');
const sessionTimerDisplay = document.getElementById('session-timer-display');
const sessionProgressFill = document.getElementById('session-progress-fill');
const totalTreesEl = document.getElementById('total-trees');
const totalTimeEl = document.getElementById('total-time');

/**
 * Initialize the application
 */
async function init() {
    // Wait for Three.js to load
    if (typeof THREE === 'undefined') {
        console.error('Three.js not loaded');
        return;
    }

    // Initialize 3D world
    try {
        forestWorld = new ForestWorld('bg-3d');
    } catch (error) {
        console.error('Failed to initialize 3D world:', error);
    }

    // Setup event listeners
    setupEventListeners();

    // Load forest data from API
    await loadForestData();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Home view
    enterRealmBtn?.addEventListener('click', enterRealm);

    // Dashboard
    startSessionBtn?.addEventListener('click', showTimerConfig);

    // Timer config
    durationSlider?.addEventListener('input', updateDurationDisplay);
    confirmSessionBtn?.addEventListener('click', startFocusSession);
    cancelConfigBtn?.addEventListener('click', cancelTimerConfig);

    // Active session
    giveUpBtn?.addEventListener('click', giveUpSession);
}

/**
 * Enter the focus realm (show dashboard)
 */
function enterRealm() {
    viewHome.classList.remove('active');
    viewFocus.classList.add('active');
    showDashboard();
    currentView = 'dashboard';
}

/**
 * Show dashboard layer
 */
function showDashboard() {
    hideAllLayers();
    dashboardLayer.classList.remove('hidden');
    updateDashboardStats();
}

/**
 * Show timer configuration layer
 */
function showTimerConfig() {
    hideAllLayers();
    timerConfigLayer.classList.remove('hidden');
    currentView = 'config';
    // Reset slider to default
    durationSlider.value = currentSessionDuration;
    updateDurationDisplay();
}

/**
 * Update duration display based on slider
 */
function updateDurationDisplay() {
    const value = parseInt(durationSlider.value);
    durationDisplay.textContent = value;
    selectedDuration.textContent = value;
    currentSessionDuration = value;
}

/**
 * Cancel timer configuration
 */
function cancelTimerConfig() {
    showDashboard();
}

/**
 * Start a focus session
 */
async function startFocusSession() {
    hideAllLayers();
    sessionLayer.classList.remove('hidden');
    currentView = 'session';

    // Start 3D tree growth
    if (forestWorld) {
        forestWorld.startSessionTree(currentSessionDuration);
    }

    // Start timer
    const durationSeconds = currentSessionDuration * 60;
    startFocusTimer(durationSeconds);
}

/**
 * Start the focus timer
 * @param {number} duration - Duration in seconds
 */
function startFocusTimer(duration) {
    focusStartTime = Date.now();

    // Clear any existing timer
    if (focusTimer) {
        clearInterval(focusTimer);
    }

    // Update timer every second
    focusTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - focusStartTime) / 1000);
        const remaining = Math.max(0, duration - elapsed);
        const progress = (elapsed / duration) * 100;

        // Update timer display
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        sessionTimerDisplay.textContent = timeString;

        // Update progress bar
        sessionProgressFill.style.width = `${progress}%`;

        // Update 3D tree growth
        if (forestWorld) {
            forestWorld.updateSessionProgress(progress);
        }

        // Check if timer is complete
        if (remaining <= 0) {
            completeFocusSession();
        }
    }, 1000);

    // Initial update
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    sessionTimerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    sessionProgressFill.style.width = '0%';
}

/**
 * Complete the focus session
 */
async function completeFocusSession() {
    // Clear timer
    if (focusTimer) {
        clearInterval(focusTimer);
        focusTimer = null;
    }

    // Complete 3D tree
    if (forestWorld) {
        forestWorld.completeSession();
    }

    // Update UI
    sessionProgressFill.style.width = '100%';
    sessionTimerDisplay.textContent = '00:00';

    // Save to API
    try {
        const response = await fetch(`${API_BASE}/api/forest/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                duration: currentSessionDuration,
                tree_type: 'default'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Tree added:', data);

            // Play success audio
            playSuccessAudio();

            // Reload forest data
            await loadForestData();

            // Show completion message with confetti
            setTimeout(() => {
                showCompletionMessage();
            }, 500);
        } else {
            console.error('Failed to save tree');
        }
    } catch (error) {
        console.error('Error saving tree:', error);
    }
}

/**
 * Give up on current session
 */
async function giveUpSession() {
    if (confirm('Are you sure you want to give up this focus session? One tree will be removed from your forest.')) {
        // Clear timer
        if (focusTimer) {
            clearInterval(focusTimer);
            focusTimer = null;
        }

        // Clear session tree
        if (forestWorld) {
            forestWorld.clearSessionTree();
        }

        // Remove a tree from the forest
        try {
            const response = await fetch(`${API_BASE}/api/forest/remove`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Tree removed:', data);

                // Reload forest data
                await loadForestData();
            } else {
                console.error('Failed to remove tree');
            }
        } catch (error) {
            console.error('Error removing tree:', error);
        }

        // Return to dashboard
        showDashboard();
    }
}

/**
 * Show completion message with confetti
 */
function showCompletionMessage() {
    // Trigger confetti effect
    triggerConfetti();

    // Create appreciation message
    const message = document.createElement('div');
    message.id = 'completion-message';
    message.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
        <div style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem; color: #0369a1;">
            AMAZING WORK!
        </div>
        <div style="font-size: 1.3rem; margin-bottom: 0.5rem; color: #0284c7;">
            You've completed your focus session!
        </div>
        <div style="font-size: 1.1rem; color: #0369a1; margin-bottom: 1.5rem;">
            Your dedication is growing your forest.
        </div>
        <div style="font-size: 1rem; color: #0284c7; font-style: italic;">
            A new tree has been added to your forest! 🌲
        </div>
    `;
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.98);
        color: #0369a1;
        padding: 3rem 4rem;
        border: 3px solid #7dd3fc;
        box-shadow: 0 8px 30px rgba(3, 105, 161, 0.3);
        z-index: 1000;
        text-align: center;
        font-family: 'Courier New', monospace;
        animation: messageAppear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        border-radius: 16px;
        min-width: 400px;
        max-width: 500px;
    `;
    document.body.appendChild(message);

    // Return to dashboard after delay
    setTimeout(() => {
        message.style.animation = 'messageAppear 0.5s ease-out reverse';
        setTimeout(() => {
            message.remove();
            showDashboard();
        }, 500);
    }, 5000);
}

/**
 * Trigger confetti effect
 */
function triggerConfetti() {
    if (typeof confetti !== 'undefined') {
        // Main burst
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#0284c7', '#7dd3fc', '#bae6fd', '#0369a1', '#0ea5e9']
        });

        // Side bursts
        setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#0284c7', '#7dd3fc', '#bae6fd']
            });
            confetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#0284c7', '#7dd3fc', '#bae6fd']
            });
        }, 250);

        // Continuous gentle confetti
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                clearInterval(interval);
                return;
            }

            const particleCount = 2;
            confetti({
                particleCount,
                startVelocity: 0,
                ticks: 200,
                origin: {
                    x: Math.random(),
                    y: Math.random() - 0.2
                },
                colors: ['#0284c7', '#7dd3fc', '#bae6fd', '#0369a1'],
                shapes: ['circle', 'square'],
                gravity: 0.3
            });
        }, 250);
    }
}

/**
 * Load forest data from API
 */
async function loadForestData() {
    try {
        const response = await fetch(`${API_BASE}/api/forest`);
        if (response.ok) {
            const data = await response.json();
            forestData = data.forest || [];

            // Update dashboard stats
            updateDashboardStats();

            // Load trees into 3D scene
            if (forestWorld) {
                forestWorld.loadForest(forestData);
            }
        } else {
            console.error('Failed to load forest data');
        }
    } catch (error) {
        console.error('Error loading forest data:', error);
        // If API is not available, continue with empty forest
        forestData = [];
    }
}

/**
 * Update dashboard statistics
 */
function updateDashboardStats() {
    const totalTrees = forestData.length;
    const totalMinutes = forestData.reduce((sum, tree) => sum + (tree.duration || 0), 0);

    totalTreesEl.textContent = totalTrees;
    totalTimeEl.textContent = `${totalMinutes} min`;
}

/**
 * Hide all UI layers
 */
function hideAllLayers() {
    dashboardLayer.classList.add('hidden');
    timerConfigLayer.classList.add('hidden');
    sessionLayer.classList.add('hidden');
}

/**
 * Play success audio
 */
function playSuccessAudio() {
    if ('speechSynthesis' in window) {
        const messages = [
            'Amazing work! You completed your focus session!',
            'Congratulations! Your dedication is growing your forest!',
            'Fantastic! You stayed focused and earned a new tree!',
            'Well done! Your focus session is complete!',
            'Excellent! You\'ve added a new tree to your forest!'
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        const utterance = new SpeechSynthesisUtterance(randomMessage);
        utterance.rate = 0.9;
        utterance.pitch = 1.2;
        speechSynthesis.speak(utterance);
    }
}

/**
 * Initialize when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (focusTimer) {
        clearInterval(focusTimer);
    }
    if (forestWorld) {
        forestWorld.dispose();
    }
});

// ===== GAMIFICATION FEATURES =====

// New DOM Elements for Gamification
const successLayer = document.getElementById('success-layer');
const comparisonLayer = document.getElementById('comparison-layer');
const viewForestBtn = document.getElementById('view-forest-btn');
const tryAgainBtn = document.getElementById('try-again-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const percentileValue = document.getElementById('percentile-value');
const userTreeCount = document.getElementById('user-tree-count');
const userFocusTime = document.getElementById('user-focus-time');
const avgTrees = document.getElementById('avg-trees');
const peerGrid = document.getElementById('peer-grid');

// Setup gamification event listeners
function setupGamificationListeners() {
    viewForestBtn?.addEventListener('click', () => {
        hideAllLayers();
        dashboardLayer.classList.remove('hidden');
        // Enable vibrant mode
        if (forestWorld) {
            forestWorld.setRenderMode('vibrant');
        }
    });
    
    tryAgainBtn?.addEventListener('click', () => {
        hideAllLayers();
        timerConfigLayer.classList.remove('hidden');
    });
    
    backToDashboardBtn?.addEventListener('click', () => {
        hideAllLayers();
        dashboardLayer.classList.remove('hidden');
        if (forestWorld) {
            forestWorld.setRenderMode('normal');
        }
    });
}

// Modified completeFocusSession to show success celebration
async function completeFocusSessionWithCelebration() {
    // Clear timer
    if (focusTimer) {
        clearInterval(focusTimer);
        focusTimer = null;
    }

    // Complete 3D tree
    if (forestWorld) {
        forestWorld.completeSession();
    }

    // Update UI
    sessionProgressFill.style.width = '100%';
    sessionTimerDisplay.textContent = '00:00';

    // Save to API
    try {
        const response = await fetch(`${API_BASE}/api/forest/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                duration: currentSessionDuration,
                tree_type: 'default'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Tree added:', data);
            
            // Reload forest data
            await loadForestData();
            
            // Fetch user stats for percentile
            const statsResponse = await fetch(`${API_BASE}/api/stats/compare`);
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                percentileValue.textContent = statsData.user_stats.percentile;
            }
            
            // Show success celebration
            showSuccessCelebration();
        } else {
            console.error('Failed to save tree');
        }
    } catch (error) {
        console.error('Error saving tree:', error);
    }
}

// Show success celebration layer
function showSuccessCelebration() {
    hideAllLayers();
    successLayer.classList.remove('hidden');
    
    // Enable vibrant forest mode
    if (forestWorld) {
        forestWorld.setRenderMode('vibrant');
    }
    
    // Trigger confetti
    triggerConfetti();
    
    // Play success sound
    playSuccessSound();
}

// Modified giveUpSession to show peer comparison
async function giveUpSessionWithComparison() {
    if (confirm('Are you sure you want to give up this focus session?')) {
        // Clear timer
        if (focusTimer) {
            clearInterval(focusTimer);
            focusTimer = null;
        }

        // Clear session tree
        if (forestWorld) {
            forestWorld.clearSessionTree();
        }

        // Remove a tree from the forest
        try {
            const response = await fetch(`${API_BASE}/api/forest/remove`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Tree removed:', data);
                
                // Reload forest data
                await loadForestData();
                
                // Fetch peer comparison data
                const comparisonResponse = await fetch(`${API_BASE}/api/stats/compare`);
                if (comparisonResponse.ok) {
                    const comparisonData = await comparisonResponse.json();
                    showPeerComparison(comparisonData);
                }
            } else {
                console.error('Failed to remove tree');
            }
        } catch (error) {
            console.error('Error removing tree:', error);
        }
    }
}

// Show peer comparison layer
function showPeerComparison(comparisonData) {
    hideAllLayers();
    comparisonLayer.classList.remove('hidden');
    
    // Update user stats
    userTreeCount.textContent = comparisonData.user_stats.trees;
    userFocusTime.textContent = comparisonData.user_stats.total_focus_minutes;
    avgTrees.textContent = comparisonData.average.trees;
    
    // Enable dull mode for user forest
    if (forestWorld) {
        forestWorld.setRenderMode('dull');
    }
    
    // Populate peer grid
    peerGrid.innerHTML = '';
    comparisonData.peers.forEach(peer => {
        const peerCard = document.createElement('div');
        peerCard.className = 'peer-card';
        peerCard.innerHTML = `
            <p class="peer-label">${peer.label}</p>
            <p class="peer-stats">${peer.trees} trees</p>
            <p class="peer-stats">${peer.total_focus_minutes} min</p>
        `;
        peerGrid.appendChild(peerCard);
    });
    
    // Play failure sound
    playFailureSound();
}

// Sound effects
function playSuccessSound() {
    if ('speechSynthesis' in window) {
        const messages = [
            'Amazing work! You completed your focus session!',
            'Congratulations! Your dedication is growing your forest!',
            'Fantastic! You stayed focused and earned a new tree!'
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        const utterance = new SpeechSynthesisUtterance(randomMessage);
        utterance.rate = 0.9;
        utterance.pitch = 1.2;
        speechSynthesis.speak(utterance);
    }
}

function playFailureSound() {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance("You gave up. Others are building stronger forests.");
        utterance.rate = 0.8;
        utterance.pitch = 0.8;
        speechSynthesis.speak(utterance);
    }
}

// Override original functions
const originalCompleteFocusSession = completeFocusSession;
const originalGiveUpSession = giveUpSession;

completeFocusSession = completeFocusSessionWithCelebration;
giveUpSession = giveUpSessionWithComparison;

// Initialize gamification listeners
setupGamificationListeners();

