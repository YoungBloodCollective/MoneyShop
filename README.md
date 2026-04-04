# MoneyShop® — Platforma Digitala de Intermediere Credite

> Broker de credite autorizat ANPC | [moneyshop.ro](https://moneyshop.ro)

## Despre Proiect

MoneyShop este o platforma digitala completa de analiza si intermediere financiara care faciliteaza accesul utilizatorilor la informatii privind optiunile de credit disponibile in piata. Platforma permite evaluarea eligibilitatii, compararea ofertelor bancare si depunerea cererilor de credit online.

## Arhitectura

```
MoneyShop/
├── MoneyShop.Api/                    # Backend API (.NET 8, ASP.NET Core)
│   ├── Controllers/                  # REST API endpoints (34 controllers)
│   ├── Services/                     # Firebase token verification
│   └── Program.cs                    # App configuration, DI, middleware
├── MoneyShop.ServiceAdapters/        # Business logic implementation
│   ├── Services/Account/             # Authentication, registration
│   ├── Services/Application/         # Credit application CRUD
│   ├── Services/Simulator/           # Credit scoring engine
│   ├── Services/Eligibility/         # Advanced eligibility calculator
│   ├── Services/BcReport/            # BC Report PDF parser
│   ├── Services/Kyc/                 # KYC verification
│   ├── Services/Chat/                # AI-powered chat (OpenAI)
│   └── Services/Otp/                 # SMS/Email OTP verification
├── MoneyShop.ServiceInterface/       # Service contracts (interfaces + DTOs)
├── MoneyShop.DomainModel/            # Entity models (26 entities)
├── MoneyShop.DomainServices/         # Repository implementations
├── MoneyShop.Infrastructure.EF/      # EF Core DbContext, migrations, base repository
├── MoneyShop.Tests/                  # Unit & integration tests (xUnit + Moq)
├── MoneyShopWeb/                     # Frontend (React + TypeScript + Vite + Tailwind)
│   ├── src/pages/                    # 25+ pages (landing, dashboard, admin, etc.)
│   ├── src/components/               # Reusable UI components
│   ├── src/services/api/             # API client services
│   └── src/store/                    # Zustand state management
└── MoneyShopMobile/                  # Mobile app (React Native + Expo)
```

## Stack Tehnologic

| Layer | Tehnologie |
|---|---|
| **Backend** | .NET 8, ASP.NET Core, Entity Framework Core 8, SQL Server |
| **Frontend Web** | React 19, TypeScript, Vite, Tailwind CSS, Recharts |
| **Frontend Mobile** | React Native, Expo SDK 54, Zustand |
| **Autentificare** | JWT + Firebase Auth (Google social login) |
| **Baza de date** | Azure SQL Database |
| **Hosting** | Azure App Service (backend) + Azure Static Web Apps (frontend) |
| **CI/CD** | GitHub Actions (build, test, deploy) |
| **SMS/Email** | Brevo (transactional SMS + email) |
| **AI** | Azure OpenAI (chat assistant) |
| **KYC** | MediaPipe (face detection, liveness, document OCR) |

## Diagrama ER

Diagrama completa a bazei de date este disponibila in [docs/er-diagram.md](docs/er-diagram.md).

**Entitati principale (26):**
- `Utilizatori` — utilizatori cu roluri (Utilizator/Administrator)
- `Application` — cereri de credit (NP, ipotecar, refinantare)
- `ApplicationBank` — trimiterea cererilor catre banci (many-to-many)
- `Bank` — banci partenere
- `KycSession` + `KycFile` — verificare identitate (one-to-many)
- `Consent` + `LegalDoc` — consimtaminte GDPR (many-to-one)
- `Mandate` — mandate ANAF si Birou de Credit
- `BcReport` — rapoarte Birou de Credit cu scor FICO
- `UserFinancialData` — date financiare (salariu, DTI, scoring)
- `OtpChallenge` — coduri OTP pentru verificare telefon/email
- `Appointment` — programari consultanta
- `BrokerDirectory` — director brokeri autorizati (Excel upload)

**Tipuri de relatii:**
- `@OneToOne`: Utilizatori ↔ UserFinancialData
- `@OneToMany`: Utilizatori → Applications, KycSession → KycFiles, Application → Documents
- `@ManyToOne`: Utilizatori → Roluri, Consent → LegalDoc, ApplicationBank → Bank
- `@ManyToMany`: Application ↔ Bank (prin ApplicationBank)

## Functionalitati

### Pentru Clienti
- Simulator de credit (nevoi personale + ipotecar + refinantare)
- Calculator avansat cu date din Biroul de Credit
- Inregistrare si autentificare (email/parola + Google OAuth)
- Verificare identitate (KYC) cu OCR si liveness detection
- Upload raport Birou de Credit (PDF parser)
- Vizualizare scor FICO si situatie financiara
- Depunere cereri de credit
- Chat AI cu asistent financiar
- Portal self-service cu tracking status dosar

### Pentru Administratori
- Dashboard admin cu statistici
- Gestionare cereri de credit
- Verificari KYC (aprobare/respingere)
- Director brokeri (upload Excel, cautare)
- Programari (lead management)
- Rapoarte si analytics

## Configurare Multi-Environment

| Mediu | Backend | Frontend | Baza de date |
|---|---|---|---|
| **Development** | `appsettings.Development.json` | `.env.development` | Local SQL Server |
| **Production** | Azure App Settings | `.env.production` | Azure SQL Database |

## Securitate

- JWT authentication cu BCrypt password hashing
- 2 roluri: `Utilizator` si `Administrator`
- Endpoint-uri protejate cu `[Authorize]` si `[Authorize(Roles = "Administrator")]`
- Firebase token verification pentru social login (Google)
- GDPR compliance: consimtaminte explicite, drept la stergere
- CORS configurare stricta per origin
- Rate limiting pe chat AI si OTP

## Testing

```bash
# Rulare teste
dotnet test MoneyShop.Tests/MoneyShop.Tests.csproj --verbosity normal

# 45 teste: unit tests + integration tests
# - ScoringServiceTests (18 tests) — credit scoring logic
# - ApplicationServiceTests (13 tests) — CRUD operations with Moq
# - AccountServiceTests (10 tests) — password hashing & verification
# - EligibilityEngineTests (3 tests) — end-to-end scoring scenarios
```

**Tehnologii testing:** xUnit, Moq, FluentAssertions

## Logging

- **Framework:** Serilog (echivalent SLF4J)
- **Sink-uri:** Console + File (logs separate pentru erori)
- **Nivele:** DEBUG, INFO, WARNING, ERROR
- **Configurare:** `appsettings.json` cu override per environment

## Setup Local

### Prerequisites
- .NET 8 SDK
- Node.js 20+
- SQL Server (local sau Azure)

### Backend
```bash
cd MoneyShop.Api
dotnet restore
dotnet run
# API: https://localhost:7094
```

### Frontend
```bash
cd MoneyShopWeb
npm install
npm run dev
# App: http://localhost:5173
```

### Teste
```bash
dotnet test MoneyShop.Tests/MoneyShop.Tests.csproj
```

## Deployment

- **Backend:** Azure App Service (Linux, .NET 8) — auto-deploy via GitHub Actions
- **Frontend:** Azure Static Web Apps — auto-deploy on push to master
- **Database:** Azure SQL Database
- **CI/CD:** GitHub Actions (build → test → deploy)

**Live:** [https://moneyshop.ro](https://moneyshop.ro)

## API Documentation

Principalele endpoint-uri:

| Metoda | Endpoint | Descriere | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Inregistrare utilizator | Public |
| POST | `/api/auth/login` | Autentificare | Public |
| POST | `/api/auth/social-login` | Login cu Google/Firebase | Public |
| GET | `/api/auth/me` | Utilizator curent | JWT |
| GET | `/api/applications` | Lista cereri credit | JWT |
| POST | `/api/applications` | Cerere noua de credit | JWT |
| GET | `/api/broker/search` | Cautare brokeri | Public |
| POST | `/api/broker/upload-excel` | Upload director brokeri | Admin |
| GET | `/api/BcReport/latest` | Ultimul raport BC | JWT |
| POST | `/api/eligibility/simple` | Calculator eligibilitate | JWT |
| POST | `/api/appointments` | Programare consultanta | Public |
| GET | `/api/kyc/stats` | Statistici KYC | Admin |
| POST | `/api/otp/request` | Trimitere cod OTP | Public |

## Screenshots

### Landing Page
Pagina principala cu simulator de credit, parteneri bancari si formular de contact.

### Dashboard Client
Vizualizare dosare active, scor FICO, date financiare si actiuni rapide.

### Admin Panel
Gestionare cereri, verificari KYC, director brokeri si programari.

## Echipa

- **Eduard Cristea** — Full-stack development, architecture, DevOps

## Licenta

Proiect privat — MONEYSHOP FINTECH S.R.L. Toate drepturile rezervate.
