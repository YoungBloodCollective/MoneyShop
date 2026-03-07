using System.Text.RegularExpressions;

namespace MoneyShop.ServiceAdapters.Services.Chat;

public class BankNameFilter
{
    private static readonly string[] BankTerms = new[]
    {
        "ing", "brd", "bcr", "raiffeisen", "unicredit", "cec", "bt", "banca transilvania",
        "garanti", "alpha", "otp", "intesa", "libra", "tbi", "first bank", "piraeus",
        "credit europe", "carpatica", "patria", "bancpost", "exim", "credit agricole"
    };

    public static (string Text, bool Flagged) ScrubBankNames(string text)
    {
        if (string.IsNullOrEmpty(text))
            return (text, false);

        bool flagged = false;
        string output = text;

        foreach (var term in BankTerms)
        {
            var pattern = $@"\b{Regex.Escape(term)}\b";
            var regex = new Regex(pattern, RegexOptions.IgnoreCase);

            if (regex.IsMatch(output))
            {
                flagged = true;
                output = regex.Replace(output, "o institutie financiara");
            }
        }

        return (output, flagged);
    }

    public static bool AsksForBankNames(string text)
    {
        if (string.IsNullOrEmpty(text))
            return false;

        var lower = text.ToLower();
        return lower.Contains("ce banca") ||
               lower.Contains("care banca") ||
               lower.Contains("recomanzi banca") ||
               lower.Contains("la ce banca") ||
               lower.Contains("spune-mi banca") ||
               lower.Contains("unde sa aplic");
    }

    public static string GetBankRefusalMessage()
    {
        return "Nu pot recomanda sau mentiona nume de banci. Iti pot explica insa criteriile dupa care sa alegi (dobanda totala, costuri, perioada, grad de indatorare, stabilitatea venitului) si te pot ajuta sa intelegi eligibilitatea ta. Daca vrei, spune-mi venitul net aproximativ, obligatiile lunare totale si tipul creditului.";
    }
}
