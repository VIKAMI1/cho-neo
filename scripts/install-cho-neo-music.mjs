import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const pagePath = path.join(repoRoot, 'src/app/cho-neo/page.tsx');
const componentImport = "import ChoNeoThemeParkAudio from '@/components/cho-neo/ChoNeoThemeParkAudio';";
const componentTag = '      <ChoNeoThemeParkAudio />';

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(pagePath)) {
  fail('Cannot find src/app/cho-neo/page.tsx. Run this from the root of /Users/baonguyen/dev/cho-neo.');
}

let page = fs.readFileSync(pagePath, 'utf8');
const backupPath = `${pagePath}.bak.cho-neo-music`;
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, page, 'utf8');
}

if (!page.includes(componentImport)) {
  const lines = page.split('\n');
  let insertAt = 0;
  if (lines[0]?.trim() === "'use client';" || lines[0]?.trim() === '"use client";' || lines[0]?.trim() === '"use client"') {
    insertAt = 1;
  }
  while (insertAt < lines.length && lines[insertAt].trim() === '') insertAt += 1;
  lines.splice(insertAt, 0, componentImport);
  page = lines.join('\n');
}

if (!page.includes('<ChoNeoThemeParkAudio')) {
  if (page.includes('</main>')) {
    page = page.replace(/\n\s*<\/main>/, `\n${componentTag}\n    </main>`);
  } else if (page.includes('</section>')) {
    page = page.replace(/\n\s*<\/section>(?![\s\S]*<\/section>)/, `\n${componentTag}\n    </section>`);
  } else if (page.includes('</div>')) {
    page = page.replace(/\n\s*<\/div>(?![\s\S]*<\/div>)/, `\n${componentTag}\n    </div>`);
  } else {
    fail('I added the import but could not safely place <ChoNeoThemeParkAudio />. Add it manually near the bottom of the page JSX.');
  }
}

fs.writeFileSync(pagePath, page, 'utf8');
console.log('\n✅ Chợ Neo music attached.');
console.log('   Assets: public/Cho_Neo_music/');
console.log('   Component: src/components/cho-neo/ChoNeoThemeParkAudio.tsx');
console.log('   Page backup:', path.relative(repoRoot, backupPath));
console.log('\nNext: npm run dev and open /cho-neo.\n');
