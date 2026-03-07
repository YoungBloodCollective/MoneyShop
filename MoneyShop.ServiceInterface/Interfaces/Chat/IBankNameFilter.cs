namespace MoneyShop.ServiceInterface.Interfaces.Chat
{
    public interface IBankNameFilter
    {
        // Note: The original BankNameFilter uses only static methods.
        // This interface provides an instance-based abstraction for testability.
        (string Text, bool Flagged) ScrubBankNames(string text);
        bool AsksForBankNames(string text);
        string GetBankRefusalMessage();
    }
}
