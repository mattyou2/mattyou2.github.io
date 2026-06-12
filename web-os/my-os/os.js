// Centrale OS Object
const os = {
    currentUser: null,
    registeredApps: {},

    init() {
        this.clock.start();
        this.wm.initDragHandler();
        
        // Check of er al een actieve sessie is
        const session = localStorage.getItem('myos_session');
        if (session) {
            this.currentUser = session;
            this.loadUserOS();
        }
    },

    // --- ACCOUNT EN LOCALSTORAGE BEHEER ---
    auth: {
        getUsers() {
            return JSON.parse(localStorage.getItem('myos_users')) || {};
        },
        register() {
            const u = document.getElementById('username').value.trim();
            const p = document.getElementById('password').value;
            const error = document.getElementById('auth-error');

            if (!u || !p) return error.innerText = "Vul alle velden in.";
            
            let users = this.getUsers();
            if (users[u]) return error.innerText = "Gebruiker bestaat al!";

            // Maak nieuwe gebruiker aan met standaard OS instellingen en app data
            users[u] = {
                password: p,
                settings: { wallpaper: '#2b3a42' },
                notes: [],
                files: { "Welkom.txt": "Welkom bij My-OS! Dit is je persoonlijke bestandsbeheer." }
            };

            localStorage.setItem('myos_users', JSON.stringify(users));
            error.style.color = "lightgreen";
            error.innerText = "Registratie succesvol! Log nu in.";
        },
        login() {
            const u = document.getElementById('username').value.trim();
            const p = document.getElementById('password').value;
            const error = document.getElementById('auth-error');

            let users = this.getUsers();
            if (users[u] && users[u].password === p) {
                os.currentUser = u;
                localStorage.setItem('myos_session', u);
                os.loadUserOS();
            } else {
                error.innerText = "Onjuiste inloggegevens.";
            }
        },
        logout() {
            localStorage.removeItem('myos_session');
            location.reload();
        }
    },

    // --- DATA OPSLAG EN SYNCHRONISATIE ---
    data: {
        get() {
            let users = JSON.parse(localStorage.getItem('myos_users'));
            return users[os.currentUser];
        },
        save(newData) {
            let users = JSON.parse(localStorage.getItem('myos_users'));
            users[os.currentUser] = { ...users[os.currentUser], ...newData };
            localStorage.setItem('myos_users', JSON.stringify(users));
        }
    },

    loadUserOS() {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('desktop-screen').classList.add('active');
        document.getElementById('start-username').innerText = this.currentUser;
        
        // Laad gepersonaliseerde instellingen
        const userData = this.data.get();
        document.getElementById('desktop-screen').style.backgroundColor = userData.settings.wallpaper;
    },

    // --- WINDOW MANAGER (WM) ---
    wm: {
        zIndexCount: 100,

        openWindow(appId) {
            if (document.getElementById(`win-${appId}`)) {
                this.focusWindow(`win-${appId}`);
                return;
            }

            const app = os.registeredApps[appId];
            if (!app) return;

            const win = document.createElement('div');
            win.id = `win-${appId}`;
            win.className = 'window';
            win.style.left = '100px';
            win.style.top = '100px';
            win.style.zIndex = ++this.zIndexCount;

            win.innerHTML = `
                <div class="window-header" onmousedown="os.wm.dragStart(event, '${win.id}')">
                    <span class="window-title">${app.title}</span>
                    <div class="window-controls">
                        <button class="close-btn" onclick="os.wm.closeWindow('${win.id}')">✕</button>
                    </div>
                </div>
                <div class="window-content" id="content-${appId}"></div>
            `;

            document.getElementById('window-container').appendChild(win);
            win.addEventListener('mousedown', () => this.focusWindow(win.id));

            // Voer de specifieke app code uit om de content te vullen
            app.render(document.getElementById(`content-${appId}`));
            this.toggleStartMenu(false);
        },

        closeWindow(winId) {
            document.getElementById(winId).remove();
        },

        focusWindow(winId) {
            document.getElementById(winId).style.zIndex = ++this.zIndexCount;
        },

        toggleStartMenu(force) {
            const menu = document.getElementById('start-menu');
            if (force !== undefined) {
                force ? menu.classList.add('active') : menu.classList.remove('active');
            } else {
                menu.classList.toggle('active');
            }
        },

        // Sleep functionaliteit voor vensters
        dragStart(e, winId) {
            const win = document.getElementById(winId);
            this.focusWindow(winId);
            let posX = e.clientX - win.offsetLeft;
            let posY = e.clientY - win.offsetTop;

            function move(e) {
                win.style.left = (e.clientX - posX) + 'px';
                win.style.top = (e.clientY - posY) + 'px';
            }

            function stop() {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', stop);
            }

            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', stop);
        },

        initDragHandler() {
            // Sluit startmenu als je op desktop klikt
            document.getElementById('desktop-screen').addEventListener('click', (e) => {
                if (!e.target.closest('.start-btn') && !e.target.closest('.start-menu')) {
                    this.toggleStartMenu(false);
                }
            });
        }
    },

    // --- SYSTEEM KLOK ---
    clock: {
        start() {
            setInterval(() => {
                const now = new Date();
                const time = now.toTimeString().split(' ')[0].substring(0, 5);
                document.getElementById('taskbar-clock').innerText = time;
            }, 1000);
        }
    }
};
