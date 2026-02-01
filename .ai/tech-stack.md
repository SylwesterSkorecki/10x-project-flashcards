Frontend - Astro z React dla komponentów interaktywnych:

- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:

- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami przez usługę Openrouter.ai:

- Dostęp do szerokiej gamy modeli (OpenAI, Anthropic, Google i wiele innych), które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API

Testowanie:

- Vitest jako test runner dla testów jednostkowych i integracyjnych - szybszy niż Jest, kompatybilny z Vite/Astro, wsparcie dla TypeScript out of the box
- React Testing Library do testowania komponentów React - testowanie zachowania, nie implementacji
- Playwright do testów E2E - automatyzacja przeglądarki, wsparcie dla wielu przeglądarek (Chromium, Firefox, WebKit), screenshot i video recording przy błędach
- MSW (Mock Service Worker) do mockowania API calls (OpenRouter, Supabase)
- Supabase CLI do lokalnego środowiska testowego z PostgreSQL w Docker

CI/CD i Hosting:

- Github Actions do tworzenia pipeline'ów CI/CD
- DigitalOcean do hostowania aplikacji za pośrednictwem obrazu docker
