const fs = require('fs');

// Read the files
const indexHTML = fs.readFileSync('D:\\Descargas\\SmartTwitchTV\\app\\index.html', 'utf8');
const mockupCSS = fs.readFileSync('D:\\Descargas\\SmartTwitchTV\\backup\\mockup_css.html', 'utf8');

// Extract mockup CSS content (between style tags)
const mockupStart = mockupCSS.indexOf('<style id="mockup-ui-style">') + '<style id="mockup-ui-style">'.length;
const mockupEnd = mockupCSS.indexOf('</style>', mockupStart);
const mockupCSSContent = mockupCSS.substring(mockupStart, mockupEnd);

// Add mockup CSS as overlay style
const overlayStyle = '<style id="mockup-ui-style">\n' + mockupCSSContent + '\n</style>';

// Add it before </head>
const html = indexHTML.replace('</head>', overlayStyle + '\n</head>');

// Clean problematic inline styles from side panel elements
// These were originally inline #000000 backgrounds that should use CSS classes
let cleaned = html
  .replace(/style="background-color: transparent"/g, '')  // Keep transparent ones
  .replace(/style="background: transparent"/g, '');  // Keep transparent ones

// Save
fs.writeFileSync('D:\\Descargas\\SmartTwitchTV\\app\\index.html', html);
console.log('Updated index.html with mockup CSS overlay');
console.log('Size:', Math.round(html.length / 1024), 'KB');
console.log('Has inline style:', html.includes('<style>'));
console.log('Has mockup style:', html.includes('mockup-ui-style'));
console.log('Has app.css link:', html.includes('app.css'));
console.log('Has <style> count:', (html.match(/<style/g) || []).length);
