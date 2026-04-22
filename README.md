# Focus Flow

Een mobiele en desktopvriendelijke webapp voor dagelijkse stemming, taken en structuur. De app werkt lokaal in de browser en ondersteunt aparte prive- en werkmodi.

## Huidige MVP-basis

- Dagelijkse check-in met 5 kleuren van rood naar groen
- Maand- en jaaroverzicht voor stemming
- Werk- en priveprofiel met eigen taken en stemming
- Taken toevoegen, afvinken, verwijderen en belangrijk markeren
- Afgeronde taken automatisch onderaan tonen
- Spraak-naar-taak via browser speech recognition wanneer ondersteund, met eenvoudige slimme parsing
- Quick capture mindmap met losse kaarten die je kunt slepen en koppelen
- Acties vanuit taken en ideeën naar agenda, mail of kopietekst voor je wekker
- Export en import van appdata als JSON
- Mindfulness-audio lokaal opslaan en in de app afspelen
- Dashboard met focus, statistieken en werk/prive-afstemming
- Prototype-tab `Sociaal` voor gedeelde doelstellingen, volgers en accountability

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run social-api`

## Sociaal prototype

- Frontend-tab `Sociaal` toont gedeelde routines, streaks en volgers
- Prototype-backend luistert lokaal op `http://localhost:8787`
- Vite proxyt `/api` in development automatisch door naar deze backend
- API-routes:
	- `GET /api/health`
	- `GET /api/social-goals`
	- `POST /api/social-goals`
	- `POST /api/social-goals/:id/progress`

## Eenvoudigste hosting-aanpak

- Frontend hosten op Vercel of Netlify
- Voor echte gedeelde doelen en volgers is een online datastore nodig
- Praktisch eenvoudig pad: frontend op Vercel + database/auth op Supabase
- Deze repo bevat alvast een kleine Node-prototype om de API-vorm en UI te testen
