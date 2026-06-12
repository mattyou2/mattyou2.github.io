// Update os.wm in je os.js bestand:

os.wm = {
    zIndexCount: 100,
    openApps: [], // Bijhouden welke apps open staan voor de taakbalk

    openWindow(appId) {
        // Als app al open is, focus hem of herstel hem
        if (document.getElementById(`win-${appId}`)) {
            this.restoreWindow(appId);
            return;
        }

        const app = os.registeredApps[appId];
        if (!app) return;

        const win = document.createElement('div');
        win.id = `win-${appId}`;
        win.className = 'window';
        win.style.left = '100px';
        win.style.top = '100px';
        win.style.width = '500px'; // Standaard breedte
        win.style.height = '350px'; // Standaard hoogte
        win.style.zIndex = ++this.zIndexCount;

        win.innerHTML = `
            <div class="window-header" onmousedown="os.wm.dragStart(event, '${win.id}')">
                <span class="window-title">${app.icon || ''} ${app.title}</span>
                <div class="window-controls">
                    <button class="min-btn" onclick="os.wm.minimizeWindow('${appId}')">_</button>
                    <button class="close-btn" onclick="os.wm.closeWindow('${appId}')">✕</button>
                </div>
            </div>
            <div class="window-content" id="content-${appId}"></div>
            <div class="resizer" onmousedown="os.wm.resizeStart(event, '${win.id}')"></div>
        `;

        document.getElementById('window-container').appendChild(win);
        win.addEventListener('mousedown', () => this.focusWindow(win.id));

        app.render(document.getElementById(`content-${appId}`));
        
        // Toevoegen aan taakbalk
        this.addToTaskbar(appId, app.title);
        this.toggleStartMenu(false);
    },

    // --- TAAKBALK LOGICA ---
    addToTaskbar(appId, title) {
        const tb = document.getElementById('taskbar-apps');
        const btn = document.createElement('div');
        btn.id = `tb-${appId}`;
        btn.className = 'taskbar-item active';
        btn.innerText = title;
        btn.onclick = () => this.toggleWindow(appId);
        tb.appendChild(btn);
    },

    removeFromTaskbar(appId) {
        const btn = document.getElementById(`tb-${appId}`);
        if (btn) btn.remove();
    },

    toggleWindow(appId) {
        const win = document.getElementById(`win-${appId}`);
        const btn = document.getElementById(`tb-${appId}`);

        if (win.classList.contains('minimized')) {
            this.restoreWindow(appId);
        } else {
            // Als hij al de focus heeft, minimaliseer hem. Anders: geef hem focus.
            if (parseInt(win.style.zIndex) < this.zIndexCount) {
                this.focusWindow(win.id);
            } else {
                this.minimizeWindow(appId);
            }
        }
    },

    minimizeWindow(appId) {
        const win = document.getElementById(`win-${appId}`);
        const btn = document.getElementById(`tb-${appId}`);
        win.classList.add('minimized');
        btn.classList.remove('active');
    },

    restoreWindow(appId) {
        const win = document.getElementById(`win-${appId}`);
        const btn = document.getElementById(`tb-${appId}`);
        win.classList.remove('minimized');
        btn.classList.add('active');
        this.focusWindow(win.id);
    },

    closeWindow(appId) {
        document.getElementById(`win-${appId}`).remove();
        this.removeFromTaskbar(appId);
    },

    focusWindow(winId) {
        this.zIndexCount++;
        document.getElementById(winId).style.zIndex = this.zIndexCount;
        
        // Update taakbalk visueel
        document.querySelectorAll('.taskbar-item').forEach(i => i.classList.remove('active'));
        const appId = winId.replace('win-', '');
        const btn = document.getElementById(`tb-${appId}`);
        if (btn) btn.classList.add('active');
    },

    // --- RESIZE LOGICA ---
    resizeStart(e, winId) {
        e.preventDefault();
        e.stopPropagation(); // Voorkom dat we ook gaan slepen
        const win = document.getElementById(winId);
        let startWidth = parseInt(document.defaultView.getComputedStyle(win).width, 10);
        let startHeight = parseInt(document.defaultView.getComputedStyle(win).height, 10);
        let startX = e.clientX;
        let startY = e.clientY;

        const doResize = (e) => {
            win.style.width = (startWidth + e.clientX - startX) + 'px';
            win.style.height = (startHeight + e.clientY - startY) + 'px';
        };

        const stopResize = () => {
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
        };

        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
    },

    // (Sleeplogica blijft hetzelfde als in het vorige voorbeeld)
    dragStart(e, winId) {
        const win = document.getElementById(winId);
        this.focusWindow(winId);
        if (e.target.closest('.window-controls')) return;

        let posX = e.clientX - win.offsetLeft;
        let posY = e.clientY - win.offsetTop;

        const move = (e) => {
            win.style.left = (e.clientX - posX) + 'px';
            win.style.top = (e.clientY - posY) + 'px';
        }

        const stop = () => {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', stop);
        }

        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', stop);
    },

    toggleStartMenu(force) {
        const menu = document.getElementById('start-menu');
        force !== undefined ? (force ? menu.classList.add('active') : menu.classList.remove('active')) : menu.classList.toggle('active');
    },

    initDragHandler() {
        document.getElementById('desktop-screen').addEventListener('click', (e) => {
            if (!e.target.closest('.start-btn') && !e.target.closest('.start-menu')) this.toggleStartMenu(false);
        });
    }
};
