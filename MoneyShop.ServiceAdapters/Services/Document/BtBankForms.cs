using iText.Kernel.Font;
using MoneyShop.ServiceInterface.Interfaces.Document;

namespace MoneyShop.ServiceAdapters.Services.Document;

internal static class BtBankForms
{
    /// <summary>
    /// Formular de recomandare - the client agrees that the broker passes their name,
    /// birth date and phone to Banca Transilvania. The partner representative's own
    /// signature block stays empty: it is the broker's declaration that they checked the
    /// client's ID in person, so the broker signs it themselves.
    /// </summary>
    public static byte[] Recomandare(BankConsentPdfInput input, byte[] template, PdfFont font)
    {
        using var form = new BankFormFiller(template, font);
        return form
            .Text(1, 102f, 660.2f, 262f, input.FullName)
            .Text(1, 298f, 592.1f, 246f, input.BrokerCompany, 9f)
            .Text(1, 152f, 557.9f, 330f, input.FullName)
            .Text(1, 164f, 540.8f, 320f, input.BirthDate)
            .Text(1, 171f, 523.7f, 315f, input.Telefon)
            .Text(1, 183f, 239.1f, 310f, input.FullName)
            .Text(1, 82f, 222f, 160f, BankFormFiller.Date(input.SignedOn))
            .Signature(1, 118f, 201f, 150f, 26f, input.SignaturePng)
            .Text(1, 377f, 170.9f, 180f, input.BrokerCompany, 8f)
            .Text(1, 235f, 153.9f, 320f, input.BrokerRepresentative, 9f)
            .Build();
    }
}
