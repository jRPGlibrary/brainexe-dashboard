/* Système de favoris/bookmarks */

const favorites = {
  storage: 'brainexe_favorites',

  load() {
    const saved = localStorage.getItem(this.storage);
    return saved ? JSON.parse(saved) : [];
  },

  save(items) {
    localStorage.setItem(this.storage, JSON.stringify(items));
  },

  toggle(type, id) {
    const items = this.load();
    const exists = items.find(i => i.type === type && i.id === id);

    if (exists) {
      const idx = items.indexOf(exists);
      items.splice(idx, 1);
    } else {
      items.push({ type, id, addedAt: Date.now() });
    }

    this.save(items);
    return !exists;
  },

  isFavorite(type, id) {
    return this.load().some(i => i.type === type && i.id === id);
  },

  getByType(type) {
    return this.load().filter(i => i.type === type);
  },

  toggleUI(element, type, id) {
    const isFav = this.toggle(type, id);
    if (element) {
      element.style.color = isFav ? 'var(--accent)' : '';
      element.innerHTML = isFav ? '⭐' : '☆';
    }
  }
};
