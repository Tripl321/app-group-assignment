# Fas 1 – Hotmodellering & Kravspecifikation (STRIDE-E + OWASP 2025)

<aside>

**Syfte:** Identifiera de viktigaste hoten mot vår applikation med hjälp av **STRIDE-E**, mappa varje hot mot **OWASP Top 10 (2025)**, och formulera ett konkret, testbart säkerhetskrav per kategori.

</aside>

## Översikt

Dokumentet utgör **Fas 1** av grupparbetet och är underlaget för kravspecifikationen som implementeras i kommande faser. Varje rad i tabellen nedan består av fyra delar:

1. **STRIDE-E-kategori** – vilken typ av hot vi adresserar.
2. **OWASP Top 10 (2025)** – mappning till en etablerad branschstandard.
3. **Säkerhetskrav** – det konkreta, verifierbara kravet i vår kravspecifikation.
4. **Motivering** – argumentet vi använder i presentationen för *varför* kravet finns.

---

## Hotmodelleringstabell

| **STRIDE-E** | **OWASP Top 10 (2025)** | **Säkerhetskrav (kravspecifikation)** | **Motivering (presentationsargument)** |
| --- | --- | --- | --- |
| **S — Spoofing** *(Identitetsförfalskning)* | **A07:** Authentication Failures | **Lösenordslös inloggning:** Systemet ska tillåta autentisering via **Passkeys (WebAuthn)** utan traditionella lösenord. | Genom att fasa ut lösenord eliminerar vi själva grundorsaken till läckta konton. Passkeys är kryptografiskt låsta till vår domän, vilket gör plattformen immun mot nätfiske (phishing) och brute-force. |
| **T — Tampering** *(Manipulering)* | **A05:** Injection | **Strikt indatavalidering:** Systemet ska i backend validera att meddelanden är rensade (saniterade) och mellan **3–140 tecken**. | Genom att aldrig lita på data från frontend och tvinga fram validering i vår Express-API skyddar vi databasen från skadlig kod (SQL/NoSQL Injection) och XSS-attacker. |
| **R — Repudiation** *(Förnekande)* | **A09:** Security Logging & Monitoring Failures | **Granskningslogg:** Systemet ska logga **tidsstämpel, användar-ID och händelsetyp** för alla raderade eller ändrade inlägg. | Om en säkerhetsincident inträffar (t.ex. radering av viktig data) måste vi ha spårbarhet. Utan loggning är vi blinda och användare kan förneka sina handlingar i systemet. |
| **I — Information Disclosure** *(Informationsläckage)* | **A02:** Security Misconfiguration | **Skyddade hemligheter:** Inga känsliga API-nycklar eller lösenord får checkas in i Git, utan ska hanteras via dolda **`.env`-filer**. | Att råka publicera produktionsnycklar på GitHub är en av de vanligaste (och farligaste) felkonfigureringarna. Denna rutin minimerar vår attackyta och skyddar konfidentiell data. |
| **D — Denial of Service** *(Överbelastning)* | **A05:** Insecure Design | **Hastighetsbegränsning (Rate Limiting):** API:et ska ha en gräns på antalet tillåtna anrop **per minut och IP-adress**. | För att säkerställa applikationens tillgänglighet måste vi införa resursbegränsningar. Rate limiting skyddar vår backend från att krascha om den utsätts för automatiserad spam eller en överbelastningsattack. |
| **E — Elevation of Privilege** *(Behörighetsökning)* | **A01:** Broken Access Control | **Auktoriseringskontroll:** Backend måste alltid validera att meddelandets **`author_id`** matchar sessionens inloggade användare vid radering/redigering. | Broken Access Control är webbens största sårbarhet. Vi förhindrar behörighetsökning genom att säkerställa att en vanlig användare aldrig kan manipulera någon annans inlägg, oavsett vad frontenden skickar för anrop. |

---

## Sammanfattning av kraven

-   **K1 – Autentisering:** Passkeys/WebAuthn istället för lösenord.
-   **K2 – Indatavalidering:** Sanitering + längdkontroll (3–140 tecken) i backend.
-   **K3 – Loggning:** Granskningslogg med tidsstämpel, användar-ID och händelsetyp för mutationer.
-   **K4 – Hemligheter:** Inga secrets i Git; allt via `.env` + `.gitignore`.
-   **K5 – Tillgänglighet:** Rate limiting per IP och minut på API.
-   **K6 – Auktorisering:** `author_id`-kontroll mot session vid alla mutationer.

---

## Referenser

- [STRIDE threat model (Microsoft)](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- [OWASP Top 10 (2025)](https://owasp.org/Top10/)
- [WebAuthn / Passkeys (W3C)](https://www.w3.org/TR/webauthn-3/)

<aside>

**Nästa steg (Fas 2):** Översätta varje krav (K1–K6) till konkreta acceptanskriterier och testfall innan implementation påbörjas.

</aside>
