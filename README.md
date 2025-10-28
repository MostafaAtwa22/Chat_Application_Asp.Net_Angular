# Chat Application

Lightweight real-time chat application with an ASP.NET Core API backend and an Angular client. Uses SignalR for WebSocket messaging and Entity Framework Core for persistence.

---

## Table of contents

- [Project overview](#project-overview)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Configuration / Environment variables](#configuration--environment-variables)
- [Run locally (development)](#run-locally-development)
  - [Backend (API)](#backend-api)
  - [Frontend (Client)](#frontend-client)
- [Database / Migrations / Seeding](#database--migrations--seeding)
- [SignalR usage (client example)](#signalr-usage-client-example)
- [Build for production & deployment](#build-for-production--deployment)
- [Docker (optional)](#docker-optional)
- [CI / CD (example)](#ci--cd-example)
- [Testing](#testing)
- [Contributing](#contributing)
- [Troubleshooting & common issues](#troubleshooting--common-issues)
- [License](#license)

---

## Project overview

This project demonstrates a full-stack chat application:

- API: ASP.NET Core + SignalR + EF Core
- Client: Angular (TypeScript) single-page app
- Realtime messaging handled with SignalR hubs located in `API/Hubs`
- Client production build is served from `API/wwwroot` when deployed

---

## Repository layout

- `Chat_Application.sln` — Visual Studio solution
- `API/` — ASP.NET Core backend
  - `API/Program.cs`, `API/Startup.cs` (if present)
  - `API/Hubs/` — SignalR hub implementations
  - `API/Services/` — business logic and helpers
  - `API/Migrations/` — EF migrations
  - `API/wwwroot/` — static files (production client)
- `Client/` — Angular frontend (`package.json`, `angular.json`, `src/`)

---

## Prerequisites

- .NET SDK 6+ (match `API/API.csproj`)
- Node.js 16+ and npm/yarn
- Angular CLI (optional): `npm i -g @angular/cli`
- (Optional) Docker and Docker Compose for containerized runs

---

## Configuration / Environment variables

Typical settings (backend):

- `ASPNETCORE_ENVIRONMENT` (Development/Production)
- `ConnectionStrings__DefaultConnection` — EF Core DB connection string
- `JWT__Key` — secret for JWT (if authentication used)
- `CLIENT_URL` — allowed client origin during development

Example `appsettings.Development.json` snippet:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=ChatAppDev;Trusted_Connection=True;"
  },
  "Jwt": {
    "Key": "replace_with_strong_secret"
  },
  "AllowedHosts": "*"
}
```

Frontend environment:
- `Client/src/environments/environment.ts` and `environment.prod.ts` — set API base URL and SignalR hub url.

---

## Run locally (development)

From repo root:

Backend:
```powershell
cd "d:\programming\Full-stack projects\Chat_Application\API"
dotnet restore
dotnet build
dotnet run
# API default url from launchSettings (usually https://localhost:5001 or http://localhost:5000)
```

Frontend:
```powershell
cd "d:\programming\Full-stack projects\Chat_Application\Client"
npm install
npm start         # or: ng serve --proxy-config proxy.conf.json --open
```

Use a proxy config (example `proxy.conf.json`) to forward API calls to the backend during dev:
```json
{
  "/api": {
    "target": "https://localhost:5001",
    "secure": false,
    "changeOrigin": true
  },
  "/hubs": {
    "target": "https://localhost:5001",
    "secure": false,
    "changeOrigin": true,
    "ws": true
  }
}
```

---

## Database / Migrations / Seeding

From API project folder:
```powershell
cd "d:\programming\Full-stack projects\Chat_Application\API"
dotnet ef migrations add InitialCreate
dotnet ef database update
```

If seeding is implemented, call the seed routine on startup (check `Program.cs` or `Startup.cs`).

---

## SignalR usage (client example)

Example connecting from Angular / plain JS to a SignalR hub at `/hubs/chat`:

```ts
import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("/hubs/chat") // or full url during dev: https://localhost:5001/hubs/chat
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

connection.on("ReceiveMessage", (message) => {
  console.log("message", message);
});

await connection.start();
await connection.invoke("JoinRoom", "room-id");
```

Check `API/Hubs/ChatHub.cs` for server-side method names and event names.

---

## Build for production & deployment

1. Build client:
```powershell
cd "d:\programming\Full-stack projects\Chat_Application\Client"
npm run build -- --configuration production
```

2. Copy client build files to API/wwwroot:
- `Client/dist/<app-name>/*` -> `API/wwwroot/`

3. Publish API:
```powershell
cd "d:\programming\Full-stack projects\Chat_Application\API"
dotnet publish -c Release -o publish
# deploy 'publish' folder to your host (Azure, Docker image, etc.)
```

---

## Docker (optional)

Example minimal `docker-compose.yml` (place at repo root):

```yaml
version: "3.8"
services:
  api:
    build:
      context: ./API
    ports:
      - "5000:80"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
  db:
    image: mcr.microsoft.com/mssql/server:2019-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong!Passw0rd
    ports:
      - "1433:1433"
```

Adapt to your DB engine and volumes for persistence.

---

## CI / CD (example)

A simple GitHub Actions workflow to build and test:

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '7.x'
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: dotnet build ./API/Chat_Application.sln --configuration Release
      - run: |
          cd Client
          npm ci
          npm run build --if-present
```

Add tests and publish steps as needed.

---

## Testing

- Run .NET tests (if present):
```powershell
dotnet test
```
- Frontend tests:
```powershell
cd Client
npm test
```

---

## Contributing

- Follow Conventional Commits: feat, fix, docs, style, refactor, test, chore.
- Open a PR; include description and testing steps.
- Lint and run unit tests before pushing.

Suggested commit message format:
```
feat(chat): <short description>

<detailed description, context, and note about breaking changes if any>
```

---

## Troubleshooting & common issues

- CORS / SignalR fails to connect: ensure backend allows the client origin and websockets are enabled; verify proxy config during dev.
- SSL issues in dev: use `secure: false` in proxy or trust dev certificate (`dotnet dev-certs https --trust`).
- EF Core migrations fail: check connection string and database permissions.

---

## License

Specify your license (e.g., MIT) or add a `LICENSE` file in repo root.

---

If you want, I can:
- Add the README file to the repository now,
- Create example `proxy.conf.json`, `proxy` npm script, or Docker files,
- Generate a GitHub Actions workflow file.
