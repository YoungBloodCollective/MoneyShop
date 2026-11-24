using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Tests.Crm;

internal sealed class NoReferralNotifier : IReferralNotifier
{
    public void BankFileChanged(int bankFileId) { }
}
