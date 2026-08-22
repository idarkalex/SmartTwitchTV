const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use('/githubio', express.static(path.join(__dirname, 'release', 'githubio')));
app.use('/app/githubio', express.static(path.join(__dirname, 'release', 'githubio')));
app.use(express.static(path.join(__dirname, 'app'), { index: false }));
app.use('/release', express.static(path.join(__dirname, 'release')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'release', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SmartTwitchTV server running at http://localhost:${PORT}`);
});
