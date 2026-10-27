using System;

internal sealed class ReadinessPolicy
{
    private TimeSpan? firstSuccess;
    internal bool Ready { get; private set; }
    internal bool Slow { get; private set; }

    internal void Observe(bool interactive, TimeSpan elapsed)
    {
        if (Ready) return;
        Slow = elapsed >= TimeSpan.FromSeconds(30);
        if (!interactive) { firstSuccess = null; return; }
        if (!firstSuccess.HasValue) firstSuccess = elapsed;
        // Two successful observations separated in time avoid a transient boot shell.
        Ready = elapsed - firstSuccess.Value >= TimeSpan.FromMilliseconds(350);
    }
}
