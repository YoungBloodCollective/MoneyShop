using System;

namespace MoneyShop.ServiceInterface.Interfaces.Account
{
    public class AccountLockedException : Exception
    {
        public DateTime LockoutEndUtc { get; }

        public AccountLockedException(DateTime lockoutEndUtc) : base("Account is temporarily locked.")
        {
            LockoutEndUtc = lockoutEndUtc;
        }
    }
}
