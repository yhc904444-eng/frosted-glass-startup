[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$mediaVersion='1.0.0'
$mediaHash='85a0009514f178e5f6ae39880aaee195623c1f81a8025c9aeae14efbac80c984'
$mediaFolder=Join-Path $PSScriptRoot 'assets'
$mediaFiles=@('startup-standard.mp4','startup-wide.mp4','final-standard.png','final-wide.png')
if(@($mediaFiles | Where-Object {-not(Test-Path -LiteralPath (Join-Path $mediaFolder $_))}).Count -eq 0){Write-Output 'All four media assets are already present.';return}
$mediaArchive=Join-Path ([IO.Path]::GetTempPath()) ('Codex-Liquid-Glass-Startup-'+$mediaVersion+'-Media.zip')
Invoke-WebRequest -Uri ('https://github.com/yhc904444-eng/codex-liquid-glass-startup/releases/download/v'+$mediaVersion+'/Codex-Liquid-Glass-Startup-'+$mediaVersion+'-Media.zip') -OutFile $mediaArchive
if((Get-FileHash -LiteralPath $mediaArchive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $mediaHash){throw 'Downloaded media archive hash does not match this version.'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$mediaZip=[IO.Compression.ZipFile]::OpenRead($mediaArchive)
try{
    foreach($mediaFile in $mediaFiles){
        $entry=$mediaZip.GetEntry($mediaFile)
        if(-not $entry){throw ('Missing media entry: '+$mediaFile)}
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,(Join-Path $mediaFolder $mediaFile),$true)
    }
}finally{$mediaZip.Dispose()}
Write-Output 'Versioned media downloaded and verified.'
