// ============================================
// MangaRead - Home Page JavaScript
// ============================================

// Initialize home page
document.addEventListener('DOMContentLoaded', function() {
    loadHomePage();
});

// Load home page content
async function loadHomePage() {
    const trendingGrid = document.getElementById('trendingGrid');
    const popularGrid = document.getElementById('popularGrid');
    const latestGrid = document.getElementById('latestGrid');

    // Load all sections in parallel
    await Promise.all([
        loadTrendingManga(trendingGrid),
        loadPopularManga(popularGrid),
        loadLatestManga(latestGrid)
    ]);
}

// Load trending manga
async function loadTrendingManga(container) {
    if (!container) return;

    try {
        MangaRead.UI.showLoading(container, 6);
        
        const mangaList = await MangaRead.API.getTopManga(6);
        
        if (!mangaList || mangaList.length === 0) {
            MangaRead.UI.showEmpty(container, 'No trending manga available');
            return;
        }

        container.innerHTML = '';
        mangaList.forEach(manga => {
            container.appendChild(MangaRead.UI.createMangaCard(manga));
        });

    } catch (error) {
        console.error('Error loading trending manga:', error);
        MangaRead.UI.showError(container, 'Failed to load trending manga. Please try again later.');
    }
}

// Load popular manga
async function loadPopularManga(container) {
    if (!container) return;

    try {
        MangaRead.UI.showLoading(container, 6);
        
        const mangaList = await MangaRead.API.getPopularManga(6);
        
        if (!mangaList || mangaList.length === 0) {
            MangaRead.UI.showEmpty(container, 'No popular manga available');
            return;
        }

        container.innerHTML = '';
        mangaList.forEach(manga => {
            container.appendChild(MangaRead.UI.createMangaCard(manga));
        });

    } catch (error) {
        console.error('Error loading popular manga:', error);
        MangaRead.UI.showError(container, 'Failed to load popular manga. Please try again later.');
    }
}

// Load latest manga
async function loadLatestManga(container) {
    if (!container) return;

    try {
        MangaRead.UI.showLoading(container, 6);
        
        const mangaList = await MangaRead.API.getLatestManga(6);
        
        if (!mangaList || mangaList.length === 0) {
            MangaRead.UI.showEmpty(container, 'No latest manga available');
            return;
        }

        container.innerHTML = '';
        mangaList.forEach(manga => {
            container.appendChild(MangaRead.UI.createMangaCard(manga));
        });

    } catch (error) {
        console.error('Error loading latest manga:', error);
        MangaRead.UI.showError(container, 'Failed to load latest manga. Please try again later.');
    }
}

// Refresh home page data
function refreshHomePage() {
    loadHomePage();
    MangaRead.UI.showToast('Content refreshed', 'success');
}

// Handle genre card clicks
document.querySelectorAll('.genre-card').forEach(card => {
    card.addEventListener('click', function(e) {
        e.preventDefault();
        const genre = this.getAttribute('href').split('=')[1];
        if (genre) {
            window.location.href = `/search.html?genre=${genre}`;
        }
    });
});

// Add scroll effect to header
window.addEventListener('scroll', function() {
    const header = document.getElementById('header');
    if (header) {
        if (window.scrollY > 50) {
            header.style.backgroundColor = 'rgba(15, 15, 15, 0.98)';
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
        } else {
            header.style.backgroundColor = 'rgba(15, 15, 15, 0.95)';
            header.style.boxShadow = 'none';
        }
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Handle search form submission
const searchForm = document.querySelector('.search-container');
if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim()) {
            window.location.href = `/search.html?q=${encodeURIComponent(searchInput.value.trim())}`;
        }
    });
}

// Add keyboard navigation for search
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    });
}

// Intersection Observer for lazy loading
const observerOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
};

const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        }
    });
}, observerOptions);

// Observe all images with data-src attribute
document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
});

// Add animation on scroll
const animateOnScroll = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

// Observe sections for animation
document.querySelectorAll('.section').forEach(section => {
    animateOnScroll.observe(section);
});

// Handle window resize for responsive behavior
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        // Adjust grid columns based on screen size
        const grids = document.querySelectorAll('.manga-grid');
        grids.forEach(grid => {
            if (window.innerWidth < 480) {
                grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
            } else if (window.innerWidth < 768) {
                grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(140px, 1fr))';
            } else {
                grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
            }
        });
    }, 250);
});

// Initialize tooltips
function initTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.dataset.tooltip;
            tooltip.style.cssText = `
                position: absolute;
                background: var(--bg-secondary);
                color: var(--text-primary);
                padding: 0.5rem 1rem;
                border-radius: var(--radius-md);
                font-size: var(--font-size-sm);
                z-index: 1000;
                pointer-events: none;
                box-shadow: var(--shadow-lg);
            `;
            
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
        });
        
        element.addEventListener('mouseleave', function() {
            const tooltip = document.querySelector('.tooltip');
            if (tooltip) tooltip.remove();
        });
    });
}

// Call tooltip initialization
initTooltips();

// Export for global access
window.HomePage = {
    loadHomePage,
    refreshHomePage,
    loadTrendingManga,
    loadPopularManga,
    loadLatestManga
};