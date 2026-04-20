// ============================================
// MangaRead - Main Application JavaScript
// ============================================

// Configuration
const CONFIG = {
    API_BASE_URL: 'http://localhost:8080/api',
    JIKAN_API_URL: 'https://api.jikan.moe/v4',
    ITEMS_PER_PAGE: 12,
    DEBOUNCE_DELAY: 300
};

// State Management
const AppState = {
    user: null,
    token: null,
    bookmarks: [],
    readingHistory: [],
    isLoading: false
};

// Utility Functions
const Utils = {
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Format date
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Truncate text
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    },

    // Sanitize HTML to prevent XSS
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    // Generate unique ID
    generateID() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Local storage helpers
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    },

    getItem(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return null;
        }
    },

    removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Error removing from localStorage:', e);
        }
    }
};

// API Service
const API = {
    async fetch(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const token = AppState.token;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Manga endpoints
    async getTopManga(limit = 12) {
        return this.fetch(`/manga/top?limit=${limit}`);
    },

    async getPopularManga(limit = 12) {
        return this.fetch(`/manga/popular?limit=${limit}`);
    },

    async getLatestManga(limit = 12) {
        return this.fetch(`/manga/latest?limit=${limit}`);
    },

    async searchManga(query, filters = {}) {
        const params = new URLSearchParams({
            q: query,
            ...filters
        });
        return this.fetch(`/manga/search?${params}`);
    },

    async getMangaDetails(id) {
        return this.fetch(`/manga/${id}`);
    },

    async getMangaChapters(id) {
        return this.fetch(`/manga/${id}/chapters`);
    },

    // User endpoints
    async login(email, password) {
        return this.fetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    async register(username, email, password) {
        return this.fetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    },

    // Bookmark endpoints
    async getBookmarks() {
        return this.fetch('/user/bookmarks');
    },

    async addBookmark(mangaId, mangaTitle, chapter = 1, page = 1) {
        return this.fetch('/user/bookmarks', {
            method: 'POST',
            body: JSON.stringify({ mangaId, mangaTitle, chapter, page })
        });
    },

    async deleteBookmark(id) {
        return this.fetch(`/user/bookmarks/${id}`, {
            method: 'DELETE'
        });
    },

    // History endpoints
    async getHistory() {
        return this.fetch('/user/history');
    },

    async addToHistory(mangaId, mangaTitle, chapter, page) {
        return this.fetch('/user/history', {
            method: 'POST',
            body: JSON.stringify({ mangaId, mangaTitle, chapter, page })
        });
    }
};

// UI Components
const UI = {
    // Create manga card
    createMangaCard(manga) {
        const card = document.createElement('div');
        card.className = 'manga-card';
        card.onclick = () => window.location.href = `/manga.html?id=${manga.mal_id}`;

        const imageUrl = manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url || '/images/placeholder.jpg';
        const title = Utils.sanitizeHTML(manga.title || 'Unknown Title');
        const score = manga.score ? manga.score.toFixed(1) : 'N/A';

        card.innerHTML = `
            <div class="manga-card-image">
                <img src="${imageUrl}" alt="${title}" loading="lazy" onerror="this.src='/images/placeholder.jpg'">
                <div class="manga-card-overlay"></div>
                <span class="manga-card-score">★ ${score}</span>
            </div>
            <div class="manga-card-info">
                <h3 class="manga-card-title">${title}</h3>
                <p class="manga-card-meta">${manga.type || 'Manga'} • ${manga.status || 'Unknown'}</p>
            </div>
        `;

        return card;
    },

    // Create skeleton card
    createSkeletonCard() {
        const card = document.createElement('div');
        card.className = 'skeleton-card';
        return card;
    },

    // Show loading state
    showLoading(container, count = 6) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            container.appendChild(this.createSkeletonCard());
        }
    },

    // Show error message
    showError(container, message) {
        container.innerHTML = `
            <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <p style="color: var(--error); margin-bottom: 1rem;">${Utils.sanitizeHTML(message)}</p>
                <button class="btn btn-secondary" onclick="location.reload()">Try Again</button>
            </div>
        `;
    },

    // Show empty state
    showEmpty(container, message) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <p style="color: var(--text-muted);">${Utils.sanitizeHTML(message)}</p>
            </div>
        `;
    },

    // Create toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

        if (type === 'success') {
            toast.style.borderColor = 'var(--success)';
        } else if (type === 'error') {
            toast.style.borderColor = 'var(--error)';
        }

        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function switchModal(fromId, toId) {
    closeModal(fromId);
    setTimeout(() => openModal(toId), 200);
}

// Password Toggle
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    button.textContent = isPassword ? 'Hide' : 'Show';
    button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
}

// Search Functions
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    if (query) {
        window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    // Check for saved auth state
    const savedToken = Utils.getItem('token');
    const savedUser = Utils.getItem('user');

    if (savedToken && savedUser) {
        AppState.token = savedToken;
        AppState.user = savedUser;
        updateAuthUI();
    }

    // Initialize search toggle
    const searchToggle = document.getElementById('searchToggle');
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.getElementById('searchInput');

    if (searchToggle && searchBar) {
        searchToggle.addEventListener('click', () => {
            searchBar.classList.toggle('show');
            if (searchBar.classList.contains('show')) {
                searchInput.focus();
            }
        });
    }

    // Initialize search input
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    // Initialize mobile menu
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('show');
        });
    }

    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                modal.classList.remove('show');
            });
            document.body.style.overflow = '';
        }
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', () => {
            const modal = backdrop.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    });

    console.log('MangaRead App Initialized');
});

// Update auth UI based on login state
function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userInitial = document.getElementById('userInitial');

    if (AppState.user) {
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'block';
            if (userInitial) {
                userInitial.textContent = AppState.user.username.charAt(0).toUpperCase();
            }
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}

// Logout function
function logout() {
    AppState.user = null;
    AppState.token = null;
    Utils.removeItem('token');
    Utils.removeItem('user');
    updateAuthUI();
    window.location.href = '/';
}

// Export for use in other modules
window.MangaRead = {
    CONFIG,
    AppState,
    Utils,
    API,
    UI,
    openModal,
    closeModal,
    switchModal,
    togglePassword,
    performSearch,
    logout,
    updateAuthUI
};