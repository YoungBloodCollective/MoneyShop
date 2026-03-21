using System.Globalization;
using System.Text.RegularExpressions;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using MoneyShop.ServiceInterface.Dtos.BcReport;
using MoneyShop.ServiceInterface.Interfaces.BcReport;

namespace MoneyShop.ServiceAdapters.Services.BcReport;

public class BcReportParserService : IBcReportParserService
{
    public BcParseResult ParsePdf(byte[] pdfBytes)
    {
        var result = new BcParseResult();
        var data = result.Data;
        try
        {
            var fullText = ExtractText(pdfBytes);
            var lines = fullText.Split('\n').ToList();
            ParseSubjectInfo(lines, data, result.Warnings);
            ParseFicoScore(lines, data, result.Warnings);
            ParseIndicators(lines, data, result.Warnings);
            ParseAccountSummary(lines, data, result.Warnings);
            ParseDetailedAccounts(lines, data, result.Warnings);
            ParseInquiries(lines, data, result.Warnings);
        }
        catch (Exception ex)
        {
            result.Warnings.Add($"Critical parse error: {ex.Message}");
        }
        return result;
    }

    private static string ExtractText(byte[] pdfBytes)
    {
        using var ms = new MemoryStream(pdfBytes);
        using var reader = new PdfReader(ms);
        using var pdfDoc = new PdfDocument(reader);
        var sb = new System.Text.StringBuilder();
        for (int i = 1; i <= pdfDoc.GetNumberOfPages(); i++)
        {
            var page = pdfDoc.GetPage(i);
            var text = PdfTextExtractor.GetTextFromPage(page);
            sb.AppendLine(text);
        }
        return sb.ToString();
    }

    private static void ParseSubjectInfo(List<string> lines, BcParsedData data, List<string> warnings)
    {
        for (int i = 0; i < lines.Count; i++)
        {
            var trimmed = lines[i].Trim();
            if (trimmed.StartsWith("Numele:"))
            {
                var value = trimmed.Replace("Numele:", "").Trim();
                if (!string.IsNullOrEmpty(value))
                    data.SubjectName = value;
                else if (i + 1 < lines.Count && !string.IsNullOrWhiteSpace(lines[i + 1]))
                    data.SubjectName = lines[i + 1].Trim();
            }
            if (trimmed.StartsWith("CNP/CUI:"))
            {
                var value = trimmed.Replace("CNP/CUI:", "").Trim();
                if (!string.IsNullOrEmpty(value))
                    data.SubjectCnp = value;
            }
            if (trimmed.StartsWith("Data emiterii:"))
            {
                var dateMatch = Regex.Match(trimmed, @"(\d{2}-\d{2}-\d{4})");
                if (dateMatch.Success)
                    data.ReportDate = dateMatch.Groups[1].Value;
            }
        }
    }

    private static void ParseFicoScore(List<string> lines, BcParsedData data, List<string> warnings)
    {
        for (int i = 0; i < lines.Count; i++)
        {
            var trimmed = lines[i].Trim();
            if (trimmed == "Scor:" || trimmed.StartsWith("Scor:"))
            {
                var inlineMatch = Regex.Match(trimmed, @"Scor:\s*(\d+)");
                if (inlineMatch.Success)
                {
                    data.FicoScore = int.Parse(inlineMatch.Groups[1].Value);
                }
                else
                {
                    for (int j = i + 1; j < Math.Min(i + 3, lines.Count); j++)
                    {
                        var nextTrimmed = lines[j].Trim();
                        if (int.TryParse(nextTrimmed, out var score) && score >= 300 && score <= 850)
                        {
                            data.FicoScore = score;
                            break;
                        }
                    }
                }
                break;
            }
        }
        if (data.FicoScore == null)
            warnings.Add("FICO score not found in report");
        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            var codeMatch = Regex.Match(trimmed, @"^(\d+)\.([A-Z]\d+)\s*-\s*(.+)$");
            if (codeMatch.Success)
                data.FicoExplanationCodes.Add($"{codeMatch.Groups[2].Value} - {codeMatch.Groups[3].Value}");
        }
    }

    private static string NormalizeRo(string text)
    {
        return text
            .Replace('ţ', 'ț').Replace('Ţ', 'Ț')
            .Replace('ş', 'ș').Replace('Ş', 'Ș')
            .Replace('ă', 'a').Replace('Ă', 'A')
            .Replace('â', 'a').Replace('Â', 'A')
            .Replace('î', 'i').Replace('Î', 'I');
    }

    private static void ParseIndicators(List<string> lines, BcParsedData data, List<string> warnings)
    {
        var startIdx = lines.FindIndex(l => l.Contains("INDICATORI PRINCIPALI"));
        if (startIdx < 0)
        {
            warnings.Add("Principal indicators section not found");
            return;
        }
        data.BankingIndicators = new BcIndicators();
        data.NonBankingIndicators = new BcIndicators();
        var endIdx = lines.FindIndex(startIdx + 1, l =>
            NormalizeRo(l.Trim()).StartsWith("Istoricul") || l.Contains("SUMAR CONTURI") || (l.Contains("Page ") && l.Contains(" of ")));
        if (endIdx < 0) endIdx = Math.Min(startIdx + 60, lines.Count);
        var indicatorLines = new List<string>();
        for (int i = startIdx + 1; i < endIdx; i++)
        {
            var trimmed = lines[i].Trim();
            if (!string.IsNullOrWhiteSpace(trimmed))
                indicatorLines.Add(trimmed);
        }
        foreach (var trimmed in indicatorLines)
        {
            var norm = NormalizeRo(trimmed);
            if (TryExtractTwoValues(trimmed, norm, "conturi din dosarul", out var bVal, out var nbVal))
            {
                data.BankingIndicators.AccountsInfo = bVal;
                data.NonBankingIndicators.AccountsInfo = nbVal;
                ParseAccountsInfo(bVal, data.BankingIndicators);
                ParseAccountsInfo(nbVal, data.NonBankingIndicators);
            }
            else if (TryExtractTwoValues(trimmed, norm, "conturi cu restante curente", out bVal, out nbVal))
            {
                data.BankingIndicators.AccountsWithArrears = SafeInt(bVal);
                data.NonBankingIndicators.AccountsWithArrears = SafeInt(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "Cele mai vechi informatii", out bVal, out nbVal))
            {
                data.BankingIndicators.OldestInfo = bVal;
                data.NonBankingIndicators.OldestInfo = nbVal;
            }
            else if (TryExtractTwoValues(trimmed, norm, "afara bilantului", out bVal, out nbVal))
            {
                data.BankingIndicators.OffBalanceSheet = SafeInt(bVal);
                data.NonBankingIndicators.OffBalanceSheet = SafeInt(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "date la colectare", out bVal, out nbVal))
            {
                data.BankingIndicators.SentToCollection = SafeInt(bVal);
                data.NonBankingIndicators.SentToCollection = SafeInt(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "sumelor de plata pe luna", out bVal, out nbVal))
            {
                data.BankingIndicators.TotalMonthlyPayment = SafeDecimal(bVal);
                data.NonBankingIndicators.TotalMonthlyPayment = SafeDecimal(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "sumelor datorate curent", out bVal, out nbVal))
            {
                data.BankingIndicators.TotalAmountOwed = SafeDecimal(bVal);
                data.NonBankingIndicators.TotalAmountOwed = SafeDecimal(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "- sub 1 an", out bVal, out nbVal))
            {
                data.BankingIndicators.AmountOwedUnder1Year = SafeDecimal(bVal);
                data.NonBankingIndicators.AmountOwedUnder1Year = SafeDecimal(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "- 1 - 5 ani", out bVal, out nbVal))
            {
                data.BankingIndicators.AmountOwed1To5Years = SafeDecimal(bVal);
                data.NonBankingIndicators.AmountOwed1To5Years = SafeDecimal(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "- peste 5 ani", out bVal, out nbVal))
            {
                data.BankingIndicators.AmountOwedOver5Years = SafeDecimal(bVal);
                data.NonBankingIndicators.AmountOwedOver5Years = SafeDecimal(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "sume restante curent", out bVal, out nbVal))
            {
                data.BankingIndicators.TotalArrears = SafeDecimal(bVal);
                data.NonBankingIndicators.TotalArrears = SafeDecimal(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "Intarziere maxima curenta", out bVal, out nbVal))
            {
                data.BankingIndicators.MaxCurrentDelay = bVal;
                data.NonBankingIndicators.MaxCurrentDelay = nbVal;
            }
            else if (TryExtractTwoValues(trimmed, norm, "conturi contractate in ultimele 24", out bVal, out nbVal))
            {
                data.BankingIndicators.ContractsLast24Months = SafeInt(bVal);
                data.NonBankingIndicators.ContractsLast24Months = SafeInt(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "conturi inchise in ultimele 24", out bVal, out nbVal))
            {
                data.BankingIndicators.ClosedLast24Months = SafeInt(bVal);
                data.NonBankingIndicators.ClosedLast24Months = SafeInt(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "- La termen", out bVal, out nbVal))
            {
                data.BankingIndicators.ClosedOnTime = SafeInt(bVal);
                data.NonBankingIndicators.ClosedOnTime = SafeInt(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "- Anticipat", out bVal, out nbVal))
            {
                data.BankingIndicators.ClosedEarly = SafeInt(bVal);
                data.NonBankingIndicators.ClosedEarly = SafeInt(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "- Altele", out bVal, out nbVal))
            {
                data.BankingIndicators.ClosedOther = SafeInt(bVal);
                data.NonBankingIndicators.ClosedOther = SafeInt(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "Maximul platit intr-o luna", out bVal, out nbVal))
            {
                data.BankingIndicators.MaxPaidInMonth24 = SafeDecimal(bVal);
                data.NonBankingIndicators.MaxPaidInMonth24 = SafeDecimal(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "conturi cu sume restante", out bVal, out nbVal)
                     && !norm.Contains("curente"))
            {
                data.BankingIndicators.AccountsWithArrearsLast6M = SafeInt(bVal);
                data.NonBankingIndicators.AccountsWithArrearsLast6M = SafeInt(nbVal);
            }
            else if (TryExtractTwoValues(trimmed, norm, "conturi actualizate", out bVal, out nbVal))
            {
                data.BankingIndicators.AccountsUpdatedLast6M = SafeInt(bVal);
                data.NonBankingIndicators.AccountsUpdatedLast6M = SafeInt(nbVal);
            }
            else if (norm.Contains("Cea mai recenta interogare"))
            {
                var dateMatch = Regex.Match(trimmed, @"(\d{2}-\d{2}-\d{4})");
                if (dateMatch.Success)
                    data.BankingIndicators.MostRecentInquiry = dateMatch.Groups[1].Value;
            }
        }
    }

    private static bool TryExtractTwoValues(string originalLine, string normalizedLine, string normalizedLabel, out string bankingVal, out string nonBankingVal)
    {
        bankingVal = "";
        nonBankingVal = "";
        if (!normalizedLine.Contains(normalizedLabel)) return false;
        var idx = normalizedLine.IndexOf(normalizedLabel);
        var afterLabel = originalLine.Substring(idx + normalizedLabel.Length);
        afterLabel = Regex.Replace(afterLabel, @"[/]\s*[A-ZÀ-Ža-zà-ž\s]+participan[a-zț]+i", "").Trim();
        afterLabel = Regex.Replace(afterLabel, @"\(RON\)", "").Trim();
        afterLabel = Regex.Replace(afterLabel, @"la data emiterii RC", "").Trim();
        if (string.IsNullOrWhiteSpace(afterLabel)) return false;
        var zileMatch = Regex.Match(afterLabel, @"(\d+\s+zile)\s+(\d+\s+zile)");
        if (zileMatch.Success)
        {
            bankingVal = zileMatch.Groups[1].Value;
            nonBankingVal = zileMatch.Groups[2].Value;
            return true;
        }
        var parts = afterLabel.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2)
        {
            bankingVal = parts[parts.Length - 2];
            nonBankingVal = parts[parts.Length - 1];
            return true;
        }
        if (parts.Length == 1)
        {
            bankingVal = parts[0];
            nonBankingVal = parts[0];
            return true;
        }
        return false;
    }

    private static void ParseAccountsInfo(string value, BcIndicators indicators)
    {
        var parts = value.Split('/');
        if (parts.Length == 2)
        {
            indicators.TotalAccounts = SafeInt(parts[0]);
            indicators.Participants = SafeInt(parts[1]);
        }
    }

    private static void ParseAccountSummary(List<string> lines, BcParsedData data, List<string> warnings)
    {
        var sumarStart = lines.FindIndex(l => l.Trim().StartsWith("SUMAR CONTURI"));
        if (sumarStart < 0)
        {
            warnings.Add("Account summary section not found");
            return;
        }
        var detaliiIdx = lines.FindIndex(sumarStart, l => l.Trim().StartsWith("Detalii conturi"));
        var endIdx = detaliiIdx > 0 ? detaliiIdx : lines.Count;
        var contRegex = new Regex(@"Cont\s+(\d+)\s*$");
        for (int i = sumarStart; i < endIdx; i++)
        {
            var trimmed = lines[i].Trim();
            var contMatch = contRegex.Match(trimmed);
            if (!contMatch.Success) continue;
            var contIndex = int.Parse(contMatch.Groups[1].Value);
            var mergedLine = CollectSummaryRow(lines, i, sumarStart, contRegex);
            var account = ParseSummaryRow(mergedLine, contIndex);
            data.Accounts.Add(account);
        }
        if (data.Accounts.Count == 0)
            warnings.Add("No accounts found in summary section");
    }

    private static string CollectSummaryRow(List<string> lines, int contLineIdx, int sectionStart, Regex contRegex)
    {
        var parts = new List<string>();
        for (int j = contLineIdx; j >= Math.Max(sectionStart, contLineIdx - 4); j--)
        {
            var prev = lines[j].Trim();
            if (j < contLineIdx && (contRegex.IsMatch(prev) || prev.StartsWith("DP") || prev.StartsWith("Suma") || prev.StartsWith("Data ")))
                break;
            parts.Insert(0, prev);
        }
        return string.Join(" ", parts);
    }

    private static BcAccountSummary ParseSummaryRow(string line, int contIndex)
    {
        var account = new BcAccountSummary { AccountIndex = contIndex, Currency = "RON" };
        var statusPatterns = new[]
        {
            "Cont platit complet în avans, renuntare voluntara la subiectul contractului",
            "Cont platit complet în avans",
            "Cont platit sau închis/sold zero",
            "Cont fara restante",
            "Cont restant cu peste 180 de zile",
            "Cont restant cu peste 150 de zile",
            "Cont restant cu peste 120 de zile",
            "Cont restant cu peste 90 de zile",
            "Cont restant cu peste 60 de zile",
            "Cont restant cu peste 30 de zile",
            "Cont dat la colectare",
            "Scos în afara bilanţului"
        };
        foreach (var sp in statusPatterns)
        {
            if (line.Contains(sp))
            {
                account.Status = sp;
                break;
            }
        }
        var typePatterns = new[]
        {
            "Revolving (card de credit)",
            "Card de Credit",
            "Credit ipotecar",
            "Credit de consum",
            "Credit pe cec / linie de credit",
            "Linie de credit"
        };
        foreach (var tp in typePatterns)
        {
            if (line.Contains(tp))
            {
                account.AccountType = tp;
                break;
            }
        }
        var dateMatch = Regex.Match(line, @"(\d{2}-\d{2}-\d{4})");
        if (dateMatch.Success)
            account.LastUpdateDate = dateMatch.Groups[1].Value;
        var amountsRegion = line;
        if (dateMatch.Success)
        {
            var afterDate = line.Substring(dateMatch.Index + dateMatch.Length);
            var amountsMatch = Regex.Match(afterDate, @"RON\s+(.+?)\s+Cont\s+\d+");
            if (amountsMatch.Success)
                amountsRegion = amountsMatch.Groups[1].Value;
            else
            {
                amountsMatch = Regex.Match(afterDate, @"RON\s+(.+)$");
                if (amountsMatch.Success)
                    amountsRegion = Regex.Replace(amountsMatch.Groups[1].Value, @"Cont\s+\d+", "").Trim();
            }
        }
        var amountTokens = Regex.Matches(amountsRegion, @"[\d,]+")
            .Select(m => m.Value)
            .Where(v => !Regex.IsMatch(v, @"^\d{2}-\d{2}-\d{4}$"))
            .Select(SafeDecimal)
            .ToList();
        if (amountTokens.Count >= 3)
        {
            account.CreditLimit = amountTokens[0];
            account.CurrentBalance = amountTokens[1];
            account.ArrearsAmount = amountTokens[2];
        }
        else if (amountTokens.Count == 2)
        {
            account.CreditLimit = amountTokens[0];
            account.CurrentBalance = amountTokens[1];
        }
        else if (amountTokens.Count == 1)
        {
            account.CreditLimit = amountTokens[0];
        }
        account.IsActive = account.CurrentBalance > 0 ||
            (account.Status != null && !account.Status.Contains("platit") && !account.Status.Contains("închis") && !account.Status.Contains("sold zero"));
        account.HasArrears = account.ArrearsAmount > 0 || (account.Status != null && account.Status.Contains("restant"));
        if (account.Status != null)
        {
            var dpdMatch = Regex.Match(account.Status, @"peste\s+(\d+)\s+de\s+zile");
            if (dpdMatch.Success)
                account.DaysOverdue = int.Parse(dpdMatch.Groups[1].Value);
        }
        return account;
    }

    private static void ParseDetailedAccounts(List<string> lines, BcParsedData data, List<string> warnings)
    {
        var detaliiStart = lines.FindIndex(l => l.Trim().StartsWith("Detalii conturi"));
        if (detaliiStart < 0)
        {
            warnings.Add("Detailed accounts section not found");
            return;
        }
        var inquiriesStart = lines.FindIndex(detaliiStart, l =>
            l.Contains("Participanţii cărora le-au fost eliberate"));
        var endIdx = inquiriesStart > 0 ? inquiriesStart : lines.Count;
        var accountBlocks = new List<(int start, int end)>();
        for (int i = detaliiStart + 1; i < endIdx; i++)
        {
            var trimmed = lines[i].Trim();
            if (IsAccountBlockStart(trimmed))
                accountBlocks.Add((i, -1));
        }
        for (int i = 0; i < accountBlocks.Count; i++)
        {
            var endBlock = i + 1 < accountBlocks.Count ? accountBlocks[i + 1].start : endIdx;
            accountBlocks[i] = (accountBlocks[i].start, endBlock);
        }
        int accountIdx = 0;
        foreach (var (start, end) in accountBlocks)
        {
            accountIdx++;
            var matchingAccount = data.Accounts.FirstOrDefault(a => a.AccountIndex == accountIdx);
            if (matchingAccount == null) continue;
            for (int i = start; i < end; i++)
            {
                var trimmed = lines[i].Trim();
                if (trimmed.StartsWith("Participant:") && !trimmed.Contains("Tip participant"))
                {
                    matchingAccount.Creditor = trimmed.Replace("Participant:", "").Trim();
                }
                else if (trimmed.StartsWith("Tipul contului:"))
                {
                    var val = trimmed.Replace("Tipul contului:", "").Trim();
                    if (!string.IsNullOrEmpty(val))
                        matchingAccount.AccountType = val;
                }
                else if (trimmed.StartsWith("Stare:"))
                {
                    var val = trimmed.Replace("Stare:", "").Trim();
                    if (!string.IsNullOrEmpty(val))
                    {
                        matchingAccount.Status = val;
                        matchingAccount.IsActive = !val.Contains("platit") && !val.Contains("închis") && !val.Contains("sold zero");
                        matchingAccount.HasArrears = val.Contains("restant") && !val.Contains("fara restant") && !val.Contains("fără restanț");
                        var dpdMatch = Regex.Match(val, @"peste\s+(\d+)\s+de\s+zile");
                        if (dpdMatch.Success)
                            matchingAccount.DaysOverdue = int.Parse(dpdMatch.Groups[1].Value);
                    }
                }
                else if (trimmed.StartsWith("Suma acordată:"))
                {
                    var numMatch = Regex.Match(trimmed, @"Suma acordată:\s*([\d,]+)");
                    if (numMatch.Success)
                        matchingAccount.CreditLimit = SafeDecimal(numMatch.Groups[1].Value);
                }
                else if (trimmed.StartsWith("Suma datorată:"))
                {
                    var numMatch = Regex.Match(trimmed, @"Suma datorată:\s*([\d,]+)");
                    if (numMatch.Success)
                        matchingAccount.CurrentBalance = SafeDecimal(numMatch.Groups[1].Value);
                }
                else if (trimmed.StartsWith("Suma restantă:"))
                {
                    var numMatch = Regex.Match(trimmed, @"Suma restantă:\s*([\d,]+)");
                    if (numMatch.Success)
                        matchingAccount.ArrearsAmount = SafeDecimal(numMatch.Groups[1].Value);
                }
                else if (trimmed.StartsWith("Categorie de întârziere crt:"))
                {
                    var catMatch = Regex.Match(trimmed, @":\s*(\d+)");
                    if (catMatch.Success)
                    {
                        var cat = int.Parse(catMatch.Groups[1].Value);
                        var daysFromCat = cat switch
                        {
                            1 => 30,
                            2 => 60,
                            3 => 90,
                            4 => 120,
                            5 => 150,
                            6 => 180,
                            _ => 0
                        };
                        matchingAccount.DaysOverdue = Math.Max(matchingAccount.DaysOverdue, daysFromCat);
                    }
                }
            }
        }
    }

    private static bool IsAccountBlockStart(string trimmed)
    {
        if (Regex.IsMatch(trimmed, @"^RO\d{2}[A-Z]{4}"))
            return true;
        if (Regex.IsMatch(trimmed, @"^[A-Z]{2,4}\d{4,}") && !trimmed.Contains("CNP") && !trimmed.Contains("Page "))
            return true;
        return false;
    }

    private static void ParseInquiries(List<string> lines, BcParsedData data, List<string> warnings)
    {
        var inquiryStart = lines.FindIndex(l =>
            l.Contains("Participanţii cărora le-au fost eliberate") ||
            l.Contains("Participantii carora le-au fost eliberate"));
        if (inquiryStart < 0)
        {
            inquiryStart = lines.FindIndex(l =>
                l.Contains("eliberate Rapoarte de Credit"));
        }
        if (inquiryStart < 0)
        {
            warnings.Add("Inquiries section not found");
            return;
        }
        var headerSkipped = false;
        for (int i = inquiryStart + 1; i < lines.Count; i++)
        {
            var trimmed = lines[i].Trim();
            if (string.IsNullOrWhiteSpace(trimmed)) continue;
            if (trimmed.StartsWith("Legendă:") || trimmed.StartsWith("Legenda:")) break;
            if (trimmed.Contains("Page ") && trimmed.Contains(" of ")) continue;
            if (trimmed.StartsWith("Cu FICO") || trimmed.StartsWith("Data ") && trimmed.Contains("Participantul"))
            {
                headerSkipped = true;
                continue;
            }
            if (!headerSkipped && trimmed.Contains("de Credit")) continue;
            var dateMatch = Regex.Match(trimmed, @"^(\d{2}-\d{2}-\d{4})\s+(.+?)(?:\s+(DA|NU))?\s*$");
            if (dateMatch.Success)
            {
                data.Inquiries.Add(new BcInquiry
                {
                    Date = dateMatch.Groups[1].Value,
                    Institution = dateMatch.Groups[2].Value.Trim(),
                    Purpose = dateMatch.Groups[3].Success ? dateMatch.Groups[3].Value : null
                });
            }
            else
            {
                var simpleDateMatch = Regex.Match(trimmed, @"(\d{2}-\d{2}-\d{4})");
                if (simpleDateMatch.Success)
                {
                    var afterDate = trimmed.Substring(simpleDateMatch.Index + simpleDateMatch.Length).Trim();
                    var daMatch = Regex.Match(afterDate, @"\s+(DA|NU)\s*$");
                    var institution = daMatch.Success ? afterDate.Substring(0, daMatch.Index).Trim() : afterDate;
                    data.Inquiries.Add(new BcInquiry
                    {
                        Date = simpleDateMatch.Groups[1].Value,
                        Institution = institution,
                        Purpose = daMatch.Success ? daMatch.Groups[1].Value : null
                    });
                }
            }
        }
    }

    private static int SafeInt(string value)
    {
        var cleaned = value.Replace(",", "").Replace(".", "").Trim();
        return int.TryParse(cleaned, out var result) ? result : 0;
    }

    private static decimal SafeDecimal(string value)
    {
        var cleaned = value.Replace(",", "").Trim();
        return decimal.TryParse(cleaned, NumberStyles.Any, CultureInfo.InvariantCulture, out var result) ? result : 0;
    }
}
