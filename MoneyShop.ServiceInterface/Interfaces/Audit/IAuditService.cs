namespace MoneyShop.ServiceInterface.Interfaces.Audit
{
    public interface IAuditService
    {
        void Log(string entityType, string entityId, string action, object? oldValue = null, object? newValue = null, string? reason = null);
    }
}
