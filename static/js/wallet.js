/**
 * Wallet functionality for Learn & Earn Mini App
 */

document.addEventListener('DOMContentLoaded', function() {
    // Handle updating wallet address
    const updateAddressBtn = document.getElementById('update-address-btn');
    if (updateAddressBtn) {
        updateAddressBtn.addEventListener('click', updateWalletAddress);
    }
    
    // Initialize transaction detail modals
    initTransactionModals();
});

/**
 * Update the user's Hathor wallet address
 */
function updateWalletAddress() {
    const addressInput = document.getElementById('wallet-address');
    if (!addressInput) return;
    
    const hathorAddress = addressInput.value.trim();
    
    // Validate the address format (basic validation)
    if (!hathorAddress || hathorAddress.length < 10) {
        showNotification('Please enter a valid Hathor wallet address');
        return;
    }
    
    // Show loading state
    const updateBtn = document.getElementById('update-address-btn');
    const originalBtnContent = updateBtn.innerHTML;
    updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    updateBtn.disabled = true;
    
    // Send request to update address
    fetch('/api/update_wallet', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            hathor_address: hathorAddress
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
            showNotification('Wallet address updated successfully!');
        } else {
            showNotification('Error updating wallet address: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error updating wallet address:', error);
        showNotification('Error updating wallet address. Please try again.');
    })
    .finally(() => {
        // Restore button state
        updateBtn.innerHTML = originalBtnContent;
        updateBtn.disabled = false;
    });
}

/**
 * Initialize transaction detail modals
 */
function initTransactionModals() {
    // Check if Bootstrap JS is loaded
    if (typeof bootstrap === 'undefined') {
        // Fallback for transaction detail clicks
        document.querySelectorAll('.view-tx-details').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const txId = this.getAttribute('data-tx-id');
                const txAmount = this.getAttribute('data-tx-amount');
                const txDate = this.getAttribute('data-tx-date');
                
                alert(`Transaction Details:\nAmount: ${txAmount} tokens\nDate: ${txDate}\nID: ${txId}`);
            });
        });
        return;
    }
    
    // Use Bootstrap modals if available
    const txDetailsModal = document.getElementById('txDetailsModal');
    if (txDetailsModal) {
        const modal = new bootstrap.Modal(txDetailsModal);
        
        document.querySelectorAll('.view-tx-details').forEach(btn => {
            btn.addEventListener('click', function() {
                const txId = this.getAttribute('data-tx-id');
                const txAmount = this.getAttribute('data-tx-amount');
                const txDate = this.getAttribute('data-tx-date');
                
                document.getElementById('modal-tx-id').textContent = txId;
                document.getElementById('modal-tx-amount').textContent = txAmount + ' tokens';
                document.getElementById('modal-tx-date').textContent = txDate;
                
                // Setup explorer link
                document.getElementById('view-explorer-link').href = `https://explorer.hathor.network/transaction/${txId}`;
                
                modal.show();
            });
        });
    }
}

/**
 * Show a notification using Telegram's native UI or alert as fallback
 */
function showNotification(message) {
    const tg = window.Telegram.WebApp;
    if (tg.showPopup) {
        tg.showPopup({
            title: 'Wallet',
            message: message,
            buttons: [{type: 'ok'}]
        });
    } else {
        alert(message);
    }
}

/**
 * Format a token amount with 2 decimal places
 */
function formatTokenAmount(amount) {
    return parseFloat(amount).toFixed(2);
}
