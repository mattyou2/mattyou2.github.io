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
    checkAuthState();
    loadSchools();
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
            
            // Bereken de rotatiehoek op basis van muispositie
            const angleX = (yc - y) / 12;
            const angleY = (x - xc) / 12;
            
            card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale3d(1.03, 1.03, 1.03)`;
            
            // Geef de innerlijke elementen extra diepte (parallax)
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
    
    // Herinitialiseer het 3D effect voor de nieuwe kaarten
    init3DEffect();
}

function filterProjects(category) {
    // Update actieve knop styling
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (category === 'all') {
        renderProjects(projectsData);
    } else {
        const filtered = projectsData.filter(p => p.category === category);
        renderProjects(filtered);
    }
}

// --- COOKIE BANNER LOGICA ---
function checkCookieConsent() {
    const consent = getCookie("cookie_consent");
    if (!consent) {
        const banner = document.getElementById("cookie-banner");
        setTimeout(() => {
            banner.classList.remove("translate-y-20", "opacity-0");
        }, 1000);
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
    banner.classList.add("translate-y-20", "opacity-0");
}

// Helper functies voor cookies
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

// --- AUTHENTICATIE & SUPABASE LOGICA ---
let currentAuthTab = 'login';

function openAuthModal(tab) {
    const modal = document.getElementById("auth-modal");
    modal.classList.remove("hidden");
    setTimeout(() => {
        modal.classList.remove("opacity-0");
        modal.querySelector('.glass-card').classList.remove("scale-95");
    }, 10);
    switchAuthTab(tab);
}

function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    modal.classList.add("opacity-0");
    modal.querySelector('.glass-card').classList.add("scale-95");
    setTimeout(() => {
        modal.classList.add("hidden");
    }, 300);
}

function switchAuthTab(tab) {
    currentAuthTab = tab;
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");

    if (tab === 'login') {
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
        tabLogin.className = "px-4 py-2 bg-purple-600 text-white rounded-md font-semibold text-sm transition-all";
        tabRegister.className = "px-4 py-2 text-slate-400 hover:text-white rounded-md font-semibold text-sm transition-all";
    } else {
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
        tabRegister.className = "px-4 py-2 bg-purple-600 text-white rounded-md font-semibold text-sm transition-all";
        tabLogin.className = "px-4 py-2 text-slate-400 hover:text-white rounded-md font-semibold text-sm transition-all";
    }
}

function toggleRegFields() {
    const role = document.getElementById("reg-role").value;
    const schoolContainer = document.getElementById("school-select-container");
    
    // Scholen zijn relevant voor zowel leerlingen als docenten
    schoolContainer.classList.remove("hidden");
    
    const schoolSelect = document.getElementById("reg-school");
    schoolSelect.addEventListener('change', (e) => {
        const newSchoolContainer = document.getElementById("new-school-container");
        if (e.target.value === 'new') {
            newSchoolContainer.classList.remove("hidden");
        } else {
            newSchoolContainer.classList.add("hidden");
        }
    });
}

// --- SUPABASE ACTIONS ---

async function checkAuthState() {
    if (!supabase) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Haal profiel op
        const { data: profile } = await supabase
            .from('profiles')
            .select('*, schools(name)')
            .eq('id', user.id)
            .single();

        updateUIForLoggedInUser(user, profile);
    } else {
        updateUIForLoggedOutUser();
    }
}

function updateUIForLoggedInUser(user, profile) {
    document.getElementById("auth-nav-buttons").innerHTML = `
        <span class="text-sm text-slate-300">Hallo, <strong class="text-purple-400">${profile?.full_name || user.email}</strong></span>
        <button onclick="handleLogout()" class="px-4 py-2 rounded-full border border-red-500/30 hover:bg-red-500/10 text-red-400 transition-all">Uitloggen</button>
    `;
    
    document.getElementById("dashboard-section").classList.remove("hidden");
    document.getElementById("user-display-name").innerText = profile?.full_name || user.email;
    document.getElementById("user-display-role").innerText = profile?.role || 'Gebruiker';
    document.getElementById("user-display-school").innerText = profile?.schools?.name || 'Geen school';

    if (profile?.role === 'teacher') {
        document.getElementById("teacher-action-btn").classList.remove("hidden");
        loadTeacherClasses(user.id);
    } else {
        document.getElementById("teacher-action-btn").classList.add("hidden");
    }
}

function updateUIForLoggedOutUser() {
    document.getElementById("auth-nav-buttons").innerHTML = `
        <button onclick="openAuthModal('login')" class="px-4 py-2 rounded-full border border-purple-500/30 hover:bg-purple-500/10 transition-all">Inloggen</button>
        <button onclick="openAuthModal('register')" class="px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/20 transition-all">Registreren</button>
    `;
    document.getElementById("dashboard-section").classList.add("hidden");
}

async function handleRegister(e) {
    e.preventDefault();
    if (!supabase) return alert("Supabase is niet correct geconfigureerd.");

    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const fullName = document.getElementById("reg-name").value;
    const role = document.getElementById("reg-role").value;
    let schoolId = document.getElementById("reg-school").value;

    try {
        // Als er een nieuwe school is toegevoegd
        if (schoolId === 'new') {
            const newSchoolName = document.getElementById("reg-new-school").value;
            const { data: newSchool, error: schoolErr } = await supabase
                .from('schools')
                .insert([{ name: newSchoolName }])
                .select()
                .single();
            
            if (schoolErr) throw schoolErr;
            schoolId = newSchool.id;
        }

        // Registreer gebruiker in Supabase Auth
        const { data: authData, error: authErr } = await supabase.auth.signUp({
            email,
            password
        });

        if (authErr) throw authErr;

        if (authData.user) {
            // Maak profiel aan in de database
            const { error: profileErr } = await supabase
                .from('profiles')
                .insert([{
                    id: authData.user.id,
                    full_name: fullName,
                    role: role,
                    school_id: schoolId || null
                }]);

            if (profileErr) throw profileErr;

            alert("Registratie succesvol! Controleer je e-mail voor de verificatie link.");
            closeAuthModal();
            checkAuthState();
        }
    } catch (error) {
        alert("Fout bij registratie: " + error.message);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    if (!supabase) return alert("Supabase is niet geconfigureerd.");

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        closeAuthModal();
        checkAuthState();
    } catch (error) {
        alert("Fout bij inloggen: " + error.message);
    }
}

async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    updateUIForLoggedOutUser();
}

// --- SCHOLEN & KLASSEN BEHEER ---

async function loadSchools() {
    if (!supabase) return;
    const { data: schools } = await supabase.from('schools').select('*');
    const select = document.getElementById("reg-school");
    
    // Reset select behalve de eerste twee opties
    select.innerHTML = `
        <option value="">Geen school selecteren</option>
        <option value="new">+ Voeg nieuwe school toe...</option>
    `;

    if (schools) {
        schools.forEach(school => {
            const opt = document.createElement("option");
            opt.value = school.id;
            opt.innerText = school.name;
            select.appendChild(opt);
        });
    }
}

function openClassModal() {
    const modal = document.getElementById("class-modal");
    modal.classList.remove("hidden");
    setTimeout(() => {
        modal.classList.remove("opacity-0");
    }, 10);
}

function closeClassModal() {
    const modal = document.getElementById("class-modal");
    modal.classList.add("opacity-0");
    setTimeout(() => {
        modal.classList.add("hidden");
    }, 300);
}

async function handleCreateClass(e) {
    e.preventDefault();
    const name = document.getElementById("class-name-input").value;
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('classes')
        .insert([{ name, teacher_id: user.id }]);

    if (error) {
        alert("Fout bij klas aanmaken: " + error.message);
    } else {
        alert("Klas succesvol aangemaakt!");
        document.getElementById("class-name-input").value = "";
        loadTeacherClasses(user.id);
    }
}

async function loadTeacherClasses(teacherId) {
    const { data: classes } = await supabase
        .from('classes')
        .select('*, profiles(id, full_name, email)')
        .eq('teacher_id', teacherId);

    const list = document.getElementById("classes-list");
    const select = document.getElementById("student-class-select");
    
    list.innerHTML = "";
    select.innerHTML = '<option value="">Selecteer een klas...</option>';

    if (classes && classes.length > 0) {
        classes.forEach(c => {
            // Vul select opties
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.innerText = c.name;
            select.appendChild(opt);

            // Vul overzicht
            const div = document.createElement("div");
            div.className = "p-3 bg-slate-950/50 border border-slate-800 rounded-lg flex justify-between items-center";
            div.innerHTML = `
                <div>
                    <span class="font-semibold text-white">${c.name}</span>
                </div>
                <span class="text-xs bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-full">Actief</span>
            `;
            list.appendChild(div);
        });
    } else {
        list.innerHTML = '<p class="text-slate-500 text-sm italic">Nog geen klassen aangemaakt.</p>';
    }
}

async function handleAddStudent(e) {
    e.preventDefault();
    const classId = document.getElementById("student-class-select").value;
    const email = document.getElementById("student-email-input").value;

    // Zoek de leerling op via email in de profiles tabel
    const { data: studentProfile, error: searchErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (searchErr || !studentProfile) {
        alert("Leerling niet gevonden. Zorg dat de leerling eerst een account heeft aangemaakt.");
        return;
    }

    // Koppel de leerling aan de klas
    const { error: updateErr } = await supabase
        .from('profiles')
        .update({ class_id: classId })
        .eq('id', studentProfile.id);

    if (updateErr) {
        alert("Fout bij toevoegen van leerling: " + updateErr.message);
    } else {
        alert("Leerling succesvol toegevoegd aan de klas!");
        document.getElementById("student-email-input").value = "";
    }
}
