using Microsoft.AspNetCore.Http;
using MoneyShop.ServiceInterface.Dtos.BcReport;

namespace MoneyShop.ServiceInterface.Interfaces.BcReport;

public interface IBcReportService
{
    Task<BcReportUploadResult> UploadAndParseAsync(IFormFile file, int userId);
    BcReportSummaryDto? GetLatest(int userId);
    BcReportSummaryDto? GetById(int reportId);
}
