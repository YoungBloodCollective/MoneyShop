using System.Linq.Expressions;
using MoneyShop.DomainModel;

namespace MoneyShop.Infrastructure.EntityFramework.Common;

public interface IRepository<TEntity> where TEntity : class, IEntity
{
    IQueryable<TEntity> Get();
    TEntity Insert(TEntity entity);
    TEntity Update(TEntity entity);
    TEntity Find(Guid id);
    TEntity FindById(int id);
    IQueryable<TEntity> Where(Expression<Func<TEntity, bool>> predicate);
    void Delete(TEntity entity);
    Task SaveChangesAsync();
}
