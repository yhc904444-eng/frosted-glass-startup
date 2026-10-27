using System;
using System.Diagnostics;
using System.Threading.Tasks;

internal sealed class ReadinessProbeResult
{
    internal bool Interactive;
    internal string Status;
}

internal static class ReadinessProbe
{
    // Accessibility providers are outside our control. A disposable STA process
    // gives every observation a real deadline without leaving hung worker threads.
    internal static Task<ReadinessProbeResult> ObserveAsync(IntPtr window)
    {
        return Task.Run(() => RunBounded(AppDomain.CurrentDomain.BaseDirectory+"CodexCyberStart.exe",
            "--probe-client="+window.ToInt64(),2000));
    }

    internal static ReadinessProbeResult RunBounded(string executable,string arguments,int timeout)
    {
        using(var process=new Process())
        {
            process.StartInfo=new ProcessStartInfo(executable,arguments) {
                UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden
            };
            try
            {
                process.Start();
                if(!process.WaitForExit(timeout))
                {
                    // This is only the child probe that we just created.
                    process.Kill();process.WaitForExit(500);
                    return new ReadinessProbeResult {Status="probe-timeout"};
                }
                return new ReadinessProbeResult {
                    Interactive=process.ExitCode==0,
                    Status=process.ExitCode==0?"interactive":process.ExitCode==2?"not-interactive":"provider-error"
                };
            }
            catch(Exception ex){return new ReadinessProbeResult {Status="probe-"+ex.GetType().Name};}
        }
    }
}
