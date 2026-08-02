#!/usr/bin/env node
/**
 * FlowMind static site builder
 * ------------------------------------------------------------------
 * Assembles the final, deployable HTML pages out of:
 *   - /partials/*.html   reusable chrome (header, rail/sidebar, footer,
 *                         drawers, overlays, panels...)
 *   - /pages/*.content.html   the part of each page that is actually
 *                         unique to that page
 *   - pages.config.json  per-page title + which layout to use
 *
 * Output goes to /dist — that folder is the finished site, ready to
 * upload anywhere. You never hand-edit /dist; you edit /partials or
 * /pages and re-run `node build.js`.
 *
 * No dependencies. No npm install needed. Just Node.
 * ------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PARTIALS_DIR = path.join(ROOT, 'partials');
const PAGES_DIR = path.join(ROOT, 'pages');
const DIST_DIR = path.join(ROOT, 'dist');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

// ---- load every partial into memory, keyed by filename without extension
const partials = {};
for (const f of fs.readdirSync(PARTIALS_DIR)) {
  if (f.endsWith('.html')) {
    partials[path.basename(f, '.html')] = read(path.join(PARTIALS_DIR, f));
  }
}

/**
 * Tiny templating engine — just enough for this template, no deps:
 *   {{name}}                -> replaced with a string variable
 *   {{> partialName}}       -> replaced with the contents of a partial
 *   {{#unless flag}}...{{/unless}}  -> block kept only when flag is falsy
 */
function render(tpl, vars) {
  let out = tpl;

  // {{#unless flag}}...{{/unless}}
  out = out.replace(/\{\{#unless (\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_, flag, inner) => {
    return vars[flag] ? '' : inner;
  });

  // {{> partialName}}
  out = out.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
    if (!(name in partials)) throw new Error(`Unknown partial: ${name}`);
    // partials can themselves contain {{#unless}} blocks (e.g. rail.html),
    // so run them through the same conditional pass with the page's vars.
    return render(partials[name], vars);
  });

  // {{variable}}
  out = out.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    return key in vars ? vars[key] : '';
  });

  return out;
}

// ---- page layouts ----------------------------------------------------

const APP_LAYOUT = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{title}}</title>
{{> head-fonts}}
{{> theme-init}}
<link rel="stylesheet" href="styles.css">
</head>
<body>

{{> icon-sprite}}
{{> header}}
{{> rail}}
{{> topics-panel}}
{{> mobile-drawer}}
{{> search-overlay}}
{{> notif-dropdown}}
{{> account-popup}}
{{> share-overlay}}
{{> comment-overlay}}
{{> theme-dock-trigger}}
{{> theme-config-panel}}

{{content}}

{{> footer}}

<script src="script.js"></script>
</body>
</html>
`;

const STANDALONE_LAYOUT = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{title}}</title>
{{> head-fonts}}
{{> theme-init}}
<link rel="stylesheet" href="styles.css">
</head>
<body>

{{content}}

<script src="script.js"></script>
</body>
</html>
`;

const STANDALONE_404_LAYOUT = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{title}}</title>
{{> head-fonts}}
{{> theme-init-minimal}}
{{> 404-style}}
</head>
<body>

{{content}}

</body>
</html>
`;

const LAYOUTS = {
  app: APP_LAYOUT,
  standalone: STANDALONE_LAYOUT,
  'standalone-404': STANDALONE_404_LAYOUT,
};

// ---- build --------------------------------------------------------

function build() {
  const config = JSON.parse(read(path.join(ROOT, 'pages.config.json')));

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  for (const page of config) {
    const layout = LAYOUTS[page.layout];
    if (!layout) throw new Error(`Unknown layout "${page.layout}" for page ${page.file}`);

    const contentFile = path.join(PAGES_DIR, `${page.slug}.content.html`);
    const content = read(contentFile).trimEnd();

    const vars = {
      title: page.title,
      isHome: !!page.isHome,
      content,
    };

    const html = render(layout, vars);
    fs.writeFileSync(path.join(DIST_DIR, page.file), html);
    console.log('built', page.file);
  }

  // copy static assets straight through
  for (const item of ['styles.css', 'script.js', 'assets']) {
    const src = path.join(ROOT, item);
    const dest = path.join(DIST_DIR, item);
    fs.cpSync(src, dest, { recursive: true });
  }

  console.log(`\nDone. ${config.length} pages written to /dist`);
}

build();
