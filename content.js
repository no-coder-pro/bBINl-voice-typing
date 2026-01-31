(function () {
    if (window.bvoiInitialized) return;
    window.bvoiInitialized = true;

    let recognition = null;
    let isListening = false;
    let noSpeechTimeout = null;
    let language = 'bn-BD';
    let overlay = null;
    let settingsWidget = null;

    // Load persisted language
    chrome.storage.sync.get('bvoiLanguage', (data) => {
        if (data && data.bvoiLanguage) {
            language = data.bvoiLanguage;
            if (recognition) recognition.lang = language;
        }
    });

    function showToast(message, type = 'info', duration = 3000) {
        if (window.showToast) {
            window.showToast(message, type, duration);
        }
    }

    function createSettingsWidget() {
        if (settingsWidget) {
            settingsWidget.style.display = 'flex';
            settingsWidget.style.opacity = '1';
            return;
        }

        settingsWidget = document.createElement('div');
        settingsWidget.id = 'bbinl-pro-dock';
        settingsWidget.className = 'bbinl-pro-dock';
        settingsWidget.style.cssText = `
            position: fixed;
            right: 30px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 2147483646;
            font-family: 'Outfit', 'Inter', system-ui, sans-serif;
            user-select: none;
            display: flex;
            flex-direction: column;
            gap: 12px;
            opacity: 0;
            transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        const languages = [
            ['bn-BD', 'Bengali (BD)'], ['bn-IN', 'Bengali (IN)'], ['en-US', 'English (US)'], ['en-GB', 'English (UK)'],
            ['en-IN', 'English (IN)'], ['ar-SA', 'Arabic (SA)'], ['ar-AE', 'Arabic (UAE)'], ['hi-IN', 'Hindi'],
            ['es-ES', 'Spanish (ES)'], ['es-MX', 'Spanish (MX)'], ['fr-FR', 'French (FR)'], ['fr-CA', 'French (CA)'],
            ['de-DE', 'German'], ['it-IT', 'Italian'], ['pt-PT', 'Portuguese (PT)'], ['pt-BR', 'Portuguese (BR)'],
            ['ru-RU', 'Russian'], ['ja-JP', 'Japanese'], ['ko-KR', 'Korean'], ['zh-CN', 'Chinese (CN)'],
            ['zh-TW', 'Chinese (TW)'], ['tr-TR', 'Turkish'], ['nl-NL', 'Dutch'], ['sv-SE', 'Swedish'],
            ['no-NO', 'Norwegian'], ['da-DK', 'Danish'], ['fi-FI', 'Finnish'], ['pl-PL', 'Polish'],
            ['id-ID', 'Indonesian'], ['ms-MY', 'Malay'], ['th-TH', 'Thai'], ['vi-VN', 'Vietnamese'],
            ['el-GR', 'Greek'], ['he-IL', 'Hebrew'], ['ro-RO', 'Romanian'], ['hu-HU', 'Hungarian'],
            ['cs-CZ', 'Czech'], ['sk-SK', 'Slovak'], ['uk-UA', 'Ukrainian'], ['hr-HR', 'Croatian']
        ];

        const langMap = Object.fromEntries(languages);

        const svgGlobal = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
        const svgChevron = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
        const svgMic = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>`;
        const svgDrag = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>`;
        const svgClose = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        const svgSearch = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"/></svg>`;

        settingsWidget.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
                
                .bbinl-pro-dock * { box-sizing: border-box; }
                
                .bbinl-main-panel {
                    background: rgba(18, 22, 33, 0.75);
                    backdrop-filter: blur(24px) saturate(160%);
                    -webkit-backdrop-filter: blur(24px) saturate(160%);
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    border-radius: 28px;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
                    width: 230px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }

                .bbinl-dock-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: rgba(255, 255, 255, 0.06);
                    border-radius: 16px;
                    cursor: grab;
                }

                .bbinl-dock-drag {
                    color: rgba(255, 255, 255, 0.6);
                    display: flex;
                    pointer-events: none;
                }

                .bbinl-dock-close {
                    cursor: pointer;
                    color: rgba(255, 255, 255, 0.5);
                    padding: 4px;
                    transition: all 0.2s;
                    display: flex;
                    z-index: 2;
                }
                .bbinl-dock-close:hover { color: #ff5252; transform: scale(1.15); }

                .bbinl-dropdown-wrap { position: relative; }

                .bbinl-selector-trigger {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 18px;
                    padding: 14px 18px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    color: #ffffff;
                }
                .bbinl-selector-trigger:hover {
                    background: rgba(0, 0, 0, 0.45);
                    border-color: rgba(74, 144, 226, 0.4);
                }
                .bbinl-trigger-label {
                    font-size: 14px;
                    font-weight: 600;
                    letter-spacing: 0.2px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .bbinl-pro-dropdown {
                    position: absolute;
                    bottom: calc(100% + 12px);
                    left: 0;
                    width: 100%;
                    background: rgba(18, 20, 32, 0.96);
                    backdrop-filter: blur(24px);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 20px;
                    padding: 10px;
                    display: none;
                    flex-direction: column;
                    gap: 8px;
                    box-shadow: 0 15px 40px rgba(0,0,0,0.5);
                    z-index: 100;
                    animation: bbinl-popup 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes bbinl-popup { from { opacity: 0; transform: translateY(15px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                
                .bbinl-pro-dropdown.show { display: flex; }

                .bbinl-search-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 8px 12px;
                    margin-bottom: 4px;
                }
                .bbinl-search-input {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 13px;
                    width: 100%;
                    outline: none;
                    font-family: inherit;
                }
                .bbinl-search-input::placeholder { color: rgba(255,255,255,0.3); }

                .bbinl-lang-list-scroll {
                    max-height: 260px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    padding-right: 4px;
                }
                .bbinl-lang-list-scroll::-webkit-scrollbar { width: 4px; }
                .bbinl-lang-list-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }

                .bbinl-lang-option {
                    padding: 10px 14px;
                    border-radius: 12px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: rgba(255,255,255,0.7);
                    font-weight: 500;
                }
                .bbinl-lang-option:hover { background: rgba(255,255,255,0.08); color: white; }
                .bbinl-lang-option.active { background: rgba(74, 144, 226, 0.2); color: #4A90E2; font-weight: 700; }

                .bbinl-mic-dock-btn {
                    height: 60px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    background: #ff4757;
                    color: white;
                    box-shadow: 0 8px 20px rgba(255, 71, 87, 0.3);
                }
                .bbinl-mic-dock-btn:hover { background: #ff5e6c; transform: translateY(-2px); }
                .bbinl-mic-dock-btn.listening {
                    background: #2ed573;
                    color: white;
                    border-color: rgba(255, 255, 255, 0.3);
                    box-shadow: 0 8px 25px rgba(46, 213, 115, 0.4);
                    animation: bbinl-breath 2s infinite ease-in-out;
                }
                
                @keyframes bbinl-breath {
                    0% { transform: scale(1); box-shadow: 0 0 0px rgba(46, 213, 115, 0); }
                    50% { transform: scale(1.02); box-shadow: 0 0 20px rgba(46, 213, 115, 0.2); }
                    100% { transform: scale(1); box-shadow: 0 0 0px rgba(46, 213, 115, 0); }
                }
            </style>

            <div class="bbinl-main-panel">
                <div class="bbinl-dock-header">
                    <div class="bbinl-dock-drag">${svgDrag}</div>
                    <div class="bbinl-dock-close" id="bbinl-close-dock">${svgClose}</div>
                </div>

                <div class="bbinl-dropdown-wrap">
                    <div class="bbinl-pro-dropdown" id="bbinl-pro-drop">
                        <div class="bbinl-search-box">
                            ${svgSearch}
                            <input type="text" class="bbinl-search-input" placeholder="Search language..." id="bbinl-lang-search">
                        </div>
                        <div class="bbinl-lang-list-scroll" id="bbinl-lang-items">
                            ${languages.map(([code, label]) => `
                                <div class="bbinl-lang-option ${language === code ? 'active' : ''}" data-code="${code}">${label}</div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="bbinl-selector-trigger" id="bbinl-drop-trigger">
                        <div class="bbinl-trigger-label">
                            ${svgGlobal}
                            <span id="bbinl-active-lang-label">${langMap[language] || 'Select Language'}</span>
                        </div>
                        ${svgChevron}
                    </div>
                </div>

                <div class="bbinl-mic-dock-btn ${isListening ? 'listening' : ''}" id="bbinl-pro-mic">
                    ${svgMic}
                </div>
            </div>
        `;

        document.body.appendChild(settingsWidget);
        requestAnimationFrame(() => {
            settingsWidget.style.opacity = '1';
        });

        const dockHeader = settingsWidget.querySelector('.bbinl-dock-header');
        let isDragging = false, startX, startY, startR, startT;

        dockHeader.onmousedown = (e) => {
            if (e.target.closest('#bbinl-close-dock')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const style = window.getComputedStyle(settingsWidget);
            startR = parseInt(style.right);
            startT = parseInt(style.top);
            settingsWidget.style.transition = 'none';
        };

        window.onmousemove = (e) => {
            if (!isDragging) return;
            settingsWidget.style.right = (startR + startX - e.clientX) + 'px';
            settingsWidget.style.top = (startT + e.clientY - startY) + 'px';
            settingsWidget.style.transform = 'none';
        };

        window.onmouseup = () => {
            if (!isDragging) return;
            isDragging = false;
            settingsWidget.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            document.body.style.cursor = 'default';
        };

        settingsWidget.querySelector('#bbinl-close-dock').onclick = () => {
            settingsWidget.style.opacity = '0';
            settingsWidget.style.transform = 'translateY(-50%) scale(0.9)';
            setTimeout(() => settingsWidget.style.display = 'none', 400);
            chrome.runtime.sendMessage({ action: "updateBackgroundActiveState", isActive: false });
        };

        const trigger = settingsWidget.querySelector('#bbinl-drop-trigger');
        const dropdown = settingsWidget.querySelector('#bbinl-pro-drop');
        const searchInput = settingsWidget.querySelector('#bbinl-lang-search');

        trigger.onmousedown = (e) => e.preventDefault();
        trigger.onclick = (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
            if (dropdown.classList.contains('show')) searchInput.focus();
        };

        dropdown.onclick = (e) => e.stopPropagation();
        dropdown.onmousedown = (e) => {
            if (e.target !== searchInput) e.preventDefault();
        };

        searchInput.oninput = (e) => {
            const query = e.target.value.toLowerCase();
            settingsWidget.querySelectorAll('.bbinl-lang-option').forEach(opt => {
                const text = opt.textContent.toLowerCase();
                opt.style.display = text.includes(query) ? 'block' : 'none';
            });
        };

        // Lang Select
        settingsWidget.querySelectorAll('.bbinl-lang-option').forEach(opt => {
            opt.onmousedown = (e) => e.preventDefault();
            opt.onclick = () => {
                const newLang = opt.getAttribute('data-code');
                const wasListening = isListening;

                language = newLang;
                chrome.storage.sync.set({ 'bvoiLanguage': newLang }); // Persist selection

                if (settingsWidget) {
                    settingsWidget.querySelector('#bbinl-active-lang-label').textContent = langMap[newLang];
                    settingsWidget.querySelectorAll('.bbinl-lang-option').forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                }
                dropdown.classList.remove('show');

                showToast(`Switched to ${langMap[newLang]}`, 'success');

                if (wasListening) {
                    stopListening();
                    setTimeout(() => {
                        if (recognition) recognition.lang = language;
                        startListening();
                    }, 300);
                } else if (recognition) {
                    recognition.lang = language;
                }
            };
        });

        const micBtn = settingsWidget.querySelector('#bbinl-pro-mic');
        micBtn.onmousedown = (e) => e.preventDefault();
        micBtn.onclick = () => {
            if (isListening) {
                micBtn.classList.remove('listening');
                stopListening();
            } else {
                micBtn.classList.add('listening');
                startListening();
            }
        };

        document.addEventListener('click', () => dropdown.classList.remove('show'));
    }

    function createOverlay() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.id = 'bbinl-voice-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, rgba(20, 24, 40, 0.94), rgba(35, 40, 70, 0.9));
            backdrop-filter: blur(16px) saturate(180%);
            -webkit-backdrop-filter: blur(16px) saturate(180%);
            color: white;
            padding: 8px 18px;
            border-radius: 24px;
            font-family: 'Outfit', 'Inter', system-ui, sans-serif;
            font-size: 15px;
            z-index: 2147483647;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 12px;
            pointer-events: none;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            max-width: 80%;
            text-align: left;
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        overlay.innerHTML = `
            <div id="bbinl-rec-dot" style="width: 8px; height: 8px; background: #ff4757; border-radius: 50%; box-shadow: 0 0 10px rgba(255, 71, 87, 0.8);"></div>
            <div id="bbinl-transcript-text" style="line-height: 1.4; word-break: break-word; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Listening...</div>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
                @keyframes bbinl-pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.3); opacity: 0.6; }
                    100% { transform: scale(1); opacity: 1; }
                }
                #bbinl-rec-dot { animation: bbinl-pulse 1.5s infinite ease-in-out; }
            </style>
        `;
        document.body.appendChild(overlay);
    }

    let overlayTimeout;
    function updateOverlay(text, isFinal = false) {
        if (!text && !isFinal) return;
        if (!overlay) createOverlay();

        const textEl = overlay.querySelector('#bbinl-transcript-text');
        if (textEl) {
            textEl.textContent = text;
            textEl.style.color = isFinal ? '#4ade80' : 'white';
            textEl.style.textShadow = isFinal ? '0 0 8px rgba(74, 222, 128, 0.4)' : '0 1px 2px rgba(0,0,0,0.3)';
        }

        overlay.style.opacity = '1';
        overlay.style.top = '30px';

        clearTimeout(overlayTimeout);
        if (isFinal) {
            overlayTimeout = setTimeout(() => {
                hideOverlay();
            }, 1500); // overlay time 
        } else {
            overlayTimeout = setTimeout(() => {
                hideOverlay();
            }, 1500);
        }
    }

    function hideOverlay() {
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.top = '20px';
        }
    }

    function getDeepActiveElement() {
        let el = document.activeElement;
        while (el && el.tagName === 'IFRAME') {
            try {
                const nextEl = el.contentDocument.activeElement;
                if (!nextEl || nextEl === el) break;
                el = nextEl;
            } catch (e) {
                break;
            }
        }
        return el;
    }

    function initializeSpeechRecognition() {
        if (!window.webkitSpeechRecognition) {
            showToast('Speech Recognition API not supported.', 'error');
            return false;
        }

        try {
            recognition = new webkitSpeechRecognition();
            recognition.lang = language;
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onstart = () => {
                isListening = true;
                chrome.runtime.sendMessage({ action: "updateIcon", status: "listening" });
                resetNoSpeechTimeout();
                if (settingsWidget) settingsWidget.querySelector('#bbinl-pro-mic').classList.add('listening');
            };

            recognition.onend = () => {
                isListening = false;
                clearTimeout(noSpeechTimeout);
                hideOverlay();
                chrome.runtime.sendMessage({ action: "updateIcon", status: "active" });
                if (settingsWidget) settingsWidget.querySelector('#bbinl-pro-mic').classList.remove('listening');
            };

            recognition.onerror = (event) => {
                isListening = false;
                clearTimeout(noSpeechTimeout);
                hideOverlay();
                console.error('Recognition error:', event.error);
                chrome.runtime.sendMessage({ action: "updateIcon", status: "error" });
                showToast(`Error: ${event.error}`, 'error');
                if (settingsWidget) settingsWidget.querySelector('#bbinl-pro-mic').classList.remove('listening');
            };

            recognition.onresult = (event) => {
                resetNoSpeechTimeout();
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (interimTranscript) {
                    updateOverlay(interimTranscript, false);
                }

                if (finalTranscript) {
                    updateOverlay(finalTranscript, true);
                    insertText(finalTranscript);
                }
            };

            return true;
        } catch (error) {
            console.error('Initialization error:', error);
            return false;
        }
    }

    function resetNoSpeechTimeout() {
        clearTimeout(noSpeechTimeout);
        noSpeechTimeout = setTimeout(() => {
            stopListening();
            showToast('Stopped due to inactivity.', 'info');
        }, 8000);
    }

    function insertText(text) {
        const activeElement = getDeepActiveElement();
        const textToInsert = text.trim() + ' ';

        if (window.location.hostname.includes('docs.google.com')) {
            const iframe = document.querySelector('iframe.docs-texteventtarget-iframe');
            if (iframe) {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    const target = doc.activeElement || doc.body;
                    if (target) {
                        for (let char of textToInsert) {
                            const charCode = char.charCodeAt(0);

                            target.dispatchEvent(new KeyboardEvent('keydown', { key: char, keyCode: charCode, which: charCode, bubbles: true, cancelable: true }));
                            target.dispatchEvent(new KeyboardEvent('keypress', { key: char, keyCode: charCode, which: charCode, bubbles: true, cancelable: true }));
                            target.dispatchEvent(new InputEvent('beforeinput', { data: char, inputType: 'insertText', bubbles: true, cancelable: true }));
                            target.dispatchEvent(new InputEvent('input', { data: char, inputType: 'insertText', bubbles: true }));
                            target.dispatchEvent(new KeyboardEvent('keyup', { key: char, keyCode: charCode, which: charCode, bubbles: true, cancelable: true }));
                        }
                        return;
                    }
                } catch (e) {
                    console.error('Google Docs insertion error:', e);
                }
            }
        }

        if (!activeElement) return;

        if (activeElement.isContentEditable || activeElement.tagName === 'BODY') {
            const doc = activeElement.ownerDocument;
            if (doc.queryCommandSupported('insertText')) {
                doc.execCommand('insertText', false, textToInsert);
            } else {
                const selection = doc.getSelection();
                if (selection.rangeCount) {
                    selection.deleteFromDocument();
                    selection.getRangeAt(0).insertNode(doc.createTextNode(textToInsert));
                    selection.collapseToEnd();
                }
            }
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            const value = activeElement.value;
            activeElement.value = value.substring(0, start) + textToInsert + value.substring(end);
            activeElement.selectionStart = activeElement.selectionEnd = start + textToInsert.length;
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    function startListening() {
        if (isListening) return { success: true };
        if (!recognition && !initializeSpeechRecognition()) return { success: false };

        try {
            recognition.start();
            return { success: true };
        } catch (e) {
            console.error('Start error:', e);
            return { success: false };
        }
    }

    function stopListening() {
        if (!isListening) return { success: true };
        try {
            recognition.stop();
            return { success: true };
        } catch (e) {
            console.error('Stop error:', e);
            return { success: false };
        }
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "startListening") {
            const res = startListening();
            sendResponse({ status: res.success ? 'started' : 'error' });
            if (res.success) {
                createOverlay();
                createSettingsWidget();
                chrome.runtime.sendMessage({ action: "updateBackgroundActiveState", isActive: true, isListening: true });
            }
        } else if (request.action === "restoreState") {
            createSettingsWidget();
            sendResponse({ status: "restored" });
        } else if (request.action === "stopListening") {
            const res = stopListening();
            sendResponse({ status: res.success ? 'stopped' : 'error' });
            chrome.runtime.sendMessage({ action: "updateBackgroundActiveState", isActive: true, isListening: false });
        } else if (request.action === "getListeningState") {
            sendResponse({ isListening: isListening });
        } else if (request.action === "setLanguage") {
            language = request.language;
            if (recognition) recognition.lang = language;
            if (settingsWidget) {
                const label = settingsWidget.querySelector('#bbinl-active-lang-label');
                if (label) {
                    const languages = [['bn-BD', 'Bengali (BD)'], ['bn-IN', 'Bengali (IN)'], ['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['en-IN', 'English (IN)'], ['ar-SA', 'Arabic (SA)'], ['ar-AE', 'Arabic (UAE)'], ['hi-IN', 'Hindi'], ['es-ES', 'Spanish (ES)'], ['es-MX', 'Spanish (MX)'], ['fr-FR', 'French (FR)'], ['fr-CA', 'French (CA)'], ['de-DE', 'German'], ['it-IT', 'Italian'], ['pt-PT', 'Portuguese (PT)'], ['pt-BR', 'Portuguese (BR)'], ['ru-RU', 'Russian'], ['ja-JP', 'Japanese'], ['ko-KR', 'Korean'], ['zh-CN', 'Chinese (CN)'], ['zh-TW', 'Chinese (TW)'], ['tr-TR', 'Turkish'], ['nl-NL', 'Dutch'], ['sv-SE', 'Swedish'], ['no-NO', 'Norwegian'], ['da-DK', 'Danish'], ['fi-FI', 'Finnish'], ['pl-PL', 'Polish'], ['id-ID', 'Indonesian'], ['ms-MY', 'Malay'], ['th-TH', 'Thai'], ['vi-VN', 'Vietnamese'], ['el-GR', 'Greek'], ['he-IL', 'Hebrew'], ['ro-RO', 'Romanian'], ['hu-HU', 'Hungarian'], ['cs-CZ', 'Czech'], ['sk-SK', 'Slovak'], ['uk-UA', 'Ukrainian'], ['hr-HR', 'Croatian']];
                    const langMap = Object.fromEntries(languages);
                    label.textContent = langMap[language] || language;
                }
                settingsWidget.querySelectorAll('.bbinl-lang-option').forEach(opt => {
                    opt.classList.toggle('active', opt.getAttribute('data-code') === language);
                });
            }
            sendResponse({ status: "ok" });
        }
        return true;
    });
})();
