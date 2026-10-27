using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Security.Cryptography;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal static class Program
{
    internal const string AppId = "OpenAI.Codex_2p2nqsd0c76g0!App";
    internal static readonly string Root = AppDomain.CurrentDomain.BaseDirectory;
    internal static string State = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CodexLiquidGlassStartup");
    internal static bool Preview;
    internal static bool Follow;
    internal static bool SelfTest;
    internal static Size PreviewSize = Size.Empty;
    internal static long PreviewReadyAfterMilliseconds = 1200;
    private static readonly object LogLock = new object();

    [STAThread]
    private static int Main(string[] args)
    {
        var stateArgument = args.FirstOrDefault(value => value.StartsWith("--state-dir="));
        if (stateArgument != null) State = Path.GetFullPath(stateArgument.Substring("--state-dir=".Length));
        if (args.Contains("--diagnose"))
        {
            Directory.CreateDirectory(State);
            string version;
            try { version = CoreWebView2Environment.GetAvailableBrowserVersionString(); }
            catch (Exception) { version = "missing"; }
            File.WriteAllText(Path.Combine(State, "diagnostics.txt"), "WebView2=" + version + Environment.NewLine + "Client=" + ClientTarget.Describe());
            return version == "missing" ? 2 : 0;
        }
        var probeArgument=args.FirstOrDefault(value=>value.StartsWith("--probe-client="));
        if(probeArgument!=null)
        {
            long handle;
            if(!long.TryParse(probeArgument.Substring("--probe-client=".Length),out handle))return 3;
            var target=new IntPtr(handle);
            if(!Native.ClientWindows().Any(window=>window.Handle==target))return 2;
            return ClientReadiness.Probe(target)?0:2;
        }
        if (args.Contains("--stop-watch"))
        {
            try { using (var stop = EventWaitHandle.OpenExisting("Local\\CodexLiquidGlassStartup.StopWatcher")) stop.Set(); }
            catch (WaitHandleCannotBeOpenedException) { }
            return 0;
        }
        SelfTest = args.Contains("--self-test-lifecycle");
        Preview = args.Contains("--preview") || args.Contains("--preview-client") || args.Contains("--preview-owned-client") || SelfTest;
        Follow = args.Contains("--watch");
        foreach (var argument in args)
        {
            if(argument.StartsWith("--preview-size="))
            {
                var parts=argument.Substring("--preview-size=".Length).Split('x');
                int width,height;
                if(parts.Length==2 && int.TryParse(parts[0],out width) && int.TryParse(parts[1],out height))
                    PreviewSize=new Size(Math.Max(320,width),Math.Max(240,height));
            }
            if (argument.StartsWith("--preview-ready-after="))
            {
                long delay;
                if (long.TryParse(argument.Substring("--preview-ready-after=".Length), out delay))
                    PreviewReadyAfterMilliseconds = Math.Max(0, delay);
            }
        }
        if (SelfTest) PreviewReadyAfterMilliseconds = long.MaxValue;
        Directory.CreateDirectory(State);
        Mark("main-ready");
        bool first;
        using (var mutex = new Mutex(true, Follow ? "Local\\CodexLiquidGlassStartup.Watcher" : "Local\\CodexLiquidGlassStartup", out first))
        {
            if (!first) return 0;
            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.ThrowException);
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            try
            {
                if(args.Contains("--check-overlay-guard"))
                {
                    using(var probe=new Splash())
                    {
                        bool guard=Native.IsNonOccludingOverlay(probe.Handle);
                        Directory.CreateDirectory(Path.Combine(Root,"qa"));
                        File.WriteAllText(Path.Combine(Root,"qa","overlay-guard-result.json"),"{\"nonOccludingToolWindow\":"+guard.ToString().ToLowerInvariant()+",\"opacity\":1}");
                        return guard?0:1;
                    }
                }
                if (args.Contains("--check-window"))
                {
                    foreach (var window in Native.ClientWindows())
                    {
                        Rectangle bounds;
                        if (!Native.TryGetWindowBounds(window.Handle, out bounds)) continue;
                        using (var probe = new Splash(window.Handle))
                            Log("WINDOW_SIZE_CHECK target=" + bounds + " animation=" + probe.Bounds + " match=" + (bounds == probe.Bounds));
                    }
                    return 0;
                }
                if (args.Contains("--check-readiness"))
                {
                    var checks = Native.ClientWindows().Select(window => "hwnd=" + window.Handle.ToInt64() + " interactive=" + ClientReadiness.Probe(window.Handle)).ToArray();
                    File.WriteAllLines(Path.Combine(Program.State, "readiness-check.txt"), checks);
                    return 0;
                }
                if (args.Contains("--inspect-readiness"))
                {
                    File.WriteAllLines(Path.Combine(Program.State, "readiness-inspection.txt"), Native.ClientWindows().Select(window => "hwnd=" + window.Handle.ToInt64() + " " + ClientReadiness.Inspect(window.Handle)).ToArray());
                    return 0;
                }
                if (Follow) Application.Run(new ClientWatcher());
                else if (args.Contains("--preview-client") || args.Contains("--preview-owned-client"))
                {
                    var window = Native.ClientWindows().FirstOrDefault();
                    if (window == null) throw new InvalidOperationException("No visible Codex window was found.");
                    if(args.Contains("--preview-owned-client"))Application.Run(new OwnedStartupPreview(window.Handle));
                    else Application.Run(new Splash(window.Handle));
                }
                else
                {
                    if (!Preview && !ClientTarget.IsInstalled())
                    {
                        var result = MessageBox.Show("Codex is not installed. Open the official Codex download page?\r\n\r\nChoose No to preview the animation independently.", "Codex Liquid Glass Startup", MessageBoxButtons.YesNoCancel, MessageBoxIcon.Information);
                        if (result == DialogResult.Yes) { Process.Start(new ProcessStartInfo("https://openai.com/codex/") { UseShellExecute = true }); return 0; }
                        if (result != DialogResult.No) return 0;
                        Preview = true;
                    }
                    Application.Run(new Splash());
                }
                return SelfTest && File.Exists(Path.Combine(Root,"qa","lifecycle-failure.txt")) ? 1 : 0;
            }
            catch (Exception ex) { Log("ERROR " + ex); if (!Preview && !Follow) LaunchCodex(); return 1; }
        }
    }

    internal static void Log(string message)
    {
        string line = DateTimeOffset.Now.ToString("o") + " pid=" + Process.GetCurrentProcess().Id + " " + message + Environment.NewLine;
        lock (LogLock)
        {
            try
            {
                using (var stream = new FileStream(Path.Combine(State, "startup.log"), FileMode.Append, FileAccess.Write, FileShare.ReadWrite))
                using (var writer = new StreamWriter(stream)) writer.Write(line);
            }
            catch (Exception ex)
            {
                try { File.WriteAllText(Path.Combine(State, "watcher-log-errors.txt"), ex.ToString()); } catch { }
                try { File.AppendAllText(Path.Combine(State, "watcher-" + Process.GetCurrentProcess().Id + ".log"), line + "Shared log error: " + ex.Message + Environment.NewLine); }
                catch { }
            }
        }
    }

    internal static void Mark(string stage)
    {
        try { File.WriteAllText(Path.Combine(State, "watcher-status.txt"), "pid=" + Process.GetCurrentProcess().Id + " stage=" + stage); }
        catch { }
    }

    internal static void LaunchCodex()
    {
        try
        {
            ClientTarget.Launch();
            Log("CODEX_ACTIVATED " + ClientTarget.Describe());
        }
        catch (Exception ex) { Log("ACTIVATION_ERROR " + ex.Message); }
    }
}

internal sealed class OwnedStartupPreview : ApplicationContext
{
    internal OwnedStartupPreview(IntPtr target)
    {
        MainForm=new Splash(target);
        MainForm.Show(new ClientOwner(target));
    }
}

internal sealed class Splash : Form
{
    // Chromium excludes tool windows from native occlusion calculations. A normal
    // opaque overlay can otherwise stop Codex's first paint, making readiness
    // wait forever for a client that is itself waiting to paint underneath us.
    protected override CreateParams CreateParams
    {
        get { var parameters=base.CreateParams;parameters.ExStyle|=0x00000080;return parameters; }
    }
    private readonly WebView2 view = new WebView2();
    private readonly System.Windows.Forms.Timer watchdog = new System.Windows.Forms.Timer();
    private readonly System.Windows.Forms.Timer followBounds = new System.Windows.Forms.Timer();
    private readonly System.Windows.Forms.Timer readinessTimer = new System.Windows.Forms.Timer();
    private readonly System.Windows.Forms.Timer entryFade = new System.Windows.Forms.Timer();
    private readonly ReadinessPolicy readiness = new ReadinessPolicy();
    private readonly PlaybackPolicy playback = new PlaybackPolicy();
    private bool probePending, pageReady;
    private string lastState, lastProbeStatus;
    private IntPtr targetWindow;
    private bool finished;
    private bool mediaError;
    private bool selfTestStarted;
    private readonly Stopwatch clock = Stopwatch.StartNew();
    private const string Origin = "https://codex-boot.local/";

    internal Splash(IntPtr targetWindow = default(IntPtr))
    {
        this.targetWindow = targetWindow;
        Text = "Codex Liquid Glass Start";
        BackColor = Color.FromArgb(4, 7, 11);
        FormBorderStyle = FormBorderStyle.None;
        AutoScaleMode = AutoScaleMode.None;
        StartPosition = FormStartPosition.Manual;
        WindowState = FormWindowState.Normal;
        Rectangle targetBounds;
        if (targetWindow != IntPtr.Zero && Native.TryGetWindowBounds(targetWindow, out targetBounds)) Bounds = targetBounds;
        else
        {
            var area = Screen.FromPoint(Cursor.Position).WorkingArea;
            var requested=Program.Preview&&!Program.PreviewSize.IsEmpty?Program.PreviewSize:new Size(1280,800);
            var size = new Size(Math.Min(requested.Width, area.Width), Math.Min(requested.Height, area.Height));
            Bounds = new Rectangle(area.Left + (area.Width - size.Width) / 2, area.Top + (area.Height - size.Height) / 2, size.Width, size.Height);
        }
        ShowInTaskbar = false;
        TopMost = false;
        KeyPreview = true;
        view.Dock = DockStyle.Fill;
        view.DefaultBackgroundColor = BackColor;
        Controls.Add(view);
        KeyDown += delegate(object sender, KeyEventArgs e) { if (e.KeyCode == Keys.Escape) Finish("escape"); };
        watchdog.Interval = 20000;
        // This guards only a failed WebView boot, never an intentional wait at the gate.
        watchdog.Tick += delegate { Finish("page-load-timeout"); };
        followBounds.Interval = 100;
        followBounds.Tick += delegate { SyncTargetBounds(); };
        readinessTimer.Interval = 500;
        readinessTimer.Tick += delegate { PollReadiness(); };
        FormClosed += delegate { watchdog.Dispose(); followBounds.Dispose(); readinessTimer.Dispose(); entryFade.Dispose(); view.Dispose(); };
        Shown += Initialize;
    }

    private void SyncTargetBounds()
    {
        if (finished || targetWindow == IntPtr.Zero) return;
        if (!Native.IsWindow(targetWindow)) { Finish("client-exited", true); return; }
        if (!Native.IsWindowVisible(targetWindow) || Native.IsIconic(targetWindow)) { Finish("client-hidden", true); return; }
        Rectangle bounds;
        if (Native.TryGetWindowBounds(targetWindow, out bounds) && Bounds != bounds) Bounds = bounds;
    }

    private async void PollReadiness()
    {
        if (finished || probePending || readiness.Ready) return;
        // A preview simulates only the signal. Installed startup always probes Codex.
        if (targetWindow == IntPtr.Zero)
        {
            if (Program.Preview) readiness.Observe(clock.ElapsedMilliseconds >= Program.PreviewReadyAfterMilliseconds, clock.Elapsed);
            else
            {
                var window = Native.ClientWindows().FirstOrDefault();
                if (window != null) { targetWindow = window.Handle; SyncTargetBounds(); followBounds.Start(); }
                readiness.Observe(false, clock.Elapsed);
            }
            PublishState();
            return;
        }
        probePending = true;
        try
        {
            var result = await ReadinessProbe.ObserveAsync(targetWindow);
            if (!finished)
            {
                if(result.Status!=lastProbeStatus)
                {
                    lastProbeStatus=result.Status;
                    Program.Log("CLIENT_PROBE "+result.Status+" elapsed_ms="+clock.ElapsedMilliseconds);
                }
                readiness.Observe(result.Interactive,clock.Elapsed);PublishState();
            }
        }
        catch (Exception ex) { Program.Log("READINESS_ERROR " + ex.Message); }
        finally { probePending = false; }
    }

    private void PublishState()
    {
        if (finished || !pageReady || view.CoreWebView2 == null) return;
        string state = readiness.Ready ? "client-ready" : readiness.Slow ? "client-slow" : "client-loading";
        if (state == lastState) return;
        lastState = state;
        view.CoreWebView2.PostWebMessageAsString(state);
        Program.Log("CLIENT_STATE " + state + " elapsed_ms=" + clock.ElapsedMilliseconds);
    }

    private async void Initialize(object sender, EventArgs args)
    {
        Program.Log("START preview=" + Program.Preview + " bounds=" + Bounds);
        Program.Log("CLIENT_RENDERING_GUARD tool_window="+Native.IsNonOccludingOverlay(Handle)+" opacity="+Opacity.ToString(System.Globalization.CultureInfo.InvariantCulture));
        if (targetWindow != IntPtr.Zero) { SyncTargetBounds(); followBounds.Start(); }
        if (finished) return;
        watchdog.Start();
        // Direct activation starts Codex behind the overlay so its real startup can be observed.
        // The watcher path already has a real client and never launches another instance.
        if (targetWindow == IntPtr.Zero && !Program.Preview && !Program.Follow) Program.LaunchCodex();
        readinessTimer.Start();
        PollReadiness();
        try
        {
            var web = Path.Combine(Program.Root, "web");
            if (!File.Exists(Path.Combine(web, "index.html"))) throw new FileNotFoundException("Animation files are missing.");
            var options = new CoreWebView2EnvironmentOptions("--autoplay-policy=no-user-gesture-required");
            var environment = await CoreWebView2Environment.CreateAsync(null, Path.Combine(Program.State, "WebView2"), options);
            await view.EnsureCoreWebView2Async(environment);
            var core = view.CoreWebView2;
            core.Settings.AreDefaultContextMenusEnabled = false;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.AreBrowserAcceleratorKeysEnabled = false;
            core.Settings.AreHostObjectsAllowed = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.IsZoomControlEnabled = false;
            core.Settings.AreDefaultScriptDialogsEnabled = false;
            core.SetVirtualHostNameToFolderMapping("codex-boot.local", web, CoreWebView2HostResourceAccessKind.DenyCors);
            core.NewWindowRequested += delegate(object s, CoreWebView2NewWindowRequestedEventArgs e) { e.Handled = true; };
            core.PermissionRequested += delegate(object s, CoreWebView2PermissionRequestedEventArgs e) { e.State = CoreWebView2PermissionState.Deny; };
            core.NavigationStarting += delegate(object s, CoreWebView2NavigationStartingEventArgs e)
            {
                if (!e.Uri.StartsWith(Origin, StringComparison.OrdinalIgnoreCase)) e.Cancel = true;
            };
            core.NavigationCompleted += delegate(object s, CoreWebView2NavigationCompletedEventArgs e)
            {
                Program.Log("PAGE_LOADED success=" + e.IsSuccess);
                if (!e.IsSuccess) Finish("navigation-error");
            };
            core.WebMessageReceived += delegate(object s, CoreWebView2WebMessageReceivedEventArgs e)
            {
                if (!e.Source.StartsWith(Origin, StringComparison.OrdinalIgnoreCase)) return;
                var message = e.TryGetWebMessageAsString();
                if (message == "enter-workspace")
                {
                    if (playback.CanEnter(readiness.Ready)) Finish("video-complete-client-ready");
                    else Program.Log("ENTRY_IGNORED ended=" + playback.AnimationEnded + " ready=" + readiness.Ready);
                }
                else if (message == "animation-ended")
                {
                    playback.EndAnimation(); Program.Log("VIDEO_ENDED ready=" + readiness.Ready);
                    if (Program.SelfTest && !selfTestStarted) { selfTestStarted=true; VerifyHeldFrame(); }
                }
                else if (message == "video-holding") Program.Log("VIDEO_HOLDING_FINAL_FRAME");
                else if (message == "video-playing")
                {
                    Program.Log("VIDEO_PLAYING_ONCE");
                    if(Program.SelfTest)CapturePlayback();
                }
                else if (message == "media-error") { mediaError=true; Program.Log("VIDEO_ERROR final-frame-fallback"); }
                else if (message == "page-ready") { pageReady = true; watchdog.Stop(); PublishState(); }
                else if (message == "assets-ready") Program.Log("ASSETS_READY");
            };
            core.Navigate(Origin + "index.html");
            view.Focus();
        }
        catch (Exception ex) { Program.Log("WEBVIEW_ERROR " + ex); Finish("webview-error"); }
    }

    private async void VerifyHeldFrame()
    {
        var output = Path.Combine(Program.Root, "qa");
        Directory.CreateDirectory(output);
        try
        {
            await Task.Delay(700);
            var core=view.CoreWebView2;
            if(!Native.IsNonOccludingOverlay(Handle))throw new InvalidOperationException("Startup overlay can occlude the client first paint.");
            var media=await core.ExecuteScriptAsync("(()=>{const v=document.getElementById('boot-video'),q=v.getVideoPlaybackQuality();return {format:document.documentElement.dataset.format,duration:v.duration,sourceWidth:v.videoWidth,sourceHeight:v.videoHeight,viewportWidth:innerWidth,viewportHeight:innerHeight,devicePixelRatio,fit:getComputedStyle(v).objectFit,edgeBlendSupported:CSS.supports('mask-composite','intersect'),totalFrames:q.totalVideoFrames,droppedFrames:q.droppedVideoFrames};})()");
            File.WriteAllText(Path.Combine(output,"media-result.json"),media.TrimEnd('}')+",\"nonOccludingToolWindow\":true,\"nativeOpacity\":1}");
            var held=await core.ExecuteScriptAsync("(()=>{const v=document.getElementById('boot-video');return document.documentElement.dataset.phase === 'held' && v.paused && !v.loop && Number.isFinite(v.duration) && v.duration>0 && Math.abs(v.currentTime-v.duration)<.1 && document.documentElement.dataset.playCount === '1';})()");
            if(mediaError || held!="true" || readiness.Ready || finished)throw new InvalidOperationException("Final-frame wait state was not reached after one complete play.");
            byte[] first, second;
            using(var capture=new MemoryStream()){await core.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,capture);first=capture.ToArray();}
            File.WriteAllBytes(Path.Combine(output,"held-first.png"),first);
            await Task.Delay(1800);
            using(var capture=new MemoryStream()){await core.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,capture);second=capture.ToArray();}
            File.WriteAllBytes(Path.Combine(output,"held-second.png"),second);
            string a,b;
            using(var hash=SHA256.Create()){a=BitConverter.ToString(hash.ComputeHash(first));b=BitConverter.ToString(hash.ComputeHash(second));}
            if(a!=b || readiness.Ready || finished)throw new InvalidOperationException("Held pixels changed, replayed, or entered before readiness.");
            File.WriteAllText(Path.Combine(output,"lifecycle-result.json"),"{\"videoCompleted\":true,\"playedOnce\":true,\"heldWhileUnready\":true,\"identicalHeldFrames\":true,\"holdComparisonMilliseconds\":1800,\"sha256\":\""+a.Replace("-","")+"\"}");
            Program.Log("SELF_TEST_HELD_FRAME_PASS same_pixels=True duration_ms=1800");
            // Let the normal readiness timer observe stable successes; it must no
            // longer inject the simulated loading state between these samples.
            Program.PreviewReadyAfterMilliseconds=clock.ElapsedMilliseconds;
            PollReadiness();
        }
        catch(Exception ex)
        {
            Program.Log("SELF_TEST_FAILED "+ex.Message);
            File.WriteAllText(Path.Combine(output,"lifecycle-failure.txt"),ex.ToString());
            Environment.ExitCode=1;
            Finish("self-test-failed",true);
        }
    }

    private async void CapturePlayback()
    {
        await Task.Delay(8500);
        if(finished || view.CoreWebView2==null)return;
        try
        {
            var output=Path.Combine(Program.Root,"qa");Directory.CreateDirectory(output);
            using(var capture=new MemoryStream())
            {
                await view.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,capture);
                File.WriteAllBytes(Path.Combine(output,"playing-frame.png"),capture.ToArray());
            }
        }
        catch(Exception ex){Program.Log("SELF_TEST_CAPTURE_ERROR "+ex.GetType().Name);}
    }

    private void Finish(string reason, bool immediately = false)
    {
        if (finished) return;
        finished = true;
        watchdog.Stop();
        followBounds.Stop();
        readinessTimer.Stop();
        Program.Log("FINISH " + reason + " elapsed_ms=" + clock.ElapsedMilliseconds);
        if(Program.SelfTest && reason=="video-complete-client-ready")
            File.WriteAllText(Path.Combine(Program.Root,"qa","entry-result.json"),"{\"enteredOnlyAfterVideoAndReadiness\":true,\"elapsedMilliseconds\":"+clock.ElapsedMilliseconds+"}");
        if ((reason == "user-entered" || reason == "video-complete-client-ready") && !immediately)
        {
            var fadeClock = Stopwatch.StartNew();
            entryFade.Interval = 16;
            entryFade.Tick += delegate
            {
                double progress = Math.Min(1.0, fadeClock.Elapsed.TotalMilliseconds / 320.0);
                Opacity = Math.Max(0.0, 1.0 - progress * progress * (3.0 - 2.0 * progress));
                if (progress < 1.0) return;
                entryFade.Stop();
                Program.Log("ENTRY_TRANSITION_COMPLETE elapsed_ms=" + fadeClock.ElapsedMilliseconds);
                if (targetWindow != IntPtr.Zero && Native.IsWindow(targetWindow)) Native.SetForegroundWindow(targetWindow);
                Close();
            };
            entryFade.Start();
            return;
        }
        if (reason == "user-entered" || reason == "escape")
        {
            if (targetWindow != IntPtr.Zero && Native.IsWindow(targetWindow)) Native.SetForegroundWindow(targetWindow);
        }
        if (immediately) { Close(); return; }
        var exit = new System.Windows.Forms.Timer { Interval = Program.Preview || Program.Follow ? 100 : 700 };
        exit.Tick += delegate { exit.Stop(); exit.Dispose(); Close(); };
        exit.Start();
    }
}
