#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const RELEASE = path.join(ROOT, 'release');
const APP = path.join(ROOT, 'app');
const TEMP = path.join(RELEASE, 'temp_maker');

const JS_FOLDERS = [
    path.join(APP, 'languages'),
    path.join(APP, 'general'),
    path.join(APP, 'specific'),
    path.join(APP, 'thirdparty')
];

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
}
function tryExec(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch (e) { return null; }
}
function simpleMin(cssText) {
    return cssText
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .replace(/;}/g, '}');
}

console.log('\n=== SmartTwitchTV Build Script ===\n');

// Extract API wrapper parts
const apiLines = read(path.join(RELEASE, 'api.js')).split('\n');
let startIdx = apiLines.findIndex(l => l.includes('APISTART'));
let midIdx = apiLines.findIndex(l => l.includes('APIMID'));
let centerIdx = apiLines.findIndex(l => l.includes('APICENTER'));
let endIdx = apiLines.findIndex(l => l.includes('APIEND'));

const apiStart = startIdx >= 0 && midIdx >= 0 ? apiLines.slice(startIdx + 1, midIdx).join('\n') : '';
const apiEnd = centerIdx >= 0 && endIdx >= 0 ? apiLines.slice(centerIdx + 1, endIdx).join('\n') : '';

// Comment out Main_Start() for bundle
const mainJsPath = path.join(APP, 'specific', 'Main.js');
let mainJsSrc = read(mainJsPath);
write(mainJsPath, mainJsSrc.replace('Main_Start();', '//Main_Start();'));

try {
    // 1. Concatenate all JS
    console.log('Concatenating JS...');
    let js = '/* jshint eqeqeq: true, laxbreak: true, undef: true, unused: true, node: true, browser: true */\n';
    js += '/*globals Android, punycode, smartTwitchTV, firebase, dataLayer, ActiveXObject, Twitch */\n';
    js += '/* exported Play_CheckResume */\n';
    js += apiStart + '\n';

    for (const folder of JS_FOLDERS) {
        for (const f of fs.readdirSync(folder).filter(x => x.endsWith('.js')).sort()) {
            console.log(`  ${f}`);
            js += read(path.join(folder, f)) + '\n';
        }
    }
    js += apiEnd + '\n';

    const uncompressedPath = path.join(RELEASE, 'githubio', 'js', 'main_uncompressed.js');
    write(uncompressedPath, js);
    console.log(`  -> main_uncompressed.js (${(js.length / 1024).toFixed(0)} KB)`);

    // 2. Minify JS
    const minifiedPath = path.join(RELEASE, 'githubio', 'js', 'main.js');
    console.log('Minifying JS...');
    const uglifyResult = tryExec(`npx uglifyjs "${uncompressedPath}" -c -m toplevel=true,eval=true -o "${minifiedPath}"`);
    if (fs.existsSync(minifiedPath)) {
        console.log(`  -> main.js (${(fs.statSync(minifiedPath).size / 1024).toFixed(0)} KB)`);
    } else {
        fs.copyFileSync(uncompressedPath, minifiedPath);
        console.log('  uglifyjs failed, using uncompressed');
    }

    // Sanity check: multi-stream module present in bundle
    const bundle = read(uncompressedPath);
    if (!/function Play_MultiStart|Play_MultiSetPanelInfo/.test(bundle)) {
        console.error('  WARNING: PlayMulti functions missing from bundle!');
    } else {
        console.log('  OK: PlayMulti functions present');
    }

    // 3. Build release/index.html
    console.log('\nBuilding release/index.html...');
    let html = read(path.join(APP, 'index.html'));
    html = html.replace(/<!-- jsstart[\s\S]*?jsend-->/, '<script src="githubio/js/main.js" defer></script>');
    html = html.replace(/\.\.\/release\//g, '');
    html = html.replace(/css\/icons\.css/g, 'css/icons.min.css');
    html = html.replace(/css\/app\.css/g, 'css/app.min.css');

    const canHtmlMin = tryExec('npx html-minifier --version') !== null;
    if (canHtmlMin) {
        fs.mkdirSync(TEMP, { recursive: true });
        write(path.join(TEMP, '_index.html'), html);
        const min = tryExec(`npx html-minifier --collapse-whitespace --remove-comments --remove-optional-tags --remove-redundant-attributes --remove-script-type-attributes --use-short-doctype --minify-css true --minify-js true "${path.join(TEMP, '_index.html')}"`);
        if (min) html = min;
    }
    write(path.join(RELEASE, 'index.html'), html);
    console.log(`  -> release/index.html (${(html.length / 1024).toFixed(0)} KB)`);

    // 4. Build release/extrapageindex.html
    console.log('Building release/extrapageindex.html...');
    let exhtml = read(path.join(APP, 'Extrapage', 'index.html'));
    exhtml = exhtml.replace(/<!-- jsstart[\s\S]*?jsend-->/, '<script src="githubio/js/Extrapage.js" defer></script>');
    exhtml = exhtml.replace(/\.\.\/release\//g, '');
    exhtml = exhtml.replace(/css\/icons\.css/g, 'css/icons.min.css');

    if (canHtmlMin) {
        write(path.join(TEMP, '_extrapage.html'), exhtml);
        const min = tryExec(`npx html-minifier --collapse-whitespace --remove-comments --remove-optional-tags --remove-redundant-attributes --remove-script-type-attributes --use-short-doctype --minify-css true --minify-js true "${path.join(TEMP, '_extrapage.html')}"`);
        if (min) exhtml = min;
    }
    write(path.join(RELEASE, 'extrapageindex.html'), exhtml);
    console.log(`  -> release/extrapageindex.html`);

    // 5. CSS: concatenate modules (order from app.css @imports), then minify with crass
    console.log('\nBuilding CSS...');
    const cssModulesDir = path.join(APP, 'css', 'modules');
    let appCssContent = '';
    if (fs.existsSync(cssModulesDir)) {
        const importRe = /@import\s+url\(['"]modules\/([\w.-]+\.css)['"]\)/g;
        const indexContent = read(path.join(APP, 'css', 'app.css'));
        const orderedFiles = [];
        let m;
        while ((m = importRe.exec(indexContent)) !== null) orderedFiles.push(m[1]);
        for (const file of orderedFiles) {
            appCssContent += read(path.join(cssModulesDir, file)) + '\n';
        }
        if (!orderedFiles.length) throw new Error('No @import entries found in app/css/app.css');
        console.log(`  Concatenated ${orderedFiles.length} CSS modules (${(appCssContent.length / 1024).toFixed(0)} KB)`);
    } else {
        appCssContent = read(path.join(APP, 'css', 'app.css'));
    }

    // Icons CSS (source lives in githubio/css/icons.css)
    const iconsSrc = path.join(RELEASE, 'githubio', 'css', 'icons.css');
    const iconsDst = path.join(RELEASE, 'githubio', 'css', 'icons.min.css');
    if (fs.existsSync(iconsSrc)) {
        fs.mkdirSync(TEMP, { recursive: true });
        write(path.join(TEMP, '_icons.css'), read(iconsSrc));
        const minIcons = tryExec(`npx crass "${path.join(TEMP, '_icons.css')}"`);
        if (minIcons) {
            write(iconsDst, minIcons);
            console.log(`  -> icons.min.css (${(minIcons.length / 1024).toFixed(0)} KB) [crass]`);
        } else {
            write(iconsDst, simpleMin(read(iconsSrc)));
            console.log(`  -> icons.min.css [simple min - crass FAILED]`);
        }
    }

    // App CSS
    const appCssDst = path.join(RELEASE, 'githubio', 'css', 'app.min.css');
    write(path.join(TEMP, '_app.css'), appCssContent);
    const minApp = tryExec(`npx crass "${path.join(TEMP, '_app.css')}"`);
    if (minApp) {
        write(appCssDst, minApp);
        console.log(`  -> app.min.css (${(minApp.length / 1024).toFixed(0)} KB) [crass]`);
    } else {
        write(appCssDst, simpleMin(appCssContent));
        console.log(`  -> app.min.css (${(simpleMin(appCssContent).length / 1024).toFixed(0)} KB) [simple min - crass FAILED]`);
    }

    console.log('\n=== Build complete ===\n');
} finally {
    // Restore Main_Start() in source
    mainJsSrc = read(mainJsPath);
    write(mainJsPath, mainJsSrc.replace('//Main_Start();', 'Main_Start();'));
    // Cleanup temp
    try { fs.rmSync(TEMP, { recursive: true, force: true }); } catch {}
}
