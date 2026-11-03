using System.Text.RegularExpressions;

namespace MoneyShop.ServiceAdapters.Services.Document;

/// <summary>
/// Splits the single address line an ID card yields ("Mun.Bucuresti Sec.1 Str.Exemplu nr.1
/// bl.A2 ap.15") into the separate boxes a bank form prints. Whatever cannot be recognised
/// is left out rather than guessed, and the street falls back to the whole line so the box
/// is never empty when we do have an address.
/// </summary>
internal sealed record RomanianAddress(
    string? Street,
    string? Number,
    string? Block,
    string? Staircase,
    string? Floor,
    string? Apartment,
    string? Locality,
    string? County)
{
    private const RegexOptions Options = RegexOptions.IgnoreCase | RegexOptions.CultureInvariant;

    private static readonly Regex StreetPattern = new(
        @"\b(?:str|strada|bd|b-dul|bulevardul|ale|aleea|cal|calea|sos|soseaua|int|intrarea|pta|piata)\.?\s*(?<v>[^,]+?)(?=\s*[,;]|\s+nr\b|\s+bl\b|\s+sc\b|\s+et\b|\s+ap\b|$)", Options);

    private static readonly Regex NumberPattern = new(@"\bnr\.?\s*(?<v>[\w/\-]+)", Options);
    private static readonly Regex BlockPattern = new(@"\bbl\.?\s*(?<v>[\w/\-]+)", Options);
    private static readonly Regex StaircasePattern = new(@"\bsc\.?\s*(?<v>[\w\-]+)", Options);
    private static readonly Regex FloorPattern = new(@"\bet\.?\s*(?<v>[\w\-]+)", Options);
    private static readonly Regex ApartmentPattern = new(@"\bap\.?\s*(?<v>[\w/\-]+)", Options);

    private static readonly Regex LocalityPattern = new(
        @"\b(?:mun|municipiul|oras|orasul|or|com|comuna|sat|loc|localitatea)\.?\s*(?<v>[^,;]+?)(?=\s*[,;]|\s+str\b|\s+bd\b|\s+ale\b|\s+cal\b|\s+sos\b|\s+jud\b|\s+sec\b|\s+nr\b|$)", Options);

    private static readonly Regex CountyPattern = new(@"\bjud\.?\s*(?<v>[^,;\d]+?)(?=\s*[,;]|\s+(?:mun|oras|com|sat|str|bd|nr)\b|$)", Options);
    private static readonly Regex SectorPattern = new(@"\bsec(?:tor(?:ul)?)?\.?\s*(?<v>\d)\b", Options);

    public static RomanianAddress Parse(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new RomanianAddress(null, null, null, null, null, null, null, null);

        var text = Regex.Replace(raw.Trim(), @"\s+", " ");

        var street = Capture(StreetPattern, text);
        var county = Capture(CountyPattern, text);
        if (county == null)
        {
            var sector = Capture(SectorPattern, text);
            if (sector != null) county = $"Sector {sector}";
        }

        return new RomanianAddress(
            // A line we cannot break apart is still an address; the bank reads it either way.
            street ?? text,
            Capture(NumberPattern, text),
            Capture(BlockPattern, text),
            Capture(StaircasePattern, text),
            Capture(FloorPattern, text),
            Capture(ApartmentPattern, text),
            Capture(LocalityPattern, text),
            county);
    }

    private static string? Capture(Regex pattern, string text)
    {
        var match = pattern.Match(text);
        if (!match.Success) return null;

        var value = match.Groups["v"].Value.Trim(' ', '.', ',', '-');
        return value.Length == 0 ? null : value;
    }
}
