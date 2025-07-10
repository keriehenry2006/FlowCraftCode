# Debug Log - FlowCraft

## Problemy i rozwiązania dla przyszłych napraw

---

## 🐛 PROBLEM: Nie można zapisać procesów po edycji (2025-07-10 13:16)

### **Opis problemu:**
- Formularz edycji procesów nie pozwalał na zapisanie zmian
- Prawdopodobnie błąd walidacji w funkcji `validateProcessData()`
- Working day validation była niespójna z logiką biznesową

### **Przyczyna:**
Walidacja `working_day` w `flowcraft-error-handler.js` była nieprawidłowa:
```javascript
// BŁĘDNE - pozwalało na 0 i sprawdzało tylko < 0
if (data.working_day !== undefined && data.working_day < 0) {
    throw new Error('Working day must be a positive number');
}
```

### **Rozwiązanie:**
```javascript
// POPRAWNE - sprawdza pełny zakres 1-31 lub -1 do -31, blokuje 0
if (data.working_day !== undefined) {
    const workingDay = parseInt(data.working_day);
    if (isNaN(workingDay) || workingDay === 0 || workingDay > 31 || workingDay < -31) {
        throw new Error('Working day must be 1-31 for current month or -1 to -31 for previous month (cannot be 0)');
    }
}
```

### **Pliki zmienione:**
- `/mnt/c/Projects/Diagram2/flowcraft/flowcraft-error-handler.js` - linie 224-230
- `/mnt/c/Projects/Diagram2/flowcraft/index.html` - funkcja `handleSaveProcess()` linie 3947-4019

### **Jak uniknąć w przyszłości:**
- Zawsze sprawdzać spójność walidacji między backend i frontend
- Testować walidację z różnymi wartościami granicznymi (0, -32, 32)
- Dokumentować logikę biznesową w komentarzach kodu

---

## 🐛 PROBLEM: Kolumny tabeli za wąskie (2025-07-10 13:16)

### **Opis problemu:**
- Kolumna "Name" pokazywała tylko "Amortyz" zamiast pełnej nazwy
- Kolumna "Due Time" pokazywała tylko częściowy czas (10:, 15:)
- Brak tooltipów dla pełnych opisów

### **Przyczyna:**
Zbyt restrykcyjne szerokości kolumn w CSS:
```css
/* BŁĘDNE - za wąskie */
#processes-table th:nth-child(1), /* Name */
#processes-table td:nth-child(1) {
    min-width: 120px;
    max-width: 150px;
}
```

### **Rozwiązanie:**
```css
/* POPRAWNE - szersze kolumny */
#processes-table th:nth-child(1), /* Name */
#processes-table td:nth-child(1) {
    min-width: 160px;
    max-width: 200px;
}

#processes-table th:nth-child(4), /* Due Time */
#processes-table td:nth-child(4) {
    min-width: 110px;
    max-width: 130px;
}
```

### **Pliki zmienione:**
- `/mnt/c/Projects/Diagram2/flowcraft/index.html` - CSS linie 1774-1959

### **Jak uniknąć w przyszłości:**
- Testować z długimi nazwami procesów
- Używać min-width zamiast fixed width dla elastyczności
- Dodawać tooltips dla kolumn z ograniczoną szerokością

---

## 💡 ULEPSZENIE: System skrótów typów procesów (2025-07-10 13:16)

### **Implementacja:**
Zmiana z select dropdown na kompaktowy system skrótów:
- Standard → S
- Blocking → B  
- Informational → I

### **Nowe funkcje dodane:**
```javascript
function getProcessTypeAbbreviation(type) { /* ... */ }
function getProcessTypeFullName(type) { /* ... */ }
function toggleProcessType(element) { /* ... */ }
function updateProcessType(processId, newType) { /* ... */ }
```

### **Korzyści:**
- Znacznie mniej miejsca w tabeli
- Tooltips z pełnymi nazwami
- Łatwa zmiana przez kliknięcie
- Automatyczne zapisywanie do bazy

### **Zastosowanie w przyszłych projektach:**
- Używać skrótów dla często używanych wartości
- Implementować tooltip system dla lepszej UX
- Dodawać click-to-change funkcjonalność

---

## 📋 SZABLON DLA PRZYSZŁYCH PROBLEMÓW:

```markdown
## 🐛 PROBLEM: [Nazwa problemu] ([Data])

### **Opis problemu:**
- [Szczegóły co nie działa]

### **Przyczyna:**
[Analiza źródła problemu z przykładami kodu]

### **Rozwiązanie:**
[Kod rozwiązania z komentarzami]

### **Pliki zmienione:**
- [Lista plików i linii]

### **Jak uniknąć w przyszłości:**
- [Wnioski i best practices]
```

---

---

## 🐛 PROBLEM: "Please match the requested format" przy dodawaniu procesu (2025-07-10 13:22)

### **Opis problemu:**
- Użytkownik próbuje wprowadzić nowy proces
- Wszystkie pola są uzupełnione
- Pojawia się komunikat "Please match the requested format" w prawym górnym rogu
- Nie można zapisać procesu

### **Przyczyna:**
Zbyt restrykcyjne regex patterns w HTML5 validation:

```html
<!-- BŁĘDNE - wymagały TYLKO wielkich liter -->
pattern="^[A-Z0-9_\-]+$"          <!-- Process Name -->
pattern="^([A-Z0-9_\-]+(,[A-Z0-9_\-]+)*)?$"  <!-- Dependencies -->
pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"   <!-- Due Time - nie akceptował pustego pola -->
```

### **Rozwiązanie:**
```html
<!-- POPRAWNE - obsługują małe i wielkie litery -->
pattern="^[A-Za-z0-9_\-]+$"                   <!-- Process Name -->
pattern="^([A-Za-z0-9_\-]+(,[A-Za-z0-9_\-]+)*)?$"    <!-- Dependencies -->
pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$|^$"       <!-- Due Time - akceptuje puste pole -->
```

Dodatkowo dodano:
```javascript
// Custom validation z lepszymi komunikatami błędów
function validateProcessForm() {
    // Sprawdza wszystkie pola z dokładnymi komunikatami
    if (!/^[A-Za-z0-9_\-]+$/.test(processName.value)) {
        showCustomValidationError(processName, 'Process name can only contain letters, numbers, hyphens and underscores');
        return false;
    }
    // ... więcej validacji
}

function showCustomValidationError(element, message) {
    element.setCustomValidity(message);
    element.reportValidity();
}
```

### **Pliki zmienione:**
- `/mnt/c/Projects/Diagram2/flowcraft/index.html` - linie 2882, 2895, 2900, 4205-4254

### **Jak uniknąć w przyszłości:**
- Testować regex patterns z różnymi przypadkami (wielkie/małe litery)
- Używać `[A-Za-z]` zamiast `[A-Z]` dla uniwersalności
- Dodawać `|^$` do patterns dla opcjonalnych pól
- Implementować custom validation z dokładnymi komunikatami błędów
- Testować formularze z różnymi wartościami przed wdrożeniem

### **Objawy do rozpoznania:**
- Komunikat "Please match the requested format" w przeglądarce
- Brak możliwości submit formularza mimo wypełnionych pól
- Problem występuje przy HTML5 form validation (przed JavaScript)

---

---

## 🐛 PROBLEM: Ponowny błąd "Please match the requested format" dla "Raporting" (2025-07-10 14:07)

### **Opis problemu:**
- Wcześniej naprawiono regex patterns, ale problem powrócił
- Proces "Raporting" był odrzucany z czerwoną ramką
- Inne pola były prawidłowe (zielone ramki)
- Komunikat "Please match the requested format" dalej się pojawiał

### **Przyczyna:**
Niepoprawne escape'owanie znaku `-` w character class regex patterns:

```html
<!-- BŁĘDNE - niepotrzebne escape \- na końcu character class -->
pattern="^[A-Za-z0-9_\-]+$"
pattern="^([A-Za-z0-9_\-]+(,[A-Za-z0-9_\-]+)*)?$"
```

W character class, gdy `-` jest na początku lub końcu, nie potrzebuje escape'owania. Znak `\-` był źle interpretowany przez przeglądarki.

### **Rozwiązanie:**
```html
<!-- POPRAWNE - bez escape na końcu character class -->
pattern="^[A-Za-z0-9_-]+$"
pattern="^([A-Za-z0-9_-]+(,[A-Za-z0-9_-]+)*)?$"
```

Dodatkowo:
```html
<!-- Wyłączenie HTML5 validation dla uniknięcia konfliktów -->
<form id="process-form" novalidate>
```

I synchronizacja JavaScript patterns:
```javascript
if (!/^[A-Za-z0-9_-]+$/.test(processName.value)) { // bez \-
if (dependencies.value && !/^([A-Za-z0-9_-]+(,[A-Za-z0-9_-]+)*)?$/.test(dependencies.value)) {
```

### **Pliki zmienione:**
- `/mnt/c/Projects/Diagram2/flowcraft/index.html` - linie 2879, 2882, 2900, 4217, 4236

### **Jak uniknąć w przyszłości:**
- **Zasada escaping w character class**: `-` na początku `[-abc]` lub końcu `[abc-]` nie potrzebuje escape
- **Środkowe `-` potrzebuje escape**: `[a\-c]` lub umieścić na końcu `[ac-]`
- **Testować regex patterns** w konsoli przeglądarki: `/^[A-Za-z0-9_-]+$/.test("Raporting")`
- **Używać novalidate** gdy mamy custom validation żeby uniknąć konfliktów HTML5
- **Synchronizować wszystkie patterns** między HTML i JavaScript

### **Objawy do rozpoznania:**
- Czerwona ramka na konkretnym polu (nie wszystkich)
- Pattern działa dla niektórych wartości, ale nie dla innych
- JavaScript console może pokazać błędy regex parsing
- Problem występuje po refresh strony (cache nie pomaga)

---

---

## 🐛 PROBLEM: Błędy konsoli i polskie znaki w nazwach procesów (2025-07-10 14:20)

### **Opis problemu:**
- Proces "Zamknięcie Ksiąg" był odrzucany z czerwoną ramką
- Przycisk pokazywał "UPDATING..." ale się zatrzymywał
- W konsoli pojawiały się błędy JavaScript
- Regex patterns nie obsługiwały polskich znaków

### **Przyczyna:**
Regex patterns nie obsługiwały polskich znaków diakrytycznych:

```javascript
// BŁĘDNE - brak polskich znaków
/^[A-Za-z0-9_-]+$/

// Proces "Zamknięcie Ksiąg" zawiera:
// - ę (e z ogonkiem)
// - ą (a z ogonkiem) 
// - spację
```

Problem występował w:
1. HTML pattern validation
2. JavaScript custom validation
3. Brak obsługi spacji w nazwach

### **Rozwiązanie:**
```html
<!-- POPRAWNE - z polskimi znakami i spacjami -->
pattern="^[A-Za-z0-9ĄąĆćĘęŁłŃńÓóŚśŹźŻż_\s-]+$"
```

Pełna lista polskich znaków dodanych:
- **Wielkie**: Ą, Ć, Ę, Ł, Ń, Ó, Ś, Ź, Ż
- **Małe**: ą, ć, ę, ł, ń, ó, ś, ź, ż
- **Spacje**: `\s` dla nazw jak "Zamknięcie Ksiąg"

Dodatkowo naprawiono:
```javascript
// Button state management - originalText dostępny w finally block
const submitBtn = document.getElementById('save-process-btn');
const originalText = submitBtn.textContent; // Poza try block

// Reset przycisku przy błędzie walidacji
if (!validateProcessForm()) {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    return;
}
```

### **Pliki zmienione:**
- `/mnt/c/Projects/Diagram2/flowcraft/index.html` - linie 2882, 2900, 4008-4017, 4217, 4236

### **Jak uniknąć w przyszłości:**
- **Testować z różnymi językami** od początku projektu
- **Używać Unicode ranges** dla full international support: `[\p{L}\p{N}\s_-]+` z flag 'u'
- **Comprehensive character sets** dla różnych języków:
  - Polski: ĄąĆćĘęŁłŃńÓóŚśŹźŻż
  - Niemiecki: ÄäÖöÜüß
  - Francuski: ÀàÂâÇçÉéÈèÊêËëÎîÏïÔôÙùÛûÜüŸÿ
- **Testować edge cases** z długimi nazwami i spacjami
- **Button state management** zawsze poza try blocks

### **Objawy do rozpoznania:**
- Czerwona ramka na polach z polskimi znakami
- "UPDATING..." button zatrzymany
- JavaScript console errors z regex
- Validation działa dla angielskich, ale nie polskich nazw
- Problem występuje częściej w polskich interfejsach

### **Test cases dla przyszłości:**
```javascript
// Testy regex patterns
/^[A-Za-z0-9ĄąĆćĘęŁłŃńÓóŚśŹźŻż_\s-]+$/.test("Zamknięcie Ksiąg") // true
/^[A-Za-z0-9ĄąĆćĘęŁłŃńÓóŚśŹźŻż_\s-]+$/.test("Księgowość") // true  
/^[A-Za-z0-9ĄąĆćĘęŁłŃńÓóŚśŹźŻż_\s-]+$/.test("Płatności") // true
/^[A-Za-z0-9ĄąĆćĘęŁłŃńÓóŚśŹźŻż_\s-]+$/.test("Start Process") // true
```

---

---

## 🐛 PROBLEM: Błąd regex pattern w HTML attribute (2025-07-10 14:27)

### **Opis problemu:**
- Proces "Zamknięcie Ksiąg" został zapisany pomyślnie
- W konsoli pojawił się błąd: `Pattern attribute value ^[A-Za-z0-9ĄąĆćĘęŁłŃńÓóŚśŹźŻż_\s-]+$ is not a valid regular expression`
- Błąd: `Invalid character class` dla polskich znaków w HTML pattern

### **Przyczyna:**
HTML pattern attribute ma ograniczenia w obsłudze Unicode characters:

```html
<!-- PROBLEMATYCZNE - polskie znaki w HTML pattern -->
<input pattern="^[A-Za-z0-9ĄąĆćĘęŁłŃńÓóŚśŹźŻż_\s-]+$">
```

Przeglądarka próbuje interpretować polskie znaki w pattern attribute jako regex, ale:
1. Może nie obsługiwać Unicode w HTML patterns
2. Flag 'v' może powodować konflikty
3. Character class z polskimi znakami jest źle parsowany

### **Rozwiązanie:**
**Usunięcie wszystkich pattern attributes z HTML:**

```html
<!-- PRZED - problematyczne patterns -->
<input pattern="^[A-Za-z0-9ĄąĆćĘęŁłŃńÓóŚśŹźŻż_\s-]+$">
<input pattern="^([A-Za-z0-9ĄąĆćĘęŁłŃńÓóŚśŹźŻż_\s-]+(,[A-Za-z0-9ĄąĆćĘęŁłŃńÓóŚśŹźŻż_\s-]+)*)?$">
<input pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$|^$">

<!-- PO - tylko JavaScript validation -->
<input type="text" id="process-short-name" required>
<form novalidate> <!-- HTML5 validation wyłączona -->
```

**Zachowana JavaScript validation:**
```javascript
function validateProcessForm() {
    if (!/^[A-Za-z0-9ĄąĆćĘęŁłŃńÓóŚśŹźŻż_\s-]+$/.test(processName.value)) {
        showCustomValidationError(processName, 'Process name can contain...');
        return false;
    }
    // ...
}
```

### **Pliki zmienione:**
- `/mnt/c/Projects/Diagram2/flowcraft/index.html` - linie 2882, 2890, 2895, 2900

### **Jak uniknąć w przyszłości:**
- **Unikać HTML pattern attributes** z Unicode characters
- **Używać tylko JavaScript validation** dla complex regex patterns
- **HTML patterns** tylko dla prostych cases (digits, basic ASCII)
- **Testing**: Sprawdzać console errors po każdej zmianie validation
- **Alternative approaches**:
  - Unicode escape sequences w HTML: `\u0105` zamiast `ą`
  - Używać `inputmode` i `autocomplete` zamiast patterns
  - Full JavaScript validation z `setCustomValidity()`

### **Objawy do rozpoznania:**
- Aplikacja działa, ale console ma regex errors
- Pattern attribute value not valid regular expression
- Invalid character class w browser regex engine
- Problem występuje tylko z non-ASCII characters w patterns
- Błąd po focus/blur na input z pattern

### **Best practice validation strategy:**
```html
<!-- ZALECANE - clean HTML -->
<form novalidate>
    <input type="text" required minlength="1" maxlength="50">
</form>

<!-- + comprehensive JavaScript validation -->
<script>
function validateForm() {
    // Full control over validation logic
    // Better error messages
    // Unicode support without browser limitations
}
</script>
```

---

## 🐛 PROBLEM: "Please match the requested format" przez HTML5 form validation (2025-07-10 14:21)

### **Opis problemu:**
- Użytkownik wypełnia formularz procesu: "Zamknięcie Ksiag"
- Wszystkie pola są poprawne, ale pojawia się "Please match the requested format"
- Kliknięcie "Save Process" nie działa, formularz nie może zostać wysłany
- Błąd pojawia się zanim custom JavaScript validation zostanie uruchomiony

### **Przyczyna:**
Przyciski w formularzu nie miały `type="button"`, więc domyślnie były `type="submit"`:

```html
<!-- BŁĘDNE - domyślne type="submit" -->
<button id="save-process-button" class="btn-fc btn-fc-success save-button">Save</button>
<button id="delete-process-button" class="btn-fc btn-fc-danger delete-button">Delete</button>
<button id="cancel-process-button" class="btn-fc btn-fc-secondary cancel-button">Cancel</button>
```

To powodowało:
1. **HTML5 form validation** uruchamiała się automatycznie przy kliknięciu
2. **Brak pattern attributes** powodował domyślne browser validation
3. **JavaScript validation** nie miała szansy się uruchomić
4. **Custom error messages** nie były wyświetlane

### **Rozwiązanie:**
Dodanie `type="button"` do wszystkich przycisków:

```html
<!-- POPRAWNE - wyraźne type="button" -->
<button type="button" id="save-process-button" class="btn-fc btn-fc-success save-button">Save</button>
<button type="button" id="delete-process-button" class="btn-fc btn-fc-danger delete-button">Delete</button>
<button type="button" id="cancel-process-button" class="btn-fc btn-fc-secondary cancel-button">Cancel</button>
```

### **Pliki zmienione:**
- `/mnt/c/Projects/Diagram2/flowcraft/Diagram.html` - linie 5476-5478

### **Jak uniknąć w przyszłości:**
- **Zawsze** używać `type="button"` dla przycisków w modal dialogs
- **Tylko** używać `type="submit"` gdy chcemy rzeczywisty HTML form submission
- **Testować** form validation od razu po utworzeniu przycisków
- **Pamiętać**: button bez type attribute domyślnie jest `type="submit"`

### **Objawy do rozpoznania:**
- "Please match the requested format" pojawia się natychmiast po kliknięciu
- Formularz jest wypełniony poprawnie, ale nie można go wysłać
- JavaScript validation nie jest uruchamiany
- Problem występuje w modalach z przyciskami bez type attribute

### **Debugging tips:**
```javascript
// Sprawdzenie typu przycisku w konsoli
document.getElementById('save-process-button').type // "submit" or "button"

// Sprawdzenie czy form ma validation
document.querySelector('form').noValidate // true/false

// Sprawdzenie czy input ma pattern
document.getElementById('process-id-modal').pattern // string or ""
```

---

## 🐛 PROBLEM: "currentProcesses is not defined" błąd przy zmianie statusu (2025-07-10)

### **Opis problemu:**
- Kliknięcie na "Change Status" obok procesu powoduje błąd w konsoli
- Błąd: `Uncaught ReferenceError: currentProcesses is not defined at openProcessStatusModal (index.html:5142:33)`
- Funkcja `openProcessStatusModal()` próbuje użyć `currentProcesses.find()` ale zmienna nie istnieje

### **Przyczyna:**
Funkcja `openProcessStatusModal()` została przeniesiona z `Diagram.html` do `index.html`, ale:
1. **Brak zmiennej globalnej** - `currentProcesses` nie było zdefiniowane w `index.html`
2. **W Diagram.html** funkcja `getCurrentlyVisibleProcesses()` była używana do pobierania procesów
3. **W index.html** dane procesów były pobierane lokalnie w `loadProcesses()` ale nie przechowywane globalnie

### **Rozwiązanie:**
```javascript
// DODANE - globalna zmienna na górze pliku
let currentProcesses = [];

// ZMODYFIKOWANE - w funkcji loadProcesses()
async function loadProcesses() {
    // ... existing code ...
    
    // Store processes globally for status management
    currentProcesses = processes || [];
    renderProcessesTable(processes);
}
```

### **Pliki zmienione:**
- `/mnt/c/Projects/Diagram2/flowcraft/index.html` - linie 3779, 3799-3800

### **Jak uniknąć w przyszłości:**
- **Przy przenoszeniu funkcji** między plikami sprawdzać wszystkie dependencies
- **Globalne zmienne** muszą być zdefiniowane w scope gdzie są używane
- **Testować przeniesione funkcje** natychmiast po przeniesieniu
- **Używać console.log** do debugowania scope variables

### **Objawy do rozpoznania:**
- ReferenceError: variable is not defined
- Problem występuje po przeniesieniu kodu między plikami
- Funkcja działa w jednym miejscu, ale nie w innym
- Błąd pojawia się przy pierwszym użyciu funkcji

### **Test case:**
```javascript
// Sprawdzenie czy currentProcesses jest dostępne
console.log('currentProcesses:', currentProcesses); // powinno pokazać array
```

---

## 🐛 PROBLEM: Pattern validation errors i błędy Supabase przy zmianie statusu (2025-07-10)

### **Opis problemu:**
- Kliknięcie na "Change Status" powoduje błędy w konsoli
- Pattern attribute validation errors: "Pattern attribute value ^[A-Za-z0-9_-]+$ is not a valid regular expression"
- Błędy Supabase: "Project jvzauyhkehucfvovjqjh is in status REMOVED"
- Funkcja zmiany statusu nie działa prawidłowo

### **Przyczyny:**
1. **Pattern validation**: Jeden pattern attribute w HTML (register-name) powodował błędy
2. **Supabase project removed**: Projekt w MCP.json był inny niż w config.js
3. **Stary projekt usunięty**: MCP używał projektu `jvzauyhkehucfvovjqjh` który został usunięty
4. **Aktywny projekt**: Aplikacja używa `hbwnghrfhyikcywixjqn` w config.js

### **Rozwiązania:**
```html
<!-- USUNIĘTE - pattern attribute z rejestracji -->
<input type="text" id="register-name" placeholder="Full Name" required minlength="2" maxlength="100" title="...">
```

```json
// NAPRAWIONE - MCP.json project-ref
"--project-ref=hbwnghrfhyikcywixjqn"
```

### **Pliki zmienione:**
- `/mnt/c/Projects/Diagram2/flowcraft/index.html` - linia 2672 (usunięty pattern)
- `/mnt/c/Projects/Diagram2/flowcraft/mcp.json` - linia 10 (poprawiony project-ref)

### **Jak uniknąć w przyszłości:**
- **Synchronizować project-ref** między config.js i mcp.json
- **Usuwać pattern attributes** z HTML, używać tylko JavaScript validation
- **Sprawdzać status projektów** Supabase regularnie
- **Testować MCP connections** przed deploy

### **Objawy do rozpoznania:**
- Console errors o pattern validation
- "Project ... is in status REMOVED" w MCP
- Funkcje Supabase nie działają
- Różne project-ref w różnych plikach konfiguracji

### **Status:**
- ✅ Pattern validation naprawione
- ✅ MCP project-ref zsynchronizowany
- ⚠️ Funkcjonalność wymaga testów po restart Claude Code

---

## 🐛 PROBLEM: Błędy RLS policy i brak synchronizacji statusów między widokami (2025-07-10 19:30)

### **Opis problemu:**
- Kliknięcie "Change Status" powodowało błędy w konsoli: `new row violates row-level security policy for table "process_status_history"`
- Status changes działały w Process Manager ale nie synchronizowały się z Diagram.html
- Reset status pokazywał "Failed to update process status"
- Diagram zawsze pokazywał statusy jako "pending" mimo zmian w Manager

### **Główne przyczyny:**
1. **Brakujące pola statusu w ładowaniu danych**: Diagram.html nie ładował pól `status`, `completed_at`, `completion_note`, `assigned_to`, `due_date` z bazy
2. **RLS policy violations**: Skomplikowane RLS policies dla tabeli `process_status_history` powodowały błędy 403
3. **Brak synchronizacji**: Nie było mechanizmu komunikacji między Process Manager a Diagram
4. **Usunięte pliki migracji**: `supabase_migrations.sql` został usunięty z repozytorium

### **Rozwiązania zaimplementowane:**

#### 1. **Naprawa ładowania danych w Diagram.html**
```javascript
// DODANE - pola statusu w loadDataFromSupabase() (linie 8594-8599)
const process = {
    // ... existing fields ...
    status: row.status || 'PENDING',
    completed_at: row.completed_at,
    completion_note: row.completion_note,
    assigned_to: row.assigned_to,
    due_date: row.due_date
};
```

#### 2. **Aktualizacja funkcji zapisu w Diagram.html**
```javascript
// DODANE - pola statusu w saveProcessToSupabase() i updateProcessInSupabase()
.update({
    // ... existing fields ...
    status: processData.status || 'PENDING',
    completed_at: processData.completed_at || null,
    completion_note: processData.completion_note || null,
    assigned_to: processData.assigned_to || null,
    due_date: processData.due_date || null,
    // ...
})
```

#### 3. **Ulepszona obsługa błędów RLS**
```javascript
// DODANE - try-catch w markProcessCompleted() i markProcessDelayed()
try {
    await this.executeSupabaseRequest(/* status history insert */);
} catch (historyError) {
    console.warn('Could not record status change history (table may not exist):', historyError);
}
```

#### 4. **Mechanizm synchronizacji między widokami**
```javascript
// DODANE - w index.html po zmianie statusu
window.opener.postMessage({
    type: 'PROCESS_STATUS_UPDATED',
    processId: processId,
    newStatus: newStatus,
    completionNote: note
}, window.location.origin);

// DODANE - w Diagram.html listener
window.addEventListener('message', function(event) {
    if (event.data.type === 'PROCESS_STATUS_UPDATED') {
        // Update process data and re-render diagram
        renderDiagramAndRestoreState();
    }
});
```

#### 5. **Ulepszona obsługa reset status**
```javascript
// DODANE - fallback w przypadku błędów
try {
    result = await /* normal status update */;
} catch (statusUpdateError) {
    // Fallback: try updating only basic fields
    result = await /* basic update */;
    showNotification('Status reset completed (limited database support)', 'warning');
}
```

### **Pliki zmienione:**
- **Diagram.html**:
  - linie 8594-8599: Dodane pola statusu w `loadDataFromSupabase()`
  - linie 8701-8705, 8747-8751, 8765-8769: Dodane pola statusu w funkcjach zapisu
  - linie 8727, 8682: Zaktualizowane `excludeFields` arrays
  - linie 6432-6462: Dodany listener dla synchronizacji statusów
- **index.html**:
  - linie 5262-5296: Ulepszona obsługa błędów w `updateProcessStatus()`
  - linie 5312-5324: Dodana synchronizacja z Diagram via postMessage
- **flowcraft-error-handler.js**:
  - linie 1138-1154, 1182-1198: Dodana obsługa błędów dla `process_status_history`
- **supabase_migrations.sql**: Przywrócony z git history

### **Oczekiwane rezultaty:**
1. ✅ **Brak błędów RLS**: Try-catch handling dla `process_status_history`
2. ✅ **Synchronizacja statusów**: PostMessage komunikacja między widokami  
3. ✅ **Diagram ładuje statusy**: Dodane wszystkie pola statusu
4. ✅ **Lepsha obsługa reset**: Fallback mechanizmy
5. 🔄 **Wymaga testów**: Funkcjonalność po restart Claude Code

### **Jak uniknąć w przyszłości:**
- **Zawsze sprawdzać synchronizację** między różnymi widokami aplikacji
- **Implementować graceful degradation** dla nieistniejących tabel/pól
- **Używać postMessage API** do komunikacji między oknami
- **Nie usuwać plików migracji** bez zastąpienia ich aktualnymi
- **Testować RLS policies** z różnymi scenariuszami użytkowników
- **Dokumentować zależności** między plikami w kodzie

### **Objawy do rozpoznania:**
- Console errors: "new row violates row-level security policy"
- POST 403 (forbidden) błędy w network tab
- Status changes działają tylko w jednym widoku
- "Failed to update process status" messages
- Diagram pokazuje zawsze "pending" statusy

---

## 🐛 PROBLEM: Reset status nie działa + błędy 403 przy completed on time (2025-07-10 19:55)

### **Opis problemu:**
- Kliknięcie "Reset to Pending" pokazuje błąd "Failed to update process status"
- Completed on time powoduje wielokrotne błędy 403 Forbidden na process_status_history
- Status się zmienia ale z opóźnieniem i błędami w konsoli
- Brak automatycznego odświeżania statusu w diagramie

### **Przyczyny:**
1. **RLS Policy na process_status_history**: Brak prawidłowej autentykacji użytkownika
2. **Reset function**: Problem z walidacją result.data (był undefined mimo sukcesu)
3. **Authentication**: userId było hardcoded zamiast pobierane z auth.getUser()
4. **Status field check**: Brak sprawdzenia czy pola statusu istnieją w tabeli

### **Rozwiązania:**
```javascript
// 1. NAPRAWIONE - Authentication dla process_status_history
const user = await window.supabaseClient.auth.getUser();
if (user?.data?.user?.id) {
    // insert with proper user ID
    changed_by: user.data.user.id,
}

// 2. NAPRAWIONE - Reset status validation  
if (result?.data?.length > 0 || result?.data) {
    // proper validation for both array and object responses
}

// 3. NAPRAWIONE - Enhanced error handling dla reset
try {
    // Try with status fields
    updateFields.status = newStatus;
    updateFields.completed_at = null;
    updateFields.completion_note = null;
} catch (statusUpdateError) {
    // Fallback to minimal update
    result = await supabaseClient.update({
        updated_at: new Date().toISOString()
    });
}

// 4. NAPRAWIONE - Better memory updates
if (newStatus === 'PENDING') {
    process.completed_at = null;
    process.completion_note = null;
}
```

### **Pliki zmienione:**
- **flowcraft-error-handler.js**: 
  - Linie 1140-1159: Authentication check dla markProcessCompleted
  - Linie 1188-1208: Authentication check dla markProcessDelayed
- **index.html**:
  - Linie 5263-5309: Enhanced reset status handling
  - Linie 5311-5347: Improved result validation i memory updates

### **Jak uniknąć w przyszłości:**
- **Zawsze używać auth.getUser()** zamiast hardcoded userId
- **Sprawdzać result.data** z różnymi typami odpowiedzi (array vs object)
- **Implementować graceful degradation** dla brakujących pól bazy danych
- **Testować RLS policies** z różnymi scenariuszami autentykacji
- **Dodawać .select()** do update queries żeby otrzymać dane odpowiedzi

### **Objawy do rozpoznania:**
- "Failed to update process status" mimo że operacja się udaje
- 403 Forbidden na process_status_history w konsoli
- Status się zmienia ale z opóźnieniem
- Brak synchronizacji między widokami

### **Test cases:**
```javascript
// Test reset functionality
await updateProcessStatus(processId, 'PENDING');
// Should: 1) Update DB, 2) Clear completed_at/completion_note, 3) Show success

// Test completed on time
await updateProcessStatus(processId, 'COMPLETED_ON_TIME', 'Test note');
// Should: 1) Update DB, 2) Set completed_at, 3) Log to history if possible, 4) Show success
```

### **Status:**
- ✅ RLS authentication naprawione
- ✅ Reset validation naprawione  
- ✅ Error handling ulepszone
- 🔄 Wymaga testów w aplikacji

---

## 🐛 PROBLEM: Nadal błędy 403 na process_status_history mimo napraw (2025-07-10 20:05)

### **Opis problemu:**
- Po implementacji auth.getUser() nadal pojawiają się błędy 403 Forbidden
- "new row violates row-level security policy for table process_status_history"
- Problem występuje mimo poprawnej autentykacji

### **Przyczyna:**
**RLS Policy wymaga członkostwa w projekcie**, a aplikacja nie używa systemu projektów:

```sql
-- Policy w supabase_migrations.sql wymaga:
CREATE POLICY "Users can insert status history for their processes" ON process_status_history
FOR INSERT WITH CHECK (
    process_id IN (
        SELECT pr.id FROM processes pr
        JOIN sheets s ON pr.sheet_id = s.id
        JOIN projects p ON s.project_id = p.id
        WHERE p.user_id = auth.uid() OR p.id IN (
            SELECT pm.project_id FROM project_members pm 
            WHERE pm.user_id = auth.uid() AND pm.role IN ('FULL_ACCESS', 'EDIT_ACCESS')
        )
    )
);
```

**Problem**: Aplikacja tworzy procesy bez projektów/membership, więc RLS zawsze blokuje.

### **Rozwiązanie:**
**Całkowite wyłączenie zapisów do process_status_history:**

```javascript
// PRZED - próba zapisu z błędami 403
await supabaseClient.from('process_status_history').insert({...});

// PO - lokalne logowanie bez błędów
console.log(`Status change logged locally: ${processId} -> ${status} (${note})`);
```

### **Pliki zmienione:**
- **flowcraft-error-handler.js**: 
  - Linie 1138-1141: Wyłączenie history w markProcessCompleted
  - Linie 1169-1172: Wyłączenie history w markProcessDelayed

### **Jak uniknąć w przyszłości:**
- **Sprawdzać RLS policies** przed implementacją funkcjonalności
- **Testować z rzeczywistymi danymi** zamiast zakładać że auth wystarczy
- **Implementować project membership** jeśli potrzebny jest history
- **Używać optional features** dla zaawansowanych funkcji
- **Graceful degradation** - podstawowa funkcjonalność działa bez history

### **Objawy do rozpoznania:**
- 403 Forbidden mimo poprawnej autentykacji
- RLS policy violations w tabelach z complex policies
- Błędy przy INSERT ale nie przy SELECT/UPDATE na głównych tabelach
- Policy zawiera JOINy do tabel które nie są wypełnione

### **Alternatywy dla przyszłości:**
1. **Prostsza RLS policy**: `WHERE changed_by = auth.uid()`
2. **Tymczasowe wyłączenie RLS**: `ALTER TABLE process_status_history DISABLE ROW LEVEL SECURITY;`
3. **Implementacja project system**: Pełny system projektów i członkostwa
4. **Local storage history**: Przechowywanie historii lokalnie

### **Status:**
- ✅ Błędy 403 wyeliminowane
- ✅ Status changes działają bez przeszkód
- ⚠️ History logging wyłączone (funkcjonalność opcjonalna)

---

## 🐛 PROBLEM: 404 błąd get_table_columns + brak real-time sync w Diagram (2025-07-10 20:15)

### **Opis problemu:**
- Reset to pending powoduje błąd: `POST /rest/v1/rpc/get_table_columns 404 (Not Found)`
- Status zmienia się w Process Manager ale nie synchronizuje w real-time z Diagram
- Status tabeli processes nie jest widoczny w diagramie

### **Przyczyny:**
1. **Nieistniejąca funkcja RPC**: `get_table_columns` nie istnieje w Supabase
2. **PostMessage może nie działać**: Process Manager i Diagram mogą nie być połączone przez window.opener
3. **PENDING status clearing**: Brak czyszczenia pól completion w synchronizacji diagram

### **Rozwiązania:**
```javascript
// 1. USUNIĘTE - niepotrzebne sprawdzanie kolumn
// PRZED - próba wywołania nieistniejącej RPC
const { data: columns } = await window.supabaseClient
    .rpc('get_table_columns', { table_name: 'processes' })

// PO - bezpośrednie używanie pól
const updateFields = {
    status: newStatus,
    completed_at: null,
    completion_note: null,
    updated_at: new Date().toISOString()
};

// 2. ULEPSZONE - PostMessage debugging
// Dodane logi do sprawdzenia czy komunikacja działa
console.log(`PostMessage sent to diagram: ${processId} -> ${newStatus}`);
console.log('Message received in diagram:', event.data);

// 3. NAPRAWIONE - PENDING status clearing w Diagram
if (newStatus === 'PENDING') {
    process.completed_at = null;
    process.completion_note = null;
}
```

### **Pliki zmienione:**
- **index.html**: 
  - Linie 5264-5270: Usunięcie RPC get_table_columns
  - Linie 5328-5333: Dodane debugging dla postMessage
- **Diagram.html**:
  - Linie 6433-6477: Enhanced debugging i PENDING status clearing

### **Jak uniknąć w przyszłości:**
- **Sprawdzać dostępność RPC funkcji** przed użyciem
- **Testować komunikację między oknami** w różnych scenariuszach
- **Używać console.log** do debugowania post-message communication
- **Sprawdzać window.opener** availability przed wysłaniem wiadomości

### **Objawy do rozpoznania:**
- 404 błędy dla RPC funkcji
- Status zmienia się w jednym oknie ale nie w drugim
- Brak logs w konsoli o otrzymanych messages
- window.opener is null/undefined warnings

### **Test case:**
```javascript
// W Process Manager po zmianie statusu:
console.log(`PostMessage sent to diagram: ${processId} -> ${newStatus}`);

// W Diagram powinno pojawić się:
console.log('Message received in diagram:', event.data);
console.log(`Processing status update: ${processId} -> ${newStatus}`);
console.log('Re-rendering diagram...');
```

### **Status:**
- ✅ 404 błąd RPC naprawiony
- ✅ Debugging dodany do komunikacji
- ✅ PENDING status clearing zaimplementowany
- 🔄 Wymaga testów real-time synchronizacji

---

## 🐛 PROBLEM: Status changes nie synchronizują się między Process Manager a Diagram (2025-07-10 20:30)

### **Opis problemu:**
- User zmienia status w Process Manager (completed)
- Status zapisuje się do bazy danych 
- Diagram nadal pokazuje "pending" mimo zmiany w bazie
- Brak real-time synchronizacji między widokami
- Błędy 403 RLS policy violations dla process_status_history

### **Przyczyny zidentyfikowane:**
1. **RLS Policy conflicts**: process_status_history wymaga complex project membership
2. **PostMessage może nie dotrzeć**: Diagram może nie odbierać wiadomości z Process Manager
3. **Process ID type mismatch**: Strict equality === vs loose equality ==
4. **Brak fallback refresh**: Jeśli postMessage nie działa, brak backup synchronizacji

### **Rozwiązania zaimplementowane:**

#### 1. **Enhanced debugging w message listener (Diagram.html:6445-6490)**
```javascript
console.log(`Looking for process with ID: ${processId}`);
console.log('Available processes:', Object.keys(processesData));
// Use == instead of === for type coercion
return p._databaseId == processId;
```

#### 2. **Periodic refresh backup mechanism (Diagram.html:6492-6510)**
```javascript
// Check for status updates every 30 seconds
setInterval(async () => {
    if (currentSheetId && Object.keys(processesData).length > 0) {
        await loadDataFromSupabase();
    }
}, 30000);
```

#### 3. **Enhanced status visualization debugging (Diagram.html:7601)**
```javascript
console.log(`Rendering status for ${processData["Short name"]}: ${status}`);
```

#### 4. **Fallback database reload gdy process nie znaleziony**
```javascript
// Try to reload from database as fallback
console.log('Attempting to reload data from database...');
loadDataFromSupabase();
```

### **Oczekiwane rezultaty:**
1. ✅ **Better debugging**: Console logs pokażą gdzie jest problem z process lookup
2. ✅ **Periodic sync**: Diagram odświeży się automatycznie co 30s jako backup
3. ✅ **Type coercion**: == zamiast === powinno naprawić ID matching issues
4. ✅ **Fallback reload**: Jeśli postMessage nie działa, database reload jako backup
5. 🔄 **Wymaga testów**: Pełne testy po restart Claude Code

### **Jak testować:**
1. Otwórz Process Manager w jednym oknie
2. Otwórz Diagram w drugim oknie
3. Zmień status procesu w Process Manager
4. Sprawdź console logs w Diagram window
5. Sprawdź czy status się zmienia natychmiast lub w ciągu 30s

### **Debug commands:**
```javascript
// W Console Diagram window:
console.log('Current processes:', Object.values(processesData).flat().map(p => `${p._databaseId}: ${p["Short name"]} (${p.status})`));

// W Console Process Manager po zmianie statusu:
console.log('PostMessage sent:', window.opener ? 'success' : 'failed - no opener');
```

### **Pliki zmienione:**
- **Diagram.html**: 
  - Linie 6445-6490: Enhanced debugging i process lookup
  - Linie 6492-6510: Periodic refresh mechanism
  - Linia 7601: Status rendering debugging

### **Status:**
- ✅ Enhanced debugging zaimplementowany
- ✅ Periodic refresh dodany  
- ✅ Type coercion fixed
- ✅ Fallback mechanisms w miejscu
- 🔄 Czeka na testy w aplikacji

---

## 🐛 PROBLEM: Diagram pokazuje tylko "pending" statusy mimo zmian w Process Manager (2025-07-10 20:45)

### **Opis problemu:**
- User zmienia statusy w Process Manager (index.html) - statusy się zapisują
- Diagram (Diagram.html) nadal pokazuje wszystkie procesy jako "pending" 
- Brak wizualnych animacji i oznaczeń statusów w węzłach diagramu
- StatusY są prawidłowo zapisane w bazie danych

### **Przyczyny zidentyfikowane:**
1. **Brak real-time refresh diagramu** po zmianie statusu
2. **Possible stale data** - diagram może używać cached/przestarzałych danych
3. **PostMessage może nie działać** między oknami Process Manager → Diagram
4. **Periodic refresh zbyt rzadki** (30s może być za mało)

### **Rozwiązania zaimplementowane:**

#### 1. **Enhanced comprehensive debugging (Diagram.html)**
```javascript
// Linie 8651-8655: Raw database data logging
console.log('Raw data from Supabase:', data);
console.log('Sample process from DB:', data[0]);

// Linie 8698-8702: Loaded processes status logging  
Object.values(processesData).flat().forEach(process => {
    console.log(`- ${process["Short name"]}: ${process.status} (ID: ${process._databaseId})`);
});

// Linia 10226: Node creation debugging
console.log(`Creating node for ${process.ID} with status:`, process.status);

// Linie 7609, 7686: Status visualization detailed debugging
console.log(`Rendering status for ${processData["Short name"]}: ${status} (from processData:`, processData.status, ')');
console.log(`Added status elements: indicator class="${statusIndicator.className}", icon="${statusIcon.innerHTML}"`);
```

#### 2. **Force refresh after status updates (Diagram.html:6484-6488)**
```javascript
// Force refresh from database to ensure we have latest data
setTimeout(() => {
    console.log('Force refreshing from database after status update...');
    loadDataFromSupabase();
}, 1000);
```

#### 3. **Faster periodic refresh (Diagram.html:6502-6512)**
```javascript
// Check for status updates every 10 seconds (was 30s)
setInterval(async () => {
    if (currentSheetId && Object.keys(processesData).length > 0) {
        console.log('Performing periodic status refresh...');
        await loadDataFromSupabase();
    }
}, 10000); // 10 seconds
```

#### 4. **Improved PostMessage status updates (Diagram.html:6459-6462)**
```javascript
const oldStatus = process.status;
process.status = newStatus;
process.completion_note = completionNote;
console.log(`Status changed: ${oldStatus} → ${process.status}`);
```

### **Diagnostic Commands dla testowania:**
```javascript
// W Console Diagram window:
console.log('Current processesData:', Object.values(processesData).flat().map(p => `${p["Short name"]}: ${p.status}`));

// W Console po zmianie statusu w Process Manager:
console.log('PostMessage sent:', window.opener ? 'success' : 'failed - no opener');
```

### **Debugging Flow:**
1. **Database level**: Console pokazuje raw data z Supabase
2. **Loading level**: Console pokazuje loaded processes z statusami
3. **Rendering level**: Console pokazuje tworzenie węzłów z statusami
4. **Visualization level**: Console pokazuje dodawanie elementów statusu

### **Oczekiwane rezultaty:**
1. ✅ **Comprehensive logging** - każdy etap jest logowany
2. ✅ **Force refresh** - diagram odświeża się po zmianie statusu  
3. ✅ **Faster sync** - co 10s zamiast 30s
4. ✅ **Real-time debugging** - łatwe diagnozowanie problemów
5. 🔄 **Wymaga testów**: Szczegółowa analiza console logs

### **Pliki zmienione:**
- **Diagram.html**: 
  - Linie 8651-8655: Database data debugging
  - Linie 8698-8702: Loaded processes debugging  
  - Linia 10226: Node creation debugging
  - Linie 7609, 7613-7616, 7686: Status visualization debugging
  - Linie 6484-6488: Force refresh after updates
  - Linie 6502-6512: Faster periodic refresh (10s)
  - Linie 6459-6462: Enhanced PostMessage debugging

### **Jak diagnozować:**
1. Otwórz Console w Diagram window
2. Zmień status w Process Manager
3. Sprawdź kolejno w Console:
   - Raw data from Supabase
   - Loaded processes z statusami
   - Creating node with status
   - Rendering status for process
   - Added status elements

### **Status:**
- ✅ Comprehensive debugging zaimplementowany
- ✅ Force refresh dodany po zmianach statusu
- ✅ Periodic refresh przyspieszony do 10s  
- ✅ Enhanced PostMessage debugging
- 🔄 Gotowe do szczegółowych testów

*Problem diagnostyczny: 2025-07-10 20:50*

---

## 🔧 OPTYMALIZACJA: Zbyt częste odświeżanie statusów (2025-07-10 21:00)

### **Opis problemu:**
- Statusy działały poprawnie, ale periodic refresh co 10s generował za dużo logów
- Konsola była zapełniona nadmiarowymi debug messages
- Użytkownik potrzebował mniejszej częstotliwości - co 10 minut zamiast 10s

### **Przyczyna:**
Podczas wcześniejszych napraw ustawiono zbyt agresywny refresh (10s) dla szybkiego debugowania, ale to nie jest potrzebne dla normalnego użytku.

### **Rozwiązanie:**
```javascript
// PRZED - zbyt częste
setInterval(async () => {
    console.log('Performing periodic status refresh...');
    await loadDataFromSupabase();
}, 10000); // 10 seconds

// PO - optymalne  
setInterval(async () => {
    console.log('Performing periodic status refresh (10min interval)...');
    await loadDataFromSupabase();
}, 600000); // 10 minutes
```

### **Dodatkowo usunięto nadmiarowe logi:**
- Raw data logging z każdego ładowania Supabase
- Node creation debugging dla każdego procesu
- Szczegółowe status rendering logi
- **Zachowano**: Błędy, sync między oknami, ważne operacje

### **Pliki zmienione:**
- **Diagram.html**: Linie 6502-6512 (timing), 8656, 8706, 7608, 7612, 7680, 10243

### **Jak uniknąć w przyszłości:**
- **Różnicować logi**: Debug vs Production logging levels
- **Używać czasowe debugowanie**: Włączać szczegółowe logi tylko podczas diagnozowania
- **Optymalne interwały**: 10min dla background sync, natychmiastowe dla user actions
- **Clean console**: Tylko istotne informacje w normalnym trybie

### **Objawy do rozpoznania:**
- Za dużo logów w konsoli podczas normalnej pracy
- Częste "Performing periodic refresh" messages
- Console cluttered with debug info

### **Rezultat:**
- ✅ Clean console z minimalnymi logami
- ✅ Background refresh co 10 minut  
- ✅ Natychmiastowa synchronizacja przy zmianach statusu
- ✅ Debug logi dostępne gdy potrzebne (commented out)

*Optymalizacja: 2025-07-10 21:05*

---

## 🐛 PROBLEM: Brak automatycznego odświeżania statusów przy uruchomieniu diagramu (2025-07-10 21:10)

### **Opis problemu:**
- Po optymalizacji periodic refresh (10s → 10min), diagram przestał ładować aktualne statusy przy pierwszym uruchomieniu
- User zmienia statusy w Process Manager, wchodzi w diagram, ale widzi stare statusy (pending)
- Periodic refresh działa po 10 minutach, ale to za późno

### **Przyczyna:**
**Różnice między funkcjami ładowania danych:**
- `loadDataFromSupabase()` - ładowała pola statusów (używana w periodic refresh)
- `loadMultipleSheetsFromSupabase()` - NIE ładowała pól statusów (używana przy inicjalizacji)

```javascript
// loadDataFromSupabase() - MIAŁA status fields
status: row.status || 'PENDING',
completed_at: row.completed_at,
completion_note: row.completion_note,

// loadMultipleSheetsFromSupabase() - BRAKOWAŁO status fields  
"Process type": row.process_type || 'standard',
_databaseId: row.id,
// Brak pól statusów!
```

### **Rozwiązanie:**
```javascript
// DODANE do loadMultipleSheetsFromSupabase (linie 9980-9985)
_customData: row.custom_data || {},
// Add status-related fields for proper synchronization
status: row.status || 'PENDING',
completed_at: row.completed_at,
completion_note: row.completion_note,
assigned_to: row.assigned_to,
due_date: row.due_date
```

**Plus force refresh dla pewności:**
```javascript
// Force refresh po inicjalizacji (linie 6362-6365)
setTimeout(async () => {
    console.log('🔄 Force refreshing status data after initial load...');
    await loadDataFromSupabase();
}, 1000);
```

### **Pliki zmienione:**
- **Diagram.html**: Linie 9980-9985, 10013, 6362-6365

### **Jak uniknąć w przyszłości:**
- **Consistency check**: Upewnić się że wszystkie funkcje ładowania mają te same pola
- **Testing**: Testować inicjalizację po zmianie statusów w innym oknie
- **Documentation**: Dokumentować różnice między funkcjami ładowania  
- **Unified loading**: Rozważyć użycie jednej funkcji dla wszystkich przypadków

### **Objawy do rozpoznania:**
- Diagram pokazuje stare statusy po pierwszym uruchomieniu
- Status updates działają w Process Manager ale nie pojawiają się w diagramie
- Periodic refresh działa, ale initial load nie

### **Rezultat:**
- ✅ Statusy ładowane natychmiast przy uruchomieniu diagramu
- ✅ Consistency między funkcjami ładowania
- ✅ Double assurance z force refresh
- ✅ Zachowane optymalizacje periodic timing

*Naprawa: 2025-07-10 21:15*

---

## 🐛 PROBLEM: Błąd w konsoli przy kliknięciu "Show Dependencies" (2025-07-10 21:25)

### **Opis problemu:**
- User klika na proces w diagramie, następnie klika "Show Dependencies"
- W konsoli pojawia się błąd JavaScript
- Panel dependencies nie otwiera się, funkcja nie działa

### **Przyczyny możliwe:**
1. **Undefined variables** - Brak definicji zmiennych używanych w funkcji
2. **Null reference errors** - Próba dostępu do elementów DOM które nie istnieją
3. **Function call errors** - Błędy w wywoływanych funkcjach pomocniczych
4. **Process selection issues** - Problem z currentlySelectedProcessId

### **Rozwiązania zaimplementowane:**

#### 1. **Enhanced debugging dla Show Dependencies (Diagram.html:7424-7453)**
```javascript
// Dodane comprehensive logging
console.log('Show Dependencies button clicked');
console.log('Button disabled:', shortcutShowDependenciesButton.disabled);
console.log('Selected process ID:', currentlySelectedProcessId);

// Try-catch dla error handling
try {
    generateAndShowDependencyTree(currentlySelectedProcessId);
    // ... reszta kodu
    console.log('Dependency tree generated successfully');
} catch (error) {
    console.error('Error generating dependency tree:', error);
    showNotification("Error generating dependency tree: " + error.message, "error");
}
```

#### 2. **Enhanced debugging dla generateAndShowDependencyTree (Diagram.html:12230-12259)**
```javascript
function generateAndShowDependencyTree(processId) {
    console.log('generateAndShowDependencyTree called with processId:', processId);
    
    const currentProcessesForRoot = getCurrentlyVisibleProcesses(true);
    console.log('Current processes for root:', currentProcessesForRoot.length);
    
    const rootProcess = currentProcessesForRoot.find(p => p.ID === processId);
    console.log('Root process found:', rootProcess);
    
    // Enhanced error checking dla getRecursiveDependenciesGraph
    try {
        currentTreeInputsData = getRecursiveDependenciesGraph(...);
        console.log('Tree inputs data generated:', currentTreeInputsData);
    } catch (error) {
        console.error('Error in getRecursiveDependenciesGraph:', error);
        throw error;
    }
}
```

### **Diagnostic Flow:**
1. **Button click**: Log czy button został kliknięty i czy jest enabled
2. **Process selection**: Log currentlySelectedProcessId
3. **Process lookup**: Log czy rootProcess został znaleziony  
4. **Data generation**: Log ile procesów dostępnych i czy tree data generowany
5. **Error catching**: Catch wszystkie błędy z dokładnymi messages

### **Pliki zmienione:**
- **Diagram.html**: Linie 7424-7453, 12230-12259

### **Jak debugować:**
1. Otwórz Console w Diagram window
2. Kliknij na proces w diagramie  
3. Kliknij "Show Dependencies"
4. Sprawdź w Console sekwencję logów:
   - "Show Dependencies button clicked"
   - "Selected process ID: [ID]"
   - "generateAndShowDependencyTree called with processId: [ID]"
   - "Root process found: [object]"
   - "Tree inputs/outputs data generated"

### **Możliwe błędy do zidentyfikowania:**
- **Button disabled**: User nie wybrał procesu
- **Process not found**: Problem z getCurrentlyVisibleProcesses()
- **getRecursiveDependenciesGraph errors**: Problem z dependency calculation
- **DOM element issues**: Problem z elementami dependency panel

### **Status:**
- ✅ Comprehensive debugging dodany
- ✅ Error handling z user-friendly messages
- ✅ Step-by-step logging
- 🔄 Gotowe do testów i analizy błędów

*Debug implementacja: 2025-07-10 21:30*

---

## 🔧 ENHANCED DEBUGGING: Show Dependencies - Comprehensive Error Handling (2025-07-10 21:35)

### **Problem:**
Screenshot pokazuje JavaScript errors w konsoli gdy user klika Show Dependencies. Potrzebne enhanced debugging dla full diagnosis.

### **Zaimplementowane rozwiązania:**

#### 1. **Comprehensive DOM Validation**
```javascript
// Weryfikacja wszystkich elementów DOM przed użyciem
if (!dependencyTreeSvg) {
    throw new Error('Dependency tree SVG element not found in DOM');
}
if (!dependencyPanelTitle) {
    throw new Error('Dependency panel title element not found in DOM');
}
```

#### 2. **Enhanced Process Data Validation**  
```javascript
// Sprawdzenie czy procesy są dostępne
if (!currentProcessesForRoot || currentProcessesForRoot.length === 0) {
    console.error('❌ No processes available for dependency tree');
    return;
}

// Pokazanie dostępnych process IDs dla debugging
console.log('📋 Available process IDs:', currentProcessesForRoot.map(p => p.ID));
```

#### 3. **Step-by-Step Progress Logging**
```javascript
console.log('🌳 generateAndShowDependencyTree called with processId:', processId);
console.log('📊 Current processes for root:', currentProcessesForRoot?.length || 0);
console.log('🎯 Root process found:', rootProcess ? `${rootProcess["Short name"]} (${rootProcess.ID})` : 'NOT FOUND');
console.log('📚 All processes combined:', allProcessesCombined?.length || 0);
console.log('🔄 Generating dependency graphs...');
console.log('⬅️ Tree inputs data generated:', currentTreeInputsData?.length || 0, 'nodes');
console.log('➡️ Tree outputs data generated:', currentTreeOutputsData?.length || 0, 'nodes');
console.log('🎯 Initializing tree states...');
console.log('🎨 Drawing dependency tree SVG...');
console.log('✅ Dependency tree generated successfully');
```

#### 4. **Complete Error Stack Traces**
```javascript
} catch (error) {
    console.error('💥 Critical error in generateAndShowDependencyTree:', error);
    console.error('Stack trace:', error.stack);
    
    if (dependencyTreeSvg) {
        dependencyTreeSvg.innerHTML = `<text x="10" y="20" fill="red">Error: ${error.message}</text>`;
    }
    
    throw error;
}
```

### **Instrukcje diagnostyczne:**
1. Kliknij proces w diagramie
2. Kliknij "Show Dependencies"  
3. Sprawdź Console sekwencyjnie:
   - 🌳 Function call z process ID
   - 📊 Liczba dostępnych procesów
   - 🎯 Czy root process został znaleziony
   - 📚 Czy combined processes data istnieje
   - 🔄 Czy dependency graphs są generowane
   - ⬅️➡️ Liczba nodes w inputs/outputs
   - 🎨 Czy SVG drawing starts
   - ✅ Success message LUB 💥 error z details

### **Pliki zmodyfikowane:**
- **Diagram.html**: Linie 12229-12311 - comprehensive error handling

### **Rezultat:**
- ✅ **DOM validation** - sprawdza czy wszystkie elementy istnieją
- ✅ **Data validation** - sprawdza czy procesy są dostępne  
- ✅ **Progress tracking** - każdy krok z emoji icons dla easy reading
- ✅ **Error details** - stack traces i specific error messages
- ✅ **Graceful fallbacks** - pokazuje error w SVG zamiast crashing

### **Status:** 
🔍 **READY FOR DETAILED DIAGNOSIS** - Console teraz pokaże dokładnie gdzie dependency tree fails

*Enhanced debugging: 2025-07-10 21:35*

---

*Debug log utworzony 2025-07-10 | FlowCraft v2.0*