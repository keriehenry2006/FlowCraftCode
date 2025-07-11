# Szybkie testowanie zmian w FlowCraft

## 1. Test lokalny (natychmiastowy)
```bash
# Otwórz plik w przeglądarce
firefox index.html
# lub
google-chrome index.html
# lub bezpośrednio przeciągnij index.html do przeglądarki
```

## 2. Test z serwerem lokalnym (zalecany)
```bash
# Python 3
python3 -m http.server 8000

# Node.js (jeśli zainstalowany)
npx http-server -p 8000

# Następnie otwórz: http://localhost:8000
```

## 3. GitHub Pages (automatyczny deployment)

### Pierwsza konfiguracja:
1. Utwórz repozytorium na GitHub
2. Wrzuć pliki aplikacji
3. Idź do Settings → Pages
4. Wybierz Source: Deploy from a branch
5. Wybierz Branch: main (lub master)
6. Folder: / (root)
7. Zapisz

### Po zmianach:
```bash
git add .
git commit -m "Opis zmian"
git push
```
Aplikacja automatycznie się zaktualizuje na GitHub Pages w ciągu 1-5 minut.

## 4. Vercel (najszybszy deployment)
1. Idź na vercel.com
2. Połącz z GitHub
3. Wybierz repozytorium
4. Deploy

Po każdym push do GitHub, Vercel automatycznie redeploy w ~30 sekund.

## 5. Netlify (drag & drop)
1. Idź na netlify.com
2. Przeciągnij folder z plikami na stronę
3. Gotowe!

## Sprawdzanie błędów:
1. Otwórz DevTools (F12)
2. Sprawdź Console tab
3. Sprawdź Network tab (czy pliki się ładują)

## Szybki test zmian:
1. Zapisz plik
2. Odśwież przeglądarkę (F5 lub Ctrl+F5)
3. Sprawdź Console na błędy

## Błąd "Unexpected token '}'":
Najczęstsze przyczyny:
- Brakujący nawias { lub }
- Dodatkowy nawias } 
- Błąd w składni JavaScript
- Problem z kodowaniem pliku

Rozwiązanie:
1. Sprawdź składnię w edytorze kodu
2. Użyj online JS validator
3. Sprawdź czy wszystkie nawiasy są sparowane