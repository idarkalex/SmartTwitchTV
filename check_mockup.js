const fs = require('fs');
const original = fs.readFileSync('D:\\Descargas\\SmartTwitchTV - pre Google AI\\app\\index.html', 'utf8');
const mockupIdx = original.indexOf('mockup-ui-style');
console.log('Has mockup-ui-style in original:', mockupIdx >= 0);
if (mockupIdx >= 0) {
  const start = original.indexOf('<style id="mockup-ui-style">');
  const end = original.indexOf('</style>', start);
  console.log('Mockup block size:', end - start);
  console.log('Mockup first 200:', original.substring(start, start+200));
}
