os.registeredApps['settings'] = {
    title: "Instellingen",
    render(container) {
        container.innerHTML = `
            <h3>Kies Desktop Achtergrond</h3>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px;">
                <div class="color-btn" style="background:#2b3a42; height:40px; cursor:pointer; border:2px solid white;" onclick="os.registeredApps.settings.changeWallpaper('#2b3a42')"></div>
                <div class="color-btn" style="background:#1a1a2e; height:40px; cursor:pointer; border:2px solid white;" onclick="os.registeredApps.settings.changeWallpaper('#1a1a2e')"></div>
                <div class="color-btn" style="background:#4e343b; height:40px; cursor:pointer; border:2px solid white;" onclick="os.registeredApps.settings.changeWallpaper('#4e343b')"></div>
                <div class="color-btn" style="background:#222831; height:40px; cursor:pointer; border:2px solid white;" onclick="os.registeredApps.settings.changeWallpaper('#222831')"></div>
                <div class="color-btn" style="background:#3f72af; height:40px; cursor:pointer; border:2px solid white;" onclick="os.registeredApps.settings.changeWallpaper('#3f72af')"></div>
                <div class="color-btn" style="background:#111111; height:40px; cursor:pointer; border:2px solid white;" onclick="os.registeredApps.settings.changeWallpaper('#111111')"></div>
            </div>
        `;
    },
    changeWallpaper(color) {
        document.getElementById('desktop-screen').style.backgroundColor = color;
        let data = os.data.get();
        data.settings.wallpaper = color;
        os.data.save(data);
    }
};
