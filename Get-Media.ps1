[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$mediaVersion='1.2.0'
$mediaHash='efd9723a7d3e2a8aeb564244ec2e58e2c68b1f32800b3cec99870be5dfbb64be'
$mediaFolder=Join-Path $PSScriptRoot 'assets'
$mediaFiles=@('startup-wide.mp4','final-wide.png','backdrop.png')
$mediaHashes=@{
    'startup-wide.mp4'='50af9b4f62a53113d68039eb01de4b9956bc85eeff1fb22fce6d3e68f7915b2a'
    'final-wide.png'='fd763ca9385ee4ff3d8a8a0a93200468f2cfd02a66c1edc98e6544a38ef1c55c'
    'backdrop.png'='e5c8aa392a5772f88f74006934112f1291722f568e4d2cf68e4ede505b2d3834'
}
function Test-MediaFile([string]$name){
    $file=Join-Path $mediaFolder $name
    return (Test-Path -LiteralPath $file) -and ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -eq $mediaHashes[$name])
}
if(@($mediaFiles | Where-Object {-not(Test-MediaFile $_)}).Count -eq 0){Write-Output 'All three media assets match this version.';return}
New-Item -ItemType Directory -Force -Path $mediaFolder | Out-Null
$mediaArchive=Join-Path ([IO.Path]::GetTempPath()) ('Codex-Liquid-Glass-Startup-'+$mediaVersion+'-Media.zip')
Invoke-WebRequest -Uri ('https://github.com/yhc904444-eng/frosted-glass-startup/releases/download/v'+$mediaVersion+'/Codex-Liquid-Glass-Startup-'+$mediaVersion+'-Media.zip') -OutFile $mediaArchive
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
