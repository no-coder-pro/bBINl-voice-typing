if (!window.showToast) {
    window.showToast = function (message, type = 'info') {
        let toast = document.getElementById('chrome-extension-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'chrome-extension-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.className = 'chrome-extension-toast ' + type;
        toast.style.display = 'block';

        setTimeout(() => {
            if (toast) toast.style.display = 'none';
        }, 3000);
    };

    (function () {
        const styleId = 'bbinl-toast-style';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .chrome-extension-toast {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(20, 24, 40, 0.95);
                backdrop-filter: blur(12px);
                color: white;
                padding: 12px 24px;
                border-radius: 16px;
                z-index: 2147483647;
                font-family: 'Outfit', 'Inter', sans-serif;
                font-size: 14px;
                font-weight: 500;
                display: none;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.1);
                animation: bbinl-toast-fade 0.3s ease;
            }
            @keyframes bbinl-toast-fade { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
            .chrome-extension-toast.success { border-left: 4px solid #4CAF50; }
            .chrome-extension-toast.error { border-left: 4px solid #f44336; }
            .chrome-extension-toast.info { border-left: 4px solid #2196F3; }
        `;
        document.head.appendChild(style);
    })();
}
