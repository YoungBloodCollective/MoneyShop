public class UserRoles
{
    public Dictionary<int, string> CreateUserRolesDictionary()
    {
        var userRoles = new Dictionary<int, string>
        {
            { 1, "Utilizator"},
            { 2, "Administrator"},
            { 3, "Broker"}
        };

        return userRoles;
    }
}

