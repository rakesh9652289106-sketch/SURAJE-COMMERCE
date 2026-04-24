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

    // Auto-init on DOMContentLoaded if not manually called
    document.addEventListener('DOMContentLoaded', () => {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
        }
        window.setupThemeToggle();
    });
})();
