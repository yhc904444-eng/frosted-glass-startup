using System;
using System.Diagnostics;
using System.Threading;

internal static class ReadinessProbeTests
{
    private static int Main(string[] args)
    {
        if(args.Length>0)
        {
            if(args[0]=="--blocked"){Thread.Sleep(120000);return 0;}
            return args[0]=="--ready"?0:2;
        }
        var executable=Process.GetCurrentProcess().MainModule.FileName;
        var timer=Stopwatch.StartNew();
        var blocked=ReadinessProbe.RunBounded(executable,"--blocked",250);
        if(blocked.Interactive||blocked.Status!="probe-timeout"||timer.ElapsedMilliseconds>1800)throw new Exception("A blocked provider was not bounded");
        Console.WriteLine("PASS A blocked provider is terminated within its deadline");
        var recovered=ReadinessProbe.RunBounded(executable,"--ready",2000);
        if(!recovered.Interactive)throw new Exception("A subsequent observation did not recover");
        Console.WriteLine("PASS A successful observation recovers after a timeout");
        var loading=ReadinessProbe.RunBounded(executable,"--loading",2000);
        if(loading.Interactive)throw new Exception("An unready provider bypassed readiness");
        Console.WriteLine("PASS An unready provider never permits entry");
        return 0;
    }
}
