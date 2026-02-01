<architecture_analysis>
- Komponenty wymienione w PRD/specyfikacji:
  - Strony Astro: login, register, forgot-password, reset-password,
    verify-email, account/settings, generate, index
  - Komponenty React: LoginForm, RegisterForm, ForgotPasswordForm,
    ResetPasswordForm, AccountSettings, Navigation
  - Serwisy: auth.service, supabase.client
  - Middleware: /src/middleware/index.ts (locals.supabase, locals.user)

- Główne strony i odpowiadające komponenty:
  - /auth/login -> LoginForm
  - /auth/register -> RegisterForm
  - /auth/forgot-password -> ForgotPasswordForm
  - /auth/reset-password -> ResetPasswordForm
  - /account/settings -> AccountSettings
  - Layout -> Navigation (renders based on isAuthenticated)

- Przepływ danych między komponentami:
  - Layout SSR pobiera locals.user i przekazuje props do Navigation
  - Formularze wywołują auth.service / supabaseClient bezpośrednio
  - Middleware udostępnia supabase client per request

- Krótki opis funkcjonalności komponentów:
  - LoginForm: walidacja, signInWithPassword, obsługa błędów
  - RegisterForm: walidacja, signUp, informacja o emailu weryfik.
  - Navigation: show links based on auth state, signOut
  - AccountSettings: reauth + delete account flow
</architecture_analysis>

<mermaid_diagram>
```mermaid
flowchart TD
  subgraph "Strony SSR"
    Index["Index (Landing)"]
    Generate["Generate (chroniona)"]
    LoginPage["/auth/login"]
    RegisterPage["/auth/register"]
    ForgotPage["/auth/forgot-password"]
    ResetPage["/auth/reset-password"]
    VerifyPage["/auth/verify-email"]
    AccountSettingsPage["/account/settings"]
  end

  subgraph "UI - Komponenty React"
    LoginForm[LoginForm]
    RegisterForm[RegisterForm]
    ForgotForm[ForgotPasswordForm]
    ResetForm[ResetPasswordForm]
    AccountSettings[AccountSettings]
    Navigation[Navigation]
  end

  subgraph "Serwisy i Middleware"
    SupabaseClient["supabaseClient / auth.service"]
    Middleware["Middleware (locals.supabase, locals.user)"]
  end

  subgraph "Backend-as-a-Service"
    SupabaseAuth[Supabase Auth]
    Database[(Postgres + RLS)]
  end

  LoginPage --> LoginForm
  RegisterPage --> RegisterForm
  ForgotPage --> ForgotForm
  ResetPage --> ResetForm
  AccountSettingsPage --> AccountSettings

  Navigation -->|props| Index
  Index -->|nav| Navigation

  LoginForm -->|calls| SupabaseClient
  RegisterForm -->|calls| SupabaseClient
  ForgotForm -->|calls| SupabaseClient
  ResetForm -->|calls| SupabaseClient
  AccountSettings -->|calls| SupabaseClient

  Middleware -->|provides client| SupabaseClient
  SupabaseClient -->|auth ops| SupabaseAuth
  SupabaseAuth -->|stores data| Database

  Generate -->|auth guard| Middleware
  AccountSettingsPage -->|auth guard| Middleware

  classDef service fill:#f3f4f6,stroke:#333,stroke-width:1px;
  class SupabaseClient,Middleware service;
```
</mermaid_diagram>

