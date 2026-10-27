using System;

internal static class StartupPolicyTests
{
    private static int checks;
    private static ClientWindowInfo Window(int handle, string session) { return new ClientWindowInfo(new IntPtr(handle), session); }
    private static void Check(bool condition, string name)
    {
        if (!condition) throw new Exception(name);
        checks++; Console.WriteLine("PASS " + name);
    }
    private static int Main()
    {
        var policy = new StartupSessions(new[] { "existing:100" });
        Check(policy.NextStartup(new[] { Window(1, "existing:100") }) == null, "Installing while Codex is running does not play");
        Check(policy.NextStartup(new ClientWindowInfo[0]) == null, "Minimize, hide, and close-to-tray do not play");
        Check(policy.NextStartup(new[] { Window(1, "existing:100") }) == null, "Restoring the original window does not play");
        Check(policy.NextStartup(new[] { Window(2, "existing:100") }) == null, "Recreating a window in the same process does not play");
        Check(policy.NextStartup(new[] { Window(3, "new:200") }) != null, "A newly started client plays once");
        Check(policy.NextStartup(new[] { Window(3, "new:200") }) == null, "Switching to an already shown window does not replay");
        policy.NextStartup(new ClientWindowInfo[0]);
        Check(policy.NextStartup(new[] { Window(3, "new:200") }) == null, "Hide then restore after an animation does not replay");
        Check(policy.NextStartup(new[] { Window(4, "new:300") }) != null, "A new process lifetime plays even when the PID is reused");
        var now = DateTime.UtcNow;
        var justLaunched = "123:" + now.AddSeconds(-3).ToFileTimeUtc();
        var longRunning = "234:" + now.AddMinutes(-5).ToFileTimeUtc();
        var resume = StartupSessions.Resume(new[] { justLaunched, longRunning }, new string[0], now);
        Check(resume.NextStartup(new[] { Window(5, justLaunched) }) != null, "Logon task starting after a fresh client does not miss the launch");
        Check(resume.NextStartup(new[] { Window(6, longRunning) }) == null, "Restarting the helper does not animate an old client");
        var restarted = StartupSessions.Resume(new[] { justLaunched }, resume.Snapshot(), now.AddSeconds(5));
        Check(restarted.NextStartup(new[] { Window(7, justLaunched) }) == null, "A helper restart does not replay a completed startup");
        var readiness = new ReadinessPolicy();
        readiness.Observe(false, TimeSpan.FromSeconds(2));
        Check(!readiness.Ready, "A fixed animation duration cannot mark a loading client ready");
        readiness.Observe(true, TimeSpan.FromSeconds(3));
        Check(!readiness.Ready, "One transient interactive observation is insufficient");
        readiness.Observe(false, TimeSpan.FromSeconds(3.2));
        readiness.Observe(true, TimeSpan.FromSeconds(3.5));
        Check(!readiness.Ready, "A failed observation resets the readiness window");
        readiness.Observe(true, TimeSpan.FromSeconds(4));
        Check(readiness.Ready, "A stably interactive client becomes ready without an 8.4 second minimum");
        var slow = new ReadinessPolicy();
        slow.Observe(false, TimeSpan.FromSeconds(45));
        Check(slow.Slow && !slow.Ready, "A slow-loading status never fakes readiness");
        slow.Observe(true, TimeSpan.FromSeconds(46));
        slow.Observe(true, TimeSpan.FromSeconds(46.5));
        Check(slow.Ready, "A slow client can still become ready later");
        var playback = new PlaybackPolicy();
        Check(!playback.CanEnter(false), "An unready client cannot enter during the film");
        Check(!playback.CanEnter(true), "An early ready signal cannot interrupt the film");
        playback.EndAnimation();
        Check(playback.AnimationEnded && !playback.CanEnter(false), "An ended film holds while the client is still loading");
        Check(playback.CanEnter(true), "Ready plus an ended film permits entry");
        playback.EndAnimation();
        Check(playback.AnimationEnded && !playback.CanEnter(false), "Repeated ended notifications do not restart or bypass readiness");
        Console.WriteLine(checks + " lifecycle checks passed.");
        return 0;
    }
}
