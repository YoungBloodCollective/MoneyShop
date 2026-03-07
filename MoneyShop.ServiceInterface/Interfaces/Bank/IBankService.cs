using BankEntity = MoneyShop.DomainModel.Entities.Bank;

namespace MoneyShop.ServiceInterface.Interfaces.Bank
{
    public interface IBankService
    {
        List<BankEntity> GetAllBanks();
        BankEntity? GetBankById(int id);
        BankEntity CreateBank(BankEntity bank);
        BankEntity UpdateBank(BankEntity bank);
    }
}
