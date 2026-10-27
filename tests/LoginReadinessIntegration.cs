using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal static class Native
{
    [DllImport("user32.dll")] internal static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll")] internal static extern bool ShowWindow(IntPtr window,int command);
}

internal static class LoginReadinessIntegration
{
    [STAThread]
    private static int Main(string[] args)
    {
        if(args.Length>0 && args[0].StartsWith("--probe=")) return ClientReadiness.Probe(new IntPtr(long.Parse(args[0].Substring(8))))?0:2;
        if(args.Length==3 && args[0]=="--inspect") { File.WriteAllText(args[2],ClientReadiness.Inspect(new IntPtr(long.Parse(args[1]))));return 0; }
        if(args.Length!=1) return 3;
        Application.EnableVisualStyles();
        Application.Run(new LoginWindow(Path.GetFullPath(args[0])));
        return Environment.ExitCode;
    }
}

internal sealed class LoginWindow : Form
{
    private readonly WebView2 view=new WebView2();
    private readonly string output;
    internal LoginWindow(string output)
    {
        this.output=output;Text="Isolated signed-out readiness test";Width=640;Height=480;
        view.Dock=DockStyle.Fill;Controls.Add(view);Shown+=Initialize;
    }
    private async void Initialize(object sender, EventArgs args)
    {
        try
        {
            // Visibility is essential to this contract: a deliberately hidden
            // test window must never count as a usable sign-in screen.
            Native.ShowWindow(Handle,5);
            Directory.CreateDirectory(output);
            var environment=await CoreWebView2Environment.CreateAsync(null,Path.Combine(output,"WebView2"),new CoreWebView2EnvironmentOptions("--force-renderer-accessibility=complete"));
            await view.EnsureCoreWebView2Async(environment);
            view.CoreWebView2.NavigateToString("<!doctype html><html lang='en'><head><title>Welcome to Codex</title></head><body><main><h1>Welcome to Codex</h1><p>Sign in to continue</p><button>Sign in</button></main></body></html>");
            bool ready=false;
            for(int i=0;i<8&&!ready;i++)
            {
                await Task.Delay(700);
                using(var process=Process.Start(new ProcessStartInfo(Application.ExecutablePath,"--probe="+Handle.ToInt64()){UseShellExecute=false,CreateNoWindow=true}))
                {
                    await Task.Run(()=>{if(!process.WaitForExit(2000)){process.Kill();process.WaitForExit(500);}});
                    ready=process.ExitCode==0;
                }
            }
            if(!ready)
            {
                using(var inspect=Process.Start(new ProcessStartInfo(Application.ExecutablePath,"--inspect "+Handle.ToInt64()+" \""+Path.Combine(output,"inspection.txt")+"\""){UseShellExecute=false,CreateNoWindow=true})) await Task.Run(()=>inspect.WaitForExit(3000));
                throw new InvalidOperationException("A visible signed-out document with one Sign in button was not recognized.");
            }
            File.WriteAllText(Path.Combine(output,"login-readiness-result.json"),"{\"passed\":true,\"visibleDocument\":true,\"buttonCount\":1,\"readyAtSignIn\":true}");
            Environment.ExitCode=0;
        }
        catch(Exception error){File.WriteAllText(Path.Combine(output,"login-readiness-error.txt"),error.ToString());Environment.ExitCode=1;}
        finally{Close();}
    }
}
