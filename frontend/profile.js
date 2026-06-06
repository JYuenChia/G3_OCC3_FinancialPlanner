/* ─── State ─── */
let currentUser = null;

/* ─── Page Initialization ─── */
document.addEventListener('DOMContentLoaded', async () => {
    checkAuthState();
    await loadUserData();
});

/* ─── Data Fetching ─── */
async function loadUserData() {
    showLoading(true);
    try {
        const response = await apiClient.getProfile();

        // Fetch real data from your backend
        currentUser = response.user;
        
        // Update UI
        displayProfile(currentUser);
        
        const dateEl = document.getElementById('last-updated-date');
        if (dateEl && currentUser.updated_at) {
            dateEl.textContent = new Date(currentUser.updated_at).toLocaleDateString();
        }
    } catch (error) {
        if (error.message.includes("token")) {
            showToast('Session expired. Please login again.', 'error');
            localStorage.removeItem('token'); // Clear the bad token
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        } else {
            showError('Could not load profile: ' + error.message);
        }
        console.error("Profile load error:", error);
    } finally {
        showLoading(false);
    }
}

/* ─── UI Rendering ─── */
function displayProfile(user) {
    const container = document.getElementById('profile-info');
    if (!container) return;

    container.innerHTML = `
        <div class="col-md-6">
            <label class="text-muted small">Full Name</label>
            <p class="fw-bold text-dark">${user.full_name || 'N/A'}</p>
        </div>
        <div class="col-md-6">
            <label class="text-muted small">Email Address</label>
            <p class="fw-bold text-dark">${user.email || 'N/A'}</p>
        </div>
        <div class="col-md-6">
            <label class="text-muted small">Role</label>
            <p class="fw-bold text-dark text-capitalize">${user.role || 'User'}</p>
        </div>
        <div class="col-md-6">
            <label class="text-muted small">Active Since</label>
            <p class="fw-bold text-dark">${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
        </div>
    `;
}

/* ─── Edit Profile ─── */
document.getElementById('edit-profile-btn').addEventListener('click', () => {
    if (!currentUser) return;
    document.getElementById('edit-full-name').value = currentUser.full_name || '';
    document.getElementById('edit-email').value = currentUser.email || '';
    openModal('modal-edit-profile');
});

document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const name = document.getElementById('edit-full-name').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    
    if (!email) { showToast('Please enter a valid email.', 'error'); return; }

    try {
        showLoading(true);
        await apiClient.updateProfile(email, name);
        
        // Update local state
        currentUser.full_name = name;
        currentUser.email = email;
        currentUser.updated_at = new Date().toISOString();
        
        displayProfile(currentUser);
        closeModal('modal-edit-profile');
        showToast('Profile updated successfully.');
    } catch (error) {
        showToast('Failed to update: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
});

/* ─── Global UI Helpers ─── */
function openModal(id) {
    const backdrop = document.getElementById('backdrop');
    const modal = document.getElementById(id);
    backdrop.style.display = 'block';
    requestAnimationFrame(() => backdrop.classList.add('show'));
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    const backdrop = document.getElementById('backdrop');
    modal.classList.remove('show');
    backdrop.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        backdrop.style.display = 'none';
        document.body.style.overflow = '';
    }, 280);
}

function checkAuthState() {
    document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'none');
}

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

/* ─── Modal Event Wiring ─── */
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Wire all "Close" buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(btn.getAttribute('data-close'));
        });
    });

    // 2. Wire the Backdrop click
    const backdrop = document.getElementById('backdrop');
    if (backdrop) {
        backdrop.addEventListener('click', () => {
            document.querySelectorAll('.modal-custom.show').forEach(m => closeModal(m.id));
        });
    }

    // 3. Password Visibility Toggle
    document.querySelectorAll('.toggle-pw').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.getAttribute('data-target'));
            if (!input) return;
            const icon = btn.querySelector('i');
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
        });
    });
});

// Update Password Logic
document.getElementById('update-password-btn').addEventListener('click', () => {
    // Clear previous inputs so it's fresh
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    
    // Open the modal
    openModal('modal-update-password');
});

// Password Strength Meter
document.getElementById('new-password').addEventListener('input', function () {
    const val = this.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const fill = document.getElementById('strength-fill');
    const label = document.getElementById('strength-label');
    
    // Safety check: ensure these exist
    if (!fill || !label) return;

    const levels = [
        { w: '0%', bg: '#e5e7eb', text: '' },
        { w: '25%', bg: '#ef4444', text: 'Weak' },
        { w: '50%', bg: '#f97316', text: 'Fair' },
        { w: '75%', bg: '#eab308', text: 'Good' },
        { w: '100%', bg: '#22c55e', text: 'Strong' },
    ];
    
    fill.style.width = levels[score].w;
    fill.style.background = levels[score].bg;
    label.textContent = levels[score].text;
});

document.getElementById('save-password-btn').addEventListener('click', async () => {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // 1. Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Please fill in all fields.');
        return;
    }

    if (newPassword.length < 8) {
        alert('New password must be at least 8 characters long.');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match.');
        return;
    }

    // 2. API Communication
    try {
        showLoading(true);
        // Ensure apiClient.updatePassword exists in api-client.js
        await apiClient.updatePassword(currentPassword, newPassword);
        
        alert('Password updated successfully.');
        closeModal('modal-update-password');
        
        // Reset fields
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    } catch (error) {
        alert('Update failed: ' + error.message);
    } finally {
        showLoading(false);
    }
});