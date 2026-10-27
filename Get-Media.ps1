[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$mediaVersion='1.1.0'
$mediaHash='d8614be00ca9aed10a86aaafaa910f93148ba82b259ce0c64d677b2a20438946'
$mediaFolder=Join-Path $PSScriptRoot 'assets'
$mediaFiles=@('startup-standard.mp4','startup-wide.mp4','final-standard.png','final-wide.png')
$mediaHashes=@{
    'startup-standard.mp4'='8e95ea128b28ff34962528d0bffe64c35421bce3774bb4d5a11f3e392b9197e3'
    'startup-wide.mp4'='9733e56b2ebff6b80f4ff9e456ca252fd533374760a66f12bcf5f0d04c87c713'
    'final-standard.png'='cfd51694f99ef8659f50fb9e2db86f0fcd1186ae86d182a46679556a4dfba79d'
    'final-wide.png'='3c4f6a28fc3b4b60e248273c4c91fcaec0a0ed57a0500db70e4ca3a04e63c71a'
}
function Test-MediaFile([string]$name){
    $file=Join-Path $mediaFolder $name
    return (Test-Path -LiteralPath $file) -and ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -eq $mediaHashes[$name])
}
if(@($mediaFiles | Where-Object {-not(Test-MediaFile $_)}).Count -eq 0){Write-Output 'All four media assets match this version.';return}
New-Item -ItemType Directory -Force -Path $mediaFolder | Out-Null
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
foreach($mediaFile in $mediaFiles){if(-not(Test-MediaFile $mediaFile)){throw ('Extracted media hash mismatch: '+$mediaFile)}}
Write-Output 'Versioned media downloaded and verified.'
