const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(__dirname, '..', 'Core Rules [Warhammer 40,000 11th edition].html');
if (!fs.existsSync(htmlPath)) {
  console.error('File not found:', htmlPath);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');

const regex = /<h([234])[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[234]|$)/gi;
const sections = [];
let match;

while ((match = regex.exec(html)) !== null) {
  const level = parseInt(match[1], 10);
  const id = match[2];
  const headerHtml = match[3];
  const bodyHtml = match[4];

  const numMatch = headerHtml.match(/class="h_number">([^<]+)<\/span>/);
  const sectionNum = numMatch ? numMatch[1].trim() : '';
  const title = headerHtml.replace(/<[^>]+>/g, '').trim();

  let bodyText = bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<hr[^>]*>/gi, '\n')
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  // Exclude advertising or navigation garbage
  if (
    title &&
    !title.toLowerCase().includes('yandex') &&
    !title.toLowerCase().includes('books') &&
    (sectionNum || bodyText.length > 80)
  ) {
    sections.push({
      id,
      title,
      sectionNum,
      level,
      text: bodyText
    });
  }
}

console.log(`Extracted ${sections.length} rule sections.`);

// Write to client/public/data/rules_reference.json
const outDir = path.resolve(__dirname, '..', 'client', 'public', 'data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, 'rules_reference.json');
fs.writeFileSync(outPath, JSON.stringify(sections, null, 2), 'utf8');
console.log(`Saved to ${outPath}`);

