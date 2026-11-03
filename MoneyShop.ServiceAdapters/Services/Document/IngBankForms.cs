using iText.Kernel.Font;
using MoneyShop.ServiceInterface.Interfaces.Document;

namespace MoneyShop.ServiceAdapters.Services.Document;

internal static class IngBankForms
{
    /// <summary>
    /// Nota de informare privind prelucrarea datelor - ING Bank and Mango Broker as joint
    /// operators. The form has labels rather than ruled lines, so the values sit under them.
    /// </summary>
    public static byte[] NotaInformare(BankConsentPdfInput input, byte[] template, PdfFont font)
    {
        using var form = new BankFormFiller(template, font);
        return form
            .Text(2, 95f, 240f, 300f, input.FullName)
            .Text(2, 427f, 240f, 120f, BankFormFiller.Date(input.SignedOn))
            .Signature(2, 95f, 143f, 160f, 30f, input.SignaturePng)
            .Build();
    }
}
