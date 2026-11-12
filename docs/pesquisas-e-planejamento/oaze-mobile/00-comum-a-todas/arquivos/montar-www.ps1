# =============================================================
# montar-www.ps1 — leva o app do OAZE para o projeto nativo
# -------------------------------------------------------------
# Copie este arquivo para a pasta do projeto Capacitor
# (oaze mobile\app-nativo\, ao lado do capacitor.config.json) e rode:
#
#   powershell -ExecutionPolicy Bypass -File .\montar-www.ps1
#   npx cap sync
#
# O QUE FAZ
#   1. recria www\ a partir de "o site": app.html vira index.html
#      (o Capacitor abre o index.html da raiz) e assets\ vai inteira,
#      menos o que é só da landing e das páginas públicas
#   2. troca o Chart.js do CDN pela cópia local: o app precisa abrir
#      sem internet, e a CSP do app não libera CDN nenhum
#   3. põe no <head> a CSP do app nativo (não existe .htaccess dentro
#      do app) e a linha que pergunta a plataforma ao Capacitor
#   4. confere que todo /assets/... citado no index.html existe
#   5. anota o commit do site em www\versao-do-site.txt
#   6. recusa o build se achar formato de segredo, com os mesmos
#      padrões de tools\varrer-segredos.js
#
# O QUE NÃO FAZ: compilar, assinar ou enviar para loja.
#
# Os textos impressos não têm acento de propósito: o Windows
# PowerShell 5.1 lê .ps1 sem BOM como ANSI e estragaria os acentos.
# =============================================================
[CmdletBinding()]
param(
  [string]$Site = 'C:\Users\santtoro\Downloads\sites\OAZE\o site',
  [string]$Destino = (Join-Path (Get-Location).Path 'www'),
  # Build de teste a partir de um site com alteracoes sem commit.
  # Para loja, nunca: o build precisa apontar para um commit real.
  [switch]$AceitarSiteComAlteracoes
)

$ErrorActionPreference = 'Stop'
$utf8SemBom = New-Object System.Text.UTF8Encoding($false)
$script:montando = $false

function Falhar([string]$mensagem) {
  Write-Host ''
  Write-Host "  WWW NAO MONTADO - $mensagem" -ForegroundColor Red
  # So apaga o que este script criou nesta execucao.
  if ($script:montando -and (Test-Path -LiteralPath $Destino)) { Remove-Item -LiteralPath $Destino -Recurse -Force }
  exit 1
}

# ---- 0 · conferencias antes de apagar qualquer coisa ----
$Destino = [System.IO.Path]::GetFullPath($Destino)
if ((Split-Path -Leaf $Destino) -ne 'www') { Falhar "o destino precisa ser uma pasta chamada www (recebi $Destino)" }
$projeto = Split-Path -Parent $Destino
if (-not (Test-Path -LiteralPath (Join-Path $projeto 'capacitor.config.json'))) {
  Falhar "nao achei capacitor.config.json em $projeto. Rode a partir da pasta do projeto nativo."
}
if (-not (Test-Path -LiteralPath (Join-Path $Site 'app.html'))) { Falhar "nao achei app.html em $Site" }

$commit = ''
$alterados = 0
if (Get-Command git -ErrorAction SilentlyContinue) {
  $antes = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $commit = (& git -C $Site rev-parse --short HEAD 2>$null)
  $alterados = @(& git -C $Site status --porcelain 2>$null | Where-Object { $_ }).Count
  $ErrorActionPreference = $antes
}
if (-not $commit) { Falhar 'nao consegui ler o commit do site (git instalado? a pasta e o repositorio?)' }
if ($alterados -gt 0 -and -not $AceitarSiteComAlteracoes) {
  Falhar "o site tem $alterados arquivo(s) alterado(s) sem commit. Faca o commit antes, ou use -AceitarSiteComAlteracoes num build de teste."
}

Write-Host ''
Write-Host "  Montando www a partir de: $Site (commit $commit)" -ForegroundColor Cyan

# ---- 1 · copia ----
if (Test-Path -LiteralPath $Destino) { Remove-Item -LiteralPath $Destino -Recurse -Force }
New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$script:montando = $true

Copy-Item -LiteralPath (Join-Path $Site 'app.html') -Destination (Join-Path $Destino 'index.html')
Copy-Item -LiteralPath (Join-Path $Site 'assets') -Destination $Destino -Recurse

# So da landing e das paginas publicas; o app.html nao carrega nenhum.
$soDoSite = @(
  'assets\css\site.css',
  'assets\js\site.js',
  'assets\js\site-auth.js',
  'assets\js\narrativa.js',
  'assets\img\telas',
  'assets\img\oaze-og.png'
)
foreach ($item in $soDoSite) {
  $caminho = Join-Path $Destino $item
  if (Test-Path -LiteralPath $caminho) { Remove-Item -LiteralPath $caminho -Recurse -Force }
}

# ---- 2 e 3 · index.html ----
$arquivoIndex = Join-Path $Destino 'index.html'
$html = [System.IO.File]::ReadAllText($arquivoIndex, [System.Text.Encoding]::UTF8)

$html = [regex]::Replace($html, 'https://cdn\.jsdelivr\.net/npm/chart\.js@[^"'']+', '/assets/vendor/chart.umd.min.js')

$csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'"
$cabeca = "<meta charset=""utf-8"">`n" +
  "<!-- montado por montar-www.ps1 para o app nativo; nao edite dentro de www -->`n" +
  "<meta http-equiv=""Content-Security-Policy"" content=""$csp"">`n" +
  "<script>window.OAZE_PLATAFORMA = (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'web';</script>"

$rxCharset = New-Object System.Text.RegularExpressions.Regex('<meta\s+charset\s*=\s*["'']?utf-8["'']?\s*/?>', 'IgnoreCase')
if (-not $rxCharset.IsMatch($html)) { Falhar 'nao achei <meta charset="utf-8"> no app.html' }
$html = $rxCharset.Replace($html, [System.Text.RegularExpressions.MatchEvaluator] { param($m) $cabeca }, 1)

$externos = @([regex]::Matches($html, '(?:src|href)\s*=\s*["''](https?://[^"'']+)') | ForEach-Object { $_.Groups[1].Value })
if ($externos.Count) { Falhar ('recurso externo no index.html, que a CSP do app bloquearia: ' + ($externos -join ', ')) }

[System.IO.File]::WriteAllText($arquivoIndex, $html, $utf8SemBom)

# ---- 4 · tudo o que o index.html cita existe? ----
$citados = @([regex]::Matches($html, '(?:src|href)\s*=\s*["''](/assets/[^"''?#]+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
$faltando = @($citados | Where-Object { -not (Test-Path -LiteralPath (Join-Path $Destino ($_.TrimStart('/') -replace '/', '\'))) })
if ($faltando.Count) { Falhar ('citados no index.html e ausentes em www: ' + ($faltando -join ', ')) }

# ---- 5 · de onde saiu este build ----
# So commit e data: caminho local nao entra no pacote do app.
$versao = "commit do site: $commit`n" +
  "alterados sem commit: $alterados`n" +
  'montado em: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + "`n"
[System.IO.File]::WriteAllText((Join-Path $Destino 'versao-do-site.txt'), $versao, $utf8SemBom)

# ---- 6 · segredos ----
$padroes = @(
  @{ nome = 'chave da OpenAI'; re = '\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}' },
  @{ nome = 'chave secreta da Stripe'; re = '\b[rs]k_(?:live|test)_[A-Za-z0-9]{20,}' },
  @{ nome = 'segredo de webhook da Stripe'; re = '\bwhsec_[A-Za-z0-9]{20,}' },
  @{ nome = 'chave do Asaas'; re = '\$aact_[A-Za-z0-9_-]{20,}' },
  @{ nome = 'OPENAI_API_KEY com valor'; re = 'OPENAI_API_KEY\s*[:=]\s*[''"][^''"]{8,}' },
  @{ nome = 'service_role do Supabase (JWT)'; re = '"role"\s*:\s*"service_role"' },
  @{ nome = 'service_role do Supabase (JWT em base64)'; re = 'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]*c2VydmljZV9yb2xl' },
  @{ nome = 'segredo do Supabase (sb_secret_)'; re = '\bsb_secret_[A-Za-z0-9_-]+' },
  @{ nome = 'chave privada em PEM'; re = '-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----' }
)
$extensoes = @('.html', '.js', '.css', '.json', '.webmanifest', '.txt', '.xml')
$achados = @()
Get-ChildItem -LiteralPath $Destino -Recurse -File -Force | Where-Object { $extensoes -contains $_.Extension.ToLower() } | ForEach-Object {
  $texto = [System.IO.File]::ReadAllText($_.FullName)
  foreach ($p in $padroes) {
    if ($texto -cmatch $p.re) { $achados += ($_.FullName.Substring($Destino.Length + 1) + ' -> ' + $p.nome) }
  }
}
if ($achados.Count) {
  $achados | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
  Falhar 'formato de segredo no build. Revogue a chave no provedor antes de qualquer coisa.'
}

$arquivos = @(Get-ChildItem -LiteralPath $Destino -Recurse -File -Force)
$kb = [math]::Round((($arquivos | Measure-Object -Property Length -Sum).Sum) / 1KB)
Write-Host ''
Write-Host '  OK - www montado' -ForegroundColor Green
Write-Host "    $($arquivos.Count) arquivos, $kb KB, commit $commit"
if ($alterados -gt 0) { Write-Host "    ATENCAO: build de teste, o site tinha $alterados alteracao(oes) sem commit" -ForegroundColor Yellow }
Write-Host '  Proximo passo: npx cap sync' -ForegroundColor Cyan
