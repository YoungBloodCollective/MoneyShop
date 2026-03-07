using AutoMapper;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Dtos.Account;

namespace MoneyShop.ServiceAdapters.Mapping;

public class MappingProfile : Profile
{
    public Dictionary<int, string> UserRolesDict { get; set; }

    public MappingProfile()
    {
        UserRoles usersList = new UserRoles();
        this.UserRolesDict = usersList.CreateUserRolesDictionary();

        // RegisterModel -> Utilizatori
        CreateMap<RegisterModel, Utilizatori>()
            .ForMember(a => a.Parola, a => a.MapFrom(s => s.Password))
            .ForMember(a => a.Prenume, a => a.MapFrom(s => s.LastName))
            .ForMember(a => a.Nume, a => a.MapFrom(s => s.FirstName))
            .ForMember(a => a.Mail, a => a.MapFrom(s => s.Email));

        // Utilizatori -> UserModel
        CreateMap<Utilizatori, UserModel>()
            .ForMember(a => a.Id, a => a.MapFrom(s => s.IdUtilizator))
            .ForMember(a => a.BirthDay, a => a.MapFrom(s => s.DataNastere))
            .ForMember(a => a.Email, a => a.MapFrom(s => s.Mail))
            .ForMember(a => a.Role, a => a.MapFrom(s => UserRolesDict.ContainsKey(s.IdRol) ? UserRolesDict[s.IdRol] : "Utilizator"))
            .ForMember(a => a.FirstName, a => a.MapFrom(s => s.Nume))
            .ForMember(a => a.LastName, a => a.MapFrom(s => s.Prenume));

        // UserModel -> Utilizatori
        CreateMap<UserModel, Utilizatori>()
            .ForMember(a => a.DataNastere, a => a.MapFrom(s => s.BirthDay))
            .ForMember(a => a.IdRol, a => a.MapFrom(s => UserRolesDict.FirstOrDefault(role => role.Value == s.Role).Key))
            .ForMember(a => a.Nume, a => a.MapFrom(s => s.FirstName))
            .ForMember(a => a.Prenume, a => a.MapFrom(s => s.LastName))
            .ForMember(a => a.Mail, a => a.MapFrom(s => s.Email))
            .ForMember(a => a.Parola, a => a.Ignore())
            .ForMember(a => a.IdUtilizator, a => a.MapFrom(s => s.Id));

        // Utilizatori -> UserModelEdit
        CreateMap<Utilizatori, UserModelEdit>()
           .ForMember(a => a.Id, a => a.MapFrom(s => s.IdUtilizator))
           .ForMember(a => a.BirthDay, a => a.MapFrom(s => s.DataNastere))
           .ForMember(a => a.Email, a => a.MapFrom(s => s.Mail))
           .ForMember(a => a.FirstName, a => a.MapFrom(s => s.Nume))
           .ForMember(a => a.LastName, a => a.MapFrom(s => s.Prenume));

        // UserModelEdit -> Utilizatori
        CreateMap<UserModelEdit, Utilizatori>()
            .ForMember(a => a.DataNastere, a => a.MapFrom(s => s.BirthDay))
            .ForMember(a => a.Nume, a => a.MapFrom(s => s.FirstName))
            .ForMember(a => a.Prenume, a => a.MapFrom(s => s.LastName))
            .ForMember(a => a.Mail, a => a.MapFrom(s => s.Email))
            .ForMember(a => a.Parola, a => a.Ignore());
    }
}
