[CmdletBinding()]
param([switch]$SkipDependencyDownload)
$ErrorActionPreference='Stop'
$projectRoot=$PSScriptRoot
if(-not $SkipDependencyDownload){ & (Join-Path $projectRoot 'Get-Dependencies.ps1') }
$sdkRoot=Join-Path $projectRoot 'vendor\sdk-1.0.4258.31'
if(-not(Test-Path -LiteralPath $sdkRoot)){throw 'Run Get-Dependencies.ps1 first.'}
$buildRoot=Join-Path $projectRoot 'build'
$payloadRoot=Join-Path $buildRoot 'payload'
$releaseRoot=Join-Path $projectRoot 'dist'
if(Test-Path -LiteralPath $buildRoot){throw 'Build directory already exists. Use a fresh checkout or rename build/ before rebuilding.'}
New-Item -ItemType Directory -Force -Path $payloadRoot,$releaseRoot,(Join-Path $payloadRoot 'web\assets'),(Join-Path $payloadRoot 'licenses'),(Join-Path $payloadRoot 'dependencies') | Out-Null
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$automation=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\WPF'
$core=Join-Path $sdkRoot 'lib\net462\Microsoft.Web.WebView2.Core.dll'
$forms=Join-Path $sdkRoot 'lib\net462\Microsoft.Web.WebView2.WinForms.dll'
Copy-Item -LiteralPath $core,$forms -Destination $payloadRoot
Copy-Item -LiteralPath (Join-Path $sdkRoot 'build\native\x64\WebView2Loader.dll') -Destination $payloadRoot
$appSources=@('AssemblyInfo.cs','Program.cs','ClientWatcher.cs','StartupSessions.cs','ReadinessPolicy.cs','ClientReadiness.cs','ReadinessProbe.cs','PlaybackPolicy.cs','ClientTarget.cs','ClientScreenPolicy.cs') | ForEach-Object {Join-Path $projectRoot ('src\'+$_)}
& $compiler /nologo /target:winexe /platform:x64 /optimize+ "/out:$payloadRoot\CodexCyberStart.exe" "/win32manifest:$projectRoot\src\app.manifest" /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll "/reference:$automation\UIAutomationClient.dll" "/reference:$automation\UIAutomationTypes.dll" "/reference:$automation\WindowsBase.dll" "/reference:$core" "/reference:$forms" $appSources
if($LASTEXITCODE -ne 0){throw 'Launcher compilation failed.'}
foreach($file in @('index.html','boot.css','boot.js','gate.js')){Copy-Item -LiteralPath (Join-Path $projectRoot ('web\'+$file)) -Destination (Join-Path $payloadRoot 'web')}
foreach($file in @('startup-standard.mp4','startup-wide.mp4','final-standard.png','final-wide.png')){
    $media=Join-Path $projectRoot ('assets\'+$file)
    if(-not(Test-Path -LiteralPath $media)){throw ('Missing media: '+$file+'. See assets/README.md.')}
    Copy-Item -LiteralPath $media -Destination (Join-Path $payloadRoot 'web\assets')
}
foreach($file in @('LICENSE','README.md','THIRD-PARTY-NOTICES.md')){Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $payloadRoot}
Copy-Item -LiteralPath (Join-Path $projectRoot 'licenses\WebView2-LICENSE.txt'),(Join-Path $projectRoot 'licenses\WebView2-NOTICE.txt') -Destination (Join-Path $payloadRoot 'licenses')
Copy-Item -LiteralPath (Join-Path $projectRoot 'vendor\MicrosoftEdgeWebview2Setup.exe') -Destination (Join-Path $payloadRoot 'dependencies')
& $compiler /nologo /target:winexe /platform:x64 /optimize+ "/out:$payloadRoot\Uninstall.exe" "/win32manifest:$projectRoot\src\app.manifest" /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll /reference:Microsoft.CSharp.dll (Join-Path $projectRoot 'installer\Setup.cs') (Join-Path $projectRoot 'src\AssemblyInfo.cs')
if($LASTEXITCODE -ne 0){throw 'Uninstaller compilation failed.'}
$checksums=@(Get-ChildItem -LiteralPath $payloadRoot -Recurse -File | Sort-Object FullName | ForEach-Object { (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()+'  '+$_.FullName.Substring($payloadRoot.Length+1) })
[IO.File]::WriteAllLines((Join-Path $payloadRoot 'payload.sha256'),$checksums,[Text.UTF8Encoding]::new($false))
Add-Type -AssemblyName System.IO.Compression.FileSystem
$payloadZip=Join-Path $buildRoot 'payload.zip'
[IO.Compression.ZipFile]::CreateFromDirectory($payloadRoot,$payloadZip,[IO.Compression.CompressionLevel]::Optimal,$false)
$setup=Join-Path $releaseRoot 'Codex-Liquid-Glass-Startup-1.1.0-Windows-x64-Setup.exe'
& $compiler /nologo /target:winexe /platform:x64 /optimize+ "/out:$setup" "/win32manifest:$projectRoot\src\app.manifest" /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll /reference:Microsoft.CSharp.dll "/resource:$payloadZip,payload.zip" (Join-Path $projectRoot 'installer\Setup.cs') (Join-Path $projectRoot 'src\AssemblyInfo.cs')
if($LASTEXITCODE -ne 0){throw 'Installer compilation failed.'}
& $compiler /nologo /target:exe /platform:x64 /optimize+ "/out:$buildRoot\StartupPolicyTests.exe" /reference:System.dll /reference:System.Core.dll (Join-Path $projectRoot 'tests\StartupPolicyTests.cs') (Join-Path $projectRoot 'src\StartupSessions.cs') (Join-Path $projectRoot 'src\ReadinessPolicy.cs') (Join-Path $projectRoot 'src\PlaybackPolicy.cs')
if($LASTEXITCODE -ne 0){throw 'Policy test compilation failed.'}
& (Join-Path $buildRoot 'StartupPolicyTests.exe')
if($LASTEXITCODE -ne 0){throw 'Policy tests failed.'}
& $compiler /nologo /target:exe /platform:x64 /optimize+ "/out:$buildRoot\ReadinessProbeTests.exe" /reference:System.dll /reference:System.Core.dll (Join-Path $projectRoot 'tests\ReadinessProbeTests.cs') (Join-Path $projectRoot 'src\ReadinessProbe.cs')
if($LASTEXITCODE -ne 0){throw 'Probe test compilation failed.'}
& (Join-Path $buildRoot 'ReadinessProbeTests.exe')
if($LASTEXITCODE -ne 0){throw 'Bounded probe tests failed.'}
$releaseFiles=@($setup)
$mediaRelease=Join-Path $releaseRoot 'Codex-Liquid-Glass-Startup-1.1.0-Media.zip'
if(Test-Path -LiteralPath $mediaRelease){$releaseFiles+=$mediaRelease}
$releaseHashes=@($releaseFiles | ForEach-Object {(Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash.ToLowerInvariant()+'  '+(Split-Path -Leaf $_)})
[IO.File]::WriteAllLines((Join-Path $releaseRoot 'SHA256SUMS.txt'),$releaseHashes,[Text.UTF8Encoding]::new($false))
Write-Output $setup
