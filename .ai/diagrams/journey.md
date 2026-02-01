<user_journey_analysis>

- Ścieżki użytkownika wymienione w PRD/specyfikacji:
  1. Gość → Rejestracja
  2. Rejestracja → Weryfikacja email
  3. Gość → Logowanie
  4. Zalogowany → Korzystanie z funkcji (generate, flashcards)
  5. Zapomniałem hasła → Reset hasła
  6. Ustawienia konta → Usunięcie konta
  7. Próba dostępu do chronionej strony bez logowania → redirect do login

- Główne podróże i stany:
  - Niezalogowany (Landing, Login, Register, ForgotPassword)
  - Proces rejestracji (formularz, walidacja, email wysłany)
  - Weryfikacja email (klik link, potwierdzenie)
  - Zalogowany (Dashboard, Generate, Flashcards, Account)
  - Reset hasła (request, link, set new password)
  - Usunięcie konta (confirm, reauth, delete)

- Punkty decyzyjne i alternatywy:
  - Czy email zweryfikowany? (tak → login możliwy; nie → komunikat)
  - Czy token resetu ważny? (tak → reset; nie → poproś o nowy link)
  - Czy user ma uprawnienia do zasobu? (tak → 200; nie → 403/404)

- Krótki opis celu każdego stanu:
  - Login: umożliwić dostęp do chronionych zasobów
  - Register: utworzyć konto i wysłać email weryfik.
  - Verify: potwierdzić adres email i aktywować konto
  - ForgotPassword/Reset: umożliwić odzyskanie dostępu
  - AccountSettings/Delete: zarządzanie i trwałe usunięcie danych
    </user_journey_analysis>

<mermaid_diagram>

```mermaid
stateDiagram-v2
[ * ] --> Landing
Landing --> Login : "Kliknij Zaloguj"
Landing --> Register : "Kliknij Zarejestruj"

state "Proces Rejestracji" as Rejestracja {
  [*] --> FormularzRejestracji
  FormularzRejestracji --> WalidacjaDanych : "Submit"
  WalidacjaDanych --> WyslanieMaila : "Dane OK"
  WyslanieMaila --> OczekiwanieWeryfikacji
  OczekiwanieWeryfikacji --> [*]
}

FormularzRejestracji: Formularz rejestracji (email, hasło, potw.)
note right of FormularzRejestracji
  Walidacja Zod: email, min length 10,
  potwierdzenie hasła.
end note

WeryfikacjaEmail --> Login : "Email zweryfikowany"
WeryfikacjaEmail --> FormularzRejestracji : "Błąd / link wygasł"

Login --> ForgotPassword : "Zapomniałeś hasła?"
ForgotPassword --> EmailWyslany : "Wyślij link"
EmailWyslany --> ResetPassword : "Kliknij w link z maila"
ResetPassword --> Login : "Hasło zmienione"

state "Zalogowany" as Zalogowany {
  [*] --> Dashboard
  Dashboard --> Generate : "Przejdź do generowania"
  Dashboard --> Flashcards : "Moje fiszki"
  Dashboard --> AccountSettings : "Ustawienia konta"
}

AccountSettings --> DeleteAccount : "Usuń konto"
DeleteAccount --> ConfirmReauth : "Potwierdź hasłem"
ConfirmReauth --> AccountDeleted : "Usunięto konto"
AccountDeleted --> Landing

Login --> Zalogowany : "Prawidłowe dane"
Login --> Login : "Błąd (pokaż komunikat)"

[*] --> Landing
```

</mermaid_diagram>
