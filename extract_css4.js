const fs = require('fs');
const content = fs.readFileSync('D:\\Descargas\\SmartTwitchTV - pre Google AI\\app\\index.html', 'utf8');

// Find all style blocks
const styleBlocks = [];
let pos = 0;
while (true) {
    const start = content.indexOf('<style', pos);
    if (start === -1) break;
    const endTagStart = content.indexOf('>', start);
    const end = content.indexOf('</style>', endTagStart);
    if (end === -1) break;
    const fullBlock = content.substring(start, end + 8);
    const inner = content.substring(endTagStart + 1, end);
    styleBlocks.push({ fullBlock, inner, start, end: end + 8 });
    pos = end + 8;
}

console.log('Found', styleBlocks.length, 'style blocks:');
styleBlocks.forEach((b, i) => {
    const isMockup = b.fullBlock.includes('mockup-ui-style');
    const isMain = i === 6;
    console.log(`  ${i}: ${b.inner.length} chars, main=${isMain}, mockup=${isMockup}`);
});

const mainStyle = styleBlocks[6].inner;
const mockupStyle = styleBlocks.find(b => b.fullBlock.includes('mockup-ui-style'))?.inner || '';

console.log('Main:', mainStyle.length);
console.log('Mockup:', mockupStyle.length);

const combined = mainStyle + '\n\n' + mockupStyle;
console.log('Combined:', combined.length);

fs.writeFileSync('D:\\Descargas\\SmartTwitchTV\\app\\css\\app.css.clean3', combined);
console.log('Saved clean3');