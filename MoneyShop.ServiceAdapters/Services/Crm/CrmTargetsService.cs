using System.Linq;
using Microsoft.EntityFrameworkCore;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    public class CrmTargetsService : ICrmTargetsService
    {
        private readonly MoneyShopDbContext _context;
        private readonly IBankCatalogService _banks;

        public CrmTargetsService(MoneyShopDbContext context, IBankCatalogService banks)
        {
            _context = context;
            _banks = banks;
        }

        public BrokerTargetsResult? GetMine(int userId)
        {
            var profile = _context.BrokerProfiles.AsNoTracking().FirstOrDefault(p => p.UserId == userId);
            if (profile == null) return null;

            var stats = _banks.GetStats(userId, null, false);
            return new BrokerTargetsResult
            {
                Month = stats.Month,
                Np = new TargetProgress { Achieved = stats.Banks.Sum(b => b.Mine.NpAmount), Target = profile.TargetNpAmount },
                Ip = new TargetProgress { Achieved = stats.Banks.Sum(b => b.Mine.IpAmount), Target = profile.TargetIpAmount },
                Commission = new TargetProgress { Achieved = stats.Banks.Sum(b => b.Mine.EstimatedCommission), Target = profile.TargetCommissionAmount },
            };
        }
    }
}
