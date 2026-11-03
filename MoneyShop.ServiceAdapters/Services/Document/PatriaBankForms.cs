using iText.Kernel.Font;
using MoneyShop.ServiceInterface.Interfaces.Document;

namespace MoneyShop.ServiceAdapters.Services.Document;

/// <summary>
/// Patria Bank's three forms. The templates are the bank's own PDFs, already carrying the
/// broker's stamp, so only the client's blanks are filled here.
/// </summary>
internal static class PatriaBankForms
{
    /// <summary>
    /// Acord pentru solicitarea veniturilor persoanelor fizice (A4). The "DA" box is
    /// already ticked in the template the bank supplied.
    /// </summary>
    public static byte[] Anaf(BankConsentPdfInput input, byte[] template, PdfFont font)
    {
        using var form = new BankFormFiller(template, font);
        return form
            .Text(1, 150f, 678.6f, 296f, input.FullName)
            .Text(1, 74f, 665.1f, 412f, input.Address)
            .Text(1, 314f, 651.9f, 206f, input.Cnp)
            .Text(2, 60f, 177.8f, 70f, BankFormFiller.Date(input.SignedOn), 9f)
            .Signature(2, 133f, 150f, 115f, 32f, input.SignaturePng)
            .Build();
    }

    /// <summary>
    /// Informare privind prelucrarea datelor in Sistemul Biroului de Credit.
    /// </summary>
    public static byte[] BirouCredit(BankConsentPdfInput input, byte[] template, PdfFont font)
    {
        using var form = new BankFormFiller(template, font);
        return form
            .Text(1, 105f, 628.5f, 243f, input.FullName)
            .Text(4, 92f, 182.3f, 100f, BankFormFiller.Date(input.SignedOn))
            .Signature(4, 240f, 224f, 150f, 30f, input.SignaturePng)
            .Build();
    }

    /// <summary>
    /// Informare privind prelucrarea datelor personale - the client confirms receipt.
    /// </summary>
    public static byte[] Gdpr(BankConsentPdfInput input, byte[] template, PdfFont font)
    {
        using var form = new BankFormFiller(template, font);
        return form
            .Text(7, 95f, 396.4f, 232f, input.FullName)
            .Text(7, 187f, 349.7f, 98f, BankFormFiller.Date(input.SignedOn), 9f)
            .Signature(7, 80f, 347f, 76f, 26f, input.SignaturePng)
            .Build();
    }
}
