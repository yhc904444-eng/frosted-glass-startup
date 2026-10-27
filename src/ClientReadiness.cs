using System;
using System.Runtime.InteropServices;
using System.Windows.Automation;

// This observes local window interactivity, not network requests or private Codex APIs.
// Only control types are queried; no messages, document text, or user input are read.
internal static class ClientReadiness
{
    internal static string Inspect(IntPtr window)
    {
        try
        {
            UIntPtr response;
            bool responsive = SendMessageTimeout(window, 0, UIntPtr.Zero, IntPtr.Zero, 2, 300, out response) != IntPtr.Zero;
            var root = AutomationElement.FromHandle(window);
            if (root == null) return "responsive=" + responsive + " root=null";
            var nodes = root.FindAll(TreeScope.Descendants, Condition.TrueCondition);
            int buttons=0, edits=0, documents=0, enabledButtons=0, enabledEdits=0;
            for (int i=0;i<nodes.Count;i++)
            {
                var current=nodes[i].Current;
                bool usable=current.IsEnabled && !current.IsOffscreen;
                if(current.ControlType==ControlType.Button){buttons++;if(usable)enabledButtons++;}
                if(current.ControlType==ControlType.Edit){edits++;if(usable)enabledEdits++;}
                if(current.ControlType==ControlType.Document)documents++;
            }
            return "responsive="+responsive+" nodes="+nodes.Count+" buttons="+buttons+" usableButtons="+enabledButtons+" edits="+edits+" usableEdits="+enabledEdits+" documents="+documents+" rootEnabled="+root.Current.IsEnabled+" rootOffscreen="+root.Current.IsOffscreen;
        }
        catch(Exception ex){return "provider-error="+ex.GetType().Name+" hresult="+ex.HResult;}
    }
    internal static bool Probe(IntPtr window)
    {
        UIntPtr result;
        if (!Native.IsWindow(window) || SendMessageTimeout(window, 0, UIntPtr.Zero, IntPtr.Zero, 2, 300, out result) == IntPtr.Zero) return false;
        try
        {
            var root = AutomationElement.FromHandle(window);
            if (root == null) return false;
            var documents = root.FindAll(TreeScope.Descendants,
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Document));
            var visible = new AndCondition(
                new PropertyCondition(AutomationElement.IsEnabledProperty, true),
                new PropertyCondition(AutomationElement.IsOffscreenProperty, false));
            foreach (AutomationElement document in documents)
            {
                if (!document.Current.IsEnabled || document.Current.IsOffscreen) continue;
                var input = document.FindFirst(TreeScope.Descendants, new AndCondition(visible,
                    new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit)));
                var buttons = document.FindAll(TreeScope.Descendants, new AndCondition(visible,
                    new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Button)));
                foreach (AutomationElement button in buttons)
                    if (ClientScreenPolicy.IsSignInAction(button.Current.Name)) return true;
                // Project selection, history and settings are usable screens too.
                // Native title-bar buttons and empty loading documents do not count.
                if ((buttons.Count >= 3 && input != null) || buttons.Count >= 4) return true;
            }
            return false;
        }
        catch (Exception) { return false; }
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SendMessageTimeout(IntPtr window, uint message, UIntPtr wParam, IntPtr lParam, uint flags, uint timeout, out UIntPtr result);
}
