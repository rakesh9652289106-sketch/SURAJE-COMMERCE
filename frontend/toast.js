/**
 * SURAJ Global Toast System
 * Usage: Toast.show("Message", "success" | "error" | "info")
 */

const Toast = {
    init() {
        if (document.getElementById('toast-container')) return;
        
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    },

    show(message, type = 'success', duration = 3000) {
        this.init();
        const container = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '<i class="ph-fill ph-check-circle"></i>';
        let gradient = 'white';
        let textColor = '#1E293B';
        let iconStyle = '';

        if (type === 'error') icon = '<i class="ph-fill ph-warning-circle"></i>';
        if (type === 'warning') icon = '<i class="ph-fill ph-warning"></i>';
        if (type === 'info') icon = '<i class="ph-fill ph-info"></i>';
        
        if (type === 'premium') {
            icon = '<i class="ph-fill ph-sparkle"></i>';
            gradient = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
            textColor = 'white';
            iconStyle = 'color: #D1FAE5; filter: drop-shadow(0 0 8px rgba(255,255,255,0.4)); animation: pulse 2s infinite;';
        }

        toast.innerHTML = `
            <div class="toast-content" style="
                background: ${gradient};
                color: ${textColor};
                padding: 14px 24px;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                display: flex;
                align-items: center;
                gap: 16px;
                min-width: 320px;
                border: 1px solid rgba(255,255,255,0.1);
                animation: toast-slide-in 0.4s cubic-bezier(0.19, 1, 0.22, 1) forwards;
                pointer-events: auto;
                position: relative;
                overflow: hidden;
            ">
                ${type === 'premium' ? '<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at top right, rgba(255,255,255,0.2), transparent); pointer-events: none;"></div>' : ''}
                <span style="font-size: 1.5rem; display: flex; ${iconStyle}">${icon}</span>
                <span style="font-weight: 600; font-size: 1rem; letter-spacing: 0.2px;">${message}</span>
            </div>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'toast-fade-out 0.4s cubic-bezier(0.19, 1, 0.22, 1) forwards';
            setTimeout(() => toast.remove(), 400);
        }, duration);
    },

    getColor(type) {
        switch(type) {
            case 'success': return '#10B981';
            case 'error': return '#EF4444';
            case 'warning': return '#F59E0B';
            case 'info': return '#3B82F6';
            case 'premium': return '#10B981';
            default: return '#10B981';
        }
    }
};

// Add animations to document
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes toast-slide-in {
            from { transform: translateX(100%) scale(0.9); opacity: 0; }
            to { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes toast-fade-out {
            from { transform: translateX(0) scale(1); opacity: 1; }
            to { transform: translateX(20px) scale(0.95); opacity: 0; }
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
}

// Attach to window for global access from non-module scripts
if (typeof window !== 'undefined') {
    window.Toast = Toast;
}

export default Toast;
