/* Theme Customizer - Couleurs personnalisées */

const themeCustomizer = {
  storageKey: 'brainexe_custom_theme',

  presets: {
    default: {
      name: 'Défaut (Indigo)',
      accent: '#818cf8',
      accentDark: '#a5b4fc'
    },
    purple: {
      name: 'Violet',
      accent: '#a78bfa',
      accentDark: '#c4a8ff'
    },
    cyan: {
      name: 'Cyan',
      accent: '#06b6d4',
      accentDark: '#22d3ee'
    },
    pink: {
      name: 'Rose',
      accent: '#ec4899',
      accentDark: '#f472b6'
    },
    orange: {
      name: 'Orange',
      accent: '#f97316',
      accentDark: '#fb923c'
    },
    green: {
      name: 'Vert',
      accent: '#10b981',
      accentDark: '#34d399'
    }
  },

  loadCustomTheme() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      const theme = JSON.parse(saved);
      this.applyTheme(theme);
    }
  },

  applyTheme(theme) {
    const root = document.documentElement;
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-hover', theme.accentDark);
    root.style.setProperty('--accent-bg', this.hexToRgb(theme.accent, 0.14));

    localStorage.setItem(this.storageKey, JSON.stringify(theme));
  },

  hexToRgb(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  renderThemeSelector() {
    return `
      <div class="theme-customizer">
        <h3>🎨 Personnaliser le thème</h3>

        <div class="theme-presets">
          ${Object.entries(this.presets).map(([key, preset]) => `
            <button
              class="preset-btn"
              style="border: 3px solid ${preset.accent}"
              onclick="themeCustomizer.applyTheme({accent: '${preset.accent}', accentDark: '${preset.accentDark}'}); toast('Thème changé en ${preset.name}', 'success')"
              title="${preset.name}"
            >
              <div class="preset-color" style="background: ${preset.accent}"></div>
              <div class="preset-name">${preset.name}</div>
            </button>
          `).join('')}
        </div>

        <div class="custom-color-picker">
          <label>Couleur personnalisée:</label>
          <div class="color-input-group">
            <input
              type="color"
              id="accent-color"
              value="#818cf8"
              onchange="
                const hex = this.value;
                const darker = themeCustomizer.darkenColor(hex, 30);
                themeCustomizer.applyTheme({accent: hex, accentDark: darker});
                toast('Couleur appliquée!', 'success');
              "
            />
            <input
              type="text"
              id="accent-hex"
              placeholder="#818cf8"
              value="#818cf8"
              onchange="
                document.getElementById('accent-color').value = this.value;
                this.dispatchEvent(new Event('change'));
              "
            />
          </div>
        </div>

        <div class="theme-preview">
          <h4>Aperçu:</h4>
          <button class="btn btn-primary">Bouton primaire</button>
          <div class="pill" style="margin-top: 10px">
            <span style="background: var(--accent); color: white; padding: 2px 8px; border-radius: 4px">Accents</span>
          </div>
        </div>
      </div>
    `;
  },

  darkenColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;

    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  },

  exportTheme() {
    const theme = localStorage.getItem(this.storageKey);
    if (!theme) {
      toast('Aucun thème personnalisé', 'error');
      return;
    }

    const blob = new Blob([theme], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brainexe-theme.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast('Thème exporté!', 'success');
  },

  importTheme(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const theme = JSON.parse(e.target.result);
        if (!theme.accent) throw new Error('Format invalide');

        this.applyTheme(theme);
        toast('Thème importé avec succès!', 'success');
      } catch (err) {
        toast(`Erreur: ${err.message}`, 'error');
      }
    };

    reader.readAsText(file);
  }
};

// Charger au démarrage
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => themeCustomizer.loadCustomTheme());
} else {
  themeCustomizer.loadCustomTheme();
}
