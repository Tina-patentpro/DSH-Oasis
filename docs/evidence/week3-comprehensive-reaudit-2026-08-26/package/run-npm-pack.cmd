@echo off
setlocal
set "npm_config_cache=..\..\docs\evidence\week3-comprehensive-reaudit-2026-08-26\package\npm-cache"
npm pack --json --pack-destination "..\..\docs\evidence\week3-comprehensive-reaudit-2026-08-26\package\tarball" > "..\..\docs\evidence\week3-comprehensive-reaudit-2026-08-26\runtime\npm-pack.json" 2> "..\..\docs\evidence\week3-comprehensive-reaudit-2026-08-26\runtime\npm-pack.stderr.txt"
exit /b %errorlevel%
