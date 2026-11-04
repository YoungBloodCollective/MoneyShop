using System;
using System.Globalization;
using System.Linq;

namespace MoneyShop.ServiceInterface.Interfaces.Subject;

/// <summary>
/// What the Romanian CNP says about its holder. The first digit carries the sex and the
/// century, digits 2-7 carry the birth date, and the last digit is a check digit over the
/// first twelve.
/// </summary>
public sealed class CnpIdentity
{
    /// <summary>"M", "F", or null when the CNP does not say.</summary>
    public string? Sex { get; init; }

    /// <summary>Date only, or null when the digits do not describe a real date.</summary>
    public DateTime? BirthDate { get; init; }

    /// <summary>Whether the check digit matches the first twelve digits.</summary>
    public bool ChecksumValid { get; init; }

    /// <summary>True when sex or birth date could be read, whatever the check digit says.</summary>
    public bool HasAnyValue => Sex != null || BirthDate != null;

    public static readonly CnpIdentity Empty = new();

    /// <summary>Weights of the Romanian CNP check digit, in order.</summary>
    private static readonly int[] Weights = { 2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9 };

    private const int MaxPlausibleAge = 110;

    /// <summary>
    /// Reads sex and birth date out of a CNP. Never throws: anything it cannot read comes
    /// back as null, so an unexpected or misread number degrades instead of failing the
    /// flow that carries it.
    /// </summary>
    public static CnpIdentity Parse(string? cnp)
    {
        var digits = Digits(cnp);
        if (digits.Length != 13) return Empty;

        return new CnpIdentity
        {
            Sex = ReadSex(digits[0]),
            BirthDate = ReadBirthDate(digits),
            ChecksumValid = ChecksumMatches(digits)
        };
    }

    /// <summary>
    /// Official check digit of the Romanian CNP, so a mistyped number is caught before it
    /// reaches a bank.
    /// </summary>
    public static bool IsValid(string? cnp)
    {
        var digits = Digits(cnp);
        return digits.Length == 13 && digits[0] != '0' && ChecksumMatches(digits);
    }

    public static string Digits(string? value) =>
        new((value ?? string.Empty).Where(char.IsDigit).ToArray());

    private static bool ChecksumMatches(string digits)
    {
        var sum = 0;
        for (var i = 0; i < 12; i++)
            sum += (digits[i] - '0') * Weights[i];

        var check = sum % 11;
        if (check == 10) check = 1;

        return check == digits[12] - '0';
    }

    /// <summary>
    /// Odd is male, even is female, for every assigned leading digit except 9 - the digit
    /// for foreign citizens, which was never split by sex.
    /// </summary>
    private static string? ReadSex(char leading) => leading switch
    {
        '1' or '3' or '5' or '7' => "M",
        '2' or '4' or '6' or '8' => "F",
        _ => null
    };

    private static DateTime? ReadBirthDate(string digits)
    {
        var year = (digits[1] - '0') * 10 + (digits[2] - '0');
        var month = (digits[3] - '0') * 10 + (digits[4] - '0');
        var day = (digits[5] - '0') * 10 + (digits[6] - '0');

        return digits[0] switch
        {
            '1' or '2' => Build(1900 + year, month, day),
            '3' or '4' => Build(1800 + year, month, day),
            '5' or '6' => Build(2000 + year, month, day),
            // 7 and 8 (residents) and 9 (foreign citizens) do not pin the century, so it is
            // resolved by plausibility rather than guessed: the 2000s reading wins when it is
            // a real date that is not in the future, otherwise the 1900s one.
            '7' or '8' or '9' => Build(2000 + year, month, day) ?? Build(1900 + year, month, day),
            _ => null
        };
    }

    private static DateTime? Build(int year, int month, int day)
    {
        if (month is < 1 or > 12) return null;
        if (day < 1 || day > DateTime.DaysInMonth(year, month)) return null;

        var date = new DateTime(year, month, day, 0, 0, 0, DateTimeKind.Unspecified);
        var today = DateTime.UtcNow.Date;

        return date > today || date < today.AddYears(-MaxPlausibleAge) ? null : date;
    }

    public static string? Format(DateTime? date) =>
        date?.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture);

    private static readonly string[] DocumentDateFormats =
    {
        "dd.MM.yyyy", "dd/MM/yyyy", "dd-MM-yyyy", "yyyy-MM-dd", "yyyy/MM/dd", "ddMMyyyy"
    };

    /// <summary>
    /// Reads a date in whichever of the shapes the document reader emits, so a CNP-derived
    /// date can be compared with one read off the card. Null when it is not a date.
    /// </summary>
    public static DateTime? ParseDocumentDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        return DateTime.TryParseExact(value.Trim(), DocumentDateFormats, CultureInfo.InvariantCulture,
            DateTimeStyles.None, out var parsed)
            ? parsed.Date
            : null;
    }
}
