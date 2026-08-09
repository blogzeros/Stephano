document.addEventListener('DOMContentLoaded', () => {
  // Sidebar "Home" link (rail icon + mobile drawer item) only makes sense
  // when you're not already on the home page — hide both on index.html.
  const onHomePage = /(^|\/)index\.html$/.test(window.location.pathname) || /\/$/.test(window.location.pathname);
  if (onHomePage) {
    document.getElementById('railHomeBtn')?.remove();
    document.getElementById('drawerHomeItem')?.remove();
  }

  // Syntax highlighting: only loads highlight.js (and only the specific
  // language packs actually used on the page) when a code block with a
  // language-xxx class is present — pages with no code blocks load nothing.
  initSyntaxHighlighting();

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

  // Code block copy button: copy text, show a checkmark for 2s, then revert
  document.querySelectorAll('.code-copy-btn').forEach(btn => {
    const originalIcon = btn.innerHTML;
    const checkIcon = '<svg class="icon-check" width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    let revertTimer = null;
    btn.addEventListener('click', () => {
      const code = btn.closest('.code-block')?.querySelector('pre');
      if (!code) return;
      navigator.clipboard.writeText(code.textContent);
      clearTimeout(revertTimer);
      btn.innerHTML = checkIcon;
      btn.classList.add('copied');
      btn.setAttribute('data-tooltip', 'Copied');
      revertTimer = setTimeout(() => {
        btn.innerHTML = originalIcon;
        btn.classList.remove('copied');
        btn.setAttribute('data-tooltip', 'Copy');
      }, 2000);
    });
  });

  // Filter chips (scoped per chip-row so the main bar and the "More" dialog don't fight each other)
  document.querySelectorAll('.chip-row').forEach(row => {
    const rowChips = row.querySelectorAll('.chip:not(.chip-more)');
    rowChips.forEach(chip => {
      chip.addEventListener('click', () => {
        rowChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;
        if (filter) {
          document.querySelectorAll('.bookmark-row').forEach(r => {
            r.style.display = (filter === 'all' || r.dataset.type === filter) ? 'flex' : 'none';
          });
        }
      });
    });
  });

  // Tags page: search box + two dropdown-panel filters (Groups, Tags) —
  // the exact chip-more / label-dropdown-panel component used for the
  // Articles page "More" menu — combine to filter the post grid. A
  // sidebar deep link like tags.html#langgraph pre-selects that tag.
  const tagPostGrid = document.getElementById('tagPostGrid');
  if (tagPostGrid) {
    const tagCards = tagPostGrid.querySelectorAll('.article-card[data-tags]');
    const tagEmptyMsg = document.getElementById('tagEmptyMsg');
    const tagSearchInput = document.getElementById('tagSearchInput');

    let activeGroup = 'all';
    let activeTag = 'all';

    const applyFilters = () => {
      const query = (tagSearchInput?.value || '').trim().toLowerCase();
      let visible = 0;
      tagCards.forEach(card => {
        const tags = (card.dataset.tags || '').split(/\s+/);
        const group = card.dataset.group || '';
        const matchesGroup = activeGroup === 'all' || group === activeGroup;
        const matchesTag = activeTag === 'all' || tags.includes(activeTag);
        const haystack = [
          card.querySelector('h3')?.textContent || '',
          card.querySelector('.excerpt')?.textContent || '',
          card.querySelector('.card-tags-row')?.textContent || '',
        ].join(' ').toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const show = matchesGroup && matchesTag && matchesQuery;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      if (tagEmptyMsg) tagEmptyMsg.style.display = visible ? 'none' : 'block';
    };

    // Wires one filter-field dropdown (label + value pill button, clear
    // button, and option panel) as a filter: opens on click or
    // Enter/Space, closes on outside-click/Escape, and picking an item
    // updates the displayed value ("All Groups" / "All Tags" when
    // nothing is picked) plus the field's active/has-value styling.
    // Returns a setter so the two filters can stay in sync.
    const wireDropdownFilter = ({ wrapId, btnId, panelId, clearId, labelDefault, onSelect }) => {
      const wrap = document.getElementById(wrapId);
      const btn = document.getElementById(btnId);
      const panel = document.getElementById(panelId);
      const clearBtn = document.getElementById(clearId);
      if (!wrap || !btn || !panel) return null;
      const valueEl = btn.querySelector('.filter-field-value');
      const items = panel.querySelectorAll('.label-dropdown-item');

      const closePanel = () => {
        panel.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      };
      const togglePanel = () => {
        const isOpen = panel.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(isOpen));
      };
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
      });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          togglePanel();
        }
      });
      document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) closePanel();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanel();
      });

      const select = (filter, label) => {
        items.forEach(i => i.classList.toggle('active', i.dataset.filter === filter));
        if (valueEl) valueEl.textContent = filter === 'all' ? labelDefault : label;
        wrap.classList.toggle('has-value', filter !== 'all');
        closePanel();
      };

      items.forEach(item => {
        item.addEventListener('click', () => {
          select(item.dataset.filter, item.textContent.trim());
          onSelect(item);
        });
      });

      if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const allItem = panel.querySelector('.label-dropdown-item[data-filter="all"]');
          if (allItem) allItem.click();
        });
      }

      return select;
    };

    let setGroupFilter, setTagFilter;

    setTagFilter = wireDropdownFilter({
      wrapId: 'tagFilterWrap', btnId: 'tagFilterBtn', panelId: 'tagFilterPanel', clearId: 'tagFilterClear', labelDefault: 'All Tags',
      onSelect: (item) => {
        activeTag = item.dataset.filter;
        activeGroup = activeTag === 'all' ? 'all' : (item.dataset.group || 'all');
        if (setGroupFilter) {
          const groupItem = document.querySelector(`#groupFilterPanel .label-dropdown-item[data-filter="${activeGroup}"]`);
          setGroupFilter(activeGroup, groupItem ? groupItem.textContent.trim() : 'All Groups');
        }
        applyFilters();
      }
    });

    setGroupFilter = wireDropdownFilter({
      wrapId: 'groupFilterWrap', btnId: 'groupFilterBtn', panelId: 'groupFilterPanel', clearId: 'groupFilterClear', labelDefault: 'All Groups',
      onSelect: (item) => {
        activeGroup = item.dataset.filter;
        activeTag = 'all';
        if (setTagFilter) setTagFilter('all', 'All Tags');
        applyFilters();
      }
    });

    if (tagSearchInput) {
      tagSearchInput.addEventListener('input', applyFilters);
    }

    const initialTag = window.location.hash.replace('#', '');
    const initialItem = initialTag && document.querySelector(`#tagFilterPanel .label-dropdown-item[data-filter="${initialTag}"]`);
    if (initialItem) {
      initialItem.click();
    } else {
      applyFilters();
    }
  }

  // "More" topics dropdown (Articles/Blog page) — More button stays fixed;
  // picking a hidden label swaps it into one of the 3 visible category slots.
  const chipMoreWrap = document.getElementById('chipMoreBtn')?.closest('.chip-more-wrap');
  if (chipMoreWrap) {
    const moreBtn = chipMoreWrap.querySelector('.chip-more');
    const panel = chipMoreWrap.querySelector('.label-dropdown-panel');
    const slots = ['chipSlot2', 'chipSlot3', 'chipSlot4']
      .map(id => document.getElementById(id))
      .filter(Boolean);

    const closePanel = () => {
      panel.classList.remove('open');
      moreBtn.setAttribute('aria-expanded', 'false');
    };

    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = panel.classList.toggle('open');
      moreBtn.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!chipMoreWrap.contains(e.target)) closePanel();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePanel();
    });

    panel.querySelectorAll('.label-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const newLabel = item.textContent.trim();
        // Replace whichever visible slot is currently active; default to the last slot.
        const target = slots.find(s => s.classList.contains('active')) || slots[slots.length - 1];
        const oldLabel = target.textContent.trim();

        target.textContent = newLabel;
        item.textContent = oldLabel; // swap the displaced label back into the dropdown

        slots.forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.chip-row > .chip:not(.chip-more)').forEach(c => {
          if (c !== target) c.classList.remove('active');
        });
        target.classList.add('active');

        closePanel();
      });
    });
  }

  // Newsletter / CTA form
  document.querySelectorAll('.cta-form').forEach(f => {
    f.addEventListener('submit', e => {
      e.preventDefault();
      const btn = f.querySelector('button');
      if (btn) { const orig = btn.textContent; btn.textContent = 'Subscribed ✓'; setTimeout(() => btn.textContent = orig, 2200); }
    });
  });

  // ---- Theme system: mode (light/dark/system) + accent color ----
  var THEME_COLORS = {
    purple: { primary: '#bd32af', dark: '#9b2a90', tint: 'rgba(189,50,175,0.10)' },
    blue:   { primary: '#00c0eb', dark: '#0092b3', tint: 'rgba(0,192,235,0.10)' },
    green:  { primary: '#67bb3a', dark: '#4f9a2c', tint: 'rgba(103,187,58,0.10)' },
    orange: { primary: '#f8a32a', dark: '#d1840f', tint: 'rgba(248,163,42,0.12)' }
  };

  function getStoredMode() { return localStorage.getItem('flowmind_theme_mode') || 'light'; }
  function getStoredColor() { return localStorage.getItem('flowmind_theme_color') || 'purple'; }

  function resolvedDark(mode) {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyThemeMode(mode, persist) {
    if (persist) localStorage.setItem('flowmind_theme_mode', mode);
    document.documentElement.classList.toggle('dark', resolvedDark(mode));
    document.querySelectorAll('.tcp-row[data-mode]').forEach(o => {
      o.classList.toggle('active', o.dataset.mode === mode);
    });
  }

  function applyThemeColor(name, persist) {
    var c = THEME_COLORS[name] || THEME_COLORS.purple;
    if (persist) localStorage.setItem('flowmind_theme_color', name);
    var root = document.documentElement.style;
    root.setProperty('--primary', c.primary);
    root.setProperty('--primary-dark', c.dark);
    root.setProperty('--primary-tint', c.tint);
    root.setProperty('--grad-brand', c.primary);
    document.querySelectorAll('.tcp-row[data-color]').forEach(sw => {
      sw.classList.toggle('active', sw.dataset.color === name);
    });
  }

  // Apply saved theme on every page load
  applyThemeMode(getStoredMode(), false);
  applyThemeColor(getStoredColor(), false);

  // Header moon/sun icon: quick light/dark toggle
  const moonSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.74986 16.7432C7.32279 21.292 13.0213 22.8505 17.4777 20.2242C18.7341 19.4838 19.7577 18.4898 20.5222 17.3421C20.7792 16.9563 20.3537 16.4958 19.9155 16.6286C16.5806 17.6392 12.8806 16.2318 11.0648 13.0216C9.2491 9.81153 9.90502 5.83713 12.4299 3.39441C12.7616 3.07348 12.5837 2.46713 12.1279 2.50139C10.7719 2.60332 9.41671 3.01112 8.16028 3.75155C3.70381 6.3778 2.17692 12.1943 4.74986 16.7432Z" stroke="currentColor" stroke-width="1.5"></path><path opacity="0.6" d="M12 18.5L11.5 18.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path opacity="0.6" d="M9.5 16.5L8.5 16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>';
  const sunSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.5"></circle><path opacity="0.6" d="M2 12L1.5 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path opacity="0.6" d="M22.5 12L22 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path opacity="0.6" d="M12 2L12 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path opacity="0.6" d="M12 22.5L12 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path opacity="0.6" d="M4.92871 19.071L4.57516 19.4246" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path opacity="0.6" d="M19.4248 4.57544L19.0713 4.92899" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path opacity="0.6" d="M4.92871 4.92895L4.57516 4.5754" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path opacity="0.6" d="M19.4248 19.4246L19.0713 19.071" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>';
  function updateDarkToggleIcon() {
    const darkBtn = document.querySelector('[data-dark-toggle]');
    if (darkBtn) {
      const isDark = document.documentElement.classList.contains('dark');
      darkBtn.innerHTML = isDark ? sunSvg : moonSvg;
      darkBtn.setAttribute('data-tooltip', isDark ? 'Light' : 'Dark');
    }
  }
  updateDarkToggleIcon();
  const darkBtn = document.querySelector('[data-dark-toggle]');
  if (darkBtn) {
    darkBtn.addEventListener('click', () => {
      const nowDark = document.documentElement.classList.contains('dark');
      applyThemeMode(nowDark ? 'light' : 'dark', true);
      updateDarkToggleIcon();
    });
  }

  // Topics flyout panel
  const topicsToggle = document.querySelector('[data-topics-toggle]');
  const topicsPanel = document.querySelector('.topics-panel');
  if (topicsToggle && topicsPanel) {
    topicsToggle.addEventListener('click', (e) => {
      e.preventDefault();
      if (categoriesPanel) categoriesPanel.classList.remove('open');
      topicsPanel.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!topicsPanel.contains(e.target) && !topicsToggle.contains(e.target)) {
        topicsPanel.classList.remove('open');
      }
    });
  }

  // Categories flyout panel
  const categoriesToggle = document.querySelector('[data-categories-toggle]');
  const categoriesPanel = document.querySelector('.categories-panel');
  if (categoriesToggle && categoriesPanel) {
    categoriesToggle.addEventListener('click', (e) => {
      e.preventDefault();
      if (topicsPanel) topicsPanel.classList.remove('open');
      categoriesPanel.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!categoriesPanel.contains(e.target) && !categoriesToggle.contains(e.target)) {
        categoriesPanel.classList.remove('open');
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
  const bookmarkOutline = '<svg fill="none" height="19" viewBox="0 0 24 24" width="19" xmlns="http://www.w3.org/2000/svg"><path d="M4.46553 7.81025C4.78016 4.97857 6.97074 2.71846 9.79121 2.31554V2.31554C11.2563 2.10624 12.7437 2.10624 14.2088 2.31554V2.31554C17.0293 2.71846 19.2198 4.97857 19.5345 7.81025L19.648 8.83196C19.8821 10.9386 19.9033 13.0635 19.7114 15.1744L19.3332 19.3344C19.1897 20.9138 17.3528 21.7058 16.1058 20.726L13.2356 18.4709C12.5104 17.901 11.4896 17.901 10.7644 18.4709L7.89419 20.726C6.64716 21.7058 4.81035 20.9138 4.66677 19.3344L4.28859 15.1745C4.09668 13.0635 4.11793 10.9386 4.352 8.83195L4.46553 7.81025Z" stroke="currentColor" stroke-width="1.5"></path></svg>';
  const bookmarkOutlineSm = '<svg fill="none" height="17" viewBox="0 0 24 24" width="17" xmlns="http://www.w3.org/2000/svg"><path d="M4.46553 7.81025C4.78016 4.97857 6.97074 2.71846 9.79121 2.31554V2.31554C11.2563 2.10624 12.7437 2.10624 14.2088 2.31554V2.31554C17.0293 2.71846 19.2198 4.97857 19.5345 7.81025L19.648 8.83196C19.8821 10.9386 19.9033 13.0635 19.7114 15.1744L19.3332 19.3344C19.1897 20.9138 17.3528 21.7058 16.1058 20.726L13.2356 18.4709C12.5104 17.901 11.4896 17.901 10.7644 18.4709L7.89419 20.726C6.64716 21.7058 4.81035 20.9138 4.66677 19.3344L4.28859 15.1745C4.09668 13.0635 4.11793 10.9386 4.352 8.83195L4.46553 7.81025Z" stroke="currentColor" stroke-width="1.5"></path></svg>';
  const bookmarkFilled = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.46553 7.81025C4.78016 4.97857 6.97074 2.71846 9.79121 2.31554V2.31554C11.2563 2.10624 12.7437 2.10624 14.2088 2.31554V2.31554C17.0293 2.71846 19.2198 4.97857 19.5345 7.81025L19.648 8.83196C19.8821 10.9386 19.9033 13.0635 19.7114 15.1744L19.3332 19.3344C19.1897 20.9138 17.3528 21.7058 16.1058 20.726L13.2356 18.4709C12.5104 17.901 11.4896 17.901 10.7644 18.4709L7.89419 20.726C6.64716 21.7058 4.81035 20.9138 4.66677 19.3344L4.28859 15.1745C4.09668 13.0635 4.11793 10.9386 4.352 8.83195L4.46553 7.81025Z" fill="var(--primary)" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 11L11.5 13.5L15.5 9" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  const bookmarkFilledSm = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.46553 7.81025C4.78016 4.97857 6.97074 2.71846 9.79121 2.31554V2.31554C11.2563 2.10624 12.7437 2.10624 14.2088 2.31554V2.31554C17.0293 2.71846 19.2198 4.97857 19.5345 7.81025L19.648 8.83196C19.8821 10.9386 19.9033 13.0635 19.7114 15.1744L19.3332 19.3344C19.1897 20.9138 17.3528 21.7058 16.1058 20.726L13.2356 18.4709C12.5104 17.901 11.4896 17.901 10.7644 18.4709L7.89419 20.726C6.64716 21.7058 4.81035 20.9138 4.66677 19.3344L4.28859 15.1745C4.09668 13.0635 4.11793 10.9386 4.352 8.83195L4.46553 7.81025Z" fill="var(--primary)" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 11L11.5 13.5L15.5 9" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

  document.querySelectorAll('.bookmark-btn, .bookmark-btn-thumb').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wasActive = btn.classList.contains('active');
      btn.classList.toggle('active');
      const isSmall = btn.classList.contains('bookmark-btn-thumb');
      btn.innerHTML = wasActive ? (isSmall ? bookmarkOutlineSm : bookmarkOutline) : (isSmall ? bookmarkFilledSm : bookmarkFilled);
    });
  });

  // Like toggle (article card footer)
  const heartOutline = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 9.34385C2 15.638 8.20633 19.5195 11.3839 20.7759C11.7805 20.9328 12.2195 20.9328 12.6161 20.7759C15.7937 19.5195 22 15.638 22 9.34385C22 6.37211 20.4779 3.46837 17.44 3.07135C14 2.62178 13 4.39359 12 5.67101C11 4.39359 10 2.62178 6.56 3.07135C3.52211 3.46837 2 6.37211 2 9.34385Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  const heartFilled = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 9.34385C2 15.638 8.20633 19.5195 11.3839 20.7759C11.7805 20.9328 12.2195 20.9328 12.6161 20.7759C15.7937 19.5195 22 15.638 22 9.34385C22 6.37211 20.4779 3.46837 17.44 3.07135C14 2.62178 13 4.39359 12 5.67101C11 4.39359 10 2.62178 6.56 3.07135C3.52211 3.46837 2 6.37211 2 9.34385Z" fill="var(--primary)" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  document.querySelectorAll('.icon-action[aria-label="Like"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wasActive = btn.classList.contains('active');
      btn.classList.toggle('active');
      btn.innerHTML = wasActive ? heartOutline : heartFilled;
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

  // ---------------- Notifications: dropdown + page ----------------
  // Declared up front (and reassigned further down if a notifications page is present)
  // so early handlers like the Clear buttons can safely call it either way.
  let renderNotifPage = function(){};
  const notifToggle = document.querySelector('[data-notif-toggle]');
  const notifDropdown = document.querySelector('#notifDropdown');
  const notifSelectAll = document.getElementById('notifSelectAll');
  const markReadBtn = document.getElementById('markReadBtn');
  const markUnreadBtn = document.getElementById('markUnreadBtn');
  const notifClearBtn = document.getElementById('notifClearBtn');
  const notifPanelNotifications = document.querySelector('.notif-panel[data-notif-panel="notifications"]');
  const dropdownSelectAllLabel = document.querySelector('.notif-dropdown .notif-select-all span');
  const dropdownMoreWrap = document.querySelector('.notif-dropdown .notif-more');
  const dropdownMoreBtn = document.querySelector('.notif-dropdown .notif-more-btn');
  const dropdownMoreMenu = document.querySelector('.notif-dropdown .notif-more-menu');
  const moreMarkRead = document.getElementById('moreMarkRead');
  const moreMarkUnread = document.getElementById('moreMarkUnread');

  const pageNotifSelectAll = document.getElementById('pageNotifSelectAll');
  const pageMarkReadBtn = document.getElementById('pageMarkReadBtn');
  const pageMarkUnreadBtn = document.getElementById('pageMarkUnreadBtn');
  const pageClearBtn = document.getElementById('pageClearBtn');
  const pageUnsubscribeBtn = document.getElementById('pageUnsubscribeBtn');
  const notifPageList = document.querySelector('.notifications-page #notifList');
  const pageSelectAllLabel = document.querySelector('.notifications-page .notif-select-all span');
  const pageMoreWrap = document.querySelector('.page-more');
  const pageMoreBtn = document.querySelector('.page-more .notif-more-btn');
  const pageMoreMenu = document.querySelector('.page-more .notif-more-menu');
  const pageMoreMarkRead = document.getElementById('pageMoreMarkRead');
  const pageMoreMarkUnread = document.getElementById('pageMoreMarkUnread');

  function getAllItemCheckboxes() {
    return notifPanelNotifications ? Array.from(notifPanelNotifications.querySelectorAll('.notif-item-checkbox')) : [];
  }

  const notifEmptyState = document.getElementById('notifEmptyState');
  const bookmarksEmptyState = document.getElementById('bookmarksEmptyState');

  function updateDropdownEmptyStates() {
    if (notifPanelNotifications && notifEmptyState) {
      const hasItems = notifPanelNotifications.querySelectorAll('.notif-item').length > 0;
      notifEmptyState.style.display = hasItems ? 'none' : 'flex';
      const viewAll = notifPanelNotifications.querySelector('.notif-viewall');
      if (viewAll) viewAll.style.display = hasItems ? 'flex' : 'none';
      const actions = notifPanelNotifications.querySelector('.notif-actions');
      if (actions) actions.style.display = hasItems ? 'flex' : 'none';
    }
    const bookmarksPanel = document.querySelector('.notif-panel[data-notif-panel="bookmarks"]');
    if (bookmarksPanel && bookmarksEmptyState) {
      const hasBookmarks = bookmarksPanel.querySelectorAll('.notif-item').length > 0;
      bookmarksEmptyState.style.display = hasBookmarks ? 'none' : 'flex';
      const viewAll = bookmarksPanel.querySelector('.notif-viewall');
      if (viewAll) viewAll.style.display = hasBookmarks ? 'flex' : 'none';
    }
  }

  function getPageItemCheckboxes() {
    if (!notifPageList) return [];
    return Array.from(notifPageList.querySelectorAll('.notif-item'))
      .filter(item => item.style.display !== 'none')
      .map(item => item.querySelector('.notif-item-checkbox'))
      .filter(cb => cb);
  }

  // The bulk "more" (3-dot) menu — and its Clear button — only appear once at
  // least one notification is selected.
  function updateTopMarkReadVisibility() {
    if (!notifSelectAll) return;
    const checkedCount = getAllItemCheckboxes().filter(cb => cb.checked).length;
    if (notifClearBtn) {
      notifClearBtn.style.display = checkedCount > 0 ? 'inline-flex' : 'none';
      notifClearBtn.disabled = checkedCount === 0;
    }
    if (dropdownMoreWrap) dropdownMoreWrap.style.display = checkedCount > 0 ? 'flex' : 'none';
  }

  function resetNotifControls() {
    if (!notifSelectAll) return;
    notifSelectAll.checked = false;
    notifSelectAll.indeterminate = false;
    if (notifClearBtn) { notifClearBtn.style.display = 'none'; notifClearBtn.disabled = true; }
    if (dropdownMoreWrap) dropdownMoreWrap.style.display = 'none';
    if (dropdownMoreMenu) dropdownMoreMenu.classList.remove('open');
  }

  // Each notification's inline actions (mark read/unread + clear) are revealed on
  // hover/select via CSS; just keep the label in sync with the item's unread state.
  function updateItemActionsVisibility(checkbox) {
    const item = checkbox.closest('.notif-item');
    if (!item) return;
    const markBtn = item.querySelector('.notif-item-mark-read');
    if (markBtn) markBtn.textContent = item.classList.contains('unread') ? 'Mark as read' : 'Mark as unread';
  }

  function updateSelectAllState() {
    if (!notifSelectAll) return;
    const allCheckboxes = getAllItemCheckboxes();
    const checkedCount = allCheckboxes.filter(cb => cb.checked).length;
    const allChecked = allCheckboxes.length > 0 && checkedCount === allCheckboxes.length;
    notifSelectAll.checked = allChecked;
    notifSelectAll.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
    if (dropdownSelectAllLabel) {
      dropdownSelectAllLabel.textContent = checkedCount > 0 ? `${checkedCount} selected` : 'Select all';
    }
    updateTopMarkReadVisibility();
  }

  function updatePageTopMarkReadVisibility() {
    if (!pageNotifSelectAll) return;
    const checkedCount = getPageItemCheckboxes().filter(cb => cb.checked).length;
    if (pageClearBtn) { pageClearBtn.style.display = checkedCount > 0 ? 'inline-flex' : 'none'; pageClearBtn.disabled = checkedCount === 0; }
    if (pageUnsubscribeBtn) { pageUnsubscribeBtn.style.display = checkedCount > 0 ? 'inline-flex' : 'none'; pageUnsubscribeBtn.disabled = checkedCount === 0; }
    if (pageMoreWrap) pageMoreWrap.style.display = checkedCount > 0 ? 'flex' : 'none';
  }

  function updatePageSelectAllState() {
    if (!pageNotifSelectAll) return;
    const allCheckboxes = getPageItemCheckboxes();
    const checkedCount = allCheckboxes.filter(cb => cb.checked).length;
    const allChecked = allCheckboxes.length > 0 && checkedCount === allCheckboxes.length;
    pageNotifSelectAll.checked = allChecked;
    pageNotifSelectAll.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
    if (pageSelectAllLabel) {
      pageSelectAllLabel.textContent = checkedCount > 0 ? `${checkedCount} selected` : 'Select all';
    }
    updatePageTopMarkReadVisibility();
  }

  function resetPageNotifControls() {
    if (!pageNotifSelectAll) return;
    pageNotifSelectAll.checked = false;
    pageNotifSelectAll.indeterminate = false;
    if (pageClearBtn) { pageClearBtn.style.display = 'none'; pageClearBtn.disabled = true; }
    if (pageUnsubscribeBtn) { pageUnsubscribeBtn.style.display = 'none'; pageUnsubscribeBtn.disabled = true; }
    if (pageMoreWrap) pageMoreWrap.style.display = 'none';
    if (pageMoreMenu) pageMoreMenu.classList.remove('open');
  }

  function setPageCheckboxes(checked) {
    getPageItemCheckboxes().forEach(cb => {
      cb.checked = checked;
      updateItemActionsVisibility(cb);
    });
    updatePageSelectAllState();
  }

  function setAllCheckboxes(checked) {
    getAllItemCheckboxes().forEach(cb => {
      cb.checked = checked;
      updateItemActionsVisibility(cb);
    });
    updateSelectAllState();
  }

  if (notifToggle && notifDropdown) {
    notifToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('open');
      if (notifDropdown.classList.contains('open')) {
        resetNotifControls();
      }
    });
    document.addEventListener('click', (e) => {
      if (!notifDropdown.contains(e.target) && !notifToggle.contains(e.target)) {
        notifDropdown.classList.remove('open');
      }
    });
  }

  if (notifSelectAll) {
    notifSelectAll.addEventListener('change', (e) => setAllCheckboxes(e.target.checked));
  }

  if (pageNotifSelectAll) {
    pageNotifSelectAll.addEventListener('change', (e) => setPageCheckboxes(e.target.checked));
  }

  // Delegated so it also covers notifications cloned later on the notifications page.
  document.addEventListener('change', (e) => {
    if (e.target.matches && e.target.matches('.notif-item-checkbox')) {
      updateItemActionsVisibility(e.target);
      updateSelectAllState();
      updatePageSelectAllState();
    }
  });

  if (markReadBtn) {
    markReadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      getAllItemCheckboxes().forEach(cb => {
        if (cb.checked) {
          const item = cb.closest('.notif-item');
          if (item) item.classList.remove('unread');
        }
      });
      updateSelectAllState();
    });
  }

  if (markUnreadBtn) {
    markUnreadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      getAllItemCheckboxes().forEach(cb => {
        if (cb.checked) {
          const item = cb.closest('.notif-item');
          if (item) item.classList.add('unread');
        }
      });
      updateSelectAllState();
    });
  }

  if (pageMarkReadBtn) {
    pageMarkReadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      getPageItemCheckboxes().forEach(cb => {
        if (cb.checked) {
          const item = cb.closest('.notif-item');
          if (item) item.classList.remove('unread');
        }
      });
      updatePageSelectAllState();
    });
  }

  if (pageMarkUnreadBtn) {
    pageMarkUnreadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      getPageItemCheckboxes().forEach(cb => {
        if (cb.checked) {
          const item = cb.closest('.notif-item');
          if (item) item.classList.add('unread');
        }
      });
      updatePageSelectAllState();
    });
  }

  if (notifClearBtn) {
    notifClearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      getAllItemCheckboxes().forEach(cb => {
        if (cb.checked) {
          const item = cb.closest('.notif-item');
          if (item) item.remove();
        }
      });
      updateSelectAllState();
      updateDropdownEmptyStates();
    });
  }

  if (pageClearBtn) {
    pageClearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      getPageItemCheckboxes().forEach(cb => {
        if (cb.checked) {
          const item = cb.closest('.notif-item');
          if (item) item.remove();
        }
      });
      updatePageSelectAllState();
      renderNotifPage();
    });
  }

  if (pageUnsubscribeBtn) {
    pageUnsubscribeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      getPageItemCheckboxes().forEach(cb => {
        if (cb.checked) {
          const item = cb.closest('.notif-item');
          if (item) item.remove();
        }
      });
      updatePageSelectAllState();
      renderNotifPage();
    });
  }

  // Bulk "more" menu toggles (dropdown + page) — always available now, not selection-gated
  setupSimpleDropdown(dropdownMoreBtn, dropdownMoreMenu);
  setupSimpleDropdown(pageMoreBtn, pageMoreMenu);

  if (moreMarkRead && markReadBtn) moreMarkRead.addEventListener('click', () => markReadBtn.click());
  if (moreMarkUnread && markUnreadBtn) moreMarkUnread.addEventListener('click', () => markUnreadBtn.click());
  if (pageMoreMarkRead && pageMarkReadBtn) pageMoreMarkRead.addEventListener('click', () => pageMarkReadBtn.click());
  if (pageMoreMarkUnread && pageMarkUnreadBtn) pageMoreMarkUnread.addEventListener('click', () => pageMarkUnreadBtn.click());

  // Notifications-page sort: custom dropdown mirrors its selection onto the hidden
  // native <select> (and fires 'change') so the existing sort/pagination logic keeps working.
  const notifSortToggleBtn = document.getElementById('notifSortToggleBtn');
  const notifSortPanel = document.getElementById('notifSortPanel');
  const notifSortToggleLabel = document.getElementById('notifSortToggleLabel');
  const notifSortHiddenSelect = document.getElementById('notifSortSelect');
  setupSimpleDropdown(notifSortToggleBtn, notifSortPanel, (item) => {
    notifSortPanel.querySelectorAll('.label-dropdown-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    if (notifSortToggleLabel) notifSortToggleLabel.textContent = item.textContent.trim();
    if (notifSortHiddenSelect) {
      notifSortHiddenSelect.value = item.dataset.value;
      notifSortHiddenSelect.dispatchEvent(new Event('change'));
    }
  });

  // Per-notification "Mark as read/unread" + "Clear" — delegated so it works in the
  // popup, on the notifications page, and for notifications cloned in later.
  document.addEventListener('click', (e) => {
    const markBtn = e.target.closest('.notif-item-mark-read');
    if (markBtn) {
      e.preventDefault();
      const item = markBtn.closest('.notif-item');
      if (item) {
        item.classList.toggle('unread');
        const cb = item.querySelector('.notif-item-checkbox');
        if (cb) cb.checked = false;
        markBtn.textContent = item.classList.contains('unread') ? 'Mark as read' : 'Mark as unread';
      }
      updateSelectAllState();
      updatePageSelectAllState();
      return;
    }
    const clearBtn = e.target.closest('.notif-item-clear');
    if (clearBtn) {
      e.preventDefault();
      const item = clearBtn.closest('.notif-item');
      if (item) item.remove();
      updateSelectAllState();
      updatePageSelectAllState();
      updateDropdownEmptyStates();
      renderNotifPage();
    }
  });

  document.querySelectorAll('.notif-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.notifTab;
      document.querySelectorAll('.notif-panel').forEach(p => {
        p.style.display = (p.dataset.notifPanel === target) ? 'block' : 'none';
      });
      if (target === 'notifications') {
        resetNotifControls();
      }
    });
  });

  // Notifications page filter + sort + pagination
  const notifPage = document.querySelector('.notifications-page');
  if (notifPage) {
    const notifList = notifPage.querySelector('#notifList');
    const filterButtons = notifPage.querySelectorAll('.notif-filter-btn');
    const sortSelect = notifPage.querySelector('#notifSortSelect');
    const notifRange = notifPage.querySelector('.notif-range');
    const notifPrev = notifPage.querySelector('#notifPrev');
    const notifNext = notifPage.querySelector('#notifNext');
    let notifPageFilter = 'all';
    let notifPageSort = sortSelect ? sortSelect.value : 'newest';
    let notifCurrentPage = 1;
    const notifItemsPerPage = 20;

    function sortItems(order) {
      const items = Array.from(notifList.querySelectorAll('.notif-item'));
      items.sort((a, b) => {
        const aDate = new Date(a.dataset.notifDate || 0);
        const bDate = new Date(b.dataset.notifDate || 0);
        return order === 'oldest' ? aDate - bDate : bDate - aDate;
      });
      items.forEach(item => notifList.appendChild(item));
    }

    renderNotifPage = function renderNotifPage() {
      sortItems(notifPageSort);
      const items = Array.from(notifList.querySelectorAll('.notif-item'));
      const filteredItems = items.filter(item => {
        const isUnread = item.classList.contains('unread');
        return notifPageFilter === 'all' || (notifPageFilter === 'unread' && isUnread) || (notifPageFilter === 'read' && !isUnread);
      });
      const total = filteredItems.length;
      const totalPages = Math.max(1, Math.ceil(total / notifItemsPerPage));
      if (notifCurrentPage > totalPages) notifCurrentPage = totalPages;
      filteredItems.forEach((item, index) => {
        const pageIndex = Math.floor(index / notifItemsPerPage) + 1;
        item.style.display = pageIndex === notifCurrentPage ? 'grid' : 'none';
      });
      items.filter(item => !filteredItems.includes(item)).forEach(item => item.style.display = 'none');
      if (notifRange) {
        const start = total === 0 ? 0 : (notifCurrentPage - 1) * notifItemsPerPage + 1;
        const end = Math.min(total, notifCurrentPage * notifItemsPerPage);
        notifRange.textContent = `${start} - ${end} of ${total}`;
      }
      if (notifPrev) notifPrev.disabled = notifCurrentPage <= 1;
      if (notifNext) notifNext.disabled = notifCurrentPage >= totalPages;
      updatePageSelectAllState();
    };

    function applyNotifFilter(filter) {
      notifPageFilter = filter;
      notifCurrentPage = 1;
      renderNotifPage();
    }

    function applyNotifSort(order) {
      notifPageSort = order;
      renderNotifPage();
    }

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyNotifFilter(btn.dataset.notifFilter);
      });
    });

    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        applyNotifSort(sortSelect.value);
      });
    }

    if (notifPrev) {
      notifPrev.addEventListener('click', () => {
        if (notifCurrentPage > 1) {
          notifCurrentPage -= 1;
          renderNotifPage();
        }
      });
    }

    if (notifNext) {
      notifNext.addEventListener('click', () => {
        notifCurrentPage += 1;
        renderNotifPage();
      });
    }

    // ensure we have 34 items for testing by cloning existing items
    (function ensureThirtyFour(){
      const desired = 34;
      const current = notifList.querySelectorAll('.notif-item');
      if (current.length >= desired) return;
      const originals = Array.from(current);
      let i = 0;
      while (notifList.querySelectorAll('.notif-item').length < desired) {
        const src = originals[i % originals.length];
        const clone = src.cloneNode(true);
        const daysBack = notifList.querySelectorAll('.notif-item').length;
        const newDate = new Date();
        newDate.setDate(newDate.getDate() - daysBack);
        clone.dataset.notifDate = newDate.toISOString();
        notifList.appendChild(clone);
        i++;
      }
    })();

    renderNotifPage();
  }


  // Theme config panel: color / mode rows
  document.querySelectorAll('.tcp-row[data-color]').forEach(row => {
    row.addEventListener('click', () => applyThemeColor(row.dataset.color, true));
  });
  document.querySelectorAll('.tcp-row[data-mode]').forEach(row => {
    row.addEventListener('click', () => applyThemeMode(row.dataset.mode, true));
  });

  // Reflect the *actual* saved mode/color on load (in case system pref differs from a plain override)
  document.querySelectorAll('.tcp-row[data-mode]').forEach(r => r.classList.toggle('active', r.dataset.mode === getStoredMode()));
  document.querySelectorAll('.tcp-row[data-color]').forEach(r => r.classList.toggle('active', r.dataset.color === getStoredColor()));

  // ---- Auth / account state ----
  function isLoggedIn() {
    return localStorage.getItem('flowmind_loggedin') === 'true';
  }
  function applyAuthUI() {
    const loggedIn = isLoggedIn();
    document.querySelectorAll('[data-account-state="guest"]').forEach(el => {
      el.style.display = loggedIn ? 'none' : 'block';
    });
    document.querySelectorAll('[data-account-state="authed"]').forEach(el => {
      el.style.display = loggedIn ? 'block' : 'none';
    });
    const avatar = document.querySelector('#headerAvatar');
    if (avatar) {
      avatar.classList.toggle('guest', !loggedIn);
      avatar.classList.toggle('authed', loggedIn);
    }
    document.querySelectorAll('.account-authed-header .user-avatar').forEach(el => {
      el.classList.add('authed');
    });
    document.querySelectorAll('.user-name-label').forEach(el => {
      el.textContent = loggedIn ? 'Ava Chen' : 'Sign In';
    });
  }
  applyAuthUI();

  // ---- Auth gating: block key actions/pages for guests with a "please log in" note ----
  function ensureAuthToast() {
    let toast = document.querySelector('#authToast');
    if (toast) return toast;
    toast = document.createElement('div');
    toast.id = 'authToast';
    toast.className = 'auth-toast';
    toast.innerHTML = `
      <div class="auth-toast-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></div>
      <div class="auth-toast-body">
        <div class="auth-toast-title">You need to log in</div>
        <div class="auth-toast-msg" id="authToastMsg">Sign in to continue.</div>
      </div>
      <a href="auth.html" class="btn btn-primary btn-sm auth-toast-btn">Log In</a>
      <button type="button" class="icon-btn auth-toast-close" aria-label="Close"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    `;
    document.body.appendChild(toast);
    toast.querySelector('.auth-toast-close').addEventListener('click', () => hideAuthToast());
    return toast;
  }
  let authToastTimer = null;
  function showAuthToast(message) {
    const toast = ensureAuthToast();
    toast.querySelector('#authToastMsg').textContent = message || 'Sign in to continue.';
    toast.classList.add('open');
    clearTimeout(authToastTimer);
    authToastTimer = setTimeout(() => hideAuthToast(), 5000);
  }
  function hideAuthToast() {
    const toast = document.querySelector('#authToast');
    if (toast) toast.classList.remove('open');
    clearTimeout(authToastTimer);
  }

  // Map of selectors -> friendly action messages, intercepted for guests before any other handler runs
  const guardedActions = [
    { selector: '.bookmark-btn, .bookmark-btn-thumb', message: 'Log in to save items to your bookmarks.' },
    { selector: '.icon-action[aria-label="Like"]', message: 'Log in to like this post.' },
    { selector: '[data-comment-toggle]', message: 'Log in to join the conversation.' },
    { selector: '[data-requires-auth="buy"]', message: 'Log in to purchase this product.' }
  ];
  document.addEventListener('click', (e) => {
    if (isLoggedIn()) return;
    for (const { selector, message } of guardedActions) {
      const match = e.target.closest(selector);
      if (match) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showAuthToast(message);
        return;
      }
    }
  }, true);

  // Full-page guard for pages that only make sense when signed in
  function gatePage(containerSelector, message) {
    const container = document.querySelector(containerSelector);
    if (!container || isLoggedIn()) return;
    container.innerHTML = `
      <div class="auth-gate">
        <div class="auth-gate-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></div>
        <h3>You need to log in</h3>
        <p>${message}</p>
        <a href="auth.html" class="btn btn-primary">Log In</a>
      </div>
    `;
  }
  const path = window.location.pathname;
  if (path.endsWith('settings.html')) {
    gatePage('.settings-layout', 'Sign in to manage your profile and account settings.');
  }
  if (path.endsWith('bookmarks.html')) {
    gatePage('.page-shell', 'Sign in to view the items you\'ve bookmarked.');
  }

  const profileTrigger = document.querySelector('#profileTrigger');
  const accountPopup = document.querySelector('#accountPopup');
  if (profileTrigger && accountPopup) {
    profileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      accountPopup.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!accountPopup.contains(e.target) && !profileTrigger.contains(e.target)) {
        accountPopup.classList.remove('open');
      }
    });
  }

  const logoutBtn = document.querySelector('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('flowmind_loggedin');
      window.location.href = 'index.html';
    });
  }

  // Auth page: simulated sign-in (no real OAuth)
  document.querySelectorAll('.auth-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.setItem('flowmind_loggedin', 'true');
      window.location.href = 'index.html';
    });
  });

  // ---- Auth page: multi-view flow (Sign in / Sign up / Forgot / Reset) ----
  const authViews = document.querySelectorAll('.auth-view');
  if (authViews.length) {
    function showAuthView(name) {
      authViews.forEach(v => v.classList.toggle('active', v.dataset.authView === name));
      window.scrollTo(0, 0);
    }
    document.querySelectorAll('[data-auth-goto]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthView(el.dataset.authGoto);
      });
    });

    // Live password requirement checklist (Sign up + New Password views)
    document.querySelectorAll('.auth-pw-input').forEach(input => {
      input.addEventListener('input', () => {
        const val = input.value;
        const reqLen = val.length >= 8;
        const reqCase = /[a-z]/.test(val) && /[A-Z]/.test(val);
        const reqSpecial = /[^A-Za-z0-9]/.test(val);
        const scope = input.closest('form');
        const setReq = (name, met) => {
          const item = scope.querySelector(`.pw-req-item[data-req="${name}"]`);
          if (item) item.classList.toggle('met', met);
        };
        setReq('len', reqLen);
        setReq('case', reqCase);
        setReq('special', reqSpecial);
      });
    });

    // Show/hide password toggle
    document.querySelectorAll('.auth-password-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        if (input) input.type = input.type === 'password' ? 'text' : 'password';
      });
    });

    // Sign in form
    const signinForm = document.querySelector('#signinForm');
    if (signinForm) {
      signinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        localStorage.setItem('flowmind_loggedin', 'true');
        window.location.href = 'index.html';
      });
    }

    // Sign up form -> verification email sent view
    const signupForm = document.querySelector('#signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showAuthView('verify-sent');
      });
    }

    // Forgot password form -> email sent confirmation view
    const forgotForm = document.querySelector('#forgotForm');
    if (forgotForm) {
      forgotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showAuthView('forgot-sent');
      });
    }

    // New password form -> back to sign in with success banner
    const newPasswordForm = document.querySelector('#newPasswordForm');
    if (newPasswordForm) {
      newPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showAuthView('signin');
        const box = document.querySelector('#resetSuccessBox');
        if (box) box.style.display = 'flex';
      });
    }

    // Deep-link support e.g. auth.html#signup / #forgot / #new-password
    const authHash = window.location.hash.replace('#', '');
    if (authHash && document.querySelector(`.auth-view[data-auth-view="${authHash}"]`)) {
      showAuthView(authHash);
    }
  }

  // Settings: left nav tab switching (with deep-link support via #hash)
  const settingsNavItems = document.querySelectorAll('.settings-nav-item');
  const settingsMobileItems = document.querySelectorAll('.settings-mobile-item');
  if (settingsNavItems.length) {
    function activateSettingsTab(target) {
      settingsNavItems.forEach(b => b.classList.toggle('active', b.dataset.settingsTab === target));
      settingsMobileItems.forEach(b => b.classList.toggle('active', b.dataset.settingsTab === target));
      document.querySelectorAll('.settings-panel').forEach(p => {
        p.style.display = (p.dataset.settingsPanel === target) ? 'flex' : 'none';
      });
    }
    settingsNavItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.settingsTab;
        activateSettingsTab(target);
        history.replaceState(null, '', '#' + target);
      });
    });
    const settingsMobilePanel = document.querySelector('#settingsMobilePanel');
    settingsMobileItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.settingsTab;
        activateSettingsTab(target);
        history.replaceState(null, '', '#' + target);
        if (settingsMobilePanel) settingsMobilePanel.classList.remove('open');
      });
    });
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && document.querySelector(`.settings-nav-item[data-settings-tab="${initialHash}"]`)) {
      activateSettingsTab(initialHash);
    }
  }

  // Settings: mobile trigger opens the flyout popup listing sub-sections
  const settingsMobileTrigger = document.querySelector('#settingsMobileTrigger');
  const settingsMobilePanelEl = document.querySelector('#settingsMobilePanel');
  if (settingsMobileTrigger && settingsMobilePanelEl) {
    settingsMobileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsMobilePanelEl.classList.add('open');
    });
    settingsMobilePanelEl.querySelectorAll('[data-smp-close]').forEach(el => {
      el.addEventListener('click', () => settingsMobilePanelEl.classList.remove('open'));
    });
  }

  // Floating theme configuration dock
  const themeDockTrigger = document.querySelector('#themeDockTrigger');
  const themeConfigPanel = document.querySelector('#themeConfigPanel');
  if (themeDockTrigger && themeConfigPanel) {
    themeDockTrigger.addEventListener('click', () => themeConfigPanel.classList.add('open'));
    themeConfigPanel.querySelectorAll('[data-tcp-close]').forEach(el => {
      el.addEventListener('click', () => themeConfigPanel.classList.remove('open'));
    });
  }

  // Theme config panel: layout select (Boxed / Fluid) — now functional
  function applyLayout(name, persist) {
    if (persist) localStorage.setItem('flowmind_layout', name);
    document.documentElement.classList.toggle('layout-fluid', name === 'fluid');
    document.querySelectorAll('.tcp-row[data-layout]').forEach(o => o.classList.toggle('active', o.dataset.layout === name));
  }
  applyLayout(localStorage.getItem('flowmind_layout') || 'boxed', false);
  document.querySelectorAll('.tcp-row[data-layout]').forEach(row => {
    row.addEventListener('click', () => applyLayout(row.dataset.layout, true));
  });

  // Settings: secondary sign-out button (inside Profile panel)
  const logoutBtnSettings = document.querySelector('#logoutBtnSettings');
  if (logoutBtnSettings) {
    logoutBtnSettings.addEventListener('click', () => {
      localStorage.removeItem('flowmind_loggedin');
      window.location.href = 'index.html';
    });
  }

  // ---- Settings: Danger Zone (Delete Account Data / Delete Account) ----
  const dangerOverlay = document.querySelector('#dangerOverlay');
  if (dangerOverlay) {
    const accountEmail = 'ava.chen@flowmind.dev';
    const titleEl = dangerOverlay.querySelector('#dangerModalTitle');
    const warningEl = dangerOverlay.querySelector('#dangerModalWarning');
    const emailLabelEl = dangerOverlay.querySelector('#dangerModalEmail');
    const input = dangerOverlay.querySelector('#dangerConfirmInput');
    const confirmBtn = dangerOverlay.querySelector('#dangerConfirmBtn');

    const actionCopy = {
      data: {
        title: 'Delete Account Data',
        warning: 'This will permanently erase your activity, content, likes, and personal data. Your account will remain active, but this action cannot be undone.',
        confirmLabel: 'Delete Data'
      },
      account: {
        title: 'Delete Account',
        warning: 'This will permanently delete your account and all associated data, including your profile, posts, purchases, and liked items. This action cannot be undone.',
        confirmLabel: 'Delete Account'
      }
    };

    let currentAction = null;

    const resetModal = () => {
      input.value = '';
      confirmBtn.disabled = true;
      confirmBtn.classList.remove('btn-loading');
    };

    const openModal = (type) => {
      currentAction = type;
      const copy = actionCopy[type];
      titleEl.textContent = copy.title;
      warningEl.textContent = copy.warning;
      emailLabelEl.textContent = accountEmail;
      confirmBtn.textContent = copy.confirmLabel;
      resetModal();
      dangerOverlay.classList.add('open');
      setTimeout(() => input.focus(), 50);
    };

    const closeModal = () => {
      dangerOverlay.classList.remove('open');
      currentAction = null;
      resetModal();
    };

    const dataBtn = document.querySelector('#deleteAccountDataBtn');
    const accountBtn = document.querySelector('#deleteAccountBtn');
    if (dataBtn) dataBtn.addEventListener('click', () => openModal('data'));
    if (accountBtn) accountBtn.addEventListener('click', () => openModal('account'));

    dangerOverlay.querySelectorAll('[data-danger-close]').forEach(el => {
      el.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dangerOverlay.classList.contains('open')) closeModal();
    });

    input.addEventListener('input', () => {
      confirmBtn.disabled = input.value.trim().toLowerCase() !== accountEmail.toLowerCase();
    });

    confirmBtn.addEventListener('click', () => {
      if (confirmBtn.disabled || !currentAction) return;
      // Demo behaviour: simulate the destructive action, then send the user back to sign-in.
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Processing…';
      setTimeout(() => {
        localStorage.removeItem('flowmind_loggedin');
        window.location.href = 'index.html';
      }, 600);
    });
  }

  // Small reusable helper for anchored dropdown panels (kebab menus, sort pickers, etc.)
  function setupSimpleDropdown(btn, panel, onSelect) {
    if (!btn || !panel) return null;
    const wrap = btn.closest('.chip-more-wrap, .dropdown-anchor') || btn.parentElement;
    const close = () => { panel.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = panel.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    if (onSelect) {
      panel.querySelectorAll('.label-dropdown-item').forEach(item => {
        item.addEventListener('click', () => { onSelect(item); close(); });
      });
    }
    return { close };
  }

  // ---- Share popup (triggered from any Share icon site-wide, plus the post share row) ----
  const shareOverlay = document.querySelector('#shareOverlay');
  if (shareOverlay) {
    document.querySelectorAll('.icon-action[aria-label="Share"], [data-share-toggle]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        shareOverlay.classList.add('open');
      });
    });
    shareOverlay.querySelectorAll('[data-share-close]').forEach(el => {
      el.addEventListener('click', () => shareOverlay.classList.remove('open'));
    });
    const copyBtn = document.querySelector('#copyShareLink');
    if (copyBtn) {
      const originalIcon = copyBtn.innerHTML;
      const checkIcon = '<svg class="icon-check" width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      let revertTimer = null;
      copyBtn.addEventListener('click', () => {
        const input = shareOverlay.querySelector('.share-copy-row input');
        if (!input) return;
        navigator.clipboard.writeText(input.value);
        clearTimeout(revertTimer);
        copyBtn.innerHTML = checkIcon;
        copyBtn.setAttribute('data-tooltip', 'Copied');
        revertTimer = setTimeout(() => {
          copyBtn.innerHTML = originalIcon;
          copyBtn.setAttribute('data-tooltip', 'Copy');
        }, 2000);
      });
    }
    // Social share buttons just open the relevant share intent (demo href="#" targets skipped)
    shareOverlay.querySelectorAll('.share-social-item').forEach(btn => {
      btn.addEventListener('click', () => shareOverlay.classList.remove('open'));
    });
  }

  // ---- Comment popup (triggered from byline icon or the Leave a Comment button) ----
  const commentOverlay = document.querySelector('#commentOverlay');
  if (commentOverlay) {
    document.querySelectorAll('[data-comment-toggle]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        commentOverlay.classList.add('open');
      });
    });
    commentOverlay.querySelectorAll('[data-comment-close]').forEach(el => {
      el.addEventListener('click', () => commentOverlay.classList.remove('open'));
    });

    setupSimpleDropdown(document.getElementById('commentKebabBtn'), document.getElementById('commentKebabPanel'));

    setupSimpleDropdown(document.getElementById('commentSortBtn'), document.getElementById('commentSortPanel'), (item) => {
      document.querySelectorAll('#commentSortPanel .label-dropdown-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const label = document.getElementById('commentSortLabel');
      if (label) label.textContent = item.textContent.trim();
    });

    commentOverlay.querySelectorAll('[data-replies-toggle]').forEach(btn => {
      const replies = btn.nextElementSibling;
      if (!replies) return;
      btn.addEventListener('click', () => {
        const isHidden = replies.classList.toggle('hidden');
        btn.textContent = isHidden ? '— Show replies' : '— Hide replies';
      });
    });

    commentOverlay.querySelectorAll('.comment-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        commentOverlay.querySelectorAll('.comment-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  }

  // Tooltip: hide on mousedown, reappear only on mouseout + re-hover
  document.addEventListener('mousedown', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (target) {
      target.classList.add('tooltip-suppressed');
    }
  });
  document.addEventListener('mouseout', (e) => {
    const related = e.relatedTarget;
    const from = e.target.closest('[data-tooltip]');
    const to = related ? related.closest('[data-tooltip]') : null;
    if (from && from !== to) {
      from.classList.remove('tooltip-suppressed');
    }
  });

  // Escape closes any open overlay/popup
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (shareOverlay) shareOverlay.classList.remove('open');
      if (commentOverlay) commentOverlay.classList.remove('open');
    }
  });

  // ---- Auto-generated collapsible Table of Contents ----
  const tocWrap = document.getElementById('tocWrap');
  const tocBody = document.getElementById('tocBody');
  const tocList = document.getElementById('tocList');
  const tocToggle = document.getElementById('tocToggle');
  if (tocWrap && tocList) {
    const postContent = document.querySelector('.post-wrap');
    if (postContent) {
      const headings = postContent.querySelectorAll('h2[id], h3[id]');
      headings.forEach(h => {
        const li = document.createElement('li');
        if (h.tagName === 'H3') li.className = 'toc-h3';
        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.getElementById(h.id);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Close TOC on mobile after click
            if (window.innerWidth < 768) {
              tocBody.classList.remove('open');
              tocToggle.textContent = 'Show All';
            }
          }
        });
        li.appendChild(a);
        tocList.appendChild(li);
      });
    }
    if (tocToggle) {
      tocToggle.addEventListener('click', () => {
        const isOpen = tocBody.classList.toggle('open');
        tocToggle.textContent = isOpen ? 'Hide All' : 'Show All';
      });
    }
  }
});

// ---------------------------------------------------------------
// Syntax highlighting for .code-block <pre><code class="language-xxx">
// Loads highlight.js core + only the needed language packs from
// cdnjs, on demand — pages with no code blocks never fetch it.
// Classes are prefixed "hl-" to match the --hl-* tokens in styles.css.
// ---------------------------------------------------------------
function initSyntaxHighlighting() {
  const blocks = document.querySelectorAll('.code-block pre code[class*="language-"]');
  if (!blocks.length) return;

  const HLJS_VERSION = '11.9.0';
  const BASE = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/${HLJS_VERSION}`;

  const languages = new Set();
  blocks.forEach(el => {
    const match = el.className.match(/\blanguage-([\w-]+)\b/i);
    if (match) languages.add(match[1]);
  });

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  loadScript(`${BASE}/highlight.min.js`).then(() => {
    if (!window.hljs) return;
    window.hljs.configure({ classPrefix: 'hl-' });

    const loaders = [...languages].map(lang =>
      loadScript(`${BASE}/languages/${lang}.min.js`).catch(() => {
        // Unknown/unsupported language name — skip it, block just stays plain text.
      })
    );

    Promise.all(loaders).then(() => {
      blocks.forEach(el => {
        try { window.hljs.highlightElement(el); } catch (e) { /* leave as plain text */ }
      });
    });
  }).catch(() => { /* offline or CDN blocked — code blocks stay readable, unhighlighted */ });
}
