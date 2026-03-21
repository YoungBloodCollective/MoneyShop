namespace MoneyShop.ServiceInterface.Dtos.Account
{
    public class SocialLoginModel
    {
        public string IdToken { get; set; } = null!;
        public string Provider { get; set; } = null!;
    }
}
