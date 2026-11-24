using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Security;
using System.Text;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    /// <summary>
    /// Writes the report as a minimal SpreadsheetML workbook directly (a zip of XML parts), with typed
    /// numeric cells and number formats. Text goes in as inline strings, so nothing is ever read as a formula.
    /// </summary>
    internal static class CommissionReportXlsx
    {
        private const int Bold = 1, DateStyle = 2, MoneyStyle = 3, PercentStyle = 4, BoldMoney = 5, Header = 6;
        private static readonly string[] Columns = { "A", "B", "C", "D", "E", "F", "G" };

        public static byte[] Build(CommissionReport report)
        {
            var rows = new List<string>();
            var n = 1;
            string Row(params string[] cells) => $"<row r=\"{n++}\">{string.Concat(cells)}</row>";
            rows.Add(Row(Text("A", n, "MoneyShop — Raport lunar de comisioane", Bold)));
            rows.Add(Row(Text("A", n, "Broker"), Text("B", n, report.BrokerName)));
            if (report.FirmName != null) rows.Add(Row(Text("A", n, "Firmă"), Text("B", n, report.FirmName)));
            rows.Add(Row(Text("A", n, "Luna"), Text("B", n, CommissionReportText.MonthName(report.Month))));
            n++;
            var headers = new[] { "Data", "Client", "Banca", "Tip credit", "Suma (lei)", "Procent aplicat", "Comision (lei)" };
            var headerRow = n;
            rows.Add(Row(headers.Select((h, i) => Text(Columns[i], headerRow, h, Header)).ToArray()));
            foreach (var bank in report.Banks)
            {
                foreach (var r in bank.Rows)
                {
                    var rn = n;
                    rows.Add(Row(
                        Number("A", rn, (r.Date - new DateTime(1899, 12, 30)).Days, DateStyle),
                        Text("B", rn, r.ClientName),
                        Text("C", rn, r.BankName),
                        Text("D", rn, CommissionReportText.CreditType(r.CreditType)),
                        Number("E", rn, r.Amount, MoneyStyle),
                        Number("F", rn, r.Percent / 100m, PercentStyle),
                        Number("G", rn, r.Commission, MoneyStyle)));
                }
                var sn = n;
                rows.Add(Row(
                    Text("A", sn, $"Subtotal {bank.BankName} ({bank.Count} dosare)", Bold),
                    Number("E", sn, bank.Amount, BoldMoney),
                    Number("G", sn, bank.Commission, BoldMoney)));
            }
            var tn = n;
            rows.Add(Row(
                Text("A", tn, $"Total ({report.Count} dosare)", Bold),
                Number("E", tn, report.TotalAmount, BoldMoney),
                Number("G", tn, report.TotalCommission, BoldMoney)));

            var sheet = new StringBuilder()
                .Append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
                .Append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">")
                .Append("<cols><col min=\"1\" max=\"1\" width=\"14\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"30\" customWidth=\"1\"/>")
                .Append("<col min=\"3\" max=\"3\" width=\"22\" customWidth=\"1\"/><col min=\"4\" max=\"4\" width=\"18\" customWidth=\"1\"/>")
                .Append("<col min=\"5\" max=\"7\" width=\"16\" customWidth=\"1\"/></cols>")
                .Append("<sheetData>").Append(string.Concat(rows)).Append("</sheetData></worksheet>")
                .ToString();

            const string contentTypes =
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
                "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
                "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
                "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>" +
                "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>" +
                "<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>" +
                "</Types>";
            const string rootRels =
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
                "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>" +
                "</Relationships>";
            const string workbook =
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">" +
                "<sheets><sheet name=\"Comisioane\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>";
            const string workbookRels =
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
                "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/>" +
                "<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>" +
                "</Relationships>";
            const string styles =
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
                "<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">" +
                "<numFmts count=\"1\"><numFmt numFmtId=\"164\" formatCode=\"dd\\.mm\\.yyyy\"/></numFmts>" +
                "<fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font><font><b/><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts>" +
                "<fills count=\"3\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill>" +
                "<fill><patternFill patternType=\"solid\"><fgColor rgb=\"FFF1F5F9\"/><bgColor indexed=\"64\"/></patternFill></fill></fills>" +
                "<borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>" +
                "<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>" +
                "<cellXfs count=\"7\">" +
                "<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/>" +
                "<xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\"/>" +
                "<xf numFmtId=\"164\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
                "<xf numFmtId=\"4\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
                "<xf numFmtId=\"10\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
                "<xf numFmtId=\"4\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\" applyFont=\"1\"/>" +
                "<xf numFmtId=\"0\" fontId=\"1\" fillId=\"2\" borderId=\"0\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\"/>" +
                "</cellXfs>" +
                "<cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles>" +
                "</styleSheet>";

            using var stream = new MemoryStream();
            using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
            {
                Add(zip, "[Content_Types].xml", contentTypes);
                Add(zip, "_rels/.rels", rootRels);
                Add(zip, "xl/workbook.xml", workbook);
                Add(zip, "xl/_rels/workbook.xml.rels", workbookRels);
                Add(zip, "xl/styles.xml", styles);
                Add(zip, "xl/worksheets/sheet1.xml", sheet);
            }
            return stream.ToArray();
        }

        private static void Add(ZipArchive zip, string name, string content)
        {
            var entry = zip.CreateEntry(name, CompressionLevel.Optimal);
            using var writer = new StreamWriter(entry.Open(), new UTF8Encoding(false));
            writer.Write(content);
        }

        private static string Text(string column, int row, string value, int style = 0) =>
            $"<c r=\"{column}{row}\" t=\"inlineStr\"{StyleAttr(style)}><is><t xml:space=\"preserve\">{SecurityElement.Escape(value)}</t></is></c>";

        private static string Number(string column, int row, decimal value, int style) =>
            $"<c r=\"{column}{row}\"{StyleAttr(style)}><v>{value.ToString(CultureInfo.InvariantCulture)}</v></c>";

        private static string Number(string column, int row, int value, int style) =>
            $"<c r=\"{column}{row}\"{StyleAttr(style)}><v>{value.ToString(CultureInfo.InvariantCulture)}</v></c>";

        private static string StyleAttr(int style) => style == 0 ? string.Empty : $" s=\"{style}\"";
    }
}
