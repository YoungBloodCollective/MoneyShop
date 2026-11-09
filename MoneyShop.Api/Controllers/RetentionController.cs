using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Retention;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/admin/retention")]
    [Authorize(Roles = "Administrator")]
    public class RetentionController : BaseController
    {
        private readonly MoneyShopDbContext _context;
        private readonly IRetentionSweeper _sweeper;

        public RetentionController(MoneyShopDbContext context, IRetentionSweeper sweeper)
        {
            _context = context;
            _sweeper = sweeper;
        }

        [HttpGet("runs")]
        public async Task<IActionResult> GetRuns(CancellationToken cancellationToken)
        {
            var runs = await _context.RetentionRuns
                .AsNoTracking()
                .OrderByDescending(r => r.StartedAt)
                .Take(20)
                .ToListAsync(cancellationToken);

            return Ok(runs);
        }

        [HttpPost("run-now")]
        public async Task<IActionResult> RunNow(CancellationToken cancellationToken)
        {
            var result = await _sweeper.SweepAsync(cancellationToken);
            return Ok(result);
        }
    }
}
