const fs = require('fs');

const original = fs.readFileSync('D:\\Descargas\\SmartTwitchTV - pre Google AI\\app\\index.html', 'utf8');

// Replace inline style block with external link
const html = original.replace(
  /<style>[\s\S]*?<\/style>/,
  '<link rel="stylesheet" href="githubio/css/app.css" />'
);

fs.writeFileSync('D:\\Descargas\\SmartTwitchTV\\app\\index.html', html);
console.log('Wrote index.html:', html.length, 'chars');
console.log('Size KB:', Math.round(html.length / 1024));

// Verify
const styleCount = (html.match(/<style>/g) || []).length;
console.log('Inline style blocks remaining:', styleCount);
console.log('Has link tag:', html.includes('githubio/css/app.css'));
