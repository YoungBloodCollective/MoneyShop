using System;
using System.Collections.Generic;
using System.IO;
using iText.IO.Image;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas;

namespace MoneyShop.ServiceAdapters.Services.Document;

/// <summary>
/// Writes the client's data onto a bank's own form instead of re-typesetting it, so the
/// bank receives its exact document. Every coordinate is in PDF points measured from the
/// bottom-left corner of the page, matching what `pdftotext -bbox-layout` reports once
/// the y axis is flipped.
/// </summary>
internal sealed class BankFormFiller : IDisposable
{
    private const float DefaultSize = 10f;
    private const float MinSize = 6f;

    private readonly MemoryStream _output = new();
    private readonly PdfDocument _pdf;
    private readonly PdfFont _font;

    public BankFormFiller(byte[] template, PdfFont font)
    {
        _pdf = new PdfDocument(new PdfReader(new MemoryStream(template)), new PdfWriter(_output));
        _font = font;
    }

    /// <summary>
    /// Draws <paramref name="text"/> on one of the form's blanks, shrinking it until it
    /// fits <paramref name="maxWidth"/>. Empty values leave the blank untouched, which is
    /// what the banks expect for the fields they fill themselves.
    /// </summary>
    public BankFormFiller Text(int page, float x, float baseline, float maxWidth, string? text, float size = DefaultSize)
    {
        if (string.IsNullOrWhiteSpace(text)) return this;

        var value = text.Trim();
        while (size > MinSize && _font.GetWidth(value, size) > maxWidth)
            size -= 0.5f;

        new PdfCanvas(_pdf.GetPage(page))
            .BeginText().SetFontAndSize(_font, size).MoveText(x, baseline).ShowText(value).EndText();

        return this;
    }

    /// <summary>
    /// Places the drawn signature so it sits on the form's line, scaled to fit the box.
    /// A null signature is how the unsigned preview is produced.
    /// </summary>
    public BankFormFiller Signature(int page, float x, float baseline, float maxWidth, float maxHeight, byte[]? signaturePng)
    {
        if (signaturePng == null || signaturePng.Length == 0) return this;

        var image = ImageDataFactory.Create(signaturePng);
        var scale = Math.Min(maxWidth / image.GetWidth(), maxHeight / image.GetHeight());
        var width = image.GetWidth() * scale;
        var height = image.GetHeight() * scale;

        new PdfCanvas(_pdf.GetPage(page))
            .AddImageWithTransformationMatrix(image, width, 0, 0, height, x, baseline);

        return this;
    }

    public byte[] Build()
    {
        _pdf.Close();
        return _output.ToArray();
    }

    public void Dispose()
    {
        if (!_pdf.IsClosed()) _pdf.Close();
        _output.Dispose();
    }

    /// <summary>
    /// The banks print the date as dd.MM.yyyy; a single place for it keeps the forms consistent.
    /// </summary>
    public static string? Date(DateTime? value) => value?.ToString("dd.MM.yyyy");

    public static IEnumerable<string> None => Array.Empty<string>();
}
