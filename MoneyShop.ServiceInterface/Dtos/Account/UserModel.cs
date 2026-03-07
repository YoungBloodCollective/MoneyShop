using System.ComponentModel.DataAnnotations;

namespace MoneyShop.ServiceInterface.Dtos.Account
{
    public class UserModel
    {
        public int Id { get; set; }
        [Required(ErrorMessage = "Please enter the Mail.")]
        public string Email { get; set; }
        [Required(ErrorMessage = "Please enter the First Name.")]
        public string FirstName { get; set; }
        [Required(ErrorMessage = "Please enter the Last Name.")]
        public string LastName { get; set; }
        [Required(ErrorMessage = "Please enter the Birthdary.")]
        public DateTime BirthDay { get; set; }
        public DateTime RegistrationDay { get; set; }
        public string? ProfileDescription { get; set; }
        public byte[] ProfilePicture { get; set; }
        public string? NumarTelefon { get; set; }
        public string Role { get; set; }
    }
}
