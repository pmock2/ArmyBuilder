const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(__dirname, '..', 'Core Rules [Warhammer 40,000 11th edition].html');
const filesDir = path.resolve(__dirname, '..', 'Core Rules [Warhammer 40,000 11th edition]_files');

if (!fs.existsSync(htmlPath)) {
  console.error('File not found:', htmlPath);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');

function cleanHtmlText(snippet) {
  return snippet
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<hr[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract balanced <div ...>...</div> starting at startIndex.
 */
function extractBalancedDiv(source, startIndex) {
  const openTagEnd = source.indexOf('>', startIndex);
  if (openTagEnd === -1) return { html: '', endIndex: startIndex };
  let depth = 1;
  let pos = openTagEnd + 1;
  const tagRegex = /<\/?div\b[^>]*>/gi;
  tagRegex.lastIndex = pos;
  let match;
  while ((match = tagRegex.exec(source)) !== null) {
    if (match[0].startsWith('</')) {
      depth--;
      if (depth === 0) {
        return {
          html: source.slice(startIndex, match.index + match[0].length),
          endIndex: match.index + match[0].length
        };
      }
    } else if (!match[0].endsWith('/>')) {
      depth++;
    }
  }
  return { html: source.slice(startIndex, Math.min(source.length, startIndex + 4000)), endIndex: Math.min(source.length, startIndex + 4000) };
}

function humanizeFilename(fileName) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d+)/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
}

const rawEntries = [];

// 1. Standard h2 / h3 / h4 headings (stop body before next heading OR str11Wrap OR abWrap)
const headingRegex = /<h([234])([^>]*)>([\s\S]*?)<\/h\1>/gi;
const allHeadings = [];
let m;
while ((m = headingRegex.exec(html)) !== null) {
  const level = parseInt(m[1], 10);
  const attrs = m[2];
  const headerHtml = m[3];
  const idMatch = attrs.match(/id="([^"]+)"/i);
  const numMatch = headerHtml.match(/class="h_number">([^<]+)<\/span>/i);
  const sectionNum = numMatch ? numMatch[1].trim() : '';
  const title = cleanHtmlText(headerHtml).replace(/\s+/g, ' ').trim();
  const id = idMatch ? idMatch[1] : (sectionNum ? `sec-${sectionNum}` : title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  allHeadings.push({
    index: m.index,
    endOfTag: m.index + m[0].length,
    level,
    id,
    title,
    sectionNum
  });
}

// Also record start positions of str11Wrap and abWrap so standard heading bodies don't swallow them
const cardMarkers = [];
const strStartRegex = /<div\s+class="str11Wrap"/gi;
while ((m = strStartRegex.exec(html)) !== null) {
  cardMarkers.push({ type: 'str11', index: m.index });
}
const abStartRegex = /<div\s+class="abWrap\b[^"]*"/gi;
while ((m = abStartRegex.exec(html)) !== null) {
  cardMarkers.push({ type: 'ab', index: m.index });
}

const allBoundaryIndices = [
  ...allHeadings.map(h => h.index),
  ...cardMarkers.map(c => c.index),
  html.length
].sort((a, b) => a - b);

function nextBoundaryAfter(pos) {
  for (const idx of allBoundaryIndices) {
    if (idx > pos) return idx;
  }
  return html.length;
}

for (const h of allHeadings) {
  const lowerTitle = h.title.toLowerCase();
  if (!h.title || lowerTitle.includes('yandex') || lowerTitle === 'books' || lowerTitle === 'faq' || lowerTitle === 'errata') {
    continue;
  }
  const bodyEnd = nextBoundaryAfter(h.endOfTag);
  const bodyText = cleanHtmlText(html.slice(h.endOfTag, bodyEnd));
  if (h.sectionNum || bodyText.length > 80) {
    rawEntries.push({
      pos: h.index,
      id: h.id,
      title: h.title,
      sectionNum: h.sectionNum,
      level: h.level,
      text: bodyText
    });
  }
}

// 2. Extract all str11Wrap cards (Move types, Shooting types, Charge/Fight types, Core Stratagems, Disembark, etc.)
for (const marker of cardMarkers) {
  if (marker.type === 'str11') {
    const { html: cardHtml } = extractBalancedDiv(html, marker.index);
    const nameMatch = cardHtml.match(/class="str11HeadBlock str11Name"[^>]*>([\s\S]*?)<\/div>/i);
    if (!nameMatch) continue;
    const idMatch = cardHtml.match(/<div\s+id="([^"]+)"\s+class="str11HeadBlock str11Name"/i);
    const numMatch = nameMatch[1].match(/class="h_number">([^<]+)<\/span>/i);
    const sectionNum = numMatch ? numMatch[1].trim() : '';
    const titleBase = cleanHtmlText(nameMatch[1].replace(/<span[^>]*class="h_number"[^>]*>[\s\S]*?<\/span>/i, ''));
    const cpMatch = cardHtml.match(/class="str11CP"[^>]*>([\s\S]*?)<\/div>/i);
    const cpCost = cpMatch ? cleanHtmlText(cpMatch[1]) : '';
    const typeMatch = cardHtml.match(/class="str11Type[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const cardType = typeMatch ? cleanHtmlText(typeMatch[1]) : '';
    const textMatch = cardHtml.match(/class="str11Text"[^>]*>([\s\S]*)/i);
    const bodyText = textMatch ? cleanHtmlText(textMatch[1]) : cleanHtmlText(cardHtml);

    const headerPrefix = [cardType, cpCost].filter(Boolean).join(' • ');
    const fullText = headerPrefix ? `${headerPrefix}\n${bodyText}` : bodyText;
    const title = sectionNum ? `${titleBase} ${sectionNum}` : titleBase;
    const id = idMatch ? idMatch[1] : (sectionNum ? `rule-${sectionNum}` : titleBase.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

    rawEntries.push({
      pos: marker.index,
      id,
      title,
      sectionNum,
      level: 3,
      text: fullText
    });
  } else if (marker.type === 'ab') {
    const { html: cardHtml } = extractBalancedDiv(html, marker.index);
    const nameMatch = cardHtml.match(/class="abName"[^>]*>([\s\S]*?)<\/div>/i);
    if (!nameMatch) continue;
    const numMatch = nameMatch[1].match(/class="h_number">([^<]+)<\/span>/i);
    const sectionNum = numMatch ? numMatch[1].trim() : '';
    const titleBase = cleanHtmlText(nameMatch[1].replace(/<span[^>]*class="h_number"[^>]*>[\s\S]*?<\/span>/i, ''));
    const bodyHtml = cardHtml.replace(/<div class="abNameWrap">[\s\S]*?<\/div>\s*<\/div>/i, '');
    const bodyText = cleanHtmlText(bodyHtml);
    const title = sectionNum ? `${titleBase} ${sectionNum}` : titleBase;
    const id = sectionNum ? `ability-${sectionNum}` : titleBase.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    rawEntries.push({
      pos: marker.index,
      id,
      title,
      sectionNum,
      level: 3,
      text: bodyText
    });
  }
}

// Sort by document order and deduplicate by sectionNum (preferring longer text) or id
rawEntries.sort((a, b) => a.pos - b.pos);
const seenKeys = new Map();
const sections = [];
for (const entry of rawEntries) {
  const key = entry.sectionNum ? `num:${entry.sectionNum}` : `id:${entry.id.toLowerCase()}`;
  if (seenKeys.has(key)) {
    const existingIdx = seenKeys.get(key);
    if (entry.text.length > sections[existingIdx].text.length) {
      sections[existingIdx] = {
        id: entry.id,
        title: entry.title,
        sectionNum: entry.sectionNum,
        level: entry.level,
        text: entry.text
      };
    }
    continue;
  }
  seenKeys.set(key, sections.length);
  sections.push({
    id: entry.id,
    title: entry.title,
    sectionNum: entry.sectionNum,
    level: entry.level,
    text: entry.text
  });
}

// 3. Extract instructional rules diagrams (>= 10 KB) + titles + captions + parent sections
const outDir = path.resolve(__dirname, '..', 'client', 'public', 'data');
const imgOutDir = path.join(outDir, 'rules_images');
fs.mkdirSync(imgOutDir, { recursive: true });

const validHeadings = allHeadings.filter(
  h => h.title && !['faq', 'errata', 'books'].includes(h.title.toLowerCase()) && !h.title.toLowerCase().includes('yandex')
);

function findNearestSection(pos) {
  let best = null;
  for (const h of validHeadings) {
    if (h.index < pos) best = h;
    else break;
  }
  return best;
}

const diagrams = [];
if (fs.existsSync(filesDir)) {
  const imgFiles = fs
    .readdirSync(filesDir)
    .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f) && fs.statSync(path.join(filesDir, f)).size >= 10 * 1024)
    .sort();

  for (const fileName of imgFiles) {
    // Copy image to client/public/data/rules_images
    fs.copyFileSync(path.join(filesDir, fileName), path.join(imgOutDir, fileName));

    const idx = html.indexOf(fileName);
    if (idx === -1) continue;

    const afterImg = html.slice(idx, idx + 4500);
    const titleMatch = afterImg.match(/<div class="h_img11">([\s\S]*?)<\/div>/i);
    const title = titleMatch ? cleanHtmlText(titleMatch[1]) : humanizeFilename(fileName);

    let caption = '';
    const capRelIdx = afterImg.search(/<div class="BreakInsideAvoid frameDark[^"]*">/i);
    if (capRelIdx !== -1 && capRelIdx < 900) {
      const { html: capHtml } = extractBalancedDiv(html, idx + capRelIdx);
      caption = cleanHtmlText(capHtml).slice(0, 1200);
    }

    const parent = findNearestSection(idx);
    diagrams.push({
      file: fileName,
      title,
      caption,
      sectionNum: parent?.sectionNum || '',
      sectionTitle: parent?.title || ''
    });
  }
}

const outPath = path.join(outDir, 'rules_reference.json');
fs.writeFileSync(outPath, JSON.stringify(sections, null, 2), 'utf8');

const imagesOutPath = path.join(outDir, 'rules_images.json');
fs.writeFileSync(imagesOutPath, JSON.stringify(diagrams, null, 2), 'utf8');

const numberedCount = sections.filter(s => s.sectionNum).length;
console.log(`Extracted ${sections.length} total rule sections (${numberedCount} numbered) -> ${outPath}`);
console.log(`Extracted ${diagrams.length} rules diagrams -> ${imagesOutPath} & ${imgOutDir}`);
