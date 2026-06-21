filename="auth.js" language="javascript"]
// --- AUTHENTICATIE & SESSION BEHEER ---

let currentAuthTab = 'login';

// Open de inlog/registreer modal
function openAuthModal(tab) {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;
    
    modal.classList.remove("hidden");
    setTimeout(() => {
        modal.classList.remove("opacity-0");
        modal.querySelector('.glass-card').classList.remove("scale-95");
    }, 10);
    switchAuthTab(tab);
}

// Sluit de modal
function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;

    modal.classList.add("opacity-0");
    modal.querySelector('.glass-card').classList.add("scale-95");
    setTimeout(() => {
        modal.classList.add("hidden");
    }, 300);
}

// Wissel tussen Inloggen en Registreren tabs
function switchAuthTab(tab) {
    currentAuthTab = tab;
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");

    if (!loginForm || !registerForm) return;

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

// Toon/verberg schoolvelden op basis van rol
function toggleRegFields() {
    const role = document.getElementById("reg-role").value;
    const schoolSelect = document.getElementById("reg-school");
    const newSchoolContainer = document.getElementById("new-school-container");

    if (schoolSelect) {
        schoolSelect.addEventListener('change', (e) => {
            if (e.target.value === 'new') {
                newSchoolContainer.classList.remove("hidden");
            } else {
                newSchoolContainer.classList.add("hidden");
            }
        });
    }
}

// --- LOGIN & REGISTRATIE LOGICA ---

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (MOCK_MODE) {
        const db = getMockDB();
        const user = db.users.find(u => u.email === email && u.password === password);
        
        if (user) {
            const profile = db.profiles.find(p => p.id === user.id);
            db.session = { user, profile };
            saveMockDB(db);
            
            alert("Succesvol ingelogd (Mock Modus)!");
            closeAuthModal();
            window.location.href = "dashboard.html";
        } else {
            alert("Ongeldig e-mailadres of wachtwoord.");
        }
    } else {
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            closeAuthModal();
            window.location.href = "dashboard.html";
        } catch (error) {
            alert("Fout bij inloggen: " + error.message);
        }
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const fullName = document.getElementById("reg-name").value;
    const role = document.getElementById("reg-role").value;
    let schoolId = document.getElementById("reg-school").value;

    if (MOCK_MODE) {
        const db = getMockDB();
        
        // Controleer of gebruiker al bestaat
        if (db.users.some(u => u.email === email)) {
            alert("Dit e-mailadres is al geregistreerd.");
            return;
        }

        // Nieuwe school toevoegen indien geselecteerd
        if (schoolId === 'new') {
            const newSchoolName = document.getElementById("reg-new-school").value;
            schoolId = "s_" + Date.now();
            db.schools.push({ id: schoolId, name: newSchoolName });
        }

        const newUserId = "user_" + Date.now();
        const newUser = { id: newUserId, email, password };
        const newProfile = {
            id: newUserId,
            full_name: fullName,
            role: role,
            school_id: schoolId || null,
            email: email
        };

        db.users.push(newUser);
        db.profiles.push(newProfile);
        db.session = { user: newUser, profile: newProfile };
        saveMockDB(db);

        alert("Registratie succesvol (Mock Modus)! Je wordt nu ingelogd.");
        closeAuthModal();
        window.location.href = "dashboard.html";
    } else {
        try {
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

            const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
            if (authErr) throw authErr;

            if (authData.user) {
                const { error: profileErr } = await supabase
                    .from('profiles')
                    .insert([{
                        id: authData.user.id,
                        full_name: fullName,
                        role: role,
                        school_id: schoolId || null,
                        email: email
                    }]);

                if (profileErr) throw profileErr;

                alert("Registratie succesvol! Controleer je e-mail voor de verificatie link.");
                closeAuthModal();
            }
        } catch (error) {
            alert("Fout bij registratie: " + error.message);
        }
    }
}

async function handleLogout() {
    if (MOCK_MODE) {
        const db = getMockDB();
        db.session = null;
        saveMockDB(db);
        window.location.href = "index.html";
    } else {
        await supabase.auth.signOut();
        window.location.href = "index.html";
    }
}

// Check de inlogstatus bij het laden van de pagina
async function checkAuthState(callback) {
    if (MOCK_MODE) {
        const db = getMockDB();
        if (db.session) {
            callback(db.session.user, db.session.profile);
        } else {
            callback(null, null);
        }
    } else {
        if (!supabase) return callback(null, null);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*, schools(name)')
                .eq('id', user.id)
                .single();
            callback(user, profile);
        } else {
            callback(null, null);
        }
    }
}
