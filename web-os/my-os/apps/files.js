os.registeredApps['files'] = {
    title: "Bestandsbeheer",
    render(container) {
        this.container = container;
        this.showFiles();
    },
    showFiles() {
        let data = os.data.get();
        let filesHTML = Object.keys(data.files).map(filename => `
            <div style="padding:8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="os.registeredApps.files.openFile('${filename}')">
                <span>📄 ${filename}</span>
                <button style="color:red; background:none; border:none; cursor:pointer;" onclick="event.stopPropagation(); os.registeredApps.files.deleteFile('${filename}')">Verwijder</button>
            </div>
        `).join('');

        this.container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:10px; height:100%;">
                <div style="display:flex; gap:5px;">
                    <input type="text" id="file-name" placeholder="bestandsnaam.txt" style="width:40%;">
                    <input type="text" id="file-content" placeholder="Inhoud van het bestand..." style="flex-grow:1;">
                    <button onclick="os.registeredApps.files.createFile()">Maak</button>
                </div>
                <div style="flex-grow:1; overflow-y:auto; border:1px solid #ccc; background:#fafafa;">
                    ${filesHTML || '<p style="padding:10px; color:#aaa;">Geen bestanden gevonden.</p>'}
                </div>
            </div>
        `;
    },
    createFile() {
        const name = document.getElementById('file-name').value.trim();
        const content = document.getElementById('file-content').value;
        if (!name) return;

        let data = os.data.get();
        data.files[name] = content;
        os.data.save(data);
        this.showFiles();
    },
    openFile(filename) {
        let data = os.data.get();
        alert(`Inhoud van ${filename}:\n\n${data.files[filename]}`);
    },
    deleteFile(filename) {
        let data = os.data.get();
        delete data.files[filename];
        os.data.save(data);
        this.showFiles();
    }
};
