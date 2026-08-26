/* ============================================
   LUCKY DIAGNOSTICS — CART SYSTEM (localStorage)
   ============================================ */
const Cart = {
  KEY: 'ld_cart',

  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch (e) { return []; }
  },

  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBadge();
  },

  add(item) {
    const items = this.get();
    if (!items.find(i => i.id === item.id)) {
      items.push(item);
      this.save(items);
      return true;
    }
    return false;
  },

  remove(id) {
    this.save(this.get().filter(i => i.id !== id));
  },

  clear() { this.save([]); },

  count() { return this.get().length; },

  total() {
    return this.get().reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
  },

  updateBadge() {
    document.querySelectorAll('#cartBadge, .cart-badge').forEach(el => {
      el.textContent = this.count();
    });
  }
};
window.Cart = Cart;

// Update badge when page loads
document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());

/* Global "Add to Cart" click handler.
   Works on ANY button with [data-add-cart], including dynamically rendered cards. */
document.addEventListener('click', function (e) {
  const btn = e.target.closest('[data-add-cart]');
  if (!btn) return;

  // Prevent the parent card's onclick (navigation) from firing
  e.preventDefault();
  e.stopPropagation();

  const item = {
    id: btn.getAttribute('data-id'),
    type: btn.getAttribute('data-type') || 'test',
    name: btn.getAttribute('data-name') || 'Item',
    price: parseFloat(btn.getAttribute('data-price')) || 0,
    slug: btn.getAttribute('data-slug') || '',
    includes: btn.getAttribute('data-includes') || ''   // ← Package test names
  };

  if (Cart.add(item)) {
    if (typeof showToast === 'function') showToast('Added to cart: ' + item.name, 'success');
    const orig = btn.innerHTML;
    btn.classList.add('pulse');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.disabled = false;
      btn.classList.remove('pulse');
    }, 1500);
  } else {
    if (typeof showToast === 'function') showToast('Already in cart', 'error');
  }
}, true); // capture phase so it runs before card onclick