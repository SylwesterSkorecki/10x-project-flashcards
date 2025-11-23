# Dokument wymagań produktu (PRD) - SmartFlash
## 1. Przegląd produktu
SmartFlash to aplikacja webowa umożliwiająca szybkie tworzenie wysokiej jakości fiszek edukacyjnych z wykorzystaniem AI. Użytkownik może generować kandydatów na fiszki na podstawie wprowadzonego tekstu (0–10000 znaków) oraz ręcznie dodawać własne fiszki. System zapewnia funkcje CRUD dla fiszek, prosty system kont użytkowników oraz integrację z gotowym algorytmem spaced repetition.

## 2. Problem użytkownika
Manualne tworzenie fiszek jest czasochłonne i monotonny proces, co prowadzi do niskiego zaangażowania i rzadkiego stosowania metody spaced repetition. Użytkownicy potrzebują wygodnego mechanizmu szybkiego generowania i zarządzania fiszkami.

## 3. Wymagania funkcjonalne
- generowanie kandydatów na fiszki przez AI na podstawie wprowadzonego tekstu (limit 0–10000 znaków), SLA < 30 s
- recenzja kandydatów: akceptacja, edycja lub odrzucenie; zaakceptowane zapisują się w bazie
- ręczne dodawanie fiszek (pole front ("przód") ≤ 200 znaków, pole back (tył) ≤ 500 znaków)
- lista fiszek z wyszukiwarką i paginacją (20 elementów na stronę)
- edycja i dodawanie fiszek w modalach
- usuwanie fiszek z potwierdzeniem
- system użytkowników: rejestracja, weryfikacja e-mail, logowanie, reset hasła, usunięcie konta
- autoryzacja i RLS: każdy użytkownik widzi i modyfikuje tylko swoje fiszki
- walidacja długości pól po stronie klienta i serwera
- logowanie zdarzeń generowania AI (ID użytkownika, czas, liczba kandydatów, czasy odpowiedzi)
- retry i back-off przy błędach API OpenAI
- przechowywanie i skalowalność: dane o fiszkach i użytkwonikach przechowywane w sposób zapewniający skalowalność i bezpieczeństwo,
- Statystyki generowania fiszek: zbieranie informacji o tym, ile fiszek zostało wygenerowanych przez AI i ile z nich ostatecznie zaakceptowano,
- wymagania prawne i ograniczenia:
    - dane osobowe użytkowników i fiszek przechowywane zgodnie z RODO,
    - prawo do wglądu i usunięcia dancyh (konto warz z fiszkami) na wniosek użytkownika

## 4. Granice produktu
- brak własnego algorytmu spaced repetition (korzystanie z istniejącego)
- brak importu wielu formatów (PDF, DOCX itp.)
- brak współdzielenia zestawów między użytkownikami
- brak integracji z zewnętrznymi platformami edukacyjnymi
- brak aplikacji mobilnych (tylko web)
- brak CI/CD w MVP

## 5. Historyjki użytkowników
- ID: US-001
  tytuł: Generowanie kandydatów na fiszki
  opis: jako student chcę wkleić tekst (1000–10000 znaków) i uruchomić generowanie, by otrzymać propozycje fiszek przed zapisaniem
  kryteria akceptacji:
  - po kliknięciu przycisku generuj wyświetlane są maksymalnie n kandydatów w czasie < 30 s
  - pole tekstowe pokazuje aktualną liczbę znaków i blokuje wprowadzanie powyżej 10000
  - gdy przekroczono limit, wyświetlany jest komunikat o błędzie

- ID: US-002
  tytuł: Recenzja kandydatów AI
  opis: jako student chcę akceptować, edytować lub odrzucać każdą propozycję fiszki, by kontrolować jakość
  kryteria akceptacji:
  - przy każdej propozycji dostępne są opcje akceptuj, edytuj, odrzuć
  - edycja otwiera modal z polami front i back
  - odrzucone propozycje znikają z listy

- ID: US-003
  tytuł: Zapisanie zaakceptowanych fiszek
  opis: jako student chcę zapisać zaakceptowane propozycje, by mieć do nich późniejszy dostęp
  kryteria akceptacji:
  - po zatwierdzeniu za pomocą przycisku zapisuje wszystkie zaakceptowane fiszki
  - lista zapisanych fiszek aktualizuje się automatycznie

- ID: US-004
  tytuł: Ręczne dodawanie fiszki
  opis: jako student chcę ręcznie utworzyć fiszkę, podając front i back, by dodać indywidualną fiszkę
  kryteria akceptacji:
  - formularz w formie modalu
  - formularz waliduje długość pól: front ≤ 200, back ≤ 500
  - po zatwierdzeniu fiszka pojawia się na liście

- ID: US-005
  tytuł: Przeglądanie listy fiszek
  opis: jako student chcę zobaczyć moją listę zapisanych fiszek, by przeglądać swoje zestawy
  kryteria akceptacji:
  - lista wyświetla w formie tabeli listę fiszek wraz z polami przód i tył

- ID: US-006
  tytuł: Wyszukiwanie i paginacja fiszek
  opis: jako student chcę filtrować fiszki po słowach kluczowych i przeglądać strony (20/stronę), by szybko znaleźć konkretną fiszkę
  kryteria akceptacji:
  - paginacja działa poprawnie z 20 elementami na stronę

- ID: US-007
  tytuł: Edycja fiszki
  opis: jako student chcę edytować front lub back istniejącej fiszki w modalach, by korygować treść
  kryteria akceptacji:
  - na liście moich fiszek kliknięcie edytuj otwiera modal z aktualnymi polami
  - zmiany zapisywane są po kliknięciu zapisz i widoczne na liście

- ID: US-008
  tytuł: Usuwanie fiszki
  opis: jako student chcę usuwać fiszki z potwierdzeniem, by usuwać zbędne elementy
  kryteria akceptacji:
  - na liście moich fiszek znajduje się przycisk po kliknięciu którego pojawia się okno potwierdzenia
  - potwierdzenie usuwa fiszkę i aktualizuje listę

- ID: US-009
  tytuł: Rejestracja użytkownika
  opis: jako nowy użytkownik chcę założyć konto, podając e-mail i hasło, by przechowywać moje fiszki
  kryteria akceptacji:
  - formularz waliduje format e-mail i minimalną długość hasła (10 znaków)
  - po wysłaniu formularza system wysyła wiadomość weryfikacyjną

- ID: US-010
  tytuł: Weryfikacja e-mail
  opis: jako użytkownik chcę potwierdzić mój adres e-mail, by aktywować konto
  kryteria akceptacji:
  - link w wiadomości prowadzi do strony potwierdzenia
  - po kliknięciu konto zostaje oznaczone jako zweryfikowane

- ID: US-011
  tytuł: Logowanie
  opis: jako użytkownik chcę się zalogować, by uzyskać dostęp do moich fiszek
  kryteria akceptacji:
  - formularz waliduje e-mail oraz hasło
  - poprawne dane przekierowują do pulpitu z listą fiszek

- ID: US-012
  tytuł: Resetowanie hasła
  opis: jako użytkownik chcę zresetować hasło, gdy je zapomnę, by odzyskać dostęp
  kryteria akceptacji:
  - wysłanie linku resetującego na zarejestrowany e-mail
  - link pozwala ustawić nowe hasło

- ID: US-013
  tytuł: Usunięcie konta
  opis: jako użytkownik chcę usunąć konto po potwierdzeniu hasłem, by usunąć moje dane
  kryteria akceptacji:
  - system wymaga ponownego podania hasła
  - po potwierdzeniu konto i wszystkie fiszki zostają usunięte

- ID: US-014
  tytuł: Bezpieczny dostęp i autoryzacja
  opis: jako użytkownik chcę, by tylko ja miał dostęp do moich fiszek, by nikt inny nie mógł ich zobaczyć ani edytować
  kryteria akceptacji:
  - próba dostępu do endpointu API z cudzym ID zwraca kod 403
  - interfejs nie pokazuje opcji edycji/usuwania obcych fiszek

- ID: US-015
  tytuł: Obsługa błędów generowania AI
  opis: jako student chcę być informowany o błędach API i mieć możliwość ponowienia próby, by dokończyć zadanie
  kryteria akceptacji:
  - w razie błędu wyświetlany jest czytelny komunikat
  - dostępna jest opcja ponowienia akcji z retry/back-off

- ID: US-016
  tytuł: Walidacja długości pól
  opis: jako student chcę, by długość front/back była wymuszana, by uniknąć błędów po stronie serwera
  kryteria akceptacji:
  - klient uniemożliwia wpisanie wartości poza limitami
  - serwer odrzuca nieprawidłowe żądania z kodem 400

- ID: US-017
  tytuł: Sesja nauki z algorytmem powtórek
  opis: jako zalogowany użytkownik chcę, aby dodane fiszki były dostępne w widoku "Sesja nauki" opartym na zewnętrznym algorytmie, aby móc efektywnie się uczyć (space repetition).
  kryteria akceptacji:
  - W widoku "Sesja nauki" algorytm przygotowuje dla mnie sesję nauki fiszek,
  - Na start wyświetlany jest przód fiszki, poprzez interakcję użytkownik wyświetla jej tył,
  - Użytkownik ocenia zgodnie z oczekiwaniami algorytmu na ile przyswoił fiszkę,
  - Następnie algorytm pokazuje kolejną fiszkę w ramach sesji nauki

## 6. Metryki sukcesu
1. Efektywność generowania fiszek:
    - 75% wygenerowanych przez AI fiszek jest akceptowanych przez użytkownika.
    - Użytkownicy tworzą co najmniej 75% fiszek z wykorzystaniem AI (w stosunku do wszystkich nowo dodanych fiszek)
2. Zaangażowanie:
    - Monitorowanie liczby wygenerowanych fiszek i porównanie z liczbą zatwierdzonych do analizy jakości i użyteczności
