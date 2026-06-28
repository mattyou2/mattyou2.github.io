// ===== ADMIN.JS — Gedeelde admin hulpfuncties =====

// ===== AUTHENTICATIE BEWAKER =====
async function requireAuth() {
  const { data } = await db.auth.getSession();
  if (!data.session) {
    window.location.href = 'login.html';
    return null;
  }

  // Toon e-mail in topbar als aanwezig
  const emailEl = document.getElementById('userEmail');
  if (emailEl) emailEl.textContent = data.session.user.email;

  return data.session;
}

// ===== UITLOGGEN =====
async function logout() {
  await db.auth.signOut();
  window.location.href = 'login.html';
}

// ===== TOAST NOTIFICATIES =====
function showToast(message, type = '') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ===== HTML ESCAPE =====
function escapeHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

// ===== PRIJS FORMATTEREN =====
function formatPrice(price) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR'
  }).format(price || 0);
}
