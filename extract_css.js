const fs = require('fs');
const content = fs.readFileSync('D:\\Descargas\\SmartTwitchTV - pre Google AI\\app\\index.html', 'utf8');

// Extract mockup-ui-style block
const mockupStart = content.indexOf('<style id="mockup-ui-style">');
const mockupEnd = content.indexOf('</style>', mockupStart) + 8;
const mockupStyle = content.substring(mockupStart, mockupEnd);
console.log('Mockup style length:', mockupStyle.length);

// Combine both
const mainStyle = fs.readFileSync('D:\\Descargas\\SmartTwitchTV\\app\\css\\app.css.clean', 'utf8');
const combined = mainStyle + '\n\n' + mockupStyle;
console.log('Combined length:', combined.length);
console.log('Combined lines:', combined.split('\n').length);
fs.writeFileSync('D:\\Descargas\\SmartTwitchTV\\app\\css\\app.css.clean2', combined);
console.log('Saved combined CSS');