-- Reports parsed before the header fix stored the birth date in SubjectCnp (the PDF text puts the
-- date next to the "CNP/CUI:" label) and the address line in SubjectName. Clear both; the API
-- re-derives nothing from them and the new parser fills them correctly for new uploads.
-- Idempotent: only rows still carrying a date-shaped SubjectCnp or an "Adresa:" SubjectName are touched.
DECLARE @datePattern NVARCHAR(100) = N'%"SubjectCnp":"[0-9][0-9]-[0-9][0-9]-[0-9][0-9][0-9][0-9]"%';
WHILE EXISTS (SELECT 1 FROM BcReports WHERE PATINDEX(@datePattern, ParsedDataJson) > 0)
BEGIN
    UPDATE BcReports
    SET ParsedDataJson = STUFF(ParsedDataJson, PATINDEX(@datePattern, ParsedDataJson) + 13, 12, N'null')
    WHERE PATINDEX(@datePattern, ParsedDataJson) > 0;
END
UPDATE BcReports
SET ParsedDataJson = JSON_MODIFY(ParsedDataJson, '$.SubjectName', NULL)
WHERE ISJSON(ParsedDataJson) = 1 AND JSON_VALUE(ParsedDataJson, '$.SubjectName') LIKE 'Adresa:%';
UPDATE BcReports
SET ParsedDataJson = JSON_MODIFY(ParsedDataJson, '$.Data.SubjectName', NULL)
WHERE ISJSON(ParsedDataJson) = 1 AND JSON_VALUE(ParsedDataJson, '$.Data.SubjectName') LIKE 'Adresa:%';
