filename="app.js" language="javascript"]
// --- PROJECTEN DATA ---
const projectsData = [
    {
        id: 1,
        title: "Space Quest 3D",
        category: "game",
        description: "Een adembenemend 3D ruimte-avontuur direct in je browser.",
        image: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=600&q=80",
        link: "#",
        glow: "glow-purple"
    },
    {
        id: 2,
        title: "TaskFlow Pro",
        category: "web-app",
        description: "Een slimme productiviteitstool met realtime databasesynchronisatie.",
        image: "https://images.unsplash.com/photo-1611224885990-ab7363d1f2a9?auto=format&fit=crop&w=600&q=80",
        link: "#",
        glow: "glow-blue"
    },
    {
        id: 3,
        title: "CodeCompiler CLI",
        category: "program",
        description: "Een supersnelle command-line tool voor het compileren van scripts.",
        image: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=600&q=80",
        link: "#",
        glow: "glow-pink"
    }
];

// --- INITIALISATIE ---
document.addEventListener("DOMContentLoaded", () => {
    renderProjects(projectsData);
    checkCookieConsent();
    init3DEffect();
    loadSchools();
    
    // Check of de gebruiker is ingelogd om de navigatiebalk bij te werken
    checkAuthState((user, profile) => {
        const navButtons = document.getElementById("auth-nav-buttons");
        if (user && profile) {
            navButtons.innerHTML = `
                <a href="dashboard.html" class="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all">
                    <i class="fa-solid fa-gauge mr-2"></i>Dashboard
                </a>
                <button onclick="handleLogout()" class="px-4 py-2 rounded-full border border-red-500/30 hover:bg-red-500/10 text-red-400 text-sm transition-all">Uitloggen</button>
            `;
        }
    });

    // Koppel de verandering van de rol aan de schoolvelden
    const regRole = document.getElementById("reg-role");
    if (regRole) {
        regRole.addEventListener('change', toggleRegFields);
    }
});

// --- 3D TILT EFFECT LOGICA ---
function init3DEffect() {
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const xc = rect.width / 2;
            const yc = rect.height / 2;
            
            const angleX = (yc - y) / 12;
            const angleY = (x - xc) / 12;
            
            card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale3d(1.03, 1.03, 1.03)`;
            
            const inner = card.querySelector('.tilt-card-inner');
            if (inner) {
                inner.style.transform = 'translateZ(40px)';
            }
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            const inner = card.querySelector('.tilt-card-inner');
            if (inner) {
                inner.style.transform = 'translateZ(0px)';
            }
        });
    });
}

// --- PROJECTEN RENDERING ---
function renderProjects(projects) {
    const grid = document.getElementById("projects-grid");
    if (!grid) return;
    grid.innerHTML = "";
    
    projects.forEach(project => {
        const card = document.createElement("div");
        card.className = `tilt-card glass-card rounded-2xl overflow-hidden border border-slate-800/80 cursor-pointer ${project.glow}`;
        card.innerHTML = `
            <div class="relative h-48 overflow-hidden">
                <img src="${project.image}" alt="${project.title}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110">
                <span class="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md text-xs font-bold px-3 py-1 rounded-full border border-slate-700 capitalize">
                    ${project.category}
                </span>
            </div>
            <div class="p-6 tilt-card-inner">
                <h3 class="text-xl font-bold mb-2 text-white">${project.title}</h3>
                <p class="text-slate-400 text-sm mb-4">${project.description}</p>
                <a href="${project.link}" class="inline-flex items-center text-purple-400 hover:text-purple-300 font-semibold text-sm transition-colors">
                    Bekijk Project <i class="fa-solid fa-arrow-up-right-from-square ml-2 text-xs"></i>
                </a>
            </div>
        `;
        grid.appendChild(card);
    });
    
    init3DEffect();
}

function filterProjects(category) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (event) {
        event.target.classList.add('active');
    }

    if (category === 'all') {
        renderProjects(projectsData);
    } else {
        const filtered = projectsData.filter(p => p.category === category);
        renderProjects(filtered);
    }
}

// --- SCHOLEN INLADEN ---
async function loadSchools() {
    const select = document.getElementById("reg-school");
    if (!select) return;

    select.innerHTML = `
        <option value="">Geen school selecteren</option>
        <option value="new">+ Voeg nieuwe school toe...</option>
    `;

    if (MOCK_MODE) {
        const db = getMockDB();
        db.schools.forEach(school => {
            const opt = document.createElement("option");
            opt.value = school.id;
            opt.innerText = school.name;
            select.appendChild(opt);
        });
    } else {
        if (!supabase) return;
        const { data: schools } = await supabase.from('schools').select('*');
        if (schools) {
            schools.forEach(school => {
                const opt = document.createElement("option");
                opt.value = school.id;
                opt.innerText = school.name;
                select.appendChild(opt);
            });
        }
    }
}

// --- COOKIE BANNER LOGICA ---
function checkCookieConsent() {
    const consent = getCookie("cookie_consent");
    if (!consent) {
        const banner = document.getElementById("cookie-banner");
        if (banner) {
            setTimeout(() => {
                banner.classList.remove("translate-y-20", "opacity-0");
            }, 1000);
        }
    }
}

function acceptCookies() {
    setCookie("cookie_consent", "accepted", 365);
    hideCookieBanner();
}

function declineCookies() {
    setCookie("cookie_consent", "declined", 365);
    hideCookieBanner();
}

function hideCookieBanner() {
    const banner = document.getElementById("cookie-banner");
    if (banner) banner.classList.add("translate-y-20", "opacity-0");
}

function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Lax";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0;i < ca.length;i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
