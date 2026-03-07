using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Bank;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using System.Linq;
using BankEntity = MoneyShop.DomainModel.Entities.Bank;

namespace MoneyShop.ServiceAdapters.Services.Bank;

public class BankService : IBankService
{
    private readonly IBankRepository _bankRepository;
    private readonly MoneyShopDbContext _context;

    public BankService(
        IBankRepository bankRepository,
        MoneyShopDbContext context)
    {
        _bankRepository = bankRepository;
        _context = context;
    }

    public List<BankEntity> GetAllBanks()
    {
        return _bankRepository.Get()
            .Where(b => b.Active)
            .OrderBy(b => b.Name)
            .ToList();
    }

    public BankEntity? GetBankById(int id)
    {
        return _bankRepository.Get()
            .FirstOrDefault(b => b.Id == id);
    }

    public BankEntity CreateBank(BankEntity bank)
    {
        _bankRepository.Insert(bank);
        _context.SaveChanges();
        return bank;
    }

    public BankEntity UpdateBank(BankEntity bank)
    {
        _bankRepository.Update(bank);
        _context.SaveChanges();
        return bank;
    }
}
