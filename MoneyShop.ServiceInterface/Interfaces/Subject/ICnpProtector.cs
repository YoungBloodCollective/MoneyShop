namespace MoneyShop.ServiceInterface.Interfaces.Subject;

/// <summary>
/// Encrypts the CNP for storage and reads it back. The plaintext never reaches the
/// database, and the key never reaches the repository.
/// </summary>
public interface ICnpProtector
{
    /// <summary>True when a usable key is configured; false means nothing can be stored.</summary>
    bool IsConfigured { get; }

    byte[] Protect(string cnp);

    /// <summary>Returns null when there is nothing stored or the payload cannot be read.</summary>
    string? Unprotect(byte[]? payload);
}
