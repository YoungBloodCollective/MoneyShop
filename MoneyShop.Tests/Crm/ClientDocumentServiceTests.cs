using System.Linq;
using MoneyShop.ServiceAdapters.Services.Crm;
using MoneyShop.ServiceInterface.Interfaces.Crm;
using static MoneyShop.Tests.Crm.CrmServiceClientUnionTests;

namespace MoneyShop.Tests.Crm;

public class ClientDocumentServiceTests
{
    [Fact]
    public void Documents_are_filed_by_folder_and_other_brokers_cannot_list_open_or_delete_them()
    {
        var (_, db) = Build();
        var docs = new ClientDocumentService(db);

        var bank = docs.Add(BothUser, ClientDocumentFolders.Banca, " ING Bank ", "fisa.pdf", "application/pdf", new byte[] { 1, 2, 3 }, 5);
        var income = docs.Add(BothUser, ClientDocumentFolders.Venituri, "ignored", "adeverinta.pdf", "application/pdf", new byte[] { 4 }, 5);

        Assert.Equal("ING Bank", bank.BankName);
        Assert.Null(income.BankName);
        Assert.Equal(3, bank.FileSize);
        Assert.Equal(2, docs.List(BothUser).Count);
        Assert.Equal(new byte[] { 1, 2, 3 }, docs.Get(bank.Id)!.Content);
        Assert.Equal(BrokerId, db.ClientDocuments.First().BrokerProfileId);

        db.BrokerScopeId = OtherBrokerId;
        Assert.Empty(docs.List(BothUser));
        Assert.Null(docs.Get(bank.Id));
        Assert.False(docs.Delete(bank.Id));

        db.BrokerScopeId = BrokerId;
        Assert.True(docs.Delete(bank.Id));
        Assert.Single(docs.List(BothUser));
    }
}
