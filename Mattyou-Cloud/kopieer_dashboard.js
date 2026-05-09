/**
 * MATTYOU CLOUD - DASHBOARD & ANALYTICS V3.0
 */

let analyticsChart = null;

function initDashboard() {
    setupServerTime();
    setupCharts();
}

function setupServerTime() {
    const timeEl = document.getElementById('server-time');
    setInterval(() => {
        const now = new Date();
        if (timeEl) timeEl.innerText = now.toLocaleTimeString('nl-NL', { hour12: false });
    }, 1000);
}

function setupCharts() {
    const ctx = document.getElementById('analyticsChart');
    if (!ctx) return;

    analyticsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Maa', 'Din', 'Woe', 'Don', 'Vri', 'Zat', 'Zon'],
            datasets: [{
                label: 'Data Traffic (MB)',
                data: [65, 59, 80, 81, 56, 55, 40],
                fill: true,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
                }
            }
        }
    });
}

function addActivity(text) {
    const log = document.getElementById('activity-log');
    if (!log) return;

    const entry = document.createElement('div');
    entry.className = "flex items-center gap-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50 animate-in fade-in slide-in-from-right duration-500";
    
    entry.innerHTML = `
        <div class="w-2 h-2 rounded-full bg-blue-500"></div>
        <div class="flex-1">
            <p class="text-xs font-bold text-slate-200">${text}</p>
            <p class="text-[10px] text-slate-500 uppercase tracking-tighter">Nu • User Action</p>
        </div>
    `;

    log.prepend(entry);
    
    // Keep only last 5
    if (log.children.length > 5) {
        log.lastElementChild.remove();
    }
}

// Re-expose to window for other scripts
window.addActivity = addActivity;

initDashboard();
