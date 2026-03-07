using System.Text.RegularExpressions;

namespace MoneyShop.ServiceAdapters.Services.Chat;

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

public class TopicGuard
{
    private static readonly Regex[] StrictPiiPatterns = new[]
    {
        new Regex(@"\bcnp\b", RegexOptions.IgnoreCase),
        new Regex(@"\bserie\b.*\bci\b", RegexOptions.IgnoreCase),
        new Regex(@"\bnumar\b.*\bci\b", RegexOptions.IgnoreCase),
        new Regex(@"\botp\b", RegexOptions.IgnoreCase),
        new Regex(@"\bpin\b", RegexOptions.IgnoreCase),
        new Regex(@"\bcard\b.*\b\d{12,19}\b", RegexOptions.IgnoreCase),
        new Regex(@"\biban\b", RegexOptions.IgnoreCase),
        new Regex(@"\bparola\b", RegexOptions.IgnoreCase)
    };

    private static readonly Regex[] PiiPatterns = new[]
    {
        new Regex(@"\bcnp\b", RegexOptions.IgnoreCase),
        new Regex(@"\bserie\b.*\bci\b", RegexOptions.IgnoreCase),
        new Regex(@"\bnumar\b.*\bci\b", RegexOptions.IgnoreCase),
        new Regex(@"\bcard\b.*\b\d{12,19}\b", RegexOptions.IgnoreCase),
        new Regex(@"\biban\b", RegexOptions.IgnoreCase),
        new Regex(@"\bparola\b", RegexOptions.IgnoreCase),
        new Regex(@"\botp\b", RegexOptions.IgnoreCase),
        new Regex(@"\bcod\b.*\bverificare\b", RegexOptions.IgnoreCase),
        new Regex(@"\bpin\b", RegexOptions.IgnoreCase),
        new Regex(@"\bemail\b.*@", RegexOptions.IgnoreCase),
        new Regex(@"\btelefon\b.*\b0\d{9}\b", RegexOptions.IgnoreCase)
    };

    private static readonly Regex[] FraudPatterns = new[]
    {
        new Regex(@"\b(ocol|evit|pacol|fent)\w*\b.*\b(verific|anaf|birou|scor|fico)\b", RegexOptions.IgnoreCase),
        new Regex(@"\b(cum sa mint|cum sa falsific|acte false|adeverinta falsa)\b", RegexOptions.IgnoreCase),
        new Regex(@"\b(spalare bani|money laundering)\b", RegexOptions.IgnoreCase),
        new Regex(@"\b(furt|phishing|hack)\b", RegexOptions.IgnoreCase)
    };

    private static readonly Regex[] IllegalPatterns = new[]
    {
        new Regex(@"\b(drog|cocaina|heroina|metamfet)\w*\b", RegexOptions.IgnoreCase),
        new Regex(@"\b(vand|cumpar)\b.*\b(buletin|ci|card)\b", RegexOptions.IgnoreCase)
    };

    private static bool MatchAny(Regex[] patterns, string text)
    {
        return patterns.Any(pattern => pattern.IsMatch(text));
    }

    public static GuardDecision CheckTopic(string userMessage, GuardMode mode = GuardMode.CHAT)
    {
        if (string.IsNullOrEmpty(userMessage))
            return new GuardDecision { Allowed = true, Reason = GuardDecisionReason.OK };

        if (mode == GuardMode.LEAD_FORM)
        {
            if (MatchAny(StrictPiiPatterns, userMessage))
                return new GuardDecision { Allowed = false, Reason = GuardDecisionReason.PII };
            if (MatchAny(FraudPatterns, userMessage))
                return new GuardDecision { Allowed = false, Reason = GuardDecisionReason.FRAUDA };
            if (MatchAny(IllegalPatterns, userMessage))
                return new GuardDecision { Allowed = false, Reason = GuardDecisionReason.ILLEGAL };

            return new GuardDecision { Allowed = true, Reason = GuardDecisionReason.OK };
        }

        // CHAT mode - more strict
        if (MatchAny(PiiPatterns, userMessage))
            return new GuardDecision { Allowed = false, Reason = GuardDecisionReason.PII };
        if (MatchAny(FraudPatterns, userMessage))
            return new GuardDecision { Allowed = false, Reason = GuardDecisionReason.FRAUDA };
        if (MatchAny(IllegalPatterns, userMessage))
            return new GuardDecision { Allowed = false, Reason = GuardDecisionReason.ILLEGAL };

        return new GuardDecision { Allowed = true, Reason = GuardDecisionReason.OK };
    }

    public static string GetRefusalMessage(GuardDecisionReason reason)
    {
        return reason switch
        {
            GuardDecisionReason.PII => "Nu pot prelua sau procesa date sensibile (de exemplu CNP, serie/numar CI, parole, OTP, numar complet card). Te rog reformuleaza fara astfel de date si spune doar informatii generale (ex: venit aproximativ, obligatii lunare totale).",
            GuardDecisionReason.FRAUDA or GuardDecisionReason.BY_PASS => "Nu te pot ajuta cu metode de ocolire a verificarilor sau cu recomandari care implica falsificare ori inselaciune. Pot insa sa iti explic pasii corecti si criteriile generale de eligibilitate.",
            GuardDecisionReason.ILLEGAL => "Nu te pot ajuta cu solicitari care tin de activitati ilegale. Pot oferi informatii generale si legale despre credite si eligibilitate.",
            _ => "Nu pot raspunde la aceasta solicitare. Pot oferi informatii generale despre credite si procesul de aplicare."
        };
    }
}
