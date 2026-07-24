const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve githubio assets at /githubio and /app/githubio
app.use('/githubio', express.static(path.join(__dirname, 'release', 'githubio')));
app.use('/app/githubio', express.static(path.join(__dirname, 'release', 'githubio')));

// Serve app folder static files at root
app.use(express.static(path.join(__dirname, 'app')));

// Serve release folder at /release
app.use('/release', express.static(path.join(__dirname, 'release')));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SmartTwitchTV server running at http://0.0.0.0:${PORT}`);
});
