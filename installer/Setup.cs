using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;

internal static class Setup
{
    internal const string Title = "Codex Liquid Glass Startup";
    internal const string Version = "1.1.0";
    internal const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexLiquidGlassStartup";
    internal static readonly string DefaultTarget = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "CodexLiquidGlassStartup");
    internal static readonly string Data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CodexLiquidGlassStartup");
    internal static string Exe { get { return Assembly.GetExecutingAssembly().Location; } }

    [STAThread]
    private static int Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        try
        {
            var extract = args.FirstOrDefault(a => a.StartsWith("--extract="));
            if (extract != null) { Extract(Path.GetFullPath(extract.Substring(10))); return 0; }
            var test = args.FirstOrDefault(a => a.StartsWith("--test-install="));
            if (test != null)
            {
                string testTarget = Path.GetFullPath(test.Substring(15));
                if (!testTarget.StartsWith(Path.GetTempPath(), StringComparison.OrdinalIgnoreCase) && !testTarget.Contains("github-publish")) throw new InvalidOperationException("Test install must use a temporary or github-publish directory.");
                Install(testTarget, false, true, delegate { }); return 0;
            }
            var testRemove = args.FirstOrDefault(a => a.StartsWith("--test-remove="));
            if (testRemove != null) { Remove(Path.GetFullPath(testRemove.Substring(14)), true); return 0; }
            if (args.Contains("--uninstall"))
            {
                if (MessageBox.Show("Remove " + Title + "? Your Codex installation and account data will be kept.", Title, MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return 0;
                string temporary = Path.Combine(Path.GetTempPath(), "CodexLiquidGlassStartup-Uninstall-" + Guid.NewGuid().ToString("N") + ".exe");
                File.Copy(Exe, temporary);
                Process.Start(new ProcessStartInfo(temporary, "--remove --parent=" + Process.GetCurrentProcess().Id) { UseShellExecute = false });
                return 0;
            }
            if (args.Contains("--remove"))
            {
                var parent = args.FirstOrDefault(a => a.StartsWith("--parent="));
                if (parent != null) { try { Process.GetProcessById(int.Parse(parent.Substring(9))).WaitForExit(5000); } catch (ArgumentException) { } }
                Remove(DefaultTarget, false);
                MessageBox.Show(Title + " has been removed.", Title, MessageBoxButtons.OK, MessageBoxIcon.Information);
                return 0;
            }
            Application.Run(new Wizard());
            return 0;
        }
        catch (Exception ex)
        {
            if (args.Any(a => a.StartsWith("--test-") || a.StartsWith("--extract=")))
            { File.WriteAllText(Path.Combine(Path.GetTempPath(), "CodexLiquidGlassStartup-setup-error.txt"), ex.ToString()); return 1; }
            MessageBox.Show(ex.Message, Title + " — setup could not finish", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    private static void Extract(string directory)
    {
        Directory.CreateDirectory(directory);
        if (Directory.EnumerateFileSystemEntries(directory).Any()) throw new InvalidOperationException("Extraction directory must be empty.");
        using (var source = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))
        using (var archive = new ZipArchive(source, ZipArchiveMode.Read))
        {
            foreach (var entry in archive.Entries)
            {
                string target = Path.GetFullPath(Path.Combine(directory, entry.FullName));
                if (!target.StartsWith(Path.GetFullPath(directory) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Invalid package entry.");
                if (entry.FullName.EndsWith("/")) continue;
                Directory.CreateDirectory(Path.GetDirectoryName(target));
                entry.ExtractToFile(target);
            }
        }
        foreach (var line in File.ReadAllLines(Path.Combine(directory, "payload.sha256")))
        {
            string expected = line.Substring(0, 64);
            string file = Path.Combine(directory, line.Substring(66));
            string hash;
            using (var sha = SHA256.Create()) using (var stream = File.OpenRead(file)) hash = BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "");
            if (!string.Equals(expected, hash, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("The downloaded package is incomplete or damaged: " + Path.GetFileName(file));
        }
    }

    internal static void Install(string target, bool autoStart, bool test, Action<string> status)
    {
        if (!Environment.Is64BitOperatingSystem) throw new PlatformNotSupportedException("This release requires 64-bit Windows.");
        if (Environment.OSVersion.Version.Build < 19045) throw new PlatformNotSupportedException("This release requires Windows 10 version 22H2 or Windows 11.");
        string stage = Path.Combine(Path.GetTempPath(), "CodexLiquidGlassStartup-" + Guid.NewGuid().ToString("N"));
        string backup = Path.Combine(stage, "rollback");
        string[] files = null;
        bool existed = Directory.Exists(target);
        if (existed && !File.Exists(Path.Combine(target, "install-record.txt"))) throw new InvalidOperationException("The installation folder already exists and is not managed by this installer. Choose another location or contact support.");
        try
        {
            status("Checking and extracting the application…");
            Extract(stage);
            files = Directory.GetFiles(stage, "*", SearchOption.AllDirectories).Select(f => f.Substring(stage.Length + 1)).ToArray();
            if (!test) EnsureRuntime(stage, status);
            string launcher = Path.Combine(target, "CodexCyberStart.exe");
            if (File.Exists(launcher))
            {
                using (var stop = Process.Start(new ProcessStartInfo(launcher, "--stop-watch") { UseShellExecute = false, CreateNoWindow = true })) stop.WaitForExit(3000);
                Thread.Sleep(350);
                foreach (var process in Process.GetProcessesByName("CodexCyberStart")) using (process)
                {
                    try { if (string.Equals(process.MainModule.FileName, launcher, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Close the startup preview, then run this installer again."); }
                    catch (System.ComponentModel.Win32Exception) { }
                }
            }
            Directory.CreateDirectory(target);
            Directory.CreateDirectory(backup);
            foreach (string file in files)
            {
                string source = Path.Combine(stage, file), destination = Path.Combine(target, file);
                if (File.Exists(destination)) { Directory.CreateDirectory(Path.GetDirectoryName(Path.Combine(backup, file))); File.Copy(destination, Path.Combine(backup, file)); }
                Directory.CreateDirectory(Path.GetDirectoryName(destination));
                File.Copy(source, destination, true);
            }
            File.WriteAllLines(Path.Combine(target, "install-record.txt"), files);
            if (!test)
            {
                status("Creating shortcuts…");
                CreateShortcuts(target, autoStart);
                using (var key = Registry.CurrentUser.CreateSubKey(UninstallKey))
                {
                    key.SetValue("DisplayName", Title); key.SetValue("DisplayVersion", Version); key.SetValue("Publisher", "yhc904444-eng");
                    key.SetValue("InstallLocation", target); key.SetValue("DisplayIcon", launcher);
                    key.SetValue("UninstallString", "\"" + Path.Combine(target, "Uninstall.exe") + "\" --uninstall");
                    key.SetValue("NoModify", 1); key.SetValue("NoRepair", 1);
                }
                if (autoStart) Process.Start(new ProcessStartInfo(launcher, "--watch") { UseShellExecute = false, CreateNoWindow = true });
            }
            status("Installation complete.");
        }
        catch
        {
            if (files != null) foreach (var file in files)
            {
                string old = Path.Combine(backup, file), destination = Path.Combine(target, file);
                try { if (File.Exists(old)) File.Copy(old, destination, true); else if (File.Exists(destination)) File.Delete(destination); } catch (IOException) { }
            }
            throw;
        }
        finally
        {
            if (Directory.Exists(stage) && stage.StartsWith(Path.GetTempPath(), StringComparison.OrdinalIgnoreCase)) Directory.Delete(stage, true);
        }
    }

    private static bool HasRuntime()
    {
        foreach (var hive in new[] { RegistryHive.CurrentUser, RegistryHive.LocalMachine })
        foreach (var view in new[] { RegistryView.Registry32, RegistryView.Registry64 })
        using (var registry = RegistryKey.OpenBaseKey(hive, view))
        using (var key = registry.OpenSubKey(@"Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"))
        {
            System.Version version;
            if (key != null && System.Version.TryParse(Convert.ToString(key.GetValue("pv")), out version) && version.Major >= 154) return true;
        }
        return false;
    }

    private static void EnsureRuntime(string stage, Action<string> status)
    {
        if (HasRuntime()) return;
        status("Installing Microsoft WebView2 automatically. Internet may be required…");
        string installer = Path.Combine(stage, "dependencies", "MicrosoftEdgeWebview2Setup.exe");
        if (!File.Exists(installer)) throw new InvalidDataException("The WebView2 installer is missing from this download.");
        using (var process = Process.Start(new ProcessStartInfo(installer, "/silent /install") { UseShellExecute = false, CreateNoWindow = true }))
        {
            if (!process.WaitForExit(300000)) throw new TimeoutException("Microsoft WebView2 setup is still running. Wait for it to finish, then run this installer again.");
            for (int i = 0; i < 90 && !HasRuntime(); i++) Thread.Sleep(1000);
            if (!HasRuntime()) throw new InvalidOperationException("Microsoft WebView2 could not finish installing. Connect to the Internet and run this installer again. On managed PCs, your administrator may need to permit Microsoft's runtime installer.");
        }
    }

    private static string StartFolder { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), Title); } }
    private static string StartupLink { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Startup), Title + ".lnk"); } }

    private static void Shortcut(string path, string target, string arguments)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        Type type = Type.GetTypeFromProgID("WScript.Shell");
        dynamic shell = Activator.CreateInstance(type);
        dynamic link = shell.CreateShortcut(path);
        link.TargetPath = target; link.Arguments = arguments; link.WorkingDirectory = Path.GetDirectoryName(target); link.Description = Title;
        link.Save(); Marshal.FinalReleaseComObject(link); Marshal.FinalReleaseComObject(shell);
    }

    private static void CreateShortcuts(string target, bool autoStart)
    {
        string launcher = Path.Combine(target, "CodexCyberStart.exe");
        Shortcut(Path.Combine(StartFolder, Title + ".lnk"), launcher, "");
        Shortcut(Path.Combine(StartFolder, "Preview animation.lnk"), launcher, "--preview");
        Shortcut(Path.Combine(StartFolder, "Uninstall.lnk"), Path.Combine(target, "Uninstall.exe"), "--uninstall");
        if (autoStart) Shortcut(StartupLink, launcher, "--watch"); else if (File.Exists(StartupLink)) File.Delete(StartupLink);
    }

    private static void Remove(string target, bool test)
    {
        string record = Path.Combine(target, "install-record.txt");
        if (!File.Exists(record)) throw new InvalidOperationException("No matching installation record was found.");
        if (!test && !string.Equals(Path.GetFullPath(target), Path.GetFullPath(DefaultTarget), StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Invalid uninstall target.");
        string launcher = Path.Combine(target, "CodexCyberStart.exe");
        if (File.Exists(launcher)) using (var stop = Process.Start(new ProcessStartInfo(launcher, "--stop-watch") { UseShellExecute = false, CreateNoWindow = true })) stop.WaitForExit(3000);
        Thread.Sleep(350);
        foreach (var file in File.ReadAllLines(record))
        {
            string path = Path.GetFullPath(Path.Combine(target, file));
            if (!path.StartsWith(Path.GetFullPath(target) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Invalid uninstall record.");
            if (File.Exists(path)) File.Delete(path);
        }
        File.Delete(record);
        foreach (var directory in Directory.GetDirectories(target, "*", SearchOption.AllDirectories).OrderByDescending(d => d.Length))
            if (!Directory.EnumerateFileSystemEntries(directory).Any()) Directory.Delete(directory);
        if (!Directory.EnumerateFileSystemEntries(target).Any()) Directory.Delete(target);
        if (!test)
        {
            Registry.CurrentUser.DeleteSubKeyTree(UninstallKey, false);
            foreach (var name in new[] { Title + ".lnk", "Preview animation.lnk", "Uninstall.lnk" }) if (File.Exists(Path.Combine(StartFolder, name))) File.Delete(Path.Combine(StartFolder, name));
            if (Directory.Exists(StartFolder) && !Directory.EnumerateFileSystemEntries(StartFolder).Any()) Directory.Delete(StartFolder);
            if (File.Exists(StartupLink)) File.Delete(StartupLink);
        }
    }
}

internal sealed class Wizard : Form
{
    private readonly Label message = new Label();
    private readonly CheckBox auto = new CheckBox();
    private readonly Button install = new Button();
    private readonly Button preview = new Button();
    internal Wizard()
    {
        Text = Setup.Title + " Setup"; ClientSize = new Size(590, 340); StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedDialog; MaximizeBox = false; Font = new Font("Segoe UI", 10);
        var heading = new Label { Text = Setup.Title, Font = new Font("Segoe UI", 18, FontStyle.Bold), AutoSize = true, Location = new Point(24, 24) };
        message.SetBounds(26, 78, 538, 130);
        message.Text = "A silent, 14-second liquid glass opening for Codex.\r\n\r\nSetup installs this app for your Windows account and automatically sets up Microsoft WebView2 if needed. Internet may be required. Install OpenAI Codex or Codex Liquid Glass to open a workspace; Preview works independently.";
        auto.Text = "Play when Codex opens (start the helper with Windows)"; auto.SetBounds(27, 220, 535, 30); auto.Checked = true;
        install.Text = "Install"; install.SetBounds(434, 280, 130, 36); install.Click += Install;
        preview.Text = "Preview"; preview.SetBounds(285, 280, 130, 36); preview.Visible = false;
        preview.Click += delegate { Process.Start(new ProcessStartInfo(Path.Combine(Setup.DefaultTarget, "CodexCyberStart.exe"), "--preview") { UseShellExecute = false }); Close(); };
        Controls.AddRange(new Control[] { heading, message, auto, preview, install });
    }
    private async void Install(object sender, EventArgs args)
    {
        if (install.Text == "Finish") { Close(); return; }
        install.Enabled = false; auto.Enabled = false;
        bool startWithWindows = auto.Checked;
        try
        {
            await Task.Run(() => Setup.Install(Setup.DefaultTarget, startWithWindows, false, text => BeginInvoke((Action)(() => message.Text = text))));
            message.Text = "Installed successfully.\r\n\r\nUse Codex Liquid Glass Startup from the Start menu, or open Codex normally when the helper is enabled. The animation is completely silent. It plays once and waits at the last frame until Codex is ready. Press Esc at any time to dismiss it.\r\n\r\nYou can uninstall from Windows Settings > Apps.";
            auto.Visible = false; install.Text = "Finish"; preview.Visible = true;
        }
        catch (Exception ex) { MessageBox.Show(this, ex.Message, "Installation could not finish", MessageBoxButtons.OK, MessageBoxIcon.Error); auto.Enabled = true; }
        finally { install.Enabled = true; }
    }
}
