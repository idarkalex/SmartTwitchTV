const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 8080;

app.use('/githubio', express.static(path.join(__dirname, 'release', 'githubio')));
app.use('/app/githubio', express.static(path.join(__dirname, 'release', 'githubio')));
app.use(express.static(path.join(__dirname, 'app'), { index: false }));
app.use('/release', express.static(path.join(__dirname, 'release')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'release', 'index.html'));
});

// Ad-filtering proxy: fetches M3U8 from Twitch, strips ad segments, returns clean playlist
app.get('/proxy/playlist', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  // Validate URL is from Twitch CDN to prevent abuse
  if (!targetUrl.includes('.ttvnw.net/') && !targetUrl.includes('.twitch.tv/')) {
    return res.status(403).send('Only Twitch URLs allowed');
  }

  console.log('[Proxy] Fetching: ' + targetUrl.substring(0, 120) + '...');

  https.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk) => { data += chunk; });
    proxyRes.on('end', () => {
      const filtered = filterM3U8Ads(data);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(filtered);

      var adCount = (data.match(/twitch-stitched-ad/g) || []).length;
      if (adCount > 0) {
        console.log('[Proxy] Filtered ' + adCount + ' ad markers from playlist');
      }
    });
  }).on('error', (err) => {
    console.log('[Proxy] Error fetching playlist: ' + err.message);
    res.status(502).send('Failed to fetch playlist: ' + err.message);
  });
});

function filterM3U8Ads(m3u8) {
  var lines = m3u8.split('\n');
  var result = [];
  var skipping = false;
  var adDurationRemaining = 0;
  var currentSegmentDuration = 0;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    // Start skipping when we hit an ad DATERANGE
    if (line.indexOf('CLASS="twitch-stitched-ad"') !== -1 || line.indexOf("CLASS='twitch-stitched-ad'") !== -1) {
      skipping = true;
      var durMatch = line.match(/DURATION=([\d.]+)/);
      adDurationRemaining = durMatch ? parseFloat(durMatch[1]) : 30;
      continue;
    }

    if (skipping) {
      // Parse segment duration from #EXTINF
      var extinfMatch = line.match(/#EXTINF:([\d.]+)/);
      if (extinfMatch) {
        currentSegmentDuration = parseFloat(extinfMatch[1]);
        continue;
      }

      // Segment URL (doesn't start with #)
      if (line.length > 0 && line[0] !== '#') {
        adDurationRemaining -= currentSegmentDuration;
        currentSegmentDuration = 0;
        if (adDurationRemaining <= 0) {
          skipping = false;
        }
        continue;
      }

      // Block-level directive ends the ad block
      if (line.indexOf('#EXT-X-DATERANGE:') !== -1 ||
          line.indexOf('#EXT-X-DISCONTINUITY') !== -1 ||
          line.indexOf('#EXT-X-ENDLIST') !== -1 ||
          line.indexOf('#EXT-X-MEDIA-SEQUENCE:') !== -1) {
        skipping = false;
      } else {
        continue;
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('SmartTwitchTV server running at http://localhost:' + PORT);
});
