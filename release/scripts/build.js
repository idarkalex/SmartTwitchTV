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

function read(file) {
    return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
}

function tryExec(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch (e) {
        return null;
    }
}

// Check tools
const canUglify = tryExec('npx uglifyjs --version') !== null;
const canHtmlMin = tryExec('npx html-minifier --version') !== null;
const canCrass = tryExec('npx crass --version') !== null;

console.log('\n=== SmartTwitchTV Build Script ===\n');
console.log(`uglifyjs: ${canUglify ? 'OK' : 'MISSING'}`);
console.log(`html-minifier: ${canHtmlMin ? 'OK' : 'MISSING'}`);
console.log(`crass: ${canCrass ? 'OK' : 'MISSING'}\n`);

// Extract API wrapper parts (matching release_maker.sh sed logic)
// main_start = content between APISTART and APIMID markers (exclusive)
// main_end = content between APICENTER and APIEND markers (exclusive)
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
    // Concatenate all JS
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

    // Minify JS
    const minifiedPath = path.join(RELEASE, 'githubio', 'js', 'main.js');
    if (canUglify) {
        console.log('Minifying JS...');
        const result = tryExec(`npx uglifyjs "${uncompressedPath}" -c -m toplevel=true,eval=true -o "${minifiedPath}"`);
        if (result !== null || fs.existsSync(minifiedPath)) {
            const size = fs.statSync(minifiedPath).size;
            console.log(`  -> main.js (${(size / 1024).toFixed(0)} KB)`);
        } else {
            console.log('  uglifyjs failed, using uncompressed');
            fs.copyFileSync(uncompressedPath, minifiedPath);
        }
    } else {
        fs.copyFileSync(uncompressedPath, minifiedPath);
    }

    // Minify Extrapage.js
    const extrapageSrc = path.join(APP, 'Extrapage', 'Extrapage.js');
    const extrapageDst = path.join(RELEASE, 'githubio', 'js', 'Extrapage.js');
    if (canUglify) {
        tryExec(`npx uglifyjs "${extrapageSrc}" -c -m toplevel=true,eval=true -o "${extrapageDst}"`);
    }
    if (!fs.existsSync(extrapageDst)) fs.copyFileSync(extrapageSrc, extrapageDst);

    // Build release/index.html
    console.log('\nBuilding release/index.html...');
    let html = read(path.join(APP, 'index.html'));
    html = html.replace(/<!-- jsstart[\s\S]*?jsend-->/, '<script src="githubio/js/main.js" defer></script>');
    html = html.replace(/\.\.\/release\//g, '');
    html = html.replace(/css\/icons\.css/g, 'css/icons.min.css');
    html = html.replace(/css\/app\.css/g, 'css/app.min.css');

    if (canHtmlMin) {
        fs.mkdirSync(TEMP, { recursive: true });
        write(path.join(TEMP, '_index.html'), html);
        const min = tryExec(`npx html-minifier --collapse-whitespace --remove-comments --remove-optional-tags --remove-redundant-attributes --remove-script-type-attributes --use-short-doctype --minify-css true --minify-js true "${path.join(TEMP, '_index.html')}"`);
        if (min) html = min;
    }
    write(path.join(RELEASE, 'index.html'), html);
    console.log(`  -> release/index.html (${(html.length / 1024).toFixed(0)} KB)`);

    // Build release/extrapageindex.html
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

    // Compress CSS
    if (canCrass) {
        console.log('Minifying CSS...');
        
        // Minify icons.css
        const iconsSrc = path.join(RELEASE, 'githubio', 'css', 'icons.css');
        const iconsDst = path.join(RELEASE, 'githubio', 'css', 'icons.min.css');
        if (fs.existsSync(iconsSrc)) {
            write(path.join(TEMP, '_icons.css'), read(iconsSrc));
            const minCSS = tryExec(`npx crass "${path.join(TEMP, '_icons.css')}"`);
            if (minCSS) {
                write(iconsDst, minCSS);
                console.log(`  -> icons.min.css (${(minCSS.length / 1024).toFixed(0)} KB)`);
            }
        }
        
        // Minify app.css
        const appCssSrc = path.join(APP, 'css', 'app.css');
        const appCssDst = path.join(RELEASE, 'githubio', 'css', 'app.min.css');
        if (fs.existsSync(appCssSrc)) {
            write(path.join(TEMP, '_app.css'), read(appCssSrc));
            const minCSS = tryExec(`npx crass "${path.join(TEMP, '_app.css')}"`);
            if (minCSS) {
                write(appCssDst, minCSS);
                console.log(`  -> app.min.css (${(minCSS.length / 1024).toFixed(0)} KB)`);
            }
        }
    }

    console.log('\n=== Build complete ===\n');
} finally {
    // Restore Main_Start() in source
    mainJsSrc = read(mainJsPath);
    write(mainJsPath, mainJsSrc.replace('//Main_Start();', 'Main_Start();'));
    // Cleanup temp
    try { fs.rmSync(TEMP, { recursive: true, force: true }); } catch {}
}
