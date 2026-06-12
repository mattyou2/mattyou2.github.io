os.registeredApps['browser'] = {
    title: "Web Browser",
    render(container) {
        container.style.padding = "0";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.height = "100%";

        container.innerHTML = `
            <div style="background:#eee; padding:5px; display:flex; gap:5px;">
                <input type="text" id="browser-url" value="https://wikipedia.org" style="flex-grow:1; padding:3px; font-size:12px;">
                <button onclick="os.registeredApps.browser.navigate()" style="padding:3px 10px; font-size:12px;">Ga</button>
            </div>
            <iframe id="browser-iframe" src="https://wikipedia.org" style="flex-grow:1; border:none; width:100%; height:calc(100% - 35px);"></iframe>
        `;
    },
    navigate() {
        let url = document.getElementById('browser-url').value;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        document.getElementById('browser-iframe').src = url;
    }
};
