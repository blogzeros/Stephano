// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('nav-open');
      nav.style.display = nav.classList.contains('nav-open') ? 'flex' : '';
    });
  }

  // Product gallery thumbnail swap
  const thumbs = document.querySelectorAll('.gallery-thumbs img');
  const mainImg = document.querySelector('.gallery-main img');
  if (thumbs.length && mainImg) {
    thumbs.forEach(t => {
      t.addEventListener('click', () => {
        thumbs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        mainImg.src = t.src;
      });
    });
  }

  // Quantity selector
  const qtyBox = document.querySelector('.qty-box');
  if (qtyBox) {
    const span = qtyBox.querySelector('span');
    let qty = 1;
    qtyBox.querySelector('.qty-minus').addEventListener('click', () => {
      qty = Math.max(1, qty - 1);
      span.textContent = qty;
    });
    qtyBox.querySelector('.qty-plus').addEventListener('click', () => {
      qty += 1;
      span.textContent = qty;
    });
  }

  // Product tabs
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

  // Filter chips (blog page)
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // Newsletter form (prevent actual submit)
  document.querySelectorAll('.newsletter-form').forEach(f => {
    f.addEventListener('submit', e => {
      e.preventDefault();
      const btn = f.querySelector('button');
      if (btn) { const orig = btn.textContent; btn.textContent = 'Subscribed ✓'; setTimeout(()=>btn.textContent = orig, 2200); }
    });
  });
});
