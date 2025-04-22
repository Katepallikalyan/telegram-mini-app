/**
 * Governance functionality for Learn & Earn Mini App
 */

// Track loaded charts to avoid duplicates
const loadedCharts = {};

document.addEventListener('DOMContentLoaded', function() {
    // Set up vote submission
    setupVoteSubmission();
    
    // Set up view results buttons
    setupViewResults();
});

/**
 * Set up governance vote submission
 */
function setupVoteSubmission() {
    const voteButtons = document.querySelectorAll('.submit-vote');
    
    voteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const topicId = this.getAttribute('data-topic-id');
            const selectedOption = document.querySelector(`input[name="vote-topic-${topicId}"]:checked`);
            
            if (!selectedOption) {
                showNotification('Please select an option to vote');
                return;
            }
            
            // Disable button and show loading state
            this.disabled = true;
            const originalText = this.innerHTML;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Voting...';
            
            // Submit vote
            fetch('/api/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic_id: topicId,
                    option_id: selectedOption.value
                }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showNotification('Vote submitted successfully!');
                    // Show results
                    loadGovernanceResults(topicId);
                } else {
                    showNotification('Error submitting vote: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error submitting vote:', error);
                showNotification('Error submitting vote. Please try again.');
            })
            .finally(() => {
                // Restore button state
                this.innerHTML = originalText;
                this.disabled = false;
            });
        });
    });
}

/**
 * Set up view results buttons for past topics
 */
function setupViewResults() {
    const viewResultButtons = document.querySelectorAll('.view-results');
    
    viewResultButtons.forEach(button => {
        button.addEventListener('click', function() {
            const topicId = this.getAttribute('data-topic-id');
            const resultsContainer = document.getElementById(`results-past-${topicId}`);
            
            if (resultsContainer.classList.contains('d-none')) {
                resultsContainer.classList.remove('d-none');
                loadGovernanceResults(topicId, true);
                this.innerHTML = '<i data-feather="eye-off" class="feather-icon"></i> Hide Results';
                feather.replace();
            } else {
                resultsContainer.classList.add('d-none');
                this.innerHTML = '<i data-feather="pie-chart" class="feather-icon"></i> View Results';
                feather.replace();
            }
        });
    });
}

/**
 * Load governance voting results
 */
function loadGovernanceResults(topicId, isPast = false) {
    const resultsContainer = document.getElementById(isPast ? `results-past-${topicId}` : `results-topic-${topicId}`);
    
    if (!resultsContainer) return;
    
    // Show loading
    resultsContainer.classList.remove('d-none');
    resultsContainer.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading results...</p>
        </div>
    `;
    
    // Load results from API
    fetch(`/api/governance/${topicId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Display results
            displayGovernanceResults(data, topicId, isPast);
        })
        .catch(error => {
            console.error('Error loading governance results:', error);
            resultsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i data-feather="alert-circle" class="feather-icon"></i>
                    Error loading results. Please try again.
                </div>
            `;
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        });
}

/**
 * Display governance results with a chart
 */
function displayGovernanceResults(data, topicId, isPast) {
    const chartId = isPast ? `results-past-chart-${topicId}` : `results-chart-${topicId}`;
    const resultsContainer = document.getElementById(isPast ? `results-past-${topicId}` : `results-topic-${topicId}`);
    
    if (!resultsContainer) return;
    
    // Clear existing chart if any
    if (loadedCharts[chartId]) {
        loadedCharts[chartId].destroy();
    }
    
    // Prepare data for chart
    const labels = data.results.map(result => result.text);
    const voteCounts = data.results.map(result => result.voting_power);
    const backgroundColor = [
        'rgba(75, 192, 192, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(255, 99, 132, 0.7)'
    ];
    
    // Create HTML for results
    resultsContainer.innerHTML = `
        <div class="chart-container" style="position: relative; height: 200px;">
            <canvas id="${chartId}"></canvas>
        </div>
        <div class="results-legend mt-3">
            <h6 class="text-center mb-2">Vote Distribution</h6>
            <ul class="list-group list-group-flush">
                ${data.results.map((result, index) => `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <span class="color-dot" style="background-color: ${backgroundColor[index % backgroundColor.length]};"></span>
                            ${result.text}
                        </div>
                        <div>
                            <span class="badge bg-primary rounded-pill">${result.voting_power} votes</span>
                            <small class="text-muted ms-2">(${result.vote_count} voters)</small>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
    
    // Create chart
    const ctx = document.getElementById(chartId).getContext('2d');
    loadedCharts[chartId] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: voteCounts,
                backgroundColor: backgroundColor,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} votes (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Show a notification using Telegram's native UI or alert as fallback
 */
function showNotification(message) {
    const tg = window.Telegram.WebApp;
    if (tg.showPopup) {
        tg.showPopup({
            title: 'Governance',
            message: message,
            buttons: [{type: 'ok'}]
        });
    } else {
        alert(message);
    }
}
