# CI/CD Setup Guide - GitHub Actions

Ten dokument opisuje konfigurację CI/CD dla projektu z wykorzystaniem GitHub Actions.

## Utworzone Workflow

### 1. Podstawowy Workflow - `ci.yml` ✅

**Status**: Aktywny i gotowy do użycia

**Co robi**:
- Uruchamia się przy każdym push i pull request
- Sprawdza kod linterem
- Buduje projekt
- Uruchamia testy jednostkowe

**Kiedy się uruchamia**:
- Push na branch: `main`, `master`, `develop`, `feature/**`
- Pull Request do: `main`, `master`, `develop`

**Czas wykonania**: ~2-3 minuty

### 2. Zaawansowany Workflow - `ci-advanced.yml.example` 📋

**Status**: Przykład do aktywacji w przyszłości

**Co robi dodatkowo**:
- Dzieli zadania na osobne joby (lint, testy, build, e2e)
- Generuje raporty coverage
- Uruchamia testy E2E z Playwright
- Zapisuje artefakty (build, raporty)

## Jak to działa

### Podstawowy Workflow (ci.yml)

```yaml
1. Checkout kodu
2. Instalacja Node.js 22.14.0
3. Instalacja zależności (npm ci)
4. Linting
5. Build
6. Testy jednostkowe
```

### Kiedy workflow NIE przejdzie

Workflow zakończy się błędem jeśli:
- ❌ Linter wykryje błędy w kodzie
- ❌ Build się nie powiedzie
- ❌ Którykolwiek test jednostkowy nie przejdzie

## Konfiguracja w GitHub

### Krok 1: Commit i Push workflow

```bash
git add .github/workflows/ci.yml
git commit -m "chore: add CI/CD workflow"
git push
```

### Krok 2: Sprawdź status w GitHub

1. Przejdź do repozytorium na GitHub
2. Kliknij zakładkę "Actions"
3. Zobaczysz uruchomiony workflow
4. Możesz kliknąć na niego aby zobaczyć szczegóły

### Krok 3: Badge w README (opcjonalnie)

Dodaj badge do `README.md`:

```markdown
![CI/CD Pipeline](https://github.com/TWÓJ_USERNAME/NAZWA_REPO/workflows/CI%2FCD%20Pipeline/badge.svg)
```

## Rozbudowa o E2E (opcjonalnie)

Jeśli chcesz dodać testy E2E:

### 1. Dodaj secrets w GitHub

Settings → Secrets and variables → Actions → New repository secret:

- `SUPABASE_URL`: URL twojej bazy Supabase
- `SUPABASE_ANON_KEY`: Klucz anon z Supabase

### 2. Aktywuj zaawansowany workflow

```bash
mv .github/workflows/ci-advanced.yml.example .github/workflows/ci-advanced.yml
# Opcjonalnie usuń podstawowy workflow
rm .github/workflows/ci.yml
```

### 3. Commit i push

```bash
git add .github/workflows/
git commit -m "chore: enable advanced CI/CD with E2E tests"
git push
```

## Lokalne testowanie przed pushem

Zawsze możesz przetestować lokalnie przed pushem:

```bash
# Linting
npm run lint

# Build
npm run build

# Testy jednostkowe
npm test

# (Opcjonalnie) Testy E2E
npm run test:e2e
```

## Troubleshooting

### Problem: Workflow nie uruchamia się

**Rozwiązanie**: 
- Sprawdź czy plik jest w `.github/workflows/`
- Upewnij się że ma rozszerzenie `.yml` (nie `.example`)
- Sprawdź czy jesteś na właściwym branchu

### Problem: Testy E2E nie działają

**Rozwiązanie**:
- Sprawdź czy dodałeś secrets w GitHub
- Upewnij się że nazwy secrets są poprawne
- Sprawdź logi Playwright w Actions

### Problem: Build trwa bardzo długo

**Rozwiązanie**:
- Używamy `npm ci` (szybsze niż `npm install`)
- Cache dla node_modules jest włączony
- Czas: 2-3 min dla podstawowego, 5-7 min dla zaawansowanego

## Najlepsze praktyki

1. **Zawsze uruchamiaj testy lokalnie przed pushem**
2. **Nie commituj kodu z błędami lintera**
3. **Sprawdzaj status workflow na GitHub Actions**
4. **Testy E2E uruchamiaj tylko gdy są potrzebne (wolniejsze)**
5. **Dodaj protection rules dla main/master (wymagaj przejścia CI)**

## Protection Rules (Rekomendowane)

Settings → Branches → Add branch protection rule:

- Branch name pattern: `main` lub `master`
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- Select: `Build & Test` (lub inne joby)

To wymusi przejście CI przed merge PR.

## Przydatne linki

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Playwright CI](https://playwright.dev/docs/ci)
