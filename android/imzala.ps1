# ============================================================
# Quiz Tactics — Play Store yükleme anahtarı (upload key) + imzalı AAB/APK
#
# Sahibi KENDİ PowerShell penceresinde çalıştırır (şifre yalnız burada yazılır):
#   powershell -ExecutionPolicy Bypass -File C:\Users\ida\Desktop\quiztactics\android\imzala.ps1
#
# · Anahtar deposu yoksa oluşturur: C:\Users\ida\quiztactics-anahtar\upload.keystore (alias: upload)
#   Varsa yalnız imzalar (aynı şifre sorulur).
# · İmzalı çıktılar depo DIŞINDA: C:\Users\ida\quiztactics-play\
#     quiztactics-<sürüm>.aab  → Play Console'a yüklenecek dosya
#     quiztactics-<sürüm>.apk  → telefona doğrudan kurup denemek için
# · Şifre ekrana, dosyaya ya da kayda yazılmaz; yalnız bu işlemin ortam değişkeninde durur ve
#   iş bitince silinir. Şifreyi kaybedersen yükleme anahtarı Play Console'dan sıfırlatılır.
#
# Önce derleme (imzasız): android klasöründe
#   gradlew.bat bundleRelease assembleRelease   (JAVA_HOME / ANDROID_HOME → ~/.bubblewrap)
# ============================================================
$ErrorActionPreference = "Stop"

$env:JAVA_HOME = Join-Path $env:USERPROFILE ".bubblewrap\jdk\jdk-17.0.20.1+1"   # apksigner.bat bunu ister
$jdkBin   = Join-Path $env:JAVA_HOME "bin"
$buildT   = Join-Path $env:USERPROFILE ".bubblewrap\android_sdk\build-tools\35.0.0"
$anahtarK = Join-Path $env:USERPROFILE "quiztactics-anahtar"
$ks       = Join-Path $anahtarK "upload.keystore"
$cikti    = Join-Path $env:USERPROFILE "quiztactics-play"
$aabHam   = Join-Path $PSScriptRoot "app\build\outputs\bundle\release\app-release.aab"
$apkHam   = Join-Path $PSScriptRoot "app\build\outputs\apk\release\app-release-unsigned.apk"

$surum = (Get-Content (Join-Path $PSScriptRoot "twa-manifest.json") -Raw | ConvertFrom-Json).appVersionName
$aab = Join-Path $cikti "quiztactics-$surum.aab"
$apk = Join-Path $cikti "quiztactics-$surum.apk"

function Calistir($exe, [string[]]$argumanlar) {
  & $exe @argumanlar
  if ($LASTEXITCODE -ne 0) { throw "$([IO.Path]::GetFileName($exe)) başarısız (çıkış kodu $LASTEXITCODE)" }
}
function Duz($guvenli) {
  $p = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($guvenli)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($p) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p) }
}

foreach ($d in @($aabHam, $apkHam, (Join-Path $jdkBin "keytool.exe"), (Join-Path $buildT "apksigner.bat"))) {
  if (-not (Test-Path $d)) { throw "Bulunamadı: $d — önce derleme / araç kurulumu gerekir (android/OKU.md)." }
}
New-Item -ItemType Directory -Force $anahtarK, $cikti | Out-Null

$yeni = -not (Test-Path $ks)
if ($yeni) {
  Write-Host "Yeni yükleme anahtarı oluşturulacak: $ks"
  Write-Host "Şifre en az 6 karakter olmalı. Yazarken ekranda görünmez. Bir yere güvenle not et."
}
$s1 = Duz (Read-Host "Anahtar deposu şifresi" -AsSecureString)
if ($yeni) {
  $s2 = Duz (Read-Host "Şifre (tekrar)" -AsSecureString)
  if ($s1 -ne $s2) { throw "Şifreler aynı değil. Yeniden çalıştır." }
  if ($s1.Length -lt 6) { throw "Şifre en az 6 karakter olmalı." }
  $s2 = $null
}

$env:QT_KS_SIFRE = $s1
$s1 = $null
try {
  if ($yeni) {
    Calistir (Join-Path $jdkBin "keytool.exe") @(
      "-genkeypair", "-keystore", $ks, "-storetype", "PKCS12", "-alias", "upload",
      "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
      "-dname", "CN=Quiz Tactics, O=Quiz Tactics, C=TR",
      "-storepass:env", "QT_KS_SIFRE", "-keypass:env", "QT_KS_SIFRE")
    Write-Host "Anahtar deposu oluşturuldu."
  }

  # AAB: jarsigner ile imzalanır (Play'in istediği yöntem).
  Copy-Item $aabHam $aab -Force
  Calistir (Join-Path $jdkBin "jarsigner.exe") @(
    "-keystore", $ks, "-storepass:env", "QT_KS_SIFRE",
    "-sigalg", "SHA256withRSA", "-digestalg", "SHA-256", $aab, "upload")

  # APK: zipalign + apksigner (telefonda doğrudan deneme için).
  $hizali = Join-Path $cikti "hizali.tmp.apk"
  Calistir (Join-Path $buildT "zipalign.exe") @("-f", "-p", "4", $apkHam, $hizali)
  Calistir (Join-Path $buildT "apksigner.bat") @(
    "sign", "--ks", $ks, "--ks-key-alias", "upload", "--ks-pass", "env:QT_KS_SIFRE",
    "--out", $apk, $hizali)
  Remove-Item $hizali -Force
  Remove-Item "$apk.idsig" -Force -ErrorAction SilentlyContinue
} finally {
  Remove-Item Env:QT_KS_SIFRE -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Tamam."
Write-Host "  AAB: $aab  ($([math]::Round((Get-Item $aab).Length / 1MB, 2)) MB)"
Write-Host "  APK: $apk  ($([math]::Round((Get-Item $apk).Length / 1MB, 2)) MB)"
Write-Host "Yükleme anahtarı SHA-256 parmak izi (assetlinks.json'a yazılır):"
& (Join-Path $jdkBin "keytool.exe") -printcert -jarfile $aab | Select-String "SHA256:"
