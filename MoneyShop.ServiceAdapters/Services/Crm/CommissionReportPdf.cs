using System;
using System.Globalization;
using System.IO;
using iText.IO.Font;
using iText.Kernel.Colors;
using iText.Kernel.Font;
using iText.Kernel.Geom;
using iText.Kernel.Pdf;
using iText.IO.Font.Constants;
using iText.Layout;
using iText.Layout.Borders;
using iText.Layout.Element;
using iText.Layout.Properties;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    internal static class CommissionReportText
    {
        private static readonly string[] Months =
        {
            "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
            "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
        };

        private static readonly NumberFormatInfo Ro = new()
        {
            NumberGroupSeparator = ".",
            NumberDecimalSeparator = ",",
            NumberGroupSizes = new[] { 3 },
            NegativeSign = "-",
        };

        public static string Money(decimal value) => value.ToString("#,##0.00", Ro);

        public static string Percent(decimal value) => value.ToString("0.##", Ro) + "%";

        public static string Date(DateTime value) => value.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture);

        public static string CreditType(string? type) => type switch
        {
            CreditTypes.Np => "Nevoi personale",
            CreditTypes.Ip => "Ipotecar",
            _ => "—",
        };

        public static string MonthName(string month)
        {
            var year = int.Parse(month[..4], CultureInfo.InvariantCulture);
            var mon = int.Parse(month[5..], CultureInfo.InvariantCulture);
            return $"{Months[mon - 1]} {year}";
        }
    }

    internal static class CommissionReportPdf
    {
        private const float Body = 8.5f;
        private static readonly Color HeaderFill = new DeviceRgb(241, 245, 249);
        private static readonly Color SubtotalFill = new DeviceRgb(248, 250, 252);
        private static readonly Color Line = new DeviceRgb(203, 213, 225);

        public static byte[] Build(CommissionReport report)
        {
            using var stream = new MemoryStream();
            var regular = LoadFont("DejaVuSansCondensed.ttf", StandardFonts.HELVETICA);
            var bold = LoadFont("DejaVuSansCondensed-Bold.ttf", StandardFonts.HELVETICA_BOLD);
            var pdf = new PdfDocument(new PdfWriter(stream));
            var document = new iText.Layout.Document(pdf, PageSize.A4);
            document.SetMargins(36, 32, 36, 32);
            document.SetFont(regular).SetFontSize(Body);

            document.Add(new Paragraph("MoneyShop").SetFont(bold).SetFontSize(11).SetMarginBottom(0));
            document.Add(new Paragraph("Raport lunar de comisioane").SetFont(bold).SetFontSize(16).SetMarginBottom(6));
            document.Add(new Paragraph($"Broker: {report.BrokerName}").SetMarginBottom(0));
            if (report.FirmName != null) document.Add(new Paragraph($"Firmă: {report.FirmName}").SetMarginBottom(0));
            document.Add(new Paragraph($"Luna: {CommissionReportText.MonthName(report.Month)}").SetMarginBottom(10));

            if (report.Banks.Count == 0)
            {
                document.Add(new Paragraph("Niciun credit disbursat în această lună.").SetFont(regular));
            }
            else
            {
                var table = new Table(UnitValue.CreatePercentArray(new[] { 11f, 24f, 17f, 14f, 13f, 7f, 14f })).UseAllAvailableWidth();
                foreach (var (text, right) in new[] { ("Data", false), ("Client", false), ("Banca", false), ("Tip credit", false), ("Suma (lei)", true), ("%", true), ("Comision (lei)", true) })
                    table.AddHeaderCell(Cell(text, bold, HeaderFill, right));
                foreach (var bank in report.Banks)
                {
                    foreach (var r in bank.Rows)
                    {
                        table.AddCell(Cell(CommissionReportText.Date(r.Date), regular));
                        table.AddCell(Cell(r.ClientName, regular));
                        table.AddCell(Cell(r.BankName, regular));
                        table.AddCell(Cell(CommissionReportText.CreditType(r.CreditType), regular));
                        table.AddCell(Cell(CommissionReportText.Money(r.Amount), regular, null, true));
                        table.AddCell(Cell(CommissionReportText.Percent(r.Percent), regular, null, true));
                        table.AddCell(Cell(CommissionReportText.Money(r.Commission), regular, null, true));
                    }
                    table.AddCell(Span($"Subtotal {bank.BankName} ({bank.Count} dosare)", bold, SubtotalFill, 4, false));
                    table.AddCell(Cell(CommissionReportText.Money(bank.Amount), bold, SubtotalFill, true));
                    table.AddCell(Cell(string.Empty, bold, SubtotalFill));
                    table.AddCell(Cell(CommissionReportText.Money(bank.Commission), bold, SubtotalFill, true));
                }
                table.AddCell(Span($"Total ({report.Count} dosare)", bold, HeaderFill, 4, false));
                table.AddCell(Cell(CommissionReportText.Money(report.TotalAmount), bold, HeaderFill, true));
                table.AddCell(Cell(string.Empty, bold, HeaderFill));
                table.AddCell(Cell(CommissionReportText.Money(report.TotalCommission), bold, HeaderFill, true));
                document.Add(table);
            }

            document.Close();
            return stream.ToArray();
        }

        private static iText.Layout.Element.Cell Cell(string text, PdfFont font, Color? fill = null, bool right = false) =>
            Styled(new iText.Layout.Element.Cell(), text, font, fill, right);

        private static iText.Layout.Element.Cell Span(string text, PdfFont font, Color? fill, int columns, bool right) =>
            Styled(new iText.Layout.Element.Cell(1, columns), text, font, fill, right);

        private static iText.Layout.Element.Cell Styled(iText.Layout.Element.Cell cell, string text, PdfFont font, Color? fill, bool right)
        {
            cell.SetPadding(3).SetBorder(Border.NO_BORDER).SetBorderBottom(new SolidBorder(Line, 0.5f));
            if (fill != null) cell.SetBackgroundColor(fill);
            cell.Add(new Paragraph(text).SetFont(font).SetFontSize(Body).SetMargin(0).SetTextAlignment(right ? TextAlignment.RIGHT : TextAlignment.LEFT));
            return cell;
        }

        private static PdfFont LoadFont(string fileName, string fallback)
        {
            var path = System.IO.Path.Combine(AppContext.BaseDirectory, "Fonts", fileName);
            return File.Exists(path) ? PdfFontFactory.CreateFont(path, PdfEncodings.IDENTITY_H) : PdfFontFactory.CreateFont(fallback);
        }
    }
}
