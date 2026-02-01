<authentication_analysis>
- Wypisane przepływy autentykacji:
  1) Rejestracja (signUp)
  2) Weryfikacja e-mail (link z Supabase)
  3) Logowanie (signInWithPassword)
  4) Reset hasła (resetPasswordForEmail + updateUser)
  5) Wylogowanie (signOut)
  6) Usunięcie konta (DELETE /api/account z admin key)
  7) Dostęp do chronionych stron (auth guard + redirect)
  8) Zarządzanie sesją i odświeżanie tokenu (access/refresh)

- Główni aktorzy i interakcje:
  - Przeglądarka (Browser) — formularze, kliknięcia linków, żądania
  - Middleware — tworzy per-request Supabase client, czyta cookies/header
  - Astro API / SSR pages — strony serwera (redirecty, render)
  - Supabase Auth — generowanie tokenów, weryfikacja, email, RLS

- Procesy weryfikacji i odświeżania tokenów:
  - Access token (JWT) ma krótkie TTL (np. 1h), refresh token dłuższy
  - SDK Supabase automatycznie odświeża access token gdy możliwe
  - Middleware odczytuje token z cookies lub Authorization header
  - Przy wygaśnięciu refresh token wymagana ponowna autoryzacja

- Krótki opis kroków autentykacji:
  1. Rejestracja: Browser -> SupabaseAuth signUp -> email weryfik.
  2. Weryfikacja: Klik link -> SSR sprawdza status -> redirect.
  3. Logowanie: Browser -> SupabaseAuth signIn -> SDK zapisuje sesję.
  4. Sesja SSR: Middleware odczytuje cookies -> getUser -> locals.user.
  5. Odświeżanie: SDK używa refresh token gdy access wygasł.
  6. Reset hasła: Browser -> SupabaseAuth resetPasswordForEmail -> link -> reset.
  7. Wylogowanie: Browser -> SupabaseAuth signOut -> redirect.
</authentication_analysis>

<mermaid_diagram>
```mermaid
sequenceDiagram
autonumber
participant Browser
participant Middleware
participant AstroAPI as "Astro API"
participant SupabaseAuth as "Supabase Auth"

activate Browser
Browser->>SupabaseAuth: signUp(email, password)
activate SupabaseAuth
SupabaseAuth->>SupabaseAuth: create user
SupabaseAuth->>SupabaseAuth: send verify email
SupabaseAuth-->>Browser: signUp result (ok / error)
deactivate SupabaseAuth

alt Kliknięcie linku weryfikacyjnego
  Browser->>AstroAPI: verify-email request (token)
  activate AstroAPI
  AstroAPI->>Middleware: init supabase client
  activate Middleware
  Middleware->>SupabaseAuth: getUser() / validate token
  activate SupabaseAuth
  SupabaseAuth-->>Middleware: token OK / error
  deactivate SupabaseAuth
  Middleware-->>AstroAPI: user verified / error
  deactivate Middleware
  AstroAPI-->>Browser: redirect to login (email_verified)
  deactivate AstroAPI
else Weryfikacja nie powiodła się
  Browser->>AstroAPI: verify-email request (token)
  AstroAPI-->>Browser: show verification error
end

Browser->>SupabaseAuth: signInWithPassword(email, password)
activate SupabaseAuth
SupabaseAuth-->>Browser: accessToken + refreshToken
deactivate SupabaseAuth

Browser->>AstroAPI: protected SSR request (cookies)
activate AstroAPI
AstroAPI->>Middleware: createServerClient (cookies/header)
activate Middleware
Middleware->>SupabaseAuth: auth.getUser() (verify token)
activate SupabaseAuth
SupabaseAuth-->>Middleware: user data OR token expired
deactivate SupabaseAuth

alt Token wygasł, refresh możliwy
  Middleware->>SupabaseAuth: refresh with refresh token
  activate SupabaseAuth
  SupabaseAuth-->>Middleware: new accessToken
  deactivate SupabaseAuth
  Middleware-->>AstroAPI: set locals.user
  AstroAPI->>AstroAPI: proceed
else Odświeżanie nie powiodło się
  Middleware-->>Browser: redirect to login (returnTo)
end
deactivate Middleware
deactivate AstroAPI

par Reset hasła - żądanie linku
  Browser->>SupabaseAuth: resetPasswordForEmail(email)
  activate SupabaseAuth
  SupabaseAuth-->>Browser: confirmation email sent
  deactivate SupabaseAuth
and Reset hasła - kliknięcie linku
  Browser->>AstroAPI: reset-password request (token)
  activate AstroAPI
  AstroAPI->>Middleware: getUser() (recovery token)
  activate Middleware
  Middleware->>SupabaseAuth: validate recovery token
  activate SupabaseAuth
  SupabaseAuth-->>Middleware: session established
  deactivate SupabaseAuth
  Middleware-->>AstroAPI: allow reset form
  deactivate Middleware
  deactivate AstroAPI
end

Browser->>SupabaseAuth: signOut()
activate SupabaseAuth
SupabaseAuth-->>Browser: session cleared
deactivate SupabaseAuth
Browser-->>AstroAPI: redirect to login (logged_out)

Note over Browser,Middleware: Middleware handles cookies,<br/>Authorization header and sets locals.user

deactivate Browser
```
</mermaid_diagram>

