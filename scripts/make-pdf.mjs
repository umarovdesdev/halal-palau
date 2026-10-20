import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'out');
const runOutDir = '/Users/umarovdesdev/.ace/runs/54-menu/out';

const ALL_LANGS = ['kk', 'ru', 'tr', 'en', 'ru-kk'];

function parseArgs(argv) {
  let allLangs = false;
  let lang = 'ru-kk';
  let explicitLang = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--all-langs') {
      allLangs = true;
    } else if (arg === '--lang' && i + 1 < argv.length) {
      lang = argv[i + 1];
      explicitLang = true;
      i++;
    } else if (arg.startsWith('--lang=')) {
      lang = arg.slice('--lang='.length);
      explicitLang = true;
    }
  }

  if (!ALL_LANGS.includes(lang)) {
    throw new Error(`Unsupported --lang "${lang}". Allowed: ${ALL_LANGS.join(', ')}`);
  }

  return { allLangs, lang, explicitLang };
}

function startPreviewServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['vite', 'preview', '--host', '127.0.0.1', '--port', '0', '--strictPort', 'false'],
      {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    let output = '';
    const onData = (chunk) => {
      output += chunk.toString();
      const stripped = output.replace(/\x1b\[[0-9;]*m/g, '');
      const match = stripped.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        resolve({ proc, url: `http://127.0.0.1:${match[1]}` });
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', reject);
    setTimeout(() => {
      reject(new Error(`Timeout waiting for vite preview. Output:\n${output}`));
    }, 15000);
  });
}

async function renderLang(page, baseUrl, lang, writeLangSuffix, writeDefaultFiles) {
  const copiedFiles = [];

  // --- A3 ---
  console.log(`   [lang=${lang}] Rendering print.html?format=a3&lang=${lang}...`);
  await page.goto(`${baseUrl}/print.html?format=a3&lang=${encodeURIComponent(lang)}`, {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(() => window.__menuReady === true, null, { timeout: 15000 });

  const a3Fit = await page.getAttribute('body', 'data-fit');
  const a3Scale = await page.getAttribute('body', 'data-scale');
  const a3ItemsCount = await page.locator('[data-item]').count();
  console.log(`   A3 (${lang}) data-fit=${a3Fit}, scale=${a3Scale}, items=${a3ItemsCount}`);

  if (a3Fit !== 'ok') {
    throw new Error(`A3 (${lang}) layout overflowed (data-fit=${a3Fit})`);
  }

  if (writeLangSuffix) {
    const pdfName = `menu-a3-${lang}.pdf`;
    await page.pdf({
      path: path.join(outDir, pdfName),
      preferCSSPageSize: true,
      printBackground: true,
    });
    copiedFiles.push(pdfName);
  }

  if (writeDefaultFiles) {
    const a3Sheet = page.locator('[data-sheet="a3-1"]');
    await a3Sheet.screenshot({ path: path.join(outDir, 'a3.png') });
    await page.pdf({
      path: path.join(outDir, 'menu-a3.pdf'),
      preferCSSPageSize: true,
      printBackground: true,
    });
    copiedFiles.push('menu-a3.pdf', 'a3.png');
  }

  // --- A4 ---
  console.log(`   [lang=${lang}] Rendering print.html?format=a4&lang=${lang}...`);
  await page.goto(`${baseUrl}/print.html?format=a4&lang=${encodeURIComponent(lang)}`, {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(() => window.__menuReady === true, null, { timeout: 15000 });

  const a4Fit = await page.getAttribute('body', 'data-fit');
  const a4Scale = await page.getAttribute('body', 'data-scale');
  const a4ItemsCount = await page.locator('[data-item]').count();
  console.log(`   A4 (${lang}) data-fit=${a4Fit}, scale=${a4Scale}, items=${a4ItemsCount}`);

  if (a4Fit !== 'ok') {
    throw new Error(`A4 (${lang}) layout overflowed (data-fit=${a4Fit})`);
  }

  if (writeLangSuffix) {
    const pdfName = `menu-a4-${lang}.pdf`;
    await page.pdf({
      path: path.join(outDir, pdfName),
      preferCSSPageSize: true,
      printBackground: true,
    });
    copiedFiles.push(pdfName);
  }

  if (writeDefaultFiles) {
    const a4Sheet1 = page.locator('[data-sheet="a4-1"]');
    const a4Sheet2 = page.locator('[data-sheet="a4-2"]');
    await a4Sheet1.screenshot({ path: path.join(outDir, 'a4-1.png') });
    await a4Sheet2.screenshot({ path: path.join(outDir, 'a4-2.png') });
    await page.pdf({
      path: path.join(outDir, 'menu-a4.pdf'),
      preferCSSPageSize: true,
      printBackground: true,
    });
    copiedFiles.push('menu-a4.pdf', 'a4-1.png', 'a4-2.png');
  }

  for (const file of copiedFiles) {
    fs.copyFileSync(path.join(outDir, file), path.join(runOutDir, file));
  }
}

async function main() {
  const { allLangs, lang, explicitLang } = parseArgs(process.argv.slice(2));

  console.log('1. Running vite build...');
  execSync('npx vite build', { cwd: projectRoot, stdio: 'inherit' });

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(runOutDir, { recursive: true });

  console.log('2. Starting vite preview server...');
  const { proc, url } = await startPreviewServer();
  console.log(`   Preview server running at ${url}`);

  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 2600 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    if (allLangs) {
      console.log(`3. Rendering all 5 languages (${ALL_LANGS.join(', ')})...`);
      for (const l of ALL_LANGS) {
        const isDefault = l === 'ru-kk';
        await renderLang(page, url, l, true, isDefault);
      }
      console.log('4. Successfully generated and copied all-langs PDF/PNG files.');
    } else {
      console.log(`3. Rendering language "${lang}"...`);
      await renderLang(page, url, lang, explicitLang, true);
      console.log('4. Successfully generated and copied PDF/PNG files.');
    }
  } finally {
    if (browser) await browser.close();
    proc.kill('SIGTERM');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('PDF generation failed:', err);
  process.exit(1);
});
