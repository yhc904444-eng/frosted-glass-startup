using System;
using System.Collections.Generic;
using System.Linq;

internal sealed class ClientWindowInfo
{
    internal readonly IntPtr Handle;
    internal readonly string Session;
    internal ClientWindowInfo(IntPtr handle, string session) { Handle = handle; Session = session; }
}

// Window visibility is not an application launch. Keep the session marked even
// when every window disappears, minimizes, or gets recreated by the same process.
internal sealed class StartupSessions
{
    private readonly HashSet<string> handled;
    internal StartupSessions(IEnumerable<string> existing) { handled = new HashSet<string>(existing); }

    internal static StartupSessions Resume(IEnumerable<string> existing, IEnumerable<string> played, DateTime now)
    {
        var result = new StartupSessions(played);
        foreach (var session in existing)
        {
            long fileTime;
            var separator = session.IndexOf(':');
            bool recent = false;
            if (separator >= 0 && long.TryParse(session.Substring(separator + 1), out fileTime))
            {
                try
                {
                    var age = now - DateTime.FromFileTimeUtc(fileTime);
                    recent = age >= TimeSpan.Zero && age <= TimeSpan.FromSeconds(30);
                }
                catch (ArgumentOutOfRangeException) { }
            }
            // A client may start just before the logon task. Do not discard that
            // new launch. Older, already-open clients remain silent.
            if (!recent) result.handled.Add(session);
        }
        return result;
    }

    internal string[] Snapshot()
    {
        return handled.OrderByDescending(value => value.Substring(value.IndexOf(':') + 1), StringComparer.Ordinal).Take(256).ToArray();
    }

    internal ClientWindowInfo NextStartup(IEnumerable<ClientWindowInfo> visible)
    {
        foreach (var window in visible)
            if (handled.Add(window.Session)) return window;
        return null;
    }
}
