/**
 * Telegram Web App integration for Learn & Earn Mini App
 */

// Initialize Telegram WebApp
let tg = window.Telegram.WebApp;

// Expand to the maximum available height
tg.expand();

// Set theme based on Telegram theme
document.documentElement.setAttribute('data-bs-theme', tg.colorScheme === 'dark' ? 'dark' : 'light');

// Ready event
document.addEventListener('DOMContentLoaded', function() {
    // Show the back button in the header if needed
    if (window.location.pathname !== '/') {
        tg.BackButton.show();
        tg.BackButton.onClick(function() {
            window.history.back();
        });
    } else {
        tg.BackButton.hide();
    }
    
    // Setup MainButton if needed - used for key actions in the app
    setupMainButton();
});

/**
 * Setup Telegram MainButton based on the current page
 */
function setupMainButton() {
    // Hide by default
    tg.MainButton.hide();
    
    // Setup button based on current page path
    const path = window.location.pathname;
    
    if (path.includes('/quiz/')) {
        // Quiz page - show when user reaches last question
        const submitButton = document.getElementById('submit-quiz');
        if (submitButton) {
            submitButton.addEventListener('click', function() {
                const form = document.getElementById('quiz-form');
                if (form && validateQuizForm(form)) {
                    submitQuiz();
                }
            });
        }
    }
    else if (path.includes('/governance')) {
        // Governance page - MainButton to submit votes
        const voteButtons = document.querySelectorAll('.submit-vote');
        voteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const topicId = this.getAttribute('data-topic-id');
                const selectedOption = document.querySelector(`input[name="vote-topic-${topicId}"]:checked`);
                
                if (selectedOption) {
                    submitVote(topicId, selectedOption.value);
                } else {
                    showNotification('Please select an option to vote');
                }
            });
        });
    }
}

/**
 * Get user data from Telegram WebApp
 */
function getTelegramUserData() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        return tg.initDataUnsafe.user;
    }
    return null;
}

/**
 * Validate if the user has completed all required fields in a form
 */
function validateQuizForm(form) {
    const questions = form.querySelectorAll('.question-container:not(.d-none)');
    let isValid = true;
    
    questions.forEach(question => {
        const questionId = question.getAttribute('data-question-id');
        const selectedOption = form.querySelector(`input[name="question-${questionId}"]:checked`);
        
        if (!selectedOption) {
            isValid = false;
            // Highlight the question as unanswered
            question.classList.add('border', 'border-danger', 'p-2', 'rounded');
            
            // Remove highlight after a selection is made
            const options = question.querySelectorAll('input[type="radio"]');
            options.forEach(option => {
                option.addEventListener('change', function() {
                    question.classList.remove('border', 'border-danger', 'p-2', 'rounded');
                });
            });
        }
    });
    
    if (!isValid) {
        showNotification('Please answer all questions');
    }
    
    return isValid;
}

/**
 * Show a notification using Telegram's native UI
 */
function showNotification(message) {
    if (tg.showPopup) {
        tg.showPopup({
            title: 'Notification',
            message: message,
            buttons: [{type: 'ok'}]
        });
    } else {
        alert(message);
    }
}

/**
 * Open a URL in an external browser
 */
function openExternalLink(url) {
    if (tg.openLink) {
        tg.openLink(url);
    } else {
        window.open(url, '_blank');
    }
}

/**
 * Handle an error with a user-friendly message
 */
function handleTelegramError(error) {
    console.error('Telegram WebApp Error:', error);
    showNotification('Something went wrong. Please try again.');
}
