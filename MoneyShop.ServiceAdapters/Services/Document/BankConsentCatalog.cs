using System;
using System.Collections.Generic;
using System.Linq;
using iText.Kernel.Font;
using MoneyShop.ServiceInterface.Interfaces.Document;

namespace MoneyShop.ServiceAdapters.Services.Document;

/// <summary>
/// The banks whose forms a broker can send a client. A bank can carry several forms that
/// the client signs in one go. Adding a bank means its PDFs in Assets plus, for each form,
/// a short summary and a builder that fills the blanks.
/// </summary>
internal static class BankConsentCatalog
{
    public static readonly IReadOnlyList<BankConsentTemplate> All = new[]
    {
        new BankConsentTemplate("procredit", "ProCredit Bank", BankConsentFields.None, new[]
        {
            new BankConsentDocument(
                "consimtamant",
                "Consimțământ privind transmiterea datelor",
                "Îți dai acordul ca numele, telefonul și e-mailul tău să fie transmise către ProCredit Bank, ca banca să te poată contacta.",
                "procredit-consimtamant.pdf",
                ProCreditConsentPdf.Build),
        }),

        new BankConsentTemplate("patria", "Patria Bank", BankConsentFields.Cnp | BankConsentFields.Address, new[]
        {
            new BankConsentDocument(
                "anaf",
                "Acord pentru consultarea veniturilor la ANAF",
                "Îți dai acordul ca Patria Bank să îți consulte veniturile înregistrate la ANAF, timp de maximum 5 zile lucrătoare.",
                "patria-anaf.pdf",
                PatriaBankForms.Anaf),
            new BankConsentDocument(
                "birou-credit",
                "Informare Biroul de Credit",
                "Iei la cunoștință cum sunt prelucrate datele tale în Sistemul Biroului de Credit.",
                "patria-birou-credit.pdf",
                PatriaBankForms.BirouCredit),
            new BankConsentDocument(
                "cerere",
                "Cerere de credit",
                "Cererea cu care brokerul cere oferta de la bancă. Datele tale sunt completate; produsul și suma le alegeți împreună.",
                "patria-cerere-credit.pdf",
                PatriaCreditApplicationForm.Build),
            new BankConsentDocument(
                "cerere-codebitor",
                "Cerere de credit - formular pentru codebitor",
                "Formularul pentru codebitor. Se generează din fișa acordului codebitorului: completat din datele acordului și semnat cu semnătura capturată la acord.",
                "patria-cerere-codebitor.pdf",
                PatriaCodebitorForm.Build,
                BrokerOnly: true),
            new BankConsentDocument(
                "gdpr",
                "Informare privind prelucrarea datelor personale",
                "Confirmi că ai primit informarea Patria Bank despre prelucrarea datelor tale personale.",
                "patria-gdpr.pdf",
                PatriaBankForms.Gdpr),
        }),

        new BankConsentTemplate("ing", "ING Bank", BankConsentFields.None, new[]
        {
            new BankConsentDocument(
                "nota-informare",
                "Notă de informare privind prelucrarea datelor",
                "Iei la cunoștință cum îți prelucrează datele ING Bank și Mango Broker pentru cererea ta de credit.",
                "ing-nota-informare.pdf",
                IngBankForms.NotaInformare),
        }),

        new BankConsentTemplate("bt", "Banca Transilvania", BankConsentFields.BirthDate, new[]
        {
            new BankConsentDocument(
                "recomandare",
                "Formular de recomandare",
                "Îți dai acordul ca brokerul să transmită numele, data nașterii și telefonul tău către Banca Transilvania, ca banca să te poată contacta.",
                "bt-recomandare.pdf",
                BtBankForms.Recomandare),
        }),
    };

    /// <summary>
    /// KycFiles.FileType holds 30 characters, so a bank whose codes are too long would only
    /// fail when a client signs. Checking it here turns that into a startup failure instead.
    /// </summary>
    private const int MAX_FILE_TYPE_LENGTH = 30;

    static BankConsentCatalog()
    {
        var tooLong = All
            .SelectMany(b => b.Documents.Select(d => FileType(b.Code, d.Code)))
            .Where(t => t.Length > MAX_FILE_TYPE_LENGTH)
            .ToList();

        if (tooLong.Count > 0)
            throw new InvalidOperationException(
                $"Bank form file types longer than {MAX_FILE_TYPE_LENGTH} characters: {string.Join(", ", tooLong)}");
    }

    public static string FileType(string bankCode, string documentCode) => $"bank_{bankCode}_{documentCode}";

    public static BankConsentTemplate? Find(string? code) =>
        All.FirstOrDefault(b => string.Equals(b.Code, code, StringComparison.Ordinal));

    /// <summary>
    /// The banks a broker partners with, in catalog order, from the comma separated list
    /// stored on their profile. Unknown codes are ignored so a renamed bank cannot break
    /// an acord that is being signed.
    /// </summary>
    public static IReadOnlyList<BankConsentTemplate> Parse(string? codes)
    {
        if (string.IsNullOrWhiteSpace(codes)) return Array.Empty<BankConsentTemplate>();

        var wanted = codes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(c => c.ToLowerInvariant())
            .ToHashSet(StringComparer.Ordinal);

        return All.Where(b => wanted.Contains(b.Code)).ToList();
    }
}

/// <summary>
/// What a bank's forms print that the platform cannot supply on its own: the CNP is never
/// stored, and the ID card reading misses the domicile on about a quarter of the acords and
/// the birth date on about half, so the client confirms them when they sign.
/// </summary>
[Flags]
internal enum BankConsentFields
{
    None = 0,
    Cnp = 1,
    Address = 2,
    BirthDate = 4,
}

internal sealed record BankConsentTemplate(
    string Code,
    string Name,
    BankConsentFields Fields,
    IReadOnlyList<BankConsentDocument> Documents)
{
    public bool Requires(BankConsentFields field) => Fields.HasFlag(field);

    public BankConsentDocument? Find(string? documentCode) =>
        Documents.FirstOrDefault(d => string.Equals(d.Code, documentCode, StringComparison.Ordinal));
}

internal sealed record BankConsentDocument(
    string Code,
    string Title,
    string Summary,
    string TemplateFile,
    Func<BankConsentPdfInput, byte[], PdfFont, byte[]> Build,
    // A broker-only form is never shown to the client and never part of what they sign; the
    // broker downloads it separately. The codebitor form is one: it belongs to another person,
    // so it must not sit in the client's package.
    bool BrokerOnly = false);
