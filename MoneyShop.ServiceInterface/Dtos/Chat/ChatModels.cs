namespace MoneyShop.ServiceInterface.Dtos.Chat
{
    public class ChatRequest
    {
        public string Message { get; set; } = null!;
        public string? ConversationId { get; set; }
        public Dictionary<string, object>? Context { get; set; }
    }

    public class ChatResponse
    {
        public string Raspuns { get; set; } = null!;
        public string ModelFolosit { get; set; } = null!;
        public bool Upgraded { get; set; }
        public double? Incredere { get; set; }
        public Dictionary<string, object>? Siguranta { get; set; }
        public string? Meta { get; set; }
        public string Nota { get; set; } = "Rezultatele sunt estimative; aprobarea finala apartine creditorului.";
    }

    public class ChatUsage
    {
        public int InputTokens { get; set; }
        public int OutputTokens { get; set; }
        public decimal EstimatedCostUsd { get; set; }
    }
}
