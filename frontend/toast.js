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
            z-index: 10000;
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
        if (type === 'error') icon = '<i class="ph-fill ph-warning-circle"></i>';
        if (type === 'info') icon = '<i class="ph-fill ph-info"></i>';

        toast.innerHTML = `
            <div class="toast-content" style="
                background: white;
                color: #1E293B;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 280px;
                border-left: 4px solid ${this.getColor(type)};
                animation: toast-slide-in 0.3s ease-out forwards;
                pointer-events: auto;
            ">
                <span style="color: ${this.getColor(type)}; font-size: 1.25rem; display: flex;">${icon}</span>
                <span style="font-weight: 500; font-size: 0.9rem;">${message}</span>
            </div>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'toast-fade-out 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    getColor(type) {
        switch(type) {
            case 'success': return '#10B981';
            case 'error': return '#EF4444';
            case 'info': return '#3B82F6';
            default: return '#10B981';
        }
    }
};

// Add animations to document
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes toast-slide-in {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toast-fade-out {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(10px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}
