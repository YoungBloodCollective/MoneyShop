-- =============================================
-- Migration: Database Cleanup & Sync
-- Date: 2026-03-07
-- Description:
--   1. Drop legacy tables (BacDocuments, Proiecte, SavedProjects, Favorites, Leads)
--   2. Remove legacy columns from Utilizatori (Skills, Description, DataIncepere)
--   3. Add missing columns to Applications (RequestedAmount, RequestedTermMonths, Purpose)
--   4. Add missing Token column to KycSessions
-- =============================================

-- ============================================
-- STEP 1: Drop legacy tables
-- (Drop in order respecting FK dependencies)
-- ============================================

-- Drop Favorites first (depends on Proiecte via FK)
IF OBJECT_ID('dbo.Favorites', 'U') IS NOT NULL
    DROP TABLE dbo.Favorites;

-- Drop SavedProjects (depends on Proiecte via FK)
IF OBJECT_ID('dbo.SavedProjects', 'U') IS NOT NULL
    DROP TABLE dbo.SavedProjects;

-- Drop Proiecte (now safe, dependents are gone)
IF OBJECT_ID('dbo.Proiecte', 'U') IS NOT NULL
    DROP TABLE dbo.Proiecte;

-- Drop BacDocuments
IF OBJECT_ID('dbo.BacDocuments', 'U') IS NOT NULL
    DROP TABLE dbo.BacDocuments;

-- Drop old Leads table
IF OBJECT_ID('dbo.Leads', 'U') IS NOT NULL
    DROP TABLE dbo.Leads;

PRINT 'Step 1 done: Legacy tables dropped.';

-- ============================================
-- STEP 2: Remove legacy columns from Utilizatori
-- ============================================

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Utilizatori') AND name = 'Skills')
    ALTER TABLE dbo.Utilizatori DROP COLUMN Skills;

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Utilizatori') AND name = 'Description')
    ALTER TABLE dbo.Utilizatori DROP COLUMN [Description];

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Utilizatori') AND name = 'DataIncepere')
    ALTER TABLE dbo.Utilizatori DROP COLUMN DataIncepere;

PRINT 'Step 2 done: Legacy columns removed from Utilizatori.';

-- ============================================
-- STEP 3: Add missing columns to Applications
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Applications') AND name = 'RequestedAmount')
    ALTER TABLE dbo.Applications ADD RequestedAmount DECIMAL(18,2) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Applications') AND name = 'RequestedTermMonths')
    ALTER TABLE dbo.Applications ADD RequestedTermMonths INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Applications') AND name = 'Purpose')
    ALTER TABLE dbo.Applications ADD Purpose NVARCHAR(500) NULL;

PRINT 'Step 3 done: Missing columns added to Applications.';

-- ============================================
-- STEP 4: Add missing Token column to KycSessions
-- ============================================

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.KycSessions') AND name = 'Token')
    ALTER TABLE dbo.KycSessions ADD Token NVARCHAR(MAX) NULL;

PRINT 'Step 4 done: Token column added to KycSessions.';

-- ============================================
-- VERIFICATION: Check final state
-- ============================================

PRINT '';
PRINT '=== Verification ===';

-- Verify legacy tables are gone
IF OBJECT_ID('dbo.Favorites', 'U') IS NULL PRINT 'OK: Favorites table dropped';
IF OBJECT_ID('dbo.SavedProjects', 'U') IS NULL PRINT 'OK: SavedProjects table dropped';
IF OBJECT_ID('dbo.Proiecte', 'U') IS NULL PRINT 'OK: Proiecte table dropped';
IF OBJECT_ID('dbo.BacDocuments', 'U') IS NULL PRINT 'OK: BacDocuments table dropped';
IF OBJECT_ID('dbo.Leads', 'U') IS NULL PRINT 'OK: Leads table dropped';

-- Verify Utilizatori cleanup
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Utilizatori') AND name = 'Skills')
    PRINT 'OK: Skills column removed from Utilizatori';
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Utilizatori') AND name = 'Description')
    PRINT 'OK: Description column removed from Utilizatori';
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Utilizatori') AND name = 'DataIncepere')
    PRINT 'OK: DataIncepere column removed from Utilizatori';

-- Verify Applications new columns
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Applications') AND name = 'RequestedAmount')
    PRINT 'OK: RequestedAmount column exists on Applications';
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Applications') AND name = 'RequestedTermMonths')
    PRINT 'OK: RequestedTermMonths column exists on Applications';
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Applications') AND name = 'Purpose')
    PRINT 'OK: Purpose column exists on Applications';

-- Verify KycSessions Token
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.KycSessions') AND name = 'Token')
    PRINT 'OK: Token column exists on KycSessions';

PRINT '';
PRINT 'Migration complete!';
