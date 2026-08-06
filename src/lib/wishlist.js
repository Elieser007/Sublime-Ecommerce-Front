const WISHLIST_KEY = 'wishlist';

export function getWishlist() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWishlist(list) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('storage'));
}

export function addToWishlist(product) {
  const list = getWishlist();
  if (!list.some((item) => item.id === product.id)) {
    list.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
    });
  }
  saveWishlist(list);
  return list;
}

export function removeFromWishlist(id) {
  const list = getWishlist().filter((item) => item.id !== id);
  saveWishlist(list);
  return list;
}

export function isInWishlist(id) {
  return getWishlist().some((item) => item.id === id);
}

export function getWishlistCount() {
  return getWishlist().length;
}

export function updateWishlistBadge() {
  const count = getWishlistCount();
  const badge = document.getElementById('wishlist-count');
  if (badge) {
    badge.textContent = count > 99 ? '99+' : count.toString();
    badge.style.display = count > 0 ? '' : 'none';
  }
}
