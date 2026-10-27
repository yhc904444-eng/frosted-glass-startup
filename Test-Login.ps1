[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$qaRoot=Join-Path $PSScriptRoot ('qa\login-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $qaRoot | Out-Null
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$automation=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\WPF'
$sdk=Join-Path $PSScriptRoot 'vendor\sdk-1.0.4258.31'
$core=Join-Path $sdk 'lib\net462\Microsoft.Web.WebView2.Core.dll'
$forms=Join-Path $sdk 'lib\net462\Microsoft.Web.WebView2.WinForms.dll'
Copy-Item -LiteralPath $core,$forms,(Join-Path $sdk 'build\native\x64\WebView2Loader.dll') -Destination $qaRoot
$testExe=Join-Path $qaRoot 'LoginReadinessIntegration.exe'
& $compiler /nologo /target:winexe /platform:x64 /optimize+ "/out:$testExe" "/win32manifest:$PSScriptRoot\src\app.manifest" /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll "/reference:$automation\UIAutomationClient.dll" "/reference:$automation\UIAutomationTypes.dll" "/reference:$automation\WindowsBase.dll" "/reference:$core" "/reference:$forms" (Join-Path $PSScriptRoot 'tests\LoginReadinessIntegration.cs') (Join-Path $PSScriptRoot 'src\ClientReadiness.cs') (Join-Path $PSScriptRoot 'src\ClientScreenPolicy.cs')
if($LASTEXITCODE -ne 0){throw 'Login readiness integration compilation failed.'}
$process=Start-Process -FilePath $testExe -ArgumentList ('"'+$qaRoot+'"') -WindowStyle Hidden -Wait -PassThru
if($process.ExitCode -ne 0){Get-Content -LiteralPath (Join-Path $qaRoot 'inspection.txt') -ErrorAction SilentlyContinue;throw ('Login readiness test failed. See '+$qaRoot)}
Get-Content -LiteralPath (Join-Path $qaRoot 'login-readiness-result.json')
