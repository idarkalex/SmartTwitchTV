#!/usr/bin/env python3

import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get('PORT', '8120'))
MAX_PLAYLIST_BYTES = 10 * 1024 * 1024
AD_CLASS_RE = re.compile(r'CLASS\s*=\s*["\']twitch-stitched-ad["\']', re.IGNORECASE)
DURATION_RE = re.compile(r'(?:PLANNED-)?DURATION\s*=\s*([0-9]+(?:\.[0-9]+)?)', re.IGNORECASE)
ELAPSED_RE = re.compile(r'ElapsedTime\s*=\s*([0-9]+(?:\.[0-9]+)?)', re.IGNORECASE)
EXTINF_RE = re.compile(r'^#EXTINF\s*:\s*([0-9]+(?:\.[0-9]+)?)')
URI_RE = re.compile(r'(\bURI\s*=\s*)(["\'])(.*?)\2', re.IGNORECASE)
ALLOWED_HOST_SUFFIXES = ('ttvnw.net', 'twitch.tv')


def is_allowed_twitch_url(url):
    try:
        parsed = urllib.parse.urlsplit(url)
        hostname = parsed.hostname
        if not hostname:
            return False
        hostname = hostname.lower().rstrip('.')
    except (AttributeError, ValueError):
        return False

    if parsed.scheme not in ('http', 'https') or parsed.username is not None or parsed.password is not None:
        return False

    return any(hostname == suffix or hostname.endswith('.' + suffix) for suffix in ALLOWED_HOST_SUFFIXES)


def redact_url(url):
    try:
        parsed = urllib.parse.urlsplit(url)
        if not parsed.hostname:
            return '<invalid-url>'
        netloc = parsed.hostname
        if ':' in netloc and not netloc.startswith('['):
            netloc = '[' + netloc + ']'
        if parsed.port is not None:
            netloc += ':' + str(parsed.port)
        return urllib.parse.urlunsplit((parsed.scheme, netloc, parsed.path, '', ''))
    except (AttributeError, ValueError):
        return '<invalid-url>'


class TwitchRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not is_allowed_twitch_url(newurl):
            return None
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def parse_cue_out_remaining(line, default=None):
    match = DURATION_RE.search(line)
    if not match:
        if line.startswith('#EXT-X-CUE-OUT:'):
            try:
                return max(0.0, float(line.split(':', 1)[1]))
            except (IndexError, ValueError):
                pass
        return default

    remaining = float(match.group(1))
    if line.startswith('#EXT-X-CUE-OUT-CONT'):
        elapsed_match = ELAPSED_RE.search(line)
        if elapsed_match:
            remaining -= float(elapsed_match.group(1))
    return max(0.0, remaining)


def is_ad_marker(line):
    return line.startswith('#EXT-X-DATERANGE:') and AD_CLASS_RE.search(line) is not None


def is_content_boundary(line):
    return (
        line.startswith('#EXT-X-DATERANGE:') and not is_ad_marker(line)
    ) or line.startswith(('#EXT-X-CUE-IN', '#EXT-X-ENDLIST'))


def rewrite_uris(line, base_url):
    def replace_uri(match):
        return match.group(1) + match.group(2) + urllib.parse.urljoin(base_url, match.group(3)) + match.group(2)

    rewritten = URI_RE.sub(replace_uri, line)
    stripped = rewritten.strip()
    if stripped and not stripped.startswith('#'):
        return urllib.parse.urljoin(base_url, stripped)
    return rewritten


def filter_m3u8_ads(m3u8_text, base_url):
    lines = m3u8_text.splitlines()
    result = []
    skipping = False
    ad_remaining = None
    current_duration = 0.0
    pending_discontinuity = False
    ad_markers = 0
    removed_segments = 0

    for line in lines:
        if is_ad_marker(line):
            remaining = parse_cue_out_remaining(line)
            ad_markers += 1
            if remaining is None or remaining > 0:
                skipping = True
                ad_remaining = remaining
            continue

        if not skipping and line.startswith('#EXT-X-CUE-OUT-CONT'):
            remaining = parse_cue_out_remaining(line)
            ad_markers += 1
            if remaining is None or remaining > 0:
                skipping = True
                ad_remaining = remaining
            continue

        if not skipping and line.startswith('#EXT-X-CUE-OUT:'):
            remaining = parse_cue_out_remaining(line)
            ad_markers += 1
            if remaining is None or remaining > 0:
                skipping = True
                ad_remaining = remaining
            continue

        if skipping and line.startswith('#EXT-X-CUE-OUT:'):
            remaining = parse_cue_out_remaining(line, ad_remaining)
            if remaining is not None and remaining <= 0:
                skipping = False
                pending_discontinuity = False
            else:
                ad_remaining = remaining
            continue

        if skipping and line.startswith('#EXT-X-CUE-OUT-CONT'):
            remaining = parse_cue_out_remaining(line, ad_remaining)
            if remaining is not None and remaining <= 0:
                skipping = False
                pending_discontinuity = False
            else:
                ad_remaining = remaining
            continue

        if skipping and line.startswith('#EXT-X-DISCONTINUITY'):
            pending_discontinuity = True
            continue

        if skipping and line.startswith(('#EXT-X-MAP:', '#EXT-X-VERSION:', '#EXT-X-TARGETDURATION:', '#EXT-X-MEDIA-SEQUENCE:', '#EXT-X-DISCONTINUITY-SEQUENCE:', '#EXT-X-INDEPENDENT-SEGMENTS')):
            result.append(rewrite_uris(line, base_url))
            continue

        if skipping and line.startswith('#EXT-X-ENDLIST'):
            result.append(rewrite_uris(line, base_url))
            skipping = False
            pending_discontinuity = False
            continue

        if skipping:
            extinf_match = EXTINF_RE.match(line)
            if extinf_match:
                current_duration = float(extinf_match.group(1))
                continue

            if line and not line.startswith('#'):
                removed_segments += 1
                if ad_remaining is not None:
                    ad_remaining -= current_duration
                current_duration = 0.0
                if ad_remaining is not None and ad_remaining <= 0:
                    skipping = False
                    pending_discontinuity = False
                continue

            if is_content_boundary(line):
                if pending_discontinuity:
                    result.append('#EXT-X-DISCONTINUITY')
                    pending_discontinuity = False
                skipping = False
            else:
                continue

        if pending_discontinuity and not skipping:
            result.append('#EXT-X-DISCONTINUITY')
            pending_discontinuity = False

        result.append(rewrite_uris(line, base_url))

    return '\n'.join(result), ad_markers, removed_segments


class AdFilterHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self._handle_request(False)

    def do_HEAD(self):
        self._handle_request(True)

    def _handle_request(self, head_only):
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path == '/healthz':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            if not head_only:
                self.wfile.write(b'ok')
            return

        query = dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))
        target_url = query.get('url', '')
        if not target_url:
            self.send_error(400, 'Missing url parameter')
            return

        if not is_allowed_twitch_url(target_url):
            self.send_error(403, 'Only Twitch URLs allowed')
            return

        proxy_url = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy') or os.environ.get('HTTP_PROXY') or os.environ.get('http_proxy')
        opener = urllib.request.build_opener(TwitchRedirectHandler(), urllib.request.ProxyHandler({'http': proxy_url, 'https': proxy_url})) if proxy_url else urllib.request.build_opener(TwitchRedirectHandler())
        request = urllib.request.Request(
            target_url,
            headers={
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/vnd.apple.mpegurl,application/x-mpegURL,*/*',
                'Accept-Encoding': 'identity',
            },
        )

        try:
            with opener.open(request, timeout=15) as response:
                raw_data = response.read(MAX_PLAYLIST_BYTES + 1)
                final_url = response.geturl()

            if len(raw_data) > MAX_PLAYLIST_BYTES:
                self.send_error(413, 'Playlist too large')
                return

            if not is_allowed_twitch_url(final_url):
                self.send_error(403, 'Redirect target not allowed')
                return

            data = raw_data.decode('utf-8', errors='replace')
            filtered, ad_markers, removed_segments = filter_m3u8_ads(data, final_url)
            payload = filtered.encode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/vnd.apple.mpegurl')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Connection', 'close')
            self.end_headers()
            if not head_only:
                self.wfile.write(payload)

            if ad_markers:
                print(f'[AdFilter] markers={ad_markers} removed_segments={removed_segments} url={redact_url(target_url)}', flush=True)

        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, UnicodeError) as exc:
            print(f'[AdFilter] fetch failed: {exc} url={redact_url(target_url)}', file=sys.stderr, flush=True)
            self.send_error(502, f'Failed to fetch playlist: {exc}')

    def log_message(self, fmt, *args):
        return


if __name__ == '__main__':
    print(f'[AdFilter] listening on 0.0.0.0:{PORT}', flush=True)
    server = ThreadingHTTPServer(('0.0.0.0', PORT), AdFilterHandler)
    server.daemon_threads = True
    server.serve_forever()
