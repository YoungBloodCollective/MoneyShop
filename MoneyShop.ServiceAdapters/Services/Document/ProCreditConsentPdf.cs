using iText.Kernel.Font;
using MoneyShop.ServiceInterface.Interfaces.Document;

namespace MoneyShop.ServiceAdapters.Services.Document;

/// <summary>
/// ProCredit Bank's Anexa nr. 1 - consimțământ privind transmiterea datelor.
/// </summary>
internal static class ProCreditConsentPdf
{
    public static byte[] Build(BankConsentPdfInput input, byte[] template, PdfFont font)
    {
        using var form = new BankFormFiller(template, font);
        return form
            .Text(1, 142f, 589f, 305f, input.FullName)
            .Text(1, 76f, 573f, 112f, input.Telefon)
            .Text(1, 292f, 573f, 240f, input.Email)
            .Signature(2, 312f, 316f, 140f, 44f, input.SignaturePng)
            .Text(2, 106f, 289f, 105f, BankFormFiller.Date(input.SignedOn))
            .Build();
    }
}
