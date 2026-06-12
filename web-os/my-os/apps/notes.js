os.registeredApps['notes'] = {
    title: "Notitieblok",
    render(container) {
        this.container = container;
        this.updateView();
    },
    updateView() {
        let data = os.data.get();
        let notesHTML = data.notes.map((note, index) => `
            <div style="background:#fff9c4; padding:8px; margin-bottom:8px; border-left:4px solid #fbc02d; display:flex; justify-content:between; align-items:center;">
                <span style="flex-grow:1;">${note}</span>
                <button style="border:none; background:none; cursor:pointer; color:red;" onclick="os.registeredApps.notes.deleteNote(${index})">✕</button>
            </div>
        `).join('');

        this.container.innerHTML = `
            <div style="display:flex; gap:5px; margin-bottom:10px;">
                <input type="text" id="note-input" placeholder="Nieuwe notitie..." style="flex-grow:1; padding:5px;">
                <button onclick="os.registeredApps.notes.addNote()" style="padding:5px 10px;">Voeg toe</button>
            </div>
            <div style="max-height:180px; overflow-y:auto;">${notesHTML || 'Geen notities.'}</div>
        `;
    },
    addNote() {
        const input = document.getElementById('note-input');
        if (!input.value.trim()) return;
        
        let data = os.data.get();
        data.notes.push(input.value.trim());
        os.data.save(data);
        this.updateView();
    },
    deleteNote(index) {
        let data = os.data.get();
        data.notes.splice(index, 1);
        os.data.save(data);
        this.updateView();
    }
};
