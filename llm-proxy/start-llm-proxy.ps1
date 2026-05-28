# start-llm-proxy.ps1 — Arranca el proxy de failover LLM
# Uso: .\start-llm-proxy.ps1

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "🔁 Iniciando LLM Failover Proxy..." -ForegroundColor Cyan

Set-Location $scriptDir
node server.js
