using System.IO;
using iText.IO.Image;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas;
using MoneyShop.ServiceInterface.Interfaces.Document;

namespace MoneyShop.ServiceAdapters.Services.Document;

/// <summary>
/// Fills ProCredit Bank's own consent form (Anexa nr. 1) instead of re-typesetting it,
/// so the bank receives its exact document. Coordinates are the template's blanks, in
/// PDF points from the bottom-left corner of a 612×792 page.
/// </summary>
internal static class ProCreditConsentPdf
{
    private const float FontSize = 10f;
    private const float MinFontSize = 6.5f;

    public static byte[] Build(ProCreditConsentPdfInput input, byte[] template, PdfFont font)
    {
        using var output = new MemoryStream();
        using (var pdf = new PdfDocument(new PdfReader(new MemoryStream(template)), new PdfWriter(output)))
        {
            var first = new PdfCanvas(pdf.GetFirstPage());
            Write(first, font, input.FullName, 142, 589, 305);
            Write(first, font, input.Telefon, 76, 573, 112);
            Write(first, font, input.Email ?? string.Empty, 292, 573, 240);

            var last = new PdfCanvas(pdf.GetLastPage());
            var signature = ImageDataFactory.Create(input.SignaturePng);
            var scale = System.Math.Min(140f / signature.GetWidth(), 44f / signature.GetHeight());
            last.AddImageWithTransformationMatrix(signature, signature.GetWidth() * scale, 0, 0, signature.GetHeight() * scale, 312, 316);
            Write(last, font, input.SignedOn.ToString("dd.MM.yyyy"), 106, 289, 105);
        }

        return output.ToArray();
    }

    private static void Write(PdfCanvas canvas, PdfFont font, string text, float x, float baseline, float maxWidth, float size = FontSize)
    {
        if (string.IsNullOrWhiteSpace(text)) return;

        while (size > MinFontSize && font.GetWidth(text, size) > maxWidth)
            size -= 0.5f;

        canvas.BeginText().SetFontAndSize(font, size).MoveText(x, baseline).ShowText(text).EndText();
    }
}
