# =============================================================
# assinar-aab-play.ps1 - assina o AAB da Google Play com a chave de envio
# -------------------------------------------------------------
# 16/11/2026. Quem roda é o dono da conta: as senhas são digitadas
# aqui no terminal e não ficam gravadas em lugar nenhum.
#
# Na primeira vez a chave de envio ainda não existe: o script cria
# em %USERPROFILE%\oaze-chaves\oaze-upload.jks. GUARDE uma cópia
# dessa chave e da senha num lugar seguro (fora do Git e do My Brain).
# Sem ela, a próxima versão não sobe na Play até a Google trocar a
# chave de envio pelo suporte.
#
# uso:
#   .\assinar-aab-play.ps1 -Aab C:\caminho\app-release.aab -Saida C:\caminho\OAZE-2.5.0-play.aab
# =============================================================
param(
  [Parameter(Mandatory = $true)][string]$Aab,
  [Parameter(Mandatory = $true)][string]$Saida
)
$ErrorActionPreference = 'Stop'

$jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' | Select-Object -First 1
if (-not $jdk) { throw 'Java 21 (Temurin) não encontrado.' }
$keytool = Join-Path $jdk.FullName 'bin\keytool.exe'
$jarsigner = Join-Path $jdk.FullName 'bin\jarsigner.exe'

$pasta = Join-Path $env:USERPROFILE 'oaze-chaves'
$chave = Join-Path $pasta 'oaze-upload.jks'
$alias = 'oaze-upload'

if (-not (Test-Path $Aab)) { throw "AAB não encontrado: $Aab" }

if (-not (Test-Path $chave)) {
  Write-Host ''
  Write-Host 'Criando a chave de envio da Play (primeira vez).' -ForegroundColor Cyan
  Write-Host 'Escolha uma senha forte e guarde-a. Ela será pedida duas vezes.' -ForegroundColor Cyan
  New-Item -ItemType Directory -Force $pasta | Out-Null
  & $keytool -genkeypair -v -keystore $chave -alias $alias -keyalg RSA -keysize 4096 -validity 10000 -dname 'CN=OAZE, O=OAZE, C=BR'
  if ($LASTEXITCODE -ne 0) { throw 'A chave não foi criada.' }
}

Write-Host ''
Write-Host 'Assinando o AAB. Digite a senha da chave de envio quando pedir.' -ForegroundColor Cyan
& $jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -keystore $chave -signedjar $Saida $Aab $alias
if ($LASTEXITCODE -ne 0) { throw 'A assinatura falhou.' }

& $jarsigner -verify $Saida | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'A verificação da assinatura falhou.' }

Write-Host ''
Write-Host "Pronto: $Saida" -ForegroundColor Green
Write-Host 'Envie esse arquivo em Play Console -> Teste -> Teste interno -> Criar nova versão.'
Write-Host "Guarde uma cópia de $chave e da senha num lugar seguro." -ForegroundColor Yellow
