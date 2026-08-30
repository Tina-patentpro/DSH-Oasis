@echo off
setlocal
set "npm_config_cache=..\..\docs\evidence\week3-comprehensive-reaudit-2026-08-26\package\npm-cache"
pnpm --config.verify-deps-before-run=false run verify > "..\..\docs\evidence\week3-comprehensive-reaudit-2026-08-26\runtime\package-verify-isolated-cache.txt" 2>&1
exit /b %errorlevel%
