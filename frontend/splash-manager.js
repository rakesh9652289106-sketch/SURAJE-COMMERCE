document.addEventListener("DOMContentLoaded", () => {
    const splash = document.getElementById('splashScreen');
    const splashVideo = document.getElementById('splashVideo');
    const skipBtn = document.getElementById('skipSplash');

    const hideSplash = () => {
        if (splash) {
            splash.classList.add('hidden');
            setTimeout(() => splash.remove(), 800);
        }
    };

    if (splash) {
        if (sessionStorage.getItem('splashShown')) {
            splash.style.display = 'none';
            splash.remove();
        } else {
            const splashTimeout = setTimeout(() => {
                hideSplash();
                sessionStorage.setItem('splashShown', 'true');
            }, 6000);
            
            if (splashVideo) {
                splashVideo.onended = () => {
                    hideSplash();
                    sessionStorage.setItem('splashShown', 'true');
                };
            }

            if (skipBtn) {
                skipBtn.onclick = () => {
                    clearTimeout(splashTimeout);
                    hideSplash();
                    sessionStorage.setItem('splashShown', 'true');
                };
            }
        }
    }
});
