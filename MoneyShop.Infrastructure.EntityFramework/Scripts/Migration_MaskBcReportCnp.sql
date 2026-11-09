-- Masks the full CNP stored in BcReports.ParsedDataJson ("SubjectCnp":"<13 digits>") to '*********' + last 4 digits.
-- Works on the raw text so it does not depend on where the property sits in the JSON tree.
-- Idempotent: loops until no row still carries a 13-digit SubjectCnp. Can run at any time; the API masks on read as well.
DECLARE @pattern NVARCHAR(100) = N'%"SubjectCnp":"[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]"%';
WHILE EXISTS (SELECT 1 FROM BcReports WHERE PATINDEX(@pattern, ParsedDataJson) > 0)
BEGIN
    UPDATE BcReports
    SET ParsedDataJson = STUFF(ParsedDataJson, PATINDEX(@pattern, ParsedDataJson) + 14, 9, N'*********')
    WHERE PATINDEX(@pattern, ParsedDataJson) > 0;
END
