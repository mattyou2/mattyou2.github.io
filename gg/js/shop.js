// ===== SHOP.JS — Winkel logica =====

let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let activeCategory = '';
let searchQuery = '';

// ===== INITIALISATIE =====
document.addEventListener('DOMContentLoaded', async () => {
  updateCartUI();
  await loadProducts();
  setupEventListeners();
});

// ===== PRODUCTEN LADEN =====
async function loadProducts() {
  try {
    const { data, error } = await db
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    allProducts = data || [];
    renderCategories();
    renderProducts();

    // Teller op over-sectie
    const counter = document.getElementById('heroProductCount');
    if (counter) counter.textContent = allProducts.length + '+';

  } catch (err) {
    console.error('Fout bij laden producten:', err);
    document.getElementById('productsGrid').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>Kon producten niet laden. Controleer je Supabase configuratie.</p>
      </div>
    `;
  }
}

// ===== CATEGORIEËN RENDEREN =====
function renderCategories() {
  const cats = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  const container = document.getElementById('categoryChips');

  // Verwijder oude chips (behalve "Alles")
  container.innerHTML = `<button class="chip active" data-cat="">Alles</button>`;

  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.cat = cat;
    btn.textContent = cat;
    container.appendChild(btn);
  });

  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeCategory = chip.dataset.cat;
      container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderProducts();
    });
  });
}

// ===== PRODUCTEN RENDEREN =====
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const countEl = document.getElementById('productCount');

  let filtered = allProducts.filter(p => {
    const matchCat = !activeCategory || p.category === activeCategory;
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery) ||
      (p.description || '').toLowerCase().includes(searchQuery);
    return matchCat && matchSearch;
  });

  countEl.textContent = `${filtered.length} product${filtered.length !== 1 ? 'en' : ''}`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>Geen producten gevonden${searchQuery ? ` voor "${searchQuery}"` : ''}.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => productCardHTML(p)).join('');

  // Klikgebeurtenissen op kaarten
  grid.querySelectorAll('.product-card').forEach(card => {
    const id = card.dataset.id;
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.add-to-cart')) return; // knop afhandelen apart
      openProductModal(product);
    });

    const addBtn = card.querySelector('.add-to-cart');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(product);
      });
    }
  });
}

// ===== PRODUCT KAART HTML =====
function productCardHTML(p) {
  const inStock = p.stock === null || p.stock === undefined || p.stock > 0;
  const imgHTML = p.image_url
    ? `<img src="${escapeHTML(p.image_url)}" alt="${escapeHTML(p.name)}" class="product-img" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="product-img-placeholder" style="display:none;">📦</div>`
    : `<div class="product-img-placeholder">📦</div>`;

  return `
    <div class="product-card" data-id="${p.id}">
      ${imgHTML}
      <div class="product-body">
        ${p.category ? `<div class="product-category">${escapeHTML(p.category)}</div>` : ''}
        <div class="product-name">${escapeHTML(p.name)}</div>
        <div class="product-desc">${escapeHTML(p.description || '')}</div>
        <div class="product-footer">
          <div class="product-price">${formatPrice(p.price)}</div>
          ${inStock
            ? `<button class="add-to-cart">+ Voeg toe</button>`
            : `<span class="stock-badge">Uitverkocht</span>`
          }
        </div>
      </div>
    </div>
  `;
}

// ===== PRODUCT MODAL =====
function openProductModal(product) {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('modalContent');
  const inStock = product.stock === null || product.stock === undefined || product.stock > 0;

  content.innerHTML = `
    ${product.image_url ? `<img src="${escapeHTML(product.image_url)}" alt="${escapeHTML(product.name)}" class="modal-img" onerror="this.style.display='none'" />` : ''}
    <div class="modal-body">
      ${product.category ? `<div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#a8893e;margin-bottom:.5rem;">${escapeHTML(product.category)}</div>` : ''}
      <h2>${escapeHTML(product.name)}</h2>
      <div class="price">${formatPrice(product.price)}</div>
      <p>${escapeHTML(product.description || 'Geen beschrijving beschikbaar.')}</p>
      ${product.stock !== null && product.stock !== undefined ? `<p style="font-size:.85rem;color:#4a4a6a;margin-bottom:1rem;">Voorraad: ${product.stock} stuks</p>` : ''}
      <div class="modal-actions">
        ${inStock
          ? `<button class="add-to-cart" onclick="addToCart(${JSON.stringify(product).replace(/'/g,"\\'")}); document.getElementById('productModal').classList.remove('open');" style="background:#1a1a2e;color:#fff;border:none;padding:.7rem 1.5rem;border-radius:7px;font-size:.95rem;font-weight:700;cursor:pointer;font-family:inherit;">🛒 Voeg toe aan winkelwagen</button>`
          : `<span style="color:#e05252;font-weight:600;">Uitverkocht</span>`
        }
        <button onclick="document.getElementById('productModal').classList.remove('open')" style="padding:.7rem 1.2rem;background:none;border:1.5px solid #e2e0db;border-radius:7px;cursor:pointer;font-family:inherit;">Sluiten</button>
      </div>
    </div>
  `;

  modal.classList.add('open');
}

// ===== WINKELWAGEN =====
function addToCart(product) {
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  saveCart();
  updateCartUI();
  showToast(`✓ ${product.name} toegevoegd!`, 'success');
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
  renderCartItems();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(id);
    return;
  }
  saveCart();
  updateCartUI();
  renderCartItems();
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartUI() {
  const total = cart.reduce((sum, i) => sum + i.qty, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = total;
    badge.style.display = total > 0 ? 'flex' : 'none';
  }
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const totalEl = document.getElementById('cartTotal');

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;color:#4a4a6a;">
        <div style="font-size:3rem;margin-bottom:1rem;">🛒</div>
        <p>Je winkelwagen is leeg</p>
      </div>
    `;
    if (footer) footer.style.display = 'none';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      ${item.image_url
        ? `<img src="${escapeHTML(item.image_url)}" class="cart-item-img" onerror="this.src=''" />`
        : `<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:#eee;">📦</div>`
      }
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHTML(item.name)}</div>
        <div class="cart-item-price">${formatPrice(item.price)}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
        </div>
      </div>
      <button class="remove-item" onclick="removeFromCart('${item.id}')" title="Verwijderen">🗑️</button>
    </div>
  `).join('');

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  if (totalEl) totalEl.textContent = formatPrice(cartTotal);
  if (footer) footer.style.display = 'block';
}

// ===== CHECKOUT =====
async function placeOrder() {
  const name    = document.getElementById('checkoutName').value.trim();
  const email   = document.getElementById('checkoutEmail').value.trim();
  const address = document.getElementById('checkoutAddress').value.trim();

  if (!name || !email || !address) {
    showToast('Vul alle velden in.', 'error');
    return;
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  try {
    const { error } = await db.from('orders').insert({
      customer_name: name,
      customer_email: email,
      customer_address: address,
      items: cart,
      total: total,
      status: 'nieuw'
    });

    if (error) throw error;

    cart = [];
    saveCart();
    updateCartUI();
    document.getElementById('checkoutModal').classList.remove('open');
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('open');
    showToast('🎉 Bestelling geplaatst! Bedankt voor je aankoop.', 'success');
    renderCartItems();

  } catch (err) {
    console.error(err);
    showToast('Er ging iets mis. Probeer het opnieuw.', 'error');
  }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Winkelwagen openen/sluiten
  document.getElementById('openCart').addEventListener('click', (e) => {
    e.preventDefault();
    renderCartItems();
    document.getElementById('cartSidebar').classList.add('open');
    document.getElementById('cartOverlay').classList.add('open');
  });

  document.getElementById('closeCart').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);

  // Modal sluiten
  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('productModal').classList.remove('open');
  });
  document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.target.classList.remove('open');
  });

  // Zoeken
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderProducts();
  });

  // Checkout knop
  document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (cart.length === 0) return;
    document.getElementById('checkoutModal').classList.add('open');
  });
  document.getElementById('checkoutModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.target.classList.remove('open');
  });
}

function closeCart() {
  document.getElementById('cartSidebar').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
}

// ===== HULPFUNCTIES =====
function formatPrice(price) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price || 0);
}

function escapeHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

function showToast(message, type = '') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Realtime updates (live producten bijwerken)
db.channel('products-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
    loadProducts();
  })
  .subscribe();
