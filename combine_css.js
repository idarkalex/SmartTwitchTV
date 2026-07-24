const fs = require('fs');

// Read the main CSS (already extracted)
const mainCss = fs.readFileSync('D:\\Descargas\\SmartTwitchTV\\app\\css\\app.css.clean3', 'utf8');

// Read mockup CSS from backup
const mockupHtml = fs.readFileSync('D:\\Descargas\\SmartTwitchTV\\backup\\mockup_css.html', 'utf8');
const mockupStart = mockupHtml.indexOf('<style id="mockup-ui-style">') + '<style id="mockup-ui-style">'.length;
const mockupEnd = mockupHtml.indexOf('</style>', mockupStart);
const mockupCss = mockupHtml.substring(mockupStart, mockupEnd).trim();

console.log('Main:', mainCss.length);
console.log('Mockup:', mockupCss.length);

// Combine
const combined = mainCss + '\n\n' + mockupCss;
console.log('Combined:', combined.length);

fs.writeFileSync('D:\\Descargas\\SmartTwitchTV\\app\\css\\app.css.clean4', combined);
console.log('Saved clean4');