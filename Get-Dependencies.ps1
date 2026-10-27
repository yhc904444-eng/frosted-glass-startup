[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$dependencyRoot=Join-Path $PSScriptRoot 'vendor'
New-Item -ItemType Directory -Force -Path $dependencyRoot | Out-Null
$sdkArchive=Join-Path $dependencyRoot 'webview2.nupkg'
$sdkHash='56F7F4B8BF9AEE4B8EFEFBBDD4F67D5F74EBD1B100ED0806DA71BF76AF481AA9'
if(-not(Test-Path -LiteralPath $sdkArchive)) {
    Invoke-WebRequest -Uri 'https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/1.0.4258.31/microsoft.web.webview2.1.0.4258.31.nupkg' -OutFile $sdkArchive
}
if((Get-FileHash -LiteralPath $sdkArchive -Algorithm SHA256).Hash -ne $sdkHash){throw 'WebView2 SDK package hash does not match the pinned release.'}
$sdkFolder=Join-Path $dependencyRoot 'sdk-1.0.4258.31'
if(-not(Test-Path -LiteralPath $sdkFolder)) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::ExtractToDirectory($sdkArchive,$sdkFolder)
}
$runtimeInstaller=Join-Path $dependencyRoot 'MicrosoftEdgeWebview2Setup.exe'
if(-not(Test-Path -LiteralPath $runtimeInstaller)) {
    Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $runtimeInstaller
}
$runtimeSignature=Get-AuthenticodeSignature -LiteralPath $runtimeInstaller
if($runtimeSignature.Status -ne 'Valid' -or $runtimeSignature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') {throw 'The WebView2 bootstrapper does not have a valid Microsoft signature.'}
Write-Output 'Pinned SDK hash and Microsoft WebView2 installer signature verified.'
