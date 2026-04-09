const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const config = require('./structure');

marked.use({
    gfm: true,
    breaks: false
});

const TEMPLATE_FILE = 'index.html';

const MARKERS = {
    DYNAMIC_START: '<!-- DYNAMIC_CONTENT_START -->',
    DYNAMIC_END: '<!-- DYNAMIC_CONTENT_END -->',
    NAV_START: '<!-- NAV_LINKS_START -->',
    NAV_END: '<!-- NAV_LINKS_END -->'
};

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function slugForDomId(s) {
    const slug = String(s || 'x')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return slug || 'family';
}

function renderMarkdown(md) {
    const trimmed = String(md).trim();
    if (!trimmed) return '';
    return marked.parse(trimmed);
}

function parseFrontMatter(raw) {
    if (!raw.startsWith('---\n')) {
        return { data: {}, body: raw.trim() };
    }
    const end = raw.indexOf('\n---\n', 4);
    if (end === -1) {
        return { data: {}, body: raw.trim() };
    }
    const yamlBlock = raw.slice(4, end);
    const body = raw.slice(end + 5).trim();
    const data = {};
    yamlBlock.split('\n').forEach((line) => {
        const m = line.match(/^(\w+):\s*(.*)$/);
        if (m) {
            let val = m[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            data[m[1]] = val;
        }
    });
    return { data, body };
}

function humanizeFilename(file) {
    return file
        .replace(/^\d+-/, '')
        .replace(/\.md$/i, '')
        .replace(/-/g, ' ');
}

function extractTitleAndBodyFromMarkdown(raw, filename) {
    const { data, body } = parseFrontMatter(raw);
    if (data.title) {
        return { title: data.title, body: body.trim() };
    }
    const lines = body.split(/\r?\n/);
    const idx = lines.findIndex((l) => l.trim());
    if (idx === -1) {
        return { title: humanizeFilename(filename || ''), body: '' };
    }
    const titleLine = lines[idx].trim();
    const title = titleLine.replace(/^\d+\.\s*/, '');
    const rest = lines.slice(idx + 1).join('\n').trim();
    return { title, body: rest };
}

function packagesFromNumberedMarkdownFile(raw) {
    const chunks = raw.trim().split(/\n(?=\d+\.\s)/);
    return chunks
        .map((chunk) => {
            const lines = chunk.trim().split(/\r?\n/);
            if (!lines.length || !lines[0].trim()) return null;
            const first = lines[0].trim();
            const m = first.match(/^\d+\.\s*(.+)$/);
            const title = m ? m[1].trim() : first;
            const body = lines.slice(1).join('\n').trim();
            return { title, body };
        })
        .filter((p) => p && (p.title || p.body));
}

function renderPackageCards(packages) {
    return packages
        .map(({ title, body }) => {
            const bodyHtml = renderMarkdown(body);
            if (!title && !bodyHtml.trim()) return '';
            return `
                <article class="service-card">
                    <h3 class="service-card-title">${escapeHtml(title)}</h3>
                    <div class="service-card-body">${bodyHtml}</div>
                </article>`;
        })
        .join('');
}

function loadPackagesFromDir(absDir) {
    if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
        console.warn(`Warning: Services directory missing: ${absDir}`);
        return [];
    }
    const mdFiles = fs.readdirSync(absDir).filter((f) => f.endsWith('.md')).sort();
    const packages = [];
    mdFiles.forEach((file) => {
        const fp = path.join(absDir, file);
        const raw = fs.readFileSync(fp, 'utf8');
        packages.push(extractTitleAndBodyFromMarkdown(raw, file));
    });
    return packages;
}

function loadPackagesFromSplitFile(absFile) {
    if (!fs.existsSync(absFile) || !fs.statSync(absFile).isFile()) {
        console.warn(`Warning: Services file missing: ${absFile}`);
        return [];
    }
    const raw = fs.readFileSync(absFile, 'utf8');
    return packagesFromNumberedMarkdownFile(raw);
}

function generateServicesHtml(section, navItems) {
    if (section.type !== 'services') return '';

    const manifestRel = section.manifestPath || 'content/services-manifest.json';
    const manifestPath = path.join(__dirname, manifestRel);
    if (!fs.existsSync(manifestPath)) {
        console.warn(`Warning: Services manifest not found: ${manifestRel}`);
        return '';
    }

    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
        console.warn(`Warning: Could not parse ${manifestRel}`, e.message);
        return '';
    }

    const families = Array.isArray(manifest.families) ? manifest.families : [];
    if (families.length === 0) {
        console.warn('Warning: services-manifest.json has no families.');
        return '';
    }

    const familiesHtml = families
        .map((fam) => {
            const idSlug = slugForDomId(fam.id);
            const familyTitle = escapeHtml(fam.title || fam.id || 'Untitled');
            const relPath = fam.path;
            if (!relPath || typeof relPath !== 'string') {
                console.warn('Warning: Service family missing path:', fam);
                return '';
            }
            const absPath = path.join(__dirname, relPath);
            let packages = [];
            if (fam.kind === 'dir') {
                packages = loadPackagesFromDir(absPath);
            } else if (fam.kind === 'splitFile') {
                packages = loadPackagesFromSplitFile(absPath);
            } else {
                console.warn('Warning: Unknown service family kind:', fam.kind, fam.id);
                return '';
            }
            const cardsHtml = renderPackageCards(packages);
            if (!cardsHtml.trim()) return '';
            return `
            <div class="service-family" id="services-${idSlug}">
                <h3 class="block-subtitle">${familyTitle}</h3>
                <div class="services-grid">${cardsHtml}
                </div>
            </div>`;
        })
        .join('');

    if (!familiesHtml.trim()) {
        console.warn('Warning: No service families rendered.');
        return '';
    }

    const servicesNav = Array.isArray(navItems) ? navItems.find((n) => n.id === 'services') : null;
    const heading = escapeHtml(manifest.sectionTitle || servicesNav?.title || section.title);
    const intro =
        typeof manifest.intro === 'string' && manifest.intro.trim()
            ? `<div class="services-intro">${renderMarkdown(manifest.intro.trim())}</div>`
            : '';

    return `
    <!-- Generated Section: ${section.title} (from content) -->
    <section id="${section.id}" class="block block-services">
        <div class="container">
            <h2 class="block-title">${heading}</h2>
            ${intro}
            <div class="services-families">${familiesHtml}
            </div>
        </div>
    </section>`;
}

function generateSectionHtml(section) {
    if (section.type !== 'dynamic') return '';

    const folderPath = path.join(__dirname, section.folder);
    if (!fs.existsSync(folderPath)) {
        console.warn(`Warning: Folder ${section.folder} does not exist.`);
        return '';
    }

    const files = fs.readdirSync(folderPath)
        .filter(file => file.endsWith('.mp4'))
        .sort();

    if (files.length === 0) return '';

    // Determine grid class based on file count (max 5)
    const gridCount = Math.min(files.length, 5);
    const gridClass = `grid-${gridCount}`;

    let html = `
    <!-- Generated Section: ${section.title} -->
    <section id="${section.id}" class="block block-ugc">
        <div class="container">
            <h3 class="block-subtitle">${section.title}</h3>
            <div class="video-grid ${gridClass}">`;

    files.forEach(file => {
        const videoPath = path.join(section.folder, file);
        html += `
                <div class="video-item">
                    <video loop muted playsinline preload="metadata">
                        <source src="${videoPath}" type="video/mp4">
                    </video>
                    <button class="sound-toggle"><i class="fas fa-volume-mute"></i></button>
                </div>`;
    });

    html += `
            </div>
            <div class="portfolio-watermark">PORTFOLIO</div>
        </div>
    </section>`;

    return html;
}

function generateNavLinks(navItems) {
    return navItems
        .map((item) => `<a href="#${item.id}">${item.title}</a>`)
        .join('\n                ');
}

function build() {
    console.log('Building site from structure.js...');

    if (!fs.existsSync(TEMPLATE_FILE)) {
        console.error(`Error: ${TEMPLATE_FILE} not found.`);
        process.exit(1);
    }

    let html = fs.readFileSync(TEMPLATE_FILE, 'utf8');

    // 1. Generate and inject Nav Links
    const navItems = config.nav;
    if (!Array.isArray(navItems) || navItems.length === 0) {
        console.error('Error: structure.js must export a non-empty nav array.');
        process.exit(1);
    }
    const navContent = generateNavLinks(navItems);
    html = replaceBetween(html, MARKERS.NAV_START, MARKERS.NAV_END, `\n                ${navContent}\n            `);

    // 2. Services + video portfolio (single #portfolio anchor for all video blocks)
    let dynamicHtml = '';
    let portfolioHtml = '';
    config.sections.forEach((section) => {
        if (section.type === 'services') {
            dynamicHtml += generateServicesHtml(section, navItems);
        } else if (section.type === 'dynamic') {
            portfolioHtml += generateSectionHtml(section);
        }
    });
    if (portfolioHtml.trim()) {
        const portfolioNav = navItems.find((n) => n.id === 'portfolio');
        const portfolioMainTitle = escapeHtml(portfolioNav?.title || 'Portfolio');
        dynamicHtml += `
    <div id="portfolio" class="portfolio-region">
        <div class="container portfolio-region-intro">
            <h2 class="block-title">${portfolioMainTitle}</h2>
        </div>
${portfolioHtml}
    </div>`;
    }
    html = replaceBetween(html, MARKERS.DYNAMIC_START, MARKERS.DYNAMIC_END, dynamicHtml);

    fs.writeFileSync(TEMPLATE_FILE, html);
    console.log('Successfully updated index.html with dynamic navigation and content.');
}

function replaceBetween(content, startMarker, endMarker, newContent) {
    const parts = content.split(startMarker);
    if (parts.length < 2) {
        console.error(`Error: Marker ${startMarker} not found.`);
        return content;
    }
    const suffixParts = parts[1].split(endMarker);
    if (suffixParts.length < 2) {
        console.error(`Error: Marker ${endMarker} not found.`);
        return content;
    }
    return parts[0] + startMarker + newContent + endMarker + suffixParts[1];
}

build();
