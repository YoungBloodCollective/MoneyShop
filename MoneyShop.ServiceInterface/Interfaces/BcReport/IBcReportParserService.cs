using MoneyShop.ServiceInterface.Dtos.BcReport;

namespace MoneyShop.ServiceInterface.Interfaces.BcReport;

public interface IBcReportParserService
{
    BcParseResult ParsePdf(byte[] pdfBytes);
}

public class BcParseResult
{
    public BcParsedData Data { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}
