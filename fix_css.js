const fs = require('fs');
let css = fs.readFileSync('D:\\Descargas\\SmartTwitchTV\\app\\css\\app.css.clean4', 'utf8');

// Pattern A: Transparent borders (.button_dialog, .button_search) - remove border-top/bottom/image
css = css.replace(/border-top: 0\.055em solid;\n                border-bottom: 0\.06em solid;\n                border-image: linear-gradient\(rgba\(255,255,255,0\.06\), rgba\(255,255,255,0\.06\)\) 1;/g, '');

// Pattern A: .hist_value, .settings_value - remove transparent borders
css = css.replace(/border-top: 0\.1em solid;\n                border-bottom: 0\.1em solid;\n                border-image: linear-gradient\(rgba\(0, 0, 0, 0\), rgba\(0, 0, 0, 0\)\) 1;/g, '');

// Pattern A: .hist_div, .settings_div - remove transparent borders  
css = css.replace(/border-top: 0\.05em solid;\n                border-bottom: 0\.05em solid;\n                border-image: linear-gradient\(rgba\(0, 0, 0, 0\), rgba\(0, 0, 0, 0\)\) 1;/g, '');

// Pattern A: .multi_dialog_div - replace transparent with none
css = css.replace(/border-image: linear-gradient\(rgba\(0, 0, 0, 0\), rgba\(0, 0, 0, 0\)\) 1;/g, 'border: none;');

// Pattern B: Solid black borders (.side_panel_new_text_options etc) - replace with glass
css = css.replace(/border-top: 0\.05em solid;\n                border-bottom: 0\.05em solid;\n                border-image: linear-gradient\(#000000, #000000\) 1;/g, 'border: 0.05em solid rgba(255, 255, 255, 0.08);');

// Pattern B: .multi_dialog_div, .div_panel_pp, .side_panel_div - replace with glass
css = css.replace(/border-top: 0\.075em solid;\n                border-bottom: 0\.075em solid;\n                border-image: linear-gradient\(#000000, #000000\) 1;/g, 'border: 0.075em solid rgba(255, 255, 255, 0.08);');

// Pattern C: Focus side panel borders
css = css.replace(/border-image: linear-gradient\(to right, #000000 18%, #d0d3d4, #000000 80%\) 1 !important;/g, 'border: 0.05em solid rgba(255, 255, 255, 0.22) !important;\n                border-radius: var(--radius-sm);');
css = css.replace(/border-image: linear-gradient\(to right, #000000 0%, #d0d3d4, #000000 70%\) 1 !important;/g, 'border: 0.05em solid rgba(255, 255, 255, 0.22) !important;\n                border-radius: var(--radius-sm);');
css = css.replace(/border-image: linear-gradient\(to right, #000000 8%, #d0d3d4, #000000 92%\) 1 !important;/g, 'border: 0.05em solid rgba(255, 255, 255, 0.22) !important;\n                border-radius: var(--radius-sm);');

// Pattern D: Button hover/focused
css = css.replace(/border-image: linear-gradient\(to right, rgba\(14,12,24,0\.9\) 6%, rgba\(255,255,255,0\.15\), rgba\(14,12,24,0\.9\) 94%\) 1;/g, 'border: 0.1em solid rgba(255, 255, 255, 0.15);');

// Pattern D: Button focused override
css = css.replace(/border-image: linear-gradient\(to right, rgba\(14,12,24,0\.9\) 9%, rgba\(255,255,255,0\.18\), rgba\(14,12,24,0\.9\) 91%\) 1;/g, 'border: 0.1em solid rgba(255, 255, 255, 0.18);\n                border-radius: 0.4em;');

// Pattern D: Dialog overlay
css = css.replace(/border-top: 0\.1em solid;\n                border-bottom: 0\.1em solid;\n                border-image: linear-gradient\(to right, rgba\(14,12,24,0\.9\) 20%, rgba\(255,255,255,0\.12\), rgba\(14,12,24,0\.9\) 80%\) 1;/g, 'border: 0.1em solid rgba(255, 255, 255, 0.12);');

// Pattern D: Settings focus
css = css.replace(/border-image: linear-gradient\(to right, rgba\(12,10,20,0\.9\) 20%, rgba\(255,255,255,0\.15\), rgba\(12,10,20,0\.9\) 80%\) 1 !important;/g, 'border: 0.05em solid rgba(255, 255, 255, 0.15) !important;');

// Pattern D: Settings value focus
css = css.replace(/border-image: linear-gradient\(to right, rgba\(12,10,20,0\.9\) 20%, rgba\(255,255,255,0\.18\), rgba\(12,10,20,0\.9\) 80%\) 1 !important;/g, 'border: 0.05em solid rgba(255, 255, 255, 0.18) !important;');

// Pattern D: Side panel focused
css = css.replace(/border-image: linear-gradient\(to right, rgba\(14,12,24,0\.9\) 20%, rgba\(255,255,255,0\.12\), rgba\(14,12,24,0\.9\) 80%\) 1 !important;/g, 'border: 0.05em solid rgba(255, 255, 255, 0.12) !important;');

fs.writeFileSync('D:\\Descargas\\SmartTwitchTV\\app\\css\\app.css.clean4_fixed', css);
console.log('Fixed CSS saved. Length:', css.length);
console.log('Contains border-image:', css.includes('border-image'));
