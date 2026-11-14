using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MoneyShop.Infrastructure.EntityFramework.DBContext;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    internal sealed record CrmAcordRow(
        int UserId,
        Guid AcordId,
        string Status,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        DateTime? SignedAt,
        string Prenume,
        string Nume,
        string Telefon,
        string? Email);

    internal static class CrmAcordQueries
    {
        public static List<CrmAcordRow> LoadAcordRows(this MoneyShopDbContext context) =>
            context.AcordClients
                .AsNoTracking()
                .Select(a => new CrmAcordRow(a.UserId, a.AcordId, a.Status, a.CreatedAt, a.UpdatedAt, a.SignedAt, a.Prenume, a.Nume, a.Telefon, a.Email))
                .ToList();
    }
}
