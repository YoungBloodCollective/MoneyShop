using System;
using System.Collections.Generic;
using System.Linq;
using iText.Kernel.Font;
using MoneyShop.ServiceInterface.Interfaces.Document;

namespace MoneyShop.ServiceAdapters.Services.Document;

/// <summary>
/// The banks whose consent form a broker can send to a client. Adding a bank means
/// its PDF in Assets, a reading text and a builder that fills the form's blanks.
/// </summary>
internal static class BankConsentCatalog
{
    public static readonly IReadOnlyList<BankConsentTemplate> All = new[]
    {
        new BankConsentTemplate(
            "procredit",
            "ProCredit Bank",
            ProCreditConsentText.DisplayTitle,
            ProCreditConsentText.Body,
            "procredit-consimtamant.pdf",
            ProCreditConsentPdf.Build),
    };

    public static BankConsentTemplate? Find(string? code) =>
        All.FirstOrDefault(b => string.Equals(b.Code, code, StringComparison.Ordinal));
}

internal sealed record BankConsentTemplate(
    string Code,
    string Name,
    string Title,
    string Body,
    string TemplateFile,
    Func<BankConsentPdfInput, byte[], PdfFont, byte[]> Build);
