/**
 * Main application JavaScript for Learn & Earn Telegram Mini App
 */

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Telegram WebApp
    const tg = window.Telegram.WebApp;
    tg.expand();
    
    // Set theme based on Telegram settings
    document.documentElement.classList.toggle('dark', tg.colorScheme === 'dark');
    
    // Initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Display user info if available
    displayUserInfo();
});

/**
 * Displays user information from Telegram
 */
function displayUserInfo() {
    const userInfoElement = document.getElementById('user-info');
    const tg = window.Telegram.WebApp;
    
    if (!userInfoElement) return;
    
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        
        // Initialize user in the backend
        initializeUser(user)
            .then(userData => {
                userInfoElement.innerHTML = `
                    <div class="d-flex align-items-center justify-content-center mb-2">
                        <div class="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                             style="width: 40px; height: 40px;">
                            ${user.first_name.charAt(0)}
                        </div>
                        <div class="text-start">
                            <div class="fw-bold">${user.first_name} ${user.last_name || ''}</div>
                            <div class="text-muted small">@${user.username || 'user'}</div>
                        </div>
                    </div>
                `;
                
                // Update token balance if available
                updateTokenBalance(userData.token_balance);
            })
            .catch(error => {
                console.error('Error initializing user:', error);
                userInfoElement.innerHTML = `
                    <div class="alert alert-warning">
                        <i data-feather="alert-triangle" class="feather-icon"></i>
                        Error connecting to server. Please try again.
                    </div>
                `;
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            });
    } else {
        userInfoElement.innerHTML = `
            <div class="alert alert-info">
                <i data-feather="info" class="feather-icon"></i>
                Please open this app in Telegram.
            </div>
        `;
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
}

/**
 * Initialize user in the backend
 */
function initializeUser(user) {
    return fetch('/api/init_user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            telegram_id: user.id.toString(),
            username: user.username || '',
            first_name: user.first_name,
            last_name: user.last_name || ''
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    });
}

/**
 * Update token balance display
 */
function updateTokenBalance(balance) {
    const balanceElement = document.getElementById('token-balance');
    if (balanceElement) {
        balanceElement.textContent = balance || '0';
    }
}

/**
 * Show a Telegram native alert
 */
function showAlert(message, title = 'Alert') {
    const tg = window.Telegram.WebApp;
    if (tg.showPopup) {
        tg.showPopup({
            title: title,
            message: message,
            buttons: [{type: 'ok'}]
        });
    } else {
        alert(`${title}: ${message}`);
    }
}

/**
 * Show a confirmation dialog
 */
function showConfirm(message, callback, title = 'Confirm') {
    const tg = window.Telegram.WebApp;
    if (tg.showPopup) {
        tg.showPopup({
            title: title,
            message: message,
            buttons: [
                {type: 'cancel', text: 'Cancel'},
                {type: 'ok', text: 'OK'}
            ]
        }, callback);
    } else {
        const result = confirm(`${title}: ${message}`);
        callback(result ? 'ok' : 'cancel');
    }
}

/**
 * Show a notification at the top of the screen
 */
function showNotification(message) {
    const tg = window.Telegram.WebApp;
    if (tg.showAlert) {
        tg.showAlert(message);
    } else {
        alert(message);
    }
}

/**
 * Handle API errors
 */
function handleApiError(error) {
    console.error('API Error:', error);
    showAlert('There was an error connecting to the server. Please try again.', 'Error');
}
