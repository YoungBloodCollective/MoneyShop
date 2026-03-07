namespace MoneyShop.ServiceInterface.SharedDtos
{
    public class CurrentUserDto
    {
        public int Id { get; set; }
        public string Email { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public bool IsAuthenticated { get; set; }
        public string Role { get; set; }
    }
}
