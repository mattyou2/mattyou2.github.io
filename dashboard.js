filename="dashboard.js" language="javascript"]
// --- DASHBOARD SPECIFIEKE LOGICA ---

document.addEventListener("DOMContentLoaded", () => {
    // Beveiliging: Check of de gebruiker wel ingelogd is
    checkAuthState((user, profile) => {
        if (!user || !profile) {
            alert("Toegang geweigerd. Log eerst in.");
            window.location.href = "index.html";
            return;
        }

        // Vul gebruikersgegevens in de UI
        document.getElementById("nav-user-name").innerText = profile.full_name;
        document.getElementById("user-display-name").innerText = profile.full_name;
        document.getElementById("user-display-role").innerText = profile.role === 'teacher' ? 'Docent' : 'Leerling';
        
        // Haal schoolnaam op
        resolveSchoolName(profile.school_id);

        // Toon docentenpaneel indien van toepassing
        if (profile.role === 'teacher') {
            document.getElementById("teacher-section").classList.remove("hidden");
            loadTeacherClasses(user.id);
        }
    });
});

// Vertaal school_id naar een leesbare naam
async function resolveSchoolName(schoolId) {
    const display = document.getElementById("user-display-school");
    if (!schoolId) {
        display.innerText = "Geen school gekoppeld";
        return;
    }

    if (MOCK_MODE) {
        const db = getMockDB();
        const school = db.schools.find(s => s.id === schoolId);
        display.innerText = school ? school.name : "Onbekende school";
    } else {
        const { data, error } = await supabase
            .from('schools')
            .select('name')
            .eq('id', schoolId)
            .single();
        
        if (data && !error) {
            display.innerText = data.name;
        } else {
            display.innerText = "Onbekende school";
        }
    }
}

// --- DOCENTEN FUNCTIES ---

async function loadTeacherClasses(teacherId) {
    const list = document.getElementById("classes-list");
    const select = document.getElementById("student-class-select");
    if (!list || !select) return;

    list.innerHTML = "";
    select.innerHTML = '<option value="">Selecteer een klas...</option>';

    let classes = [];

    if (MOCK_MODE) {
        const db = getMockDB();
        classes = db.classes.filter(c => c.teacher_id === teacherId);
    } else {
        const { data } = await supabase
            .from('classes')
            .select('*')
            .eq('teacher_id', teacherId);
        classes = data || [];
    }

    if (classes.length > 0) {
        classes.forEach(c => {
            // Voeg toe aan selectie-dropdown
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.innerText = c.name;
            select.appendChild(opt);

            // Voeg toe aan de lijst
            const div = document.createElement("div");
            div.className = "p-3 bg-slate-950/50 border border-slate-800 rounded-xl flex justify-between items-center hover:border-purple-500/30 transition-all";
            div.innerHTML = `
                <div>
                    <span class="font-semibold text-white text-sm">${c.name}</span>
                </div>
                <span class="text-xs bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-full font-bold">Actief</span>
            `;
            list.appendChild(div);
        });
    } else {
        list.innerHTML = '<p class="text-slate-500 text-sm italic">Nog geen klassen aangemaakt.</p>';
    }
}

async function handleCreateClass(e) {
    e.preventDefault();
    const name = document.getElementById("class-name-input").value;
    
    checkAuthState(async (user) => {
        if (MOCK_MODE) {
            const db = getMockDB();
            const newClass = {
                id: "class_" + Date.now(),
                name,
                teacher_id: user.id
            };
            db.classes.push(newClass);
            saveMockDB(db);

            alert("Klas succesvol aangemaakt (Mock Modus)!");
            document.getElementById("class-name-input").value = "";
            loadTeacherClasses(user.id);
        } else {
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
    });
}

async function handleAddStudent(e) {
    e.preventDefault();
    const classId = document.getElementById("student-class-select").value;
    const email = document.getElementById("student-email-input").value;

    if (MOCK_MODE) {
        const db = getMockDB();
        const studentProfile = db.profiles.find(p => p.email === email);

        if (!studentProfile) {
            alert("Leerling niet gevonden. Zorg dat de leerling eerst een account heeft aangemaakt met dit e-mailadres.");
            return;
        }

        studentProfile.class_id = classId;
        saveMockDB(db);
        alert(`Leerling ${studentProfile.full_name} succesvol toegevoegd aan de klas!`);
        document.getElementById("student-email-input").value = "";
    } else {
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
}
