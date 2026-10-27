using System;
using System.Diagnostics;
using System.IO;

// Installation locations are resolved on the user's own PC, never copied from a developer profile.
internal static class ClientTarget
{
    private static string storeId;
    private static bool storeChecked;
    internal static string GlassPath(string name)
    {
        return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", name, "app", "ChatGPT.exe");
    }

    internal static bool IsGlassExecutable(string executable)
    {
        foreach (var name in new[] { "CodexLiquidGlass", "CodexGlass" })
            if (string.Equals(executable, GlassPath(name), StringComparison.OrdinalIgnoreCase)) return true;
        return false;
    }

    internal static string Describe()
    {
        foreach (var name in new[] { "CodexLiquidGlass", "CodexGlass" })
            if (File.Exists(GlassPath(name))) return name;
        return StoreAppId() == null ? "Codex not installed" : "OpenAI Codex (Microsoft Store)";
    }

    internal static bool IsInstalled()
    {
        foreach (var name in new[] { "CodexLiquidGlass", "CodexGlass" }) if (File.Exists(GlassPath(name))) return true;
        return StoreAppId() != null;
    }

    private static string StoreAppId()
    {
        if (storeChecked) return storeId;
        storeChecked = true;
        try
        {
            string command = "$p=Get-AppxPackage -Name OpenAI.Codex | Select-Object -First 1; if($p){$a=(Get-AppxPackageManifest $p).Package.Applications.Application | Where-Object {$_.Executable -like '*ChatGPT.exe'} | Select-Object -First 1; if($a){$p.PackageFamilyName+'!'+$a.Id}}";
            using (var process = new Process())
            {
                process.StartInfo = new ProcessStartInfo("powershell.exe", "-NoProfile -NonInteractive -EncodedCommand " + Convert.ToBase64String(System.Text.Encoding.Unicode.GetBytes(command))) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
                process.Start();
                if (!process.WaitForExit(8000)) { process.Kill(); return null; }
                string result = process.StandardOutput.ReadToEnd().Trim();
                if (result.StartsWith("OpenAI.Codex_", StringComparison.OrdinalIgnoreCase) && result.Contains("!") && !result.Contains("\r") && !result.Contains("\n")) storeId = result;
            }
        }
        catch (Exception) { }
        return storeId;
    }

    internal static void Launch()
    {
        foreach (var name in new[] { "CodexLiquidGlass", "CodexGlass" })
        {
            string executable = GlassPath(name);
            if (!File.Exists(executable)) continue;
            var profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), name);
            Process.Start(new ProcessStartInfo(executable, "--user-data-dir=\"" + profile + "\" --no-first-run")
            { UseShellExecute = false, WorkingDirectory = Path.GetDirectoryName(executable) });
            return;
        }
        var appId = StoreAppId();
        if (appId == null) throw new InvalidOperationException("Codex is not installed. Install OpenAI Codex or Codex Liquid Glass first, or use Preview animation from the Start menu.");
        Process.Start(new ProcessStartInfo("explorer.exe", "shell:AppsFolder\\" + appId) { UseShellExecute = true });
    }
}
