-- Reports parsed before the header fix stored the birth date in subjectCnp (the PDF text puts the
-- date next to the "CNP/CUI:" label) and the address line in subjectName. Clear both; the new parser
-- fills them correctly for new uploads. JSON keys are camelCase and JSON paths are case-sensitive.
-- Idempotent: only rows still carrying a date-shaped subjectCnp or an "Adresa:" subjectName are touched.
UPDATE BcReports
SET ParsedDataJson = JSON_MODIFY(ParsedDataJson, '$.subjectCnp', NULL)
WHERE ISJSON(ParsedDataJson) = 1 AND JSON_VALUE(ParsedDataJson, '$.subjectCnp') LIKE '[0-9][0-9]-[0-9][0-9]-[0-9][0-9][0-9][0-9]';
UPDATE BcReports
SET ParsedDataJson = JSON_MODIFY(ParsedDataJson, '$.subjectName', NULL)
WHERE ISJSON(ParsedDataJson) = 1 AND JSON_VALUE(ParsedDataJson, '$.subjectName') LIKE 'Adresa:%';
