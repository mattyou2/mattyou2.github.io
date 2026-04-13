pc.script.createLoadingScreen((app) => {
    // We laten alle visuele functies leeg
    const showSplash = () => {
        // Er wordt niets aangemaakt in de HTML
    };

    const setProgress = (value) => {
        // De voortgangsbalk wordt niet bijgewerkt
    };

    const hideSplash = () => {
        // Er hoeft niets verwijderd te worden
    };

    // Voer de lege showSplash uit
    showSplash();

    // Luister naar de events zodat de engine denkt dat alles goed gaat
    app.on('preload:end', () => {
        app.off('preload:progress');
    });
    app.on('preload:progress', setProgress);
    app.on('start', hideSplash);
});