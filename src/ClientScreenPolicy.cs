using System;

internal static class ClientScreenPolicy
{
    // A fresh installation is usable at the sign-in screen too. Only the action
    // labels of visible controls are checked; chat and document text are not read.
    internal static bool IsSignInAction(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return false;
        foreach (var label in new[] { "sign in", "log in", "login", "continue with", "get started", "登录", "登入", "开始使用" })
            if (name.IndexOf(label, StringComparison.OrdinalIgnoreCase) >= 0) return true;
        return false;
    }
}
