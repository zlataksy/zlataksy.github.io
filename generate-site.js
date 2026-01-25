const fs = require('fs');
const path = require('path');
const config = require('./structure');

const TEMPLATE_FILE = 'index.html';

const MARKERS = {
    DYNAMIC_START: '<!-- DYNAMIC_CONTENT_START -->',
    DYNAMIC_END: '<!-- DYNAMIC_CONTENT_END -->',
    NAV_START: '<!-- NAV_LINKS_START -->',
    NAV_END: '<!-- NAV_LINKS_END -->'
};

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
            <h2 class="block-title">${section.title}</h2>
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

function generateNavLinks(sections) {
    return sections.map(section => {
        return `<a href="#${section.id}">${section.title}</a>`;
    }).join('\n                ');
}

function build() {
    console.log('Building site from structure.js...');

    if (!fs.existsSync(TEMPLATE_FILE)) {
        console.error(`Error: ${TEMPLATE_FILE} not found.`);
        process.exit(1);
    }

    let html = fs.readFileSync(TEMPLATE_FILE, 'utf8');

    // 1. Generate and inject Nav Links
    const navContent = generateNavLinks(config.sections);
    html = replaceBetween(html, MARKERS.NAV_START, MARKERS.NAV_END, `\n                ${navContent}\n            `);

    // 2. Generate and inject Dynamic Portfolio Sections
    let dynamicHtml = '';
    config.sections.forEach(section => {
        dynamicHtml += generateSectionHtml(section);
    });
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
