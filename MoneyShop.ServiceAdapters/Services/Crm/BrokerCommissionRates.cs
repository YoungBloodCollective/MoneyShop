using System.Collections.Generic;
using System.Linq;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    /// <summary>
    /// Turns the stored broker commissions into one percent per broker, bank and credit type. A row typed NP or IP wins;
    /// a row without a type (set before the NP/IP split) fills whichever of the two the broker has not set.
    /// </summary>
    internal static class BrokerCommissionRates
    {
        public static readonly string[] Types = { CreditTypes.Np, CreditTypes.Ip };

        public static Dictionary<(int BrokerId, int BankId, string Type), decimal> Expand(IEnumerable<BrokerBankCommission> rows)
        {
            var list = rows.ToList();
            var result = new Dictionary<(int, int, string), decimal>();
            foreach (var r in list.Where(r => CreditTypes.IsValid(r.CreditType)))
                result[(r.BrokerProfileId, r.BankId, r.CreditType!)] = r.CommissionPercent;
            foreach (var r in list.Where(r => r.CreditType == null))
                foreach (var type in Types)
                    result.TryAdd((r.BrokerProfileId, r.BankId, type), r.CommissionPercent);
            return result;
        }
    }
}
