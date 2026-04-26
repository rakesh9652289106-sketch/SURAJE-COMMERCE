/**
 * SURAJ Theme Manager
 * Handles Dark Mode persistence and synchronization across all pages.
 */

(function() {
    // 1. Immediate Theme Application (Avoid Flash of Light)
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && systemDark);
    
    if (isDark) {
        document.documentElement.classList.add('dark-theme');
    }

    // 2. Global Setup Function
    window.setupThemeToggle = function() {
        const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
        if (!toggleBtns.length) return;

        const applyTheme = (isDark) => {
            document.body.classList.toggle('dark-theme', isDark);
            document.documentElement.classList.toggle('dark-theme', isDark);
            
            toggleBtns.forEach(btn => {
                const icon = btn.querySelector('i');
                if (icon) {
                    if (isDark) {
                        icon.classList.remove('ph-moon');
                        icon.classList.add('ph-sun');
                    } else {
                        icon.classList.remove('ph-sun');
                        icon.classList.add('ph-moon');
                    }
                }
            });
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        };

        // Sync icons and body class on load
        const currentIsDark = document.documentElement.classList.contains('dark-theme');
        if (currentIsDark) document.body.classList.add('dark-theme');
        
        toggleBtns.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                if (currentIsDark) {
                    icon.classList.remove('ph-moon');
                    icon.classList.add('ph-sun');
                } else {
                    icon.classList.remove('ph-sun');
                    icon.classList.add('ph-moon');
                }
            }
            
            btn.addEventListener('click', () => {
                const isNowDark = !document.documentElement.classList.contains('dark-theme');
                applyTheme(isNowDark);
            });
        });
    };

    // 3. Global Scroll Behaviors (Support Button Visibility)
    let lastScrollTop = 0;
    let scrollStopTimer;

    const updateSupportVisibility = (scrollingDown = false) => {
        const supportBtn = document.getElementById('supportSymbol');
        if (!supportBtn) return;

        // 1. Check if any major UI component is open/active
        const isModalOpen = !!document.querySelector('.nav-sidebar.active, .cart-sidebar.active, .checkout-modal-overlay.active, .feature-modal-overlay.active, .auth-modal-overlay.active');
        const isNotifOpen = document.getElementById('notificationsDropdown')?.style.display === 'block';
        const isSearchActive = document.getElementById('mainSearchInput')?.value.trim() !== '';

        // 2. Decide visibility
        // Show ONLY while scrolling down AND no UI "function" is active
        if (scrollingDown && !isModalOpen && !isNotifOpen && !isSearchActive) {
            supportBtn.classList.add('visible');
        } else {
            supportBtn.classList.remove('visible');
        }
    };

    document.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollingDown = scrollTop > lastScrollTop && scrollTop > 50;
        
        updateSupportVisibility(scrollingDown);
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;

        // Auto-hide after scroll stops (if you want it to disappear when stationary)
        clearTimeout(scrollStopTimer);
        scrollStopTimer = setTimeout(() => {
            updateSupportVisibility(false);
        }, 1500); 
    }, { passive: true });
    
    // Also listen for clicks that might open/close modals
    document.addEventListener('click', () => setTimeout(updateSupportVisibility, 100));
    
    // Listen for search input
    document.addEventListener('input', (e) => {
        if (e.target.id === 'mainSearchInput') updateSupportVisibility();
    });

    // Auto-init on DOMContentLoaded if not manually called
    document.addEventListener('DOMContentLoaded', () => {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
        }
        window.setupThemeToggle();

        // Initial Support Button Check
        updateSupportVisibility();
    });
})();
