using System;
using System.IO;
using iText.IO.Image;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Borders;
using iText.Layout.Element;
using iText.Layout.Properties;
using MoneyShop.ServiceInterface.Interfaces.Document;

namespace MoneyShop.ServiceAdapters.Services.Document;

internal static class MangoAgreementPdf
{
    private const string Blank = "..............................";
    private const float BodySize = 10f;
    private const float TableSize = 9.5f;
    private const float RequestSize = 9.5f;


    public static byte[] Build(MangoAgreementPdfInput input, PdfFont regular, PdfFont bold, byte[]? logo)
    {
        using var memoryStream = new MemoryStream();
        var pdf = new PdfDocument(new PdfWriter(memoryStream));
        var document = new iText.Layout.Document(pdf);
        document.SetMargins(32, 50, 30, 50);
        document.SetFont(regular).SetFontSize(BodySize);

        var name = input.FullName;
        var date = input.SignedOn.ToString("yyyy/MM/dd");
        var birthDate = string.IsNullOrWhiteSpace(input.BirthDate) ? Blank : input.BirthDate;
        var email = string.IsNullOrWhiteSpace(input.Email) ? Blank : input.Email;

        AddLogo(document, logo);
        document.Add(new Paragraph(MangoAgreementText.Title).SetTextAlignment(TextAlignment.CENTER).SetMarginTop(10).SetMarginBottom(6));
        document.Add(new Paragraph(MangoAgreementText.IntermediarySection).SetMarginBottom(6));

        var intermediary = TwoColumnTable();
        foreach (var (label, value) in MangoAgreementText.IntermediaryRows)
            AddRow(intermediary, label, value);
        intermediary.AddCell(new Cell(1, 2).SetPadding(4).SetFontSize(TableSize).Add(new Paragraph(MangoAgreementText.AnpcNote)));
        document.Add(intermediary);

        document.Add(new Paragraph(MangoAgreementText.ClientSection).SetMarginTop(12).SetMarginBottom(6));
        var client = TwoColumnTable();
        AddRow(client, "Nume Prenume Client:", name);
        AddRow(client, "Telefon:", input.Telefon);
        AddRow(client, "E-mail:", email);
        document.Add(client);

        document.Add(new AreaBreak(AreaBreakType.NEXT_PAGE));
        foreach (var (number, point) in MangoAgreementText.Points)
        {
            if (number == MangoAgreementText.EmphasizedPoint) AddNumbered(document, number, point, bold, 14);
            else AddNumbered(document, number, point);
        }
        document.Add(DateNameSignature(input, date, name).SetMarginTop(36));

        if (input.Oug52Waived)
        {
            document.Add(new AreaBreak(AreaBreakType.NEXT_PAGE));
            document.Add(new Paragraph("ANEXA 1 la\n" + MangoAgreementText.Title).SetTextAlignment(TextAlignment.CENTER).SetMarginTop(120).SetMarginBottom(60));
            document.Add(new Paragraph(MangoAgreementText.AnnexDeclaration(name, birthDate))
                .SetTextAlignment(TextAlignment.JUSTIFIED).SetSpacingRatio(1).SetFixedLeading(18));
            document.Add(DateNameSignature(input, date, name).SetMarginTop(80));
        }

        document.Add(new AreaBreak(AreaBreakType.NEXT_PAGE));
        AddLogo(document, logo);
        document.Add(new Paragraph(MangoAgreementText.RequestTitle).SetTextAlignment(TextAlignment.CENTER).SetMarginTop(8).SetMarginBottom(0));
        document.Add(new Paragraph($"Nr. {input.RequestNumber} / {date}").SetTextAlignment(TextAlignment.CENTER).SetMarginBottom(8));
        foreach (var paragraph in MangoAgreementText.RequestParagraphs(name, birthDate, input.Telefon, email))
            AddJustified(document, RequestSize, paragraph);

        var closing = new Table(UnitValue.CreatePercentArray(new float[] { 50, 50 })).UseAllAvailableWidth().SetMarginTop(10).SetKeepTogether(true);
        var signatureCell = new Cell().SetBorder(Border.NO_BORDER).Add(new Paragraph("Semnatura"));
        AddSignature(signatureCell, input);
        closing.AddCell(signatureCell);
        closing.AddCell(new Cell().SetBorder(Border.NO_BORDER).SetPaddingLeft(120)
            .Add(new Paragraph("Data")).Add(new Paragraph(date)));
        document.Add(closing);

        document.Close();
        return memoryStream.ToArray();
    }

    private static void AddLogo(iText.Layout.Document document, byte[]? logo)
    {
        if (logo == null) return;
        document.Add(new Image(ImageDataFactory.Create(logo)).ScaleToFit(150, 42));
    }

    private static Table TwoColumnTable() =>
        new Table(UnitValue.CreatePercentArray(new float[] { 38, 62 })).UseAllAvailableWidth();

    private static void AddRow(Table table, string label, string value)
    {
        table.AddCell(new Cell().SetPadding(3.5f).SetFontSize(TableSize).Add(new Paragraph(label)));
        table.AddCell(new Cell().SetPadding(3.5f).SetFontSize(TableSize).Add(new Paragraph(value).SetTextAlignment(TextAlignment.JUSTIFIED).SetSpacingRatio(1)));
    }

    private static void AddNumbered(iText.Layout.Document document, string number, string text, PdfFont? font = null, float? size = null)
    {
        var paragraph = new Paragraph($"{number}  {text}")
            .SetTextAlignment(TextAlignment.JUSTIFIED)
            .SetSpacingRatio(1)
            .SetMarginLeft(36)
            .SetFirstLineIndent(-18)
            .SetMarginBottom(10);

        if (font != null) paragraph.SetFont(font);
        if (size.HasValue) paragraph.SetFontSize(size.Value);

        document.Add(paragraph);
    }

    private static void AddJustified(iText.Layout.Document document, float size, string text) =>
        document.Add(new Paragraph(text).SetFontSize(size).SetMultipliedLeading(1.12f).SetTextAlignment(TextAlignment.JUSTIFIED).SetSpacingRatio(1).SetMarginBottom(2));

    private static Table DateNameSignature(MangoAgreementPdfInput input, string date, string name)
    {
        var table = new Table(UnitValue.CreatePercentArray(new float[] { 50, 50 })).UseAllAvailableWidth().SetKeepTogether(true);
        table.AddCell(new Cell().SetBorder(Border.NO_BORDER)
            .Add(new Paragraph("Data")).Add(new Paragraph(date)));

        var right = new Cell().SetBorder(Border.NO_BORDER).SetPaddingLeft(50)
            .Add(new Paragraph("Nume si Prenume"))
            .Add(new Paragraph(name))
            .Add(new Paragraph("Semnatura").SetMarginTop(12));
        AddSignature(right, input);
        table.AddCell(right);

        return table;
    }

    private static void AddSignature(Cell cell, MangoAgreementPdfInput input)
    {
        cell.Add(new Image(ImageDataFactory.Create(input.SignaturePng)).ScaleToFit(150, 60));
        cell.Add(new Paragraph($"Semnat pe moneyshop.ro · {input.SignedOn:yyyy/MM/dd HH:mm}").SetFontSize(7));
    }
}
