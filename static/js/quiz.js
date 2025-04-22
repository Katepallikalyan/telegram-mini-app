/**
 * Quiz functionality for Learn & Earn Mini App
 */

// Initialize variables
let currentQuestionIndex = 0;
let quizData = null;
const userAnswers = {};

// Initialize the quiz when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    const quizForm = document.getElementById('quiz-form');
    
    if (quizForm) {
        setupQuizNavigation();
        
        // Handle quiz submission
        const submitButton = document.getElementById('submit-quiz');
        if (submitButton) {
            submitButton.addEventListener('click', submitQuiz);
        }
    }
});

/**
 * Setup navigation between quiz questions
 */
function setupQuizNavigation() {
    // Get all question containers
    const questionContainers = document.querySelectorAll('.question-container');
    currentQuestionIndex = 0;
    
    // Setup next button click handlers
    const nextButtons = document.querySelectorAll('.next-question');
    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Get current question and check if an option is selected
            const currentQuestion = questionContainers[currentQuestionIndex];
            const questionId = currentQuestion.id.replace('question-', '');
            const selectedOption = document.querySelector(`input[name="question-${questionId}"]:checked`);
            
            if (selectedOption) {
                // Store the answer
                userAnswers[questionId] = selectedOption.value;
                
                // Hide current question and show next
                currentQuestion.classList.add('d-none');
                currentQuestionIndex++;
                questionContainers[currentQuestionIndex].classList.remove('d-none');
                
                // Update progress bar and question counter
                updateQuizProgress();
            } else {
                // Show a notification if no option is selected
                showNotification('Please select an answer before proceeding');
            }
        });
    });
    
    // Setup previous button click handlers
    const prevButtons = document.querySelectorAll('.prev-question');
    prevButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Hide current question and show previous
            questionContainers[currentQuestionIndex].classList.add('d-none');
            currentQuestionIndex--;
            questionContainers[currentQuestionIndex].classList.remove('d-none');
            
            // Update progress bar and question counter
            updateQuizProgress();
        });
    });
    
    // Initialize progress bar
    updateQuizProgress();
}

/**
 * Update the quiz progress indicators
 */
function updateQuizProgress() {
    const questionContainers = document.querySelectorAll('.question-container');
    const totalQuestions = questionContainers.length;
    const progressBar = document.getElementById('quiz-progress-bar');
    const questionCounter = document.getElementById('question-counter');
    
    if (progressBar) {
        const progressPercentage = ((currentQuestionIndex + 1) / totalQuestions) * 100;
        progressBar.style.width = `${progressPercentage}%`;
        progressBar.textContent = `${Math.round(progressPercentage)}%`;
        progressBar.setAttribute('aria-valuenow', progressPercentage);
    }
    
    if (questionCounter) {
        questionCounter.textContent = `${currentQuestionIndex + 1} / ${totalQuestions}`;
    }
}

/**
 * Submit the quiz and calculate results
 */
function submitQuiz() {
    // Get the quiz form
    const quizForm = document.getElementById('quiz-form');
    const quizId = quizForm.getAttribute('data-quiz-id');
    
    // Collect all answers
    const questionContainers = document.querySelectorAll('.question-container');
    questionContainers.forEach(container => {
        const questionId = container.id.replace('question-', '');
        const selectedOption = document.querySelector(`input[name="question-${questionId}"]:checked`);
        
        if (selectedOption) {
            userAnswers[questionId] = selectedOption.value;
        }
    });
    
    // Check if all questions are answered
    if (Object.keys(userAnswers).length < questionContainers.length) {
        showNotification('Please answer all questions before submitting');
        return;
    }
    
    // Show loading state
    const quizContainer = document.getElementById('quiz-form');
    const loadingContainer = document.getElementById('quiz-loading');
    
    if (quizContainer && loadingContainer) {
        quizContainer.classList.add('d-none');
        loadingContainer.classList.remove('d-none');
    }
    
    // Submit answers to the server
    fetch('/api/submit_quiz', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            quiz_id: quizId,
            answers: userAnswers
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Show results
        if (data.success) {
            // Redirect to results page or show results
            showQuizResults(data);
        } else {
            showNotification('There was an error submitting your quiz. Please try again.');
            
            // Hide loading and show quiz again
            if (quizContainer && loadingContainer) {
                loadingContainer.classList.add('d-none');
                quizContainer.classList.remove('d-none');
            }
        }
    })
    .catch(error => {
        console.error('Error submitting quiz:', error);
        showNotification('There was an error submitting your quiz. Please try again.');
        
        // Hide loading and show quiz again
        if (quizContainer && loadingContainer) {
            loadingContainer.classList.add('d-none');
            quizContainer.classList.remove('d-none');
        }
    });
}

/**
 * Display quiz results
 */
function showQuizResults(data) {
    const tg = window.Telegram.WebApp;
    
    // Prepare result message
    let resultMessage = `Quiz completed! Your score: ${Math.round(data.score * 100)}%\n`;
    resultMessage += `Correct answers: ${data.correct_answers} of ${data.total_questions}\n\n`;
    
    if (data.reward_sent) {
        resultMessage += `🎉 Congratulations! You earned ${data.rewards_amount} tokens!`;
        
        // Redirect to results page
        window.location.href = `/results/${data.attempt_id}`;
    } else {
        if (data.score >= 0.8) {
            resultMessage += `You qualified for a reward, but there was an issue sending tokens. Please check your wallet settings.`;
        } else {
            resultMessage += `You need at least 80% to earn tokens. Try again!`;
        }
        
        // Show popup and then redirect
        if (tg.showPopup) {
            tg.showPopup({
                title: 'Quiz Results',
                message: resultMessage,
                buttons: [{type: 'ok', text: 'OK'}]
            }, function() {
                window.location.href = `/results/${data.attempt_id}`;
            });
        } else {
            alert(resultMessage);
            window.location.href = `/results/${data.attempt_id}`;
        }
    }
}

