namespace MoneyShop.ServiceInterface.Dtos.Account
{
    public class ValidatePasswordModel
    {
        public string NewPassword { get; set; }
        public string ConfirmPassword { get; set; }
        public string Email { get; set; }
    }
}
