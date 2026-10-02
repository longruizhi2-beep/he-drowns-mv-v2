@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  node serve.js
) else (
  echo Node.js not found, falling back to Python...
  start "" "http://127.0.0.1:8181/"
  python -c "import http.server, mimetypes; mimetypes.add_type('text/javascript', '.js'); mimetypes.add_type('font/woff2', '.woff2'); mimetypes.add_type('audio/flac', '.flac'); http.server.test(HandlerClass=http.server.SimpleHTTPRequestHandler, port=8181, bind='127.0.0.1')"
)
