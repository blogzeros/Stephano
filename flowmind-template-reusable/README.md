# FlowMind template — reusable structure

Your header, sidebar (icon rail), topics panel, mobile menu, search
overlay, notifications dropdown, account popup, share/comment overlays,
theme panel, and footer were **byte-for-byte identical** on every page.
They're now defined **once each** and pulled into every page automatically.
Colors, radii, shadows, and fonts were already using CSS variables in
`styles.css` — that part of your template was already solid, so it's
untouched.

## What changed

```
flowmind-template/
├── partials/              ← edit these — shared chrome, one file each
│   ├── header.html            the top bar
│   ├── rail.html              the icon sidebar
│   ├── topics-panel.html      the "Topics" flyout
│   ├── mobile-drawer.html     the mobile hamburger menu
│   ├── search-overlay.html
│   ├── notif-dropdown.html
│   ├── account-popup.html
│   ├── share-overlay.html
│   ├── comment-overlay.html
│   ├── theme-dock-trigger.html
│   ├── theme-config-panel.html
│   ├── footer.html
│   ├── icon-sprite.html       shared <svg> icons, see below
│   ├── head-fonts.html        Google Fonts <link> tags
│   ├── theme-init.html        the dark-mode/theme boot script
│   ├── theme-init-minimal.html   (404 page uses a trimmed version)
│   └── 404-style.html         the 404 page's inline <style> block
│
├── pages/                 ← edit these — content unique to each page
│   ├── index.content.html
│   ├── blog.content.html
│   ├── shop.content.html
│   ├── product.content.html
│   ├── notifications.content.html
│   ├── bookmarks.content.html
│   ├── settings.content.html
│   ├── post.content.html
│   ├── auth.content.html
│   └── 404.content.html
│
├── pages.config.json      ← page titles + which layout each page uses
├── build.js               ← assembles everything into /dist
├── styles.css              (unchanged — your existing design tokens)
├── script.js                (unchanged)
├── assets/                   (unchanged — your SVG illustrations etc.)
└── dist/                  ← GENERATED. This is the site you deploy.
```

**You never hand-edit `/dist`.** It's regenerated every time you run the
build. Edit a partial or a page's content file, then rebuild.

## How to edit something

- **Change the logo, a nav link, or anything in the header on every
  page at once** → edit `partials/header.html`, run the build once.
  Same for the sidebar (`rail.html`), footer, dropdowns, etc.
- **Change something on just one page** (e.g. the blog page's article
  list) → edit `pages/blog.content.html`.
- **Change a page's `<title>`** → edit `pages.config.json`.
- **Add a brand-new page** → add a `<slug>.content.html` file in
  `/pages`, add one entry to `pages.config.json` (pick `"layout":
  "app"` for a normal page with the full header/sidebar/footer, or
  `"standalone"` for a bare page like the sign-in screen).

## Building

You need [Node.js](https://nodejs.org) installed — no other
dependencies, nothing to `npm install`.

```bash
node build.js
```

This regenerates every file in `/dist`. Open any file in `/dist` in a
browser to preview it (works straight from disk — double-click it — no
local server required).

## Design tokens (colors, radius, shadows, buttons)

These already lived in `styles.css` as CSS custom properties and are
untouched:

```css
:root{
  --primary: #bd32af;         /* change your brand color here */
  --radius-2xl: 22px;         /* change your corner rounding here */
  --shadow-md: 0px 3px 16px #0000000a;
  --font-heading: "Urbanist", ...;
  /* ...and more, all in one place near the top of styles.css */
}
```

Buttons, cards, and other repeated pieces are already CSS classes
(`.btn.btn-primary`, `.card`, etc.) — reuse those classes rather than
writing new styles inline.

## SVG icons

Icons that repeat *within* a single partial (like the little chevron
arrow used throughout the Topics panel and mobile menu — 9 times) are
now defined once in `partials/icon-sprite.html` and reused with:

```html
<svg class="chev" width="16" height="16"><use href="#chevron"/></svg>
```

To add another shared icon: drop a new `<symbol id="your-icon"
viewBox="...">...</symbol>` into `icon-sprite.html`, then reference it
anywhere on the page with `<use href="#your-icon"/>`. This is inlined
per-page (not a separate file) so it also works when you open a page
straight from disk, not just when it's hosted on a server.

Most other icons (product thumbnails, illustrations, one-off icons)
only ever appeared once, so they were left inline — deduplicating
those wouldn't have saved anything.

## One bug fixed along the way

The original `notifications.html` had a stray extra `</div>` right
before its footer (harmless in a browser, but invalid HTML). Rebuilding
from the shared `footer.html` partial fixed it automatically.
