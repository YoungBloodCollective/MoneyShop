namespace MoneyShop.ServiceInterface.Interfaces.Chat
{
    public interface ITopicGuard
    {
        // Note: The original TopicGuard uses only static methods.
        // This interface provides an instance-based abstraction for testability.
        GuardDecision CheckTopic(string userMessage, GuardMode mode = GuardMode.CHAT);
        string GetRefusalMessage(GuardDecisionReason reason);
    }

    public enum GuardDecisionReason
    {
        OK,
        PII,
        FRAUDA,
        BY_PASS,
        ILLEGAL
    }

    public class GuardDecision
    {
        public bool Allowed { get; set; }
        public GuardDecisionReason Reason { get; set; }
    }

    public enum GuardMode
    {
        CHAT,
        LEAD_FORM
    }
}
