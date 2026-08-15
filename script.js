document.addEventListener('DOMContentLoaded', () => {
  // ------------------------------------------------------------------
  // Body scroll lock for full-screen overlays/panels
  // ------------------------------------------------------------------
  // The mobile nav drawer, theme config panel, search overlay, share/
  // comment modals, confirm modals, and the settings mobile panel are
  // all position:fixed elements toggled via an "open" class from many
  // different places below. Rather than repeating lock/unlock calls at
  // every one of those call sites, watch all of them centrally and lock
  // the page whenever at least one is open. This also stops the
  // underlying page from scrolling behind an open panel, which is what
  // let the browser add blank space at the bottom on a fast scroll
  // (most visible once the address bar collapses).
  (function initScrollLock() {
    const OVERLAY_SELECTOR = [
      '#mobileDrawer', '#searchOverlay', '#themeConfigPanel',
      '#dangerOverlay', '#profileEditOverlay', '#changePasswordOverlay',
      '#shareOverlay', '#commentOverlay', '#settingsMobilePanel',
      '.img-lightbox'
    ].join(', ');
    const overlays = Array.from(document.querySelectorAll(OVERLAY_SELECTOR));
    if (!overlays.length) return;

    let savedScrollY = 0;

    const lock = () => {
      savedScrollY = window.scrollY;
      document.body.style.top = `-${savedScrollY}px`;
      document.documentElement.classList.add('scroll-locked');
    };
    const unlock = () => {
      document.documentElement.classList.remove('scroll-locked');
      document.body.style.top = '';
      // html has scroll-behavior:smooth globally, which would animate
      // this restore into a visible "scroll back" - force it instant.
      const prevBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, savedScrollY);
      document.documentElement.style.scrollBehavior = prevBehavior;
    };
    const sync = () => {
      const anyOpen = overlays.some(el => el.classList.contains('open'));
      const isLocked = document.documentElement.classList.contains('scroll-locked');
      if (anyOpen && !isLocked) lock();
      else if (!anyOpen && isLocked) unlock();
    };

    const observer = new MutationObserver(sync);
    overlays.forEach(el => observer.observe(el, { attributes: true, attributeFilter: ['class'] }));

    sync(); // in case a panel is server-rendered already open
  })();

  // Sidebar "Home" link (rail icon + mobile drawer item) only makes sense
  // when you're not already on the home page — hide both on index.html.
  const onHomePage = /(^|\/)index\.html$/.test(window.location.pathname) || /\/$/.test(window.location.pathname);
  if (onHomePage) {
    document.getElementById('railHomeBtn')?.remove();
    document.getElementById('drawerHomeItem')?.remove();
  }

  // Code: write plain <pre><code>...</code></pre> for blocks or a bare
  // <code>...</code> inline, and this wraps blocks with a copy button +
  // language label and highlights both — only loads highlight.js when
  // a code element is actually on the page.
  initCodeBlocks();

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

  document.querySelectorAll('.bookmark-btn, .bookmark-btn-thumb, .save-btn').forEach(btn => {
    const label = btn.querySelector('.bookmark-btn-label');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wasActive = btn.classList.contains('active');
      btn.classList.toggle('active');
      const isSmall = btn.classList.contains('bookmark-btn-thumb');
      const icon = wasActive ? (isSmall ? bookmarkOutlineSm : bookmarkOutline) : (isSmall ? bookmarkFilledSm : bookmarkFilled);
      if (label) {
        btn.innerHTML = icon + ' <span class="bookmark-btn-label">' + (wasActive ? 'Save' : 'Saved') + '</span>';
      } else {
        btn.innerHTML = icon;
      }
    });
  });

  // Remove-bookmark buttons on the Bookmarks page — clicking removes the row from the list
  document.querySelectorAll('.bookmark-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const row = btn.closest('.bookmark-row');
      if (row) row.remove();
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

  // Header menus: search overlay, notification dropdown, and account popup
  // are mutually exclusive — opening one closes the other two. This only
  // covers the header's own menus, not the sidebar/mobile drawer.
  function closeHeaderMenus(except) {
    document.querySelectorAll('#searchOverlay, #notifDropdown, #accountPopup').forEach(el => {
      if (el !== except) el.classList.remove('open');
    });
  }

  // Search overlay
  const searchToggle = document.querySelector('[data-search-toggle]');
  const searchOverlay = document.querySelector('#searchOverlay');
  if (searchToggle && searchOverlay) {
    searchToggle.addEventListener('click', () => {
      closeHeaderMenus(searchOverlay);
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
      const opening = !notifDropdown.classList.contains('open');
      if (opening) closeHeaderMenus(notifDropdown);
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
        p.style.display = (p.dataset.notifPanel === target) ? 'flex' : 'none';
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
    { selector: '.bookmark-btn, .bookmark-btn-thumb, .save-btn', message: 'Log in to save items to your bookmarks.' },
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
      const opening = !accountPopup.classList.contains('open');
      if (opening) closeHeaderMenus(accountPopup);
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
      const evaluate = () => {
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
        const alertIcon = scope.querySelector('[data-pw-alert]');
        if (alertIcon) alertIcon.hidden = reqLen && reqCase && reqSpecial;
      };
      input.addEventListener('input', evaluate);
      input.addEventListener('focus', evaluate);
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

  // ---- Settings: Edit Profile popup (avatar, name, email, phone, bio) ----
  const profileEditOverlay = document.querySelector('#profileEditOverlay');
  const profileEditTrigger = document.querySelector('#profileEditTrigger');
  if (profileEditOverlay && profileEditTrigger) {
    const nameInput = profileEditOverlay.querySelector('#profileEditName');
    const emailInput = profileEditOverlay.querySelector('#profileEditEmail');
    const phoneInput = profileEditOverlay.querySelector('#profileEditPhone');
    const bioInput = profileEditOverlay.querySelector('#profileEditBio');
    const avatarInput = profileEditOverlay.querySelector('#avatarEditInput');
    const avatarPreview = profileEditOverlay.querySelector('#avatarEditPreview');
    const saveBtn = profileEditOverlay.querySelector('#profileEditSaveBtn');

    const displayName = document.querySelector('#profileDisplayName');
    const displayEmail = document.querySelector('#profileDisplayEmail');
    const displayAvatar = document.querySelector('#profileAvatarDisplay img');
    const piiName = document.querySelector('#piiName');
    const piiEmail = document.querySelector('#piiEmail');
    const piiPhone = document.querySelector('#piiPhone');
    const piiBio = document.querySelector('#piiBio');

    let pendingAvatarSrc = null;

    const openModal = () => {
      nameInput.value = piiName.textContent.trim();
      emailInput.value = piiEmail.textContent.trim();
      phoneInput.value = piiPhone.textContent.trim();
      bioInput.value = piiBio.textContent.trim();
      avatarPreview.src = displayAvatar.src;
      pendingAvatarSrc = null;
      profileEditOverlay.classList.add('open');
      setTimeout(() => nameInput.focus(), 50);
    };

    const closeModal = () => profileEditOverlay.classList.remove('open');

    profileEditTrigger.addEventListener('click', openModal);
    profileEditOverlay.querySelectorAll('[data-profile-edit-close]').forEach(el => {
      el.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && profileEditOverlay.classList.contains('open')) closeModal();
    });

    if (avatarInput) {
      avatarInput.addEventListener('change', () => {
        const file = avatarInput.files && avatarInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          pendingAvatarSrc = reader.result;
          avatarPreview.src = pendingAvatarSrc;
        };
        reader.readAsDataURL(file);
      });
    }

    saveBtn.addEventListener('click', () => {
      const savedLabel = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      setTimeout(() => {
        piiName.textContent = nameInput.value.trim();
        piiEmail.textContent = emailInput.value.trim();
        piiPhone.textContent = phoneInput.value.trim();
        piiBio.textContent = bioInput.value.trim();
        displayName.textContent = nameInput.value.trim();
        displayEmail.textContent = emailInput.value.trim();
        if (pendingAvatarSrc) displayAvatar.src = pendingAvatarSrc;
        saveBtn.disabled = false;
        saveBtn.textContent = savedLabel;
        closeModal();
      }, 500);
    });
  }

  // ---- Settings: Change Password popup ----
  const changePasswordOverlay = document.querySelector('#changePasswordOverlay');
  const changePasswordBtn = document.querySelector('#changePasswordBtn');
  if (changePasswordOverlay && changePasswordBtn) {
    const currentInput = changePasswordOverlay.querySelector('#currentPasswordInput');
    const newInput = changePasswordOverlay.querySelector('#newPasswordInput');
    const confirmInput = changePasswordOverlay.querySelector('#confirmPasswordInput');
    const errorMsg = changePasswordOverlay.querySelector('#passwordErrorMsg');
    const saveBtn = changePasswordOverlay.querySelector('#changePasswordSaveBtn');

    const showError = (msg) => {
      errorMsg.textContent = msg;
      errorMsg.style.display = 'block';
    };
    const clearError = () => {
      errorMsg.style.display = 'none';
      errorMsg.textContent = '';
    };

    const openPasswordModal = () => {
      currentInput.value = '';
      newInput.value = '';
      confirmInput.value = '';
      clearError();
      changePasswordOverlay.classList.add('open');
      setTimeout(() => currentInput.focus(), 50);
    };
    const closePasswordModal = () => changePasswordOverlay.classList.remove('open');

    changePasswordBtn.addEventListener('click', openPasswordModal);
    changePasswordOverlay.querySelectorAll('[data-password-close]').forEach(el => {
      el.addEventListener('click', closePasswordModal);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && changePasswordOverlay.classList.contains('open')) closePasswordModal();
    });
    [currentInput, newInput, confirmInput].forEach(inp => inp.addEventListener('input', clearError));

    saveBtn.addEventListener('click', () => {
      if (!currentInput.value) { showError('Enter your current password.'); currentInput.focus(); return; }
      if (newInput.value.length < 8) { showError('New password must be at least 8 characters.'); newInput.focus(); return; }
      if (newInput.value !== confirmInput.value) { showError('New passwords do not match.'); confirmInput.focus(); return; }
      if (newInput.value === currentInput.value) { showError('New password must be different from the current one.'); newInput.focus(); return; }

      const savedLabel = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Updating…';
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.textContent = savedLabel;
        closePasswordModal();
      }, 600);
    });
  }

  // ---- Settings: Active Sessions (mock data) — per-session and bulk sign-out ----
  const sessionList = document.querySelector('#sessionList');
  if (sessionList) {
    sessionList.querySelectorAll('[data-session-revoke]').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.session-item');
        if (!row) return;
        btn.disabled = true;
        btn.textContent = 'Signing out…';
        setTimeout(() => {
          row.style.transition = 'opacity .2s ease';
          row.style.opacity = '0';
          setTimeout(() => row.remove(), 200);
        }, 400);
      });
    });
  }
  const revokeAllSessionsBtn = document.querySelector('#revokeAllSessionsBtn');
  if (revokeAllSessionsBtn && sessionList) {
    revokeAllSessionsBtn.addEventListener('click', () => {
      revokeAllSessionsBtn.disabled = true;
      revokeAllSessionsBtn.textContent = 'Signing out other sessions…';
      setTimeout(() => {
        sessionList.querySelectorAll('.session-item [data-session-revoke]').forEach(btn => btn.click());
        revokeAllSessionsBtn.textContent = 'All other sessions signed out';
      }, 300);
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

    setupSimpleDropdown(document.getElementById('commentSortBtn'), document.getElementById('commentSortPanel'), (item) => {
      document.querySelectorAll('#commentSortPanel .label-dropdown-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const label = document.getElementById('commentSortLabel');
      if (label) label.textContent = item.textContent.trim();
    });

    // Turns a hide/show-replies toggle button live. Extracted so it can
    // be (re)used both for buttons present at load and ones created
    // on the fly the first time a root comment gets its first reply.
    function bindHideRepliesToggle(btn) {
      const replies = btn.nextElementSibling;
      if (!replies) return;
      btn.addEventListener('click', () => {
        const isHidden = replies.classList.toggle('hidden');
        btn.textContent = isHidden ? 'Show replies' : 'Hide replies';
      });
    }
    commentOverlay.querySelectorAll('[data-replies-toggle]').forEach(bindHideRepliesToggle);

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // Builds a freshly-posted reply's markup. `repliedToName` is only
    // set when replying to a nested reply (not the root), and shows
    // up as a permanent "Replied to {name}" badge on the comment
    // itself — since the flat reply list can't visually nest, the
    // badge is what preserves who a reply was actually aimed at.
    function buildReplyNode(text, repliedToName) {
      const node = document.createElement('div');
      node.className = 'comment-item comment-reply';
      node.innerHTML = `
        <div class="avatar-sm" style="background:var(--grad-brand);"></div>
        <div class="comment-item-body">
          <div class="comment-author">You</div>
          <div class="comment-time">Just now</div>
          ${repliedToName ? `<div class="comment-replied-to">Replied to ${escapeHtml(repliedToName)}</div>` : ''}
          <div class="comment-text">${escapeHtml(text)}</div>
          <button class="comment-reply-link"><svg width="14" height="14"><use href="#icon-back"></use></svg>Reply</button>
        </div>`;
      node.querySelector('.comment-reply-link').addEventListener('click', onReplyLinkClick);
      return node;
    }

    function bumpCommentCount() {
      const label = document.getElementById('commentCountLabel');
      if (!label) return;
      const n = parseInt(label.textContent, 10);
      if (!isNaN(n)) label.textContent = `${n + 1} comments`;
    }

    // Reply link on any comment (root or nested reply) opens its own
    // inline reply box directly under that comment. Replying to a
    // nested reply (not the root) tags who it's aimed at, since all
    // replies live in one flat list under the root — without the tag
    // it'd be unclear who a reply several levels down was meant for.
    function onReplyLinkClick() {
      const btn = this;
      const existing = btn.nextElementSibling;
      if (existing && existing.classList.contains('comment-inline-reply')) {
        existing.remove();
        return;
      }
      const isNestedReply = !!btn.closest('.comment-reply');
      const authorName = btn.closest('.comment-item-body')
        .querySelector('.comment-author').textContent.trim();

      const box = document.createElement('div');
      box.className = 'comment-inline-reply';
      box.innerHTML = `
        ${isNestedReply ? `
          <div class="comment-replying-to">
            Replying to ${escapeHtml(authorName)}
            <button type="button" aria-label="Cancel reply-to">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
            </button>
          </div>` : ''}
        <div class="comment-inline-reply-row">
          <div class="avatar-sm" style="background:var(--grad-brand);"></div>
          <div class="comment-form-bar">
            <input type="text" class="comment-input" placeholder="Write a reply...">
            <button class="comment-form-send" type="button" aria-label="Post reply">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20.4054 15.0556C16.2581 18.5808 10.9582 20.5982 5.51804 20.7737C2.75443 20.8628 1.07276 17.6924 2.77033 15.5098L4.54508 13.2279C5.10681 12.5057 5.10681 11.4944 4.54508 10.7722L2.77033 8.49037C1.07276 6.30777 2.75443 3.1373 5.51805 3.22645C10.9582 3.40194 16.2581 5.41937 20.4054 8.94454C22.2894 10.5459 22.2894 13.4542 20.4054 15.0556Z" stroke="currentColor" stroke-width="1.5"></path><path opacity="0.6" d="M5.5 12L10 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>
            </button>
          </div>
        </div>`;
      btn.insertAdjacentElement('afterend', box);
      const input = box.querySelector('.comment-input');
      input.focus();

      const cancelTag = box.querySelector('.comment-replying-to button');
      if (cancelTag) cancelTag.addEventListener('click', () => box.remove());

      const post = () => {
        const text = input.value.trim();
        if (!text) return;

        // Flat model: every reply — no matter which comment's Reply
        // link opened this box — lands in the root's single replies
        // list, in order. Find (or create) that list.
        const rootItem = isNestedReply
          ? btn.closest('.comment-replies').closest('.comment-item')
          : btn.closest('.comment-item-body').parentElement;
        const rootItemBody = rootItem.querySelector(':scope > .comment-item-body');

        let repliesList = rootItemBody.querySelector(':scope > .comment-replies');
        if (!repliesList) {
          const toggleBtn = document.createElement('button');
          toggleBtn.className = 'comment-hide-replies-btn';
          toggleBtn.setAttribute('data-replies-toggle', '');
          toggleBtn.textContent = 'Hide replies';
          repliesList = document.createElement('div');
          repliesList.className = 'comment-replies';
          const replyLinkOfRoot = rootItemBody.querySelector(':scope > .comment-reply-link');
          replyLinkOfRoot.insertAdjacentElement('afterend', toggleBtn);
          toggleBtn.insertAdjacentElement('afterend', repliesList);
          bindHideRepliesToggle(toggleBtn);
        }

        const repliedToName = isNestedReply ? authorName : null;
        const newReply = buildReplyNode(text, repliedToName);
        repliesList.appendChild(newReply);
        bumpCommentCount();
        box.remove();
      };

      box.querySelector('.comment-form-send').addEventListener('click', post);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); post(); }
      });
    }
    commentOverlay.querySelectorAll('.comment-reply-link').forEach(btn => btn.addEventListener('click', onReplyLinkClick));
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
  // Call it in a post with:
  //   <details class="spoiler toc">
  //     <summary>Table of Contents</summary>
  //     <div class="aToc"></div>
  //   </details>
  // The open/close behavior comes for free from <details>/<summary>;
  // this just fills in .aToc from the h2/h3 ids in .post-wrap.
  document.querySelectorAll('.spoiler.toc .aToc').forEach(aToc => {
    const details = aToc.closest('details');
    const postContent = document.querySelector('.post-wrap');
    if (!postContent) return;
    const ul = document.createElement('ul');
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
          if (window.innerWidth < 768 && details) details.open = false;
        }
      });
      li.appendChild(a);
      ul.appendChild(li);
    });
    aToc.appendChild(ul);
  });
  // Blog-post tables: turn each column into a CSS Grid track shared by
  // the header and body, so header/body column widths always line up
  // (a plain <table> with no wrapper div or classes needed — see
  // enhancePostTables() below).
  enhancePostTables();

  // Fixed bottom-right scroll nav button (down-arrow/progress-ring at
  // top, flips to up-arrow + fills as the page scrolls) — see
  // initScrollNavButton() below.
  initScrollNavButton();
});

// ---------------------------------------------------------------
// Blog-post tables — a plain semantic <table> (no wrapper <div>, no
// classes, no data-label attributes) is turned into a CSS Grid: thead/
// tbody/tr become display:contents so every <th>/<td> is a direct grid
// item sharing one set of column tracks, keeping header and body
// columns pixel-aligned. Also tags first/last-column and last-row
// cells so styles.css can drop their inner border edges.
// ---------------------------------------------------------------
function enhancePostTables() {
  const tables = document.querySelectorAll('.post-wrap table');
  tables.forEach(table => {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (!rows.length) return;
    const colCount = rows[0].children.length;
    table.style.setProperty('--table-cols', colCount);
    rows.forEach((tr, i) => {
      const cells = Array.from(tr.children);
      cells.forEach((cell, j) => {
        if (j === cells.length - 1) cell.classList.add('col-last');
        if (i === rows.length - 1) cell.classList.add('row-last');
      });
    });
  });
}

// ---------------------------------------------------------------
// Scroll Navigation & Progress Ring (fixed bottom-right button,
// markup in partials/overlays.html, styled in styles.css).
//   - At the top of the page: down-arrow, ring empty, click scrolls
//     to document.documentElement.scrollHeight.
//   - Once scrolled: up-arrow, ring fills with scroll %, click
//     scrolls back to top.
// Ring fill is driven by stroke-dashoffset on a circle whose
// stroke-dasharray is the circle's own circumference, so 0 = empty
// and dasharray = full. Recomputed on resize (and on load) since
// scrollHeight/innerHeight change with viewport size and reflow.
// ---------------------------------------------------------------
function initScrollNavButton() {
  const btn = document.getElementById('scrollNavBtn');
  const icon = document.getElementById('scrollNavIcon');
  const ringFg = document.getElementById('scrollNavRingFg');
  if (!btn || !icon || !ringFg) return;

  const RADIUS = ringFg.r.baseVal.value;
  let circumference = 2 * Math.PI * RADIUS;

  function setCircumference() {
    circumference = 2 * Math.PI * ringFg.r.baseVal.value;
    ringFg.style.strokeDasharray = `${circumference}`;
  }

  function update() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? Math.min(Math.max(scrollTop / scrollable, 0), 1) : 0;
    const atTop = scrollTop <= 0;

    icon.classList.toggle('is-down', atTop);
    btn.dataset.dir = atTop ? 'down' : 'up';
    btn.setAttribute('aria-label', atTop ? 'Scroll to bottom' : 'Scroll to top');

    // Empty ring at the top; fills in as pct climbs toward 1.
    ringFg.style.strokeDashoffset = `${circumference * (1 - (atTop ? 0 : pct))}`;
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  function onResize() {
    setCircumference();
    update();
  }

  setCircumference();
  update();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  btn.addEventListener('click', () => {
    if (btn.dataset.dir === 'down') {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

// ---------------------------------------------------------------
// Code blocks. Authoring is just plain markup:
//
//   <pre><code>your code here</code></pre>
//
// This finds every one of those on the page, wraps it in the
// .code-block chrome (a header with a copy button + language label),
// then loads highlight.js and lets it auto-detect the language and
// highlight the block — no language-xxx class needed. The default
// cdnjs build of highlight.js already bundles the ~40 most common
// languages, which is what makes detection possible without knowing
// the language up front, so pages with no code blocks load nothing.
// Highlight.js's classes are prefixed "hl-" to match the --hl-*
// theme tokens in styles.css.
// ---------------------------------------------------------------
function initCodeBlocks() {
  const allCode = Array.from(document.querySelectorAll('code'));
  if (!allCode.length) return;

  const codeEls = allCode.filter(code =>
    code.parentElement.tagName === 'PRE' && !code.closest('.code-block')
  );
  const inlineEls = allCode.filter(code => code.parentElement.tagName !== 'PRE');
  if (!codeEls.length && !inlineEls.length) return;

  const iconLang = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17 6L21.5858 10.5858C22.3668 11.3668 22.3668 12.6332 21.5858 13.4142L17 18" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><path d="M7 6L2.41421 10.5858C1.63317 11.3668 1.63316 12.6332 2.41421 13.4142L7 18" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><path opacity="0.6" d="M9.81053 20.2205L14.2104 3.7998" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>';
  const iconCopy = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M7.36986 21.5616C4.84126 21.1402 2.85979 19.1587 2.43836 16.6301V16.6301C2.14812 14.8887 2.14812 13.1113 2.43836 11.3699V11.3699C2.85979 8.84126 4.84126 6.85979 7.36986 6.43836V6.43836C9.11127 6.14812 10.8887 6.14812 12.6301 6.43836V6.43836C15.1587 6.85979 17.1402 8.84126 17.5616 11.3699V11.3699C17.8519 13.1113 17.8519 14.8887 17.5616 16.6301V16.6301C17.1402 19.1587 15.1587 21.1402 12.6301 21.5616V21.5616C10.8887 21.8519 9.11127 21.8519 7.36986 21.5616V21.5616Z" stroke="currentColor" stroke-width="1.75"/><path opacity="0.6" d="M18.0002 15.4507C19.8725 14.8681 21.2877 13.2753 21.6167 11.3016C21.8706 9.7779 21.8706 8.22263 21.6167 6.69889C21.2479 4.48637 19.5141 2.75258 17.3016 2.38383C15.7779 2.12987 14.2226 2.12987 12.6989 2.38383C10.7252 2.71278 9.13243 4.12796 8.5498 6.00024" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>';
  const iconCheck = '<svg class="icon-check" width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20 6L9.86221 17.5978C9.67192 17.8155 9.33719 17.8269 9.13254 17.6226L4 12.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>';

  // Auto-detection scores every loaded grammar and picks the closest
  // match, which can misfire on very short snippets (a one-line
  // `<div>...</div>` has just enough ambiguity to occasionally score
  // higher against an unrelated grammar than against HTML). Scoping
  // the guess to this practical subset — languages worth writing docs
  // in — keeps detection automatic while avoiding those false
  // positives; it's the same tradeoff highlight.js's own docs
  // recommend for auto-detection accuracy.
  const LANGUAGE_SUBSET = [
    'xml', 'javascript', 'typescript', 'css', 'scss', 'json', 'bash',
    'shell', 'python', 'ruby', 'php', 'java', 'csharp', 'cpp', 'c',
    'go', 'rust', 'sql', 'yaml', 'markdown', 'plaintext'
  ];

  // Friendlier display names for the language keys hljs detects.
  const LANG_LABELS = {
    xml: 'HTML', html: 'HTML', javascript: 'JavaScript', typescript: 'TypeScript',
    css: 'CSS', scss: 'SCSS', less: 'Less', json: 'JSON', bash: 'Bash',
    shell: 'Shell', python: 'Python', ruby: 'Ruby', php: 'PHP', java: 'Java',
    csharp: 'C#', cpp: 'C++', c: 'C', go: 'Go', rust: 'Rust', sql: 'SQL',
    yaml: 'YAML', markdown: 'Markdown', plaintext: 'Plain Text', diff: 'Diff'
  };

  // Wrap each bare block in the .code-block chrome and wire up its
  // copy button now; the language label gets filled in once
  // highlight.js has had a chance to detect it, below.
  const entries = codeEls.map(code => {
    const pre = code.parentElement;

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';

    const header = document.createElement('div');
    header.className = 'code-block-header';

    const langLabel = document.createElement('span');
    langLabel.className = 'code-block-lang';
    langLabel.innerHTML = `${iconLang}Code`;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.setAttribute('aria-label', 'Copy code');
    copyBtn.setAttribute('data-tooltip', 'Copy');
    copyBtn.innerHTML = iconCopy;

    let revertTimer = null;
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(pre.textContent);
      clearTimeout(revertTimer);
      copyBtn.innerHTML = iconCheck;
      copyBtn.classList.add('copied');
      copyBtn.setAttribute('data-tooltip', 'Copied');
      revertTimer = setTimeout(() => {
        copyBtn.innerHTML = iconCopy;
        copyBtn.classList.remove('copied');
        copyBtn.setAttribute('data-tooltip', 'Copy');
      }, 2000);
    });

    header.append(langLabel, copyBtn);
    pre.replaceWith(wrapper);
    wrapper.append(header, pre);

    return { code, langLabel };
  });

  const HLJS_VERSION = '11.9.0';
  const BASE = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/${HLJS_VERSION}`;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // For inline `<code>` snippets, auto-detection is noisier — a bare
  // word or class name (".subtitle1", "alert") often scores a weak,
  // partial match against some grammar, which highlights only a
  // fragment of the word and looks broken rather than colored. Only
  // apply the result when hljs is confident enough to tag the *whole*
  // snippet as one clean unit (a single top-level span, e.g. a full
  // `<h1>` tag) — otherwise leave it as plain text in its pill, same
  // as before.
  const fullyWrapped = html => /^<span\b[^>]*>[\s\S]*<\/span>$/.test(html.trim());

  loadScript(`${BASE}/highlight.min.js`).then(() => {
    if (!window.hljs) return;
    window.hljs.configure({ classPrefix: 'hl-' });

    entries.forEach(({ code, langLabel }) => {
      try {
        const result = window.hljs.highlightAuto(code.textContent, LANGUAGE_SUBSET);
        code.innerHTML = result.value;
        code.classList.add('hljs');
        const detected = result.language;
        const label = LANG_LABELS[detected] || (detected && detected[0].toUpperCase() + detected.slice(1));
        if (label) langLabel.innerHTML = `${iconLang}${label}`;
      } catch (e) { /* leave that block as plain text */ }
    });

    inlineEls.forEach(code => {
      try {
        const result = window.hljs.highlightAuto(code.textContent, LANGUAGE_SUBSET);
        if (result.relevance > 0 && fullyWrapped(result.value)) {
          code.innerHTML = result.value;
          code.classList.add('hljs');
        }
      } catch (e) { /* leave that snippet as plain text */ }
    });
  }).catch(() => { /* offline or CDN blocked — code blocks stay readable, unhighlighted */ });
}