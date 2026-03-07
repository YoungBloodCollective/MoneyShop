public class UserCategories
{
    public Dictionary<int, string> CreateUserCategoriesDictionary()
    {
        var userRoles = new Dictionary<int, string>
        {

            { 1, "Categoria 1"},
            { 2 , "Categoria 2"},
            { 3 , "Stagiar"},
            { 4 , "Liga 3"},
            { 5 , "Liga 2"},
            { 6 , "Liga 1"}
        };

        return userRoles;
    }
}

