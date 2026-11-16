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

Add-Type -AssemblyName System.Windows.Forms
function Pedir-Senha([string]$titulo, [string]$texto) {
  # 16/11/2026: o terminal do app não aceitava digitação escondida;
  # a senha passa a ser pedida numa janela do Windows.
  $f = New-Object System.Windows.Forms.Form
  $f.Text = $titulo; $f.Width = 460; $f.Height = 190; $f.StartPosition = 'CenterScreen'; $f.TopMost = $true
  $f.FormBorderStyle = 'FixedDialog'; $f.MaximizeBox = $false; $f.MinimizeBox = $false
  $l = New-Object System.Windows.Forms.Label; $l.Text = $texto; $l.Left = 14; $l.Top = 14; $l.Width = 420; $l.Height = 36
  $c = New-Object System.Windows.Forms.TextBox; $c.UseSystemPasswordChar = $true; $c.Left = 14; $c.Top = 56; $c.Width = 416
  $ok = New-Object System.Windows.Forms.Button; $ok.Text = 'OK'; $ok.Left = 274; $ok.Top = 96; $ok.DialogResult = 'OK'
  $no = New-Object System.Windows.Forms.Button; $no.Text = 'Cancelar'; $no.Left = 356; $no.Top = 96; $no.DialogResult = 'Cancel'
  $f.Controls.AddRange(@($l, $c, $ok, $no)); $f.AcceptButton = $ok; $f.CancelButton = $no
  $f.Add_Shown({ $f.Activate(); $c.Focus() })
  if ($f.ShowDialog() -ne 'OK') { throw 'Cancelado.' }
  return $c.Text
}

if (-not (Test-Path $chave)) {
  Write-Host ''
  Write-Host 'Criando a chave de envio da Play (primeira vez).' -ForegroundColor Cyan
  $s1 = Pedir-Senha 'OAZE - nova chave da Play' 'Crie a senha da chave de envio (mínimo 6 caracteres). Guarde essa senha.'
  $s2 = Pedir-Senha 'OAZE - nova chave da Play' 'Digite a mesma senha de novo para confirmar.'
  if ($s1 -ne $s2) { throw 'As duas senhas não são iguais. Rode o script de novo.' }
  if ($s1.Length -lt 6) { throw 'A senha precisa ter pelo menos 6 caracteres.' }
  $env:OAZE_KS_PASS = $s1
  New-Item -ItemType Directory -Force $pasta | Out-Null
  & $keytool -genkeypair -keystore $chave -alias $alias -keyalg RSA -keysize 4096 -validity 10000 -dname 'CN=OAZE, O=OAZE, C=BR' -storepass:env OAZE_KS_PASS -keypass:env OAZE_KS_PASS
  if ($LASTEXITCODE -ne 0) { Remove-Item Env:OAZE_KS_PASS; throw 'A chave não foi criada.' }
} else {
  $env:OAZE_KS_PASS = Pedir-Senha 'OAZE - assinar para a Play' 'Digite a senha da chave de envio da Play.'
}

Write-Host ''
Write-Host 'Assinando o AAB...' -ForegroundColor Cyan
& $jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -keystore $chave -storepass:env OAZE_KS_PASS -keypass:env OAZE_KS_PASS -signedjar $Saida $Aab $alias
$falhou = $LASTEXITCODE -ne 0
Remove-Item Env:OAZE_KS_PASS
if ($falhou) { throw 'A assinatura falhou (senha errada?).' }

& $jarsigner -verify $Saida | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'A verificação da assinatura falhou.' }

Write-Host ''
Write-Host "Pronto: $Saida" -ForegroundColor Green
Write-Host 'Envie esse arquivo em Play Console -> Teste -> Teste interno -> Criar nova versão.'
Write-Host "Guarde uma cópia de $chave e da senha num lugar seguro." -ForegroundColor Yellow
