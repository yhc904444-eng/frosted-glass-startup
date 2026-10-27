internal sealed class PlaybackPolicy
{
    internal bool AnimationEnded { get; private set; }
    internal void EndAnimation() { AnimationEnded = true; }
    internal bool CanEnter(bool clientReady) { return AnimationEnded && clientReady; }
}
