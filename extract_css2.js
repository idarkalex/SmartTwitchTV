const fs = require('fs');
const content = fs.readFileSync('D:\\Descargas\\SmartTwitchTV - pre Google AI\\app\\index.html', 'utf8');

// Extract main <style> block (first one, before mockup-ui-style)
const styleStart = content.indexOf('<style>');
const styleEnd = content.indexOf('</style>', styleStart) + 8;
const mainStyleBlock = content.substring(styleStart, styleEnd);

// Extract mockup-ui-style block
const mockupStart = content.indexOf('<style id="mockup-ui-style">');
const mockupEnd = content.indexOf('</style>', mockupStart) + 8;
const mockupStyleBlock = content.substring(mockupStart, mockupEnd);

// Strip <style> and </style> tags, keep content
const mainStyle = mainStyleBlock.replace(/^<style>/, '').replace(/<\/style>$/, '').trim();
const mockupStyle = mockupStyleBlock.replace(/^<style id="mockup-ui-style">/, '').replace(/<\/style>$/, '').trim();

console.log('Main style length:', mainStyle.length);
console.log('Mockup style length:', mockupStyle.length);

// Combine both
const combined = mainStyle + '\n\n' + mockupStyle;
console.log('Combined length:', combined.length);
console.log('Combined lines:', combined.split('\n').length);

fs.writeFileSync('D:\\Descargas\\SmartTwitchTV\\app\\css\\app.css.clean2', combined);
console.log('Saved combined CSS (no tags)');