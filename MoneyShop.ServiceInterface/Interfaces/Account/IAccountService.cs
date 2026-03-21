using MoneyShop.ServiceInterface.Dtos.Account;
using MoneyShop.ServiceInterface.SharedDtos;

namespace MoneyShop.ServiceInterface.Interfaces.Account
{
    public interface IAccountService
    {
        CurrentUserDto Login(string email, string password);
        void RegisterNewUser(RegisterModel model);
        List<ListItemModel<string, int>> GetUsers();
        bool SendMailResetPassword(string email);
        UserModelEdit GetUserById();
        CurrentUserDto UpdateUser(UserModelEdit model);
        CurrentUserDto SocialLogin(string firebaseUid, string email, string name);
    }
}
