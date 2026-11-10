[CmdletBinding()]
param([switch]$NativePlayback)
$ErrorActionPreference='Stop'
$qaRoot=Join-Path ([IO.Path]::GetTempPath()) ('FrostedGlassStartup-package-'+[Guid]::NewGuid().ToString('N'))
$testInstall=Join-Path $qaRoot 'clean-install'
$setup=Join-Path $PSScriptRoot 'dist\Codex-Liquid-Glass-Startup-1.2.0-Windows-x64-Setup.exe'
New-Item -ItemType Directory -Force -Path $qaRoot | Out-Null
foreach($iteration in 1..2){
    $process=Start-Process -FilePath $setup -ArgumentList ('--test-install="'+$testInstall+'"') -WindowStyle Hidden -Wait -PassThru
    if($process.ExitCode -ne 0){throw ('Clean/repeat installation failed, exit '+$process.ExitCode)}
}
$expected=Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'build\payload') -Recurse -File
$recordHash=(Get-FileHash -LiteralPath (Join-Path $testInstall 'install-record.txt')).Hash
# Simulate a busy media/style file during an update. Earlier and untouched
# installed files must both survive the failed replacement and rollback.
$lockedFile=[IO.File]::Open((Join-Path $testInstall 'web\boot.css'),[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
try{
    $failedUpdate=Start-Process -FilePath $setup -ArgumentList ('--test-install="'+$testInstall+'"') -WindowStyle Hidden -Wait -PassThru
    if($failedUpdate.ExitCode -eq 0){throw 'The locked-file update should fail safely.'}
}finally{$lockedFile.Dispose()}
if((Get-FileHash -LiteralPath (Join-Path $testInstall 'install-record.txt')).Hash -ne $recordHash){throw 'A failed update changed the installation record.'}
foreach($file in $expected){
    $relative=$file.FullName.Substring((Join-Path $PSScriptRoot 'build\payload').Length+1)
    if((Get-FileHash -LiteralPath $file.FullName).Hash -ne (Get-FileHash -LiteralPath (Join-Path $testInstall $relative)).Hash){throw ('Installed payload hash mismatch: '+$relative)}
}
$diagnosticState=Join-Path $qaRoot 'diagnostic-state'
$diagnose=Start-Process -FilePath (Join-Path $testInstall 'CodexCyberStart.exe') -ArgumentList ('--diagnose --state-dir="'+$diagnosticState+'"') -WindowStyle Hidden -Wait -PassThru
if($diagnose.ExitCode -ne 0){throw 'Installed launcher could not find the WebView2 runtime.'}
if($NativePlayback){
    $nativeState=Join-Path $qaRoot 'playback-state'
    $native=Start-Process -FilePath (Join-Path $testInstall 'CodexCyberStart.exe') -ArgumentList ('--self-test-lifecycle --preview-size=960x600 --state-dir="'+$nativeState+'"') -WindowStyle Hidden -PassThru
    if(-not $native.WaitForExit(60000)){throw 'Native lifecycle test did not finish within 60 seconds.'}
    if($native.ExitCode -ne 0){throw 'Native lifecycle test failed.'}
    $result=Get-Content -Raw -LiteralPath (Join-Path $testInstall 'qa\lifecycle-result.json') | ConvertFrom-Json
    $entry=Get-Content -Raw -LiteralPath (Join-Path $testInstall 'qa\entry-result.json') | ConvertFrom-Json
    if(-not $result.playedOnce -or -not $result.identicalHeldFrames -or -not $entry.enteredOnlyAfterVideoAndReadiness){throw 'Native playback gate did not pass.'}
}
$marker=Join-Path $testInstall 'user-created-keep.txt'
[IO.File]::WriteAllText($marker,'Uninstall preserves files outside the installation manifest.')
$uninstall=Start-Process -FilePath $setup -ArgumentList ('--test-remove="'+$testInstall+'"') -WindowStyle Hidden -Wait -PassThru
if($uninstall.ExitCode -ne 0){throw 'Isolated uninstall failed.'}
if(-not(Test-Path -LiteralPath $marker) -or (Test-Path -LiteralPath (Join-Path $testInstall 'CodexCyberStart.exe'))){throw 'Uninstall did not preserve user files or remove application files correctly.'}
$result=[ordered]@{passed=$true;cleanInstall=$true;repeatInstall=$true;failedUpdatePreservedPayload=$true;payloadHashes=$true;webView2Available=$true;nativePlayback=[bool]$NativePlayback;uninstall=$true;uninstallPreservedUserFile=$true;qaDirectory=$qaRoot}
$result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $qaRoot 'result.json') -Encoding utf8
New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'qa') | Out-Null
$result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'qa\package-result.json') -Encoding utf8
$result | ConvertTo-Json
