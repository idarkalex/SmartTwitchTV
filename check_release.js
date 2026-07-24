const fs = require('fs');
const releaseHTML = fs.readFileSync('D:\\Descargas\\SmartTwitchTV\\release\\index.html', 'utf8');
console.log('release/index.html size:', releaseHTML.length);
console.log('Has app.min.css:', releaseHTML.includes('app.min.css'));
console.log('Has icons.min.css:', releaseHTML.includes('icons.min.css'));
console.log('Has main.js:', releaseHTML.includes('main.js'));
console.log('Has mockup-ui-style:', releaseHTML.includes('mockup-ui-style'));
console.log('Has scene1:', releaseHTML.includes('scene1'));
console.log('Has side_panel_hide:', releaseHTML.includes('side_panel_hide'));
console.log('Has side_panel_fix:', releaseHTML.includes('side_panel_fix'));
console.log('Has side_panel_movel:', releaseHTML.includes('side_panel_movel'));
// Count inline styles
const inlineMatch = releaseHTML.match(/style="/g);
console.log('Inline styles:', inlineMatch ? inlineMatch.length : 0);
// Check for problematic inline styles
console.log('Has style="background: #000000":', releaseHTML.includes('style="background: #000000"'));
console.log('Has style="background-color: rgba(0, 0, 0, 1)":', releaseHTML.includes('background-color: rgba(0, 0, 0, 1)'));
