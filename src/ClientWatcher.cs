using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

// Watches only top-level windows belonging to the installed OpenAI.Codex app.
// It never changes client files, redirects other executables, or restarts Codex.
internal sealed class ClientWatcher : ApplicationContext
{
    private readonly Control dispatch = new Control();
    private readonly System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer();
    private readonly EventWaitHandle stop = new EventWaitHandle(false, EventResetMode.ManualReset, "Local\\CodexLiquidGlassStartup.StopWatcher");
    private readonly Native.EventCallback callback;
    private readonly IntPtr visibilityHook;
    private readonly StartupSessions startups;
    private Splash splash;
    private bool queued;
    private bool disposed;
    private bool inspected;

    internal ClientWatcher()
    {
        stop.Reset();
        var handle = dispatch.Handle;
        var existing = Native.ClientProcessKeys();
        Program.Mark("processes-read");
        string[] played;
        try { played = File.ReadAllLines(Path.Combine(Program.State, "played-sessions.txt")); }
        catch (IOException) { played = new string[0]; }
        startups = StartupSessions.Resume(existing, played, DateTime.UtcNow);
        SaveSessions();
        Program.Mark("sessions-saved");
        Program.Log("WATCHER_STARTED startup-only pid=" + Process.GetCurrentProcess().Id + " existing_process_sessions=" + existing.Count);
        Program.Mark("startup-logged");
        callback = OnWindowEvent;
        visibilityHook = Native.SetWinEventHook(0x8002, 0x8002, IntPtr.Zero, callback, 0, 0, 0x0002);
        if (visibilityHook == IntPtr.Zero) Program.Log("EVENT_HOOK_FALLBACK polling-enabled");
        timer.Interval = 800;
        timer.Tick += delegate { Poll(); };
        timer.Start();
        Program.Mark("monitoring");
    }

    private void OnWindowEvent(IntPtr hook, uint eventId, IntPtr window, int objectId, int childId, uint threadId, uint time)
    {
        if (disposed || queued || window == IntPtr.Zero || objectId != 0 || childId != 0) return;
        queued = true;
        try { dispatch.BeginInvoke((Action)delegate { queued = false; Poll(); }); }
        catch (InvalidOperationException) { queued = false; }
    }

    private void Poll()
    {
        if (disposed) return;
        if (stop.WaitOne(0)) { ExitThread(); return; }
        if (splash != null) return;
        var windows = Native.ClientWindows();
        if (!inspected) { Program.Mark("monitoring visible_client_windows=" + windows.Count); inspected = true; }
        var next = startups.NextStartup(windows);
        if (next != null)
        {
            SaveSessions();
            Program.Log("NEW_CLIENT_SESSION " + next.Session);
            ShowFor(next.Handle);
        }
    }

    private void SaveSessions()
    {
        try
        {
            var path = Path.Combine(Program.State, "played-sessions.txt");
            var temporary = path + ".tmp";
            File.WriteAllLines(temporary, startups.Snapshot());
            if (File.Exists(path)) File.Replace(temporary, path, null);
            else File.Move(temporary, path);
        }
        catch (IOException ex) { Program.Log("SESSION_STATE_ERROR " + ex.Message); }
    }

    private void ShowFor(IntPtr window)
    {
        if (splash != null || !Native.IsWindow(window)) return;
        Program.Log("CLIENT_OPEN_DETECTED hwnd=" + window.ToInt64());
        splash = new Splash(window);
        splash.FormClosed += delegate
        {
            splash = null;
            Program.Log("WATCH_SPLASH_ENDED");
        };
        // An owned window stays with Codex instead of covering unrelated apps.
        splash.Show(new ClientOwner(window));
    }

    protected override void ExitThreadCore()
    {
        disposed = true;
        timer.Stop(); timer.Dispose();
        if (visibilityHook != IntPtr.Zero) Native.UnhookWinEvent(visibilityHook);
        if (splash != null) splash.Close();
        dispatch.Dispose(); stop.Dispose();
        Program.Log("WATCHER_STOPPED");
        base.ExitThreadCore();
    }
}

internal sealed class ClientOwner : IWin32Window
{
    public IntPtr Handle { get; private set; }
    internal ClientOwner(IntPtr handle) { Handle = handle; }
}

internal static class Native
{
    internal delegate void EventCallback(IntPtr hook, uint eventId, IntPtr window, int objectId, int childId, uint threadId, uint time);
    private delegate bool EnumCallback(IntPtr window, IntPtr parameter);
    internal static List<ClientWindowInfo> ClientWindows()
    {
        var result = new List<ClientWindowInfo>();
        EnumWindows(delegate(IntPtr window, IntPtr parameter)
        {
            if (!IsWindowVisible(window) || IsIconic(window) || GetWindow(window, 4) != IntPtr.Zero) return true;
            var title = new StringBuilder(256);
            GetWindowText(window, title, title.Capacity);
            string text = title.ToString();
            if (text.IndexOf("ChatGPT", StringComparison.OrdinalIgnoreCase) < 0 && text.IndexOf("Codex", StringComparison.OrdinalIgnoreCase) < 0) return true;
            uint processId;
            GetWindowThreadProcessId(window, out processId);
            string key;
            Rectangle bounds;
            if (TryGetClientKey(processId, out key) && TryGetWindowBounds(window, out bounds)) result.Add(new ClientWindowInfo(window, key));
            return true;
        }, IntPtr.Zero);
        return result;
    }

    internal static List<string> ClientProcessKeys()
    {
        var result = new List<string>();
        foreach (var process in Process.GetProcessesByName("ChatGPT"))
        {
            using (process)
            {
                string key;
                if (TryGetClientKey((uint)process.Id, out key)) result.Add(key);
            }
        }
        return result;
    }

    private static bool TryGetClientKey(uint processId, out string key)
    {
        key = null;
        var process = OpenProcess(0x1000, false, processId);
        if (process != IntPtr.Zero)
        {
            try
            {
                var path = new StringBuilder(2048);
                uint size = (uint)path.Capacity;
                if (QueryFullProcessImageName(process, 0, path, ref size))
                {
                    string exe = path.ToString();
                    bool knownGlass = ClientTarget.IsGlassExecutable(exe);
                    bool knownStore = exe.IndexOf("\\WindowsApps\\OpenAI.Codex_", StringComparison.OrdinalIgnoreCase) >= 0 && exe.EndsWith("\\app\\ChatGPT.exe", StringComparison.OrdinalIgnoreCase);
                    if (!knownGlass && !knownStore) return false;
                    long created, exited, kernel, user;
                    if (GetProcessTimes(process, out created, out exited, out kernel, out user))
                    {
                        key = processId.ToString() + ":" + created.ToString();
                        return true;
                    }
                }
            }
            finally { CloseHandle(process); }
        }
        return false;
    }

    [StructLayout(LayoutKind.Sequential)] private struct Rect { public int Left, Top, Right, Bottom; }

    internal static bool TryGetWindowBounds(IntPtr window, out Rectangle bounds)
    {
        Rect rect;
        if (DwmGetWindowAttribute(window, 9, out rect, Marshal.SizeOf(typeof(Rect))) != 0 && !GetWindowRect(window, out rect))
        { bounds = Rectangle.Empty; return false; }
        bounds = Rectangle.FromLTRB(rect.Left, rect.Top, rect.Right, rect.Bottom);
        return bounds.Width >= 240 && bounds.Height >= 180;
    }

    [DllImport("user32.dll")] private static extern bool EnumWindows(EnumCallback callback, IntPtr parameter);
    [DllImport("user32.dll")] internal static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] internal static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] internal static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll")] internal static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] private static extern IntPtr GetWindowExtendedStyle(IntPtr window,int index);
    internal static bool IsNonOccludingOverlay(IntPtr window) { return (GetWindowExtendedStyle(window,-20).ToInt64() & 0x00000080)!=0; }
    [DllImport("user32.dll")] private static extern IntPtr GetWindow(IntPtr window, uint command);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowText(IntPtr window, StringBuilder text, int capacity);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("kernel32.dll")] private static extern IntPtr OpenProcess(uint access, bool inheritHandle, uint processId);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] private static extern bool QueryFullProcessImageName(IntPtr process, uint flags, StringBuilder path, ref uint size);
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")] private static extern bool GetProcessTimes(IntPtr process, out long created, out long exited, out long kernel, out long user);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out Rect rect);
    [DllImport("dwmapi.dll")] private static extern int DwmGetWindowAttribute(IntPtr window, int attribute, out Rect rect, int size);
    [DllImport("user32.dll")] internal static extern IntPtr SetWinEventHook(uint eventMin, uint eventMax, IntPtr module, EventCallback callback, uint processId, uint threadId, uint flags);
    [DllImport("user32.dll")] internal static extern bool UnhookWinEvent(IntPtr hook);
}
