document.addEventListener('DOMContentLoaded', () => {
  // Product gallery thumbnail swap
  const thumbs = document.querySelectorAll('.pd-thumbs img');
  const mainImg = document.querySelector('.pd-gallery-main img');
  if (thumbs.length && mainImg) {
    thumbs.forEach(t => {
      t.addEventListener('click', () => {
        thumbs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        mainImg.src = t.src;
      });
    });
  }

  // Tabs
  const tabBtns = document.querySelectorAll('.tabs-nav button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  tabBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      if (tabPanels[i]) tabPanels[i].style.display = 'block';
    });
  });

  // Filter chips
  const chips = document.querySelectorAll('.chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // Newsletter / CTA form
  document.querySelectorAll('.cta-form').forEach(f => {
    f.addEventListener('submit', e => {
      e.preventDefault();
      const btn = f.querySelector('button');
      if (btn) { const orig = btn.textContent; btn.textContent = 'Subscribed ✓'; setTimeout(() => btn.textContent = orig, 2200); }
    });
  });

  // Dark mode toggle (decorative, toggles a class)
  const darkBtn = document.querySelector('[data-dark-toggle]');
  if (darkBtn) {
    darkBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-preview');
    });
  }

  // Topics flyout panel
  const topicsToggle = document.querySelector('[data-topics-toggle]');
  const topicsPanel = document.querySelector('.topics-panel');
  if (topicsToggle && topicsPanel) {
    topicsToggle.addEventListener('click', (e) => {
      e.preventDefault();
      topicsPanel.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!topicsPanel.contains(e.target) && !topicsToggle.contains(e.target)) {
        topicsPanel.classList.remove('open');
      }
    });
  }

  // Topics accordion sub-items
  document.querySelectorAll('.topic-group-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.topic-group');
      const wasOpen = group.classList.contains('open');
      document.querySelectorAll('.topic-group').forEach(g => g.classList.remove('open'));
      if (!wasOpen) group.classList.add('open');
    });
  });

  // Bookmark toggle (article cards + product thumbnails)
  document.querySelectorAll('.bookmark-btn, .bookmark-btn-thumb').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.toggle('active');
    });
  });

  // Like toggle (article card footer)
  document.querySelectorAll('.icon-action[aria-label="Like"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.toggle('active');
    });
  });

  // Mobile drawer (hamburger nav)
  const mobileMenuBtn = document.querySelector('#mobileMenuBtn');
  const mobileDrawer = document.querySelector('#mobileDrawer');
  if (mobileMenuBtn && mobileDrawer) {
    mobileMenuBtn.addEventListener('click', () => mobileDrawer.classList.add('open'));
    mobileDrawer.querySelectorAll('[data-drawer-close]').forEach(el => {
      el.addEventListener('click', () => mobileDrawer.classList.remove('open'));
    });
  }
  document.querySelectorAll('.drawer-group-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.drawer-group');
      group.classList.toggle('open');
    });
  });

  // Share button stub (prevents navigation when nested in a card link)
  document.querySelectorAll('.icon-action[aria-label="Share"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  // Search overlay
  const searchToggle = document.querySelector('[data-search-toggle]');
  const searchOverlay = document.querySelector('#searchOverlay');
  if (searchToggle && searchOverlay) {
    searchToggle.addEventListener('click', () => {
      searchOverlay.classList.add('open');
      const input = searchOverlay.querySelector('input');
      if (input) setTimeout(() => input.focus(), 50);
    });
    searchOverlay.querySelectorAll('[data-search-close]').forEach(el => {
      el.addEventListener('click', () => searchOverlay.classList.remove('open'));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') searchOverlay.classList.remove('open');
    });
  }
  document.querySelectorAll('.search-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.searchTab;
      document.querySelectorAll('.search-result-item').forEach(item => {
        const type = item.dataset.type;
        item.style.display = (filter === 'all' || filter === type) ? 'flex' : 'none';
      });
    });
  });

  // Notification dropdown
  const notifToggle = document.querySelector('[data-notif-toggle]');
  const notifDropdown = document.querySelector('#notifDropdown');
  if (notifToggle && notifDropdown) {
    notifToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!notifDropdown.contains(e.target) && !notifToggle.contains(e.target)) {
        notifDropdown.classList.remove('open');
      }
    });
  }
  document.querySelectorAll('.notif-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.notifTab;
      document.querySelectorAll('.notif-panel').forEach(p => {
        p.style.display = (p.dataset.notifPanel === target) ? 'block' : 'none';
      });
    });
  });

  // Settings: theme option select
  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });

  // Settings: color swatch select
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
    });
  });
});
