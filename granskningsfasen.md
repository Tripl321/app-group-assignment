# Inlämning 3 - Granskningsfasen[fas 3 - granskning.md](https://github.com/user-attachments/files/29040324/fas.3.-.granskning.md)
## **Fas 3: Granskning** 

---

### 1\. Intro och verktyg 

I den här fasen har vi granskat vår webbapp med Dependabot. Det går igenom alla beroenden i projektet, alltså de färdiga kodpaket vi hämtat in utifrån, såsom bcrypt och jsonwebtoken och jämför dem mot en databas med kända sårbarheter. Hittar Dependabot ett paket med en känd brist skapar det en "alert".

Vi fick 16 alerts. Men de fördelar sig på bara fyra paket, flera alerts är olika varianter av samma grundproblem i samma paket. Så vi har grupperat dem och valt ut det viktigaste att fördjupa oss i.

---

### 2\. Överblick: 16 alerts, fyra paket 

Kort om vad ett "paket" är: när man bygger en webbapp så behöver man inte skriva all kod själv, utan man kan hämta in färdiga moduler via NPM, en pakethanteraren för JavaScript, som en katalog man laddar ner kod ifrån. Varje sån modul är ett paket. Vår app använder många, och det är dom Dependabot har granskat och ger oss olika CVE-koder.

De 16 alerts:en fördelar sig så här:

jsonwebtoken: 3st alerts. Paketet som sköter vår inloggning.   
Det här är det allvarligaste och det vi valt att gå djupare in på.

node-tar: 6st alerts, och alla klassade som High. node-tar är ett paket som packar ihop och packar upp filarkiv.  
Vi har aldrig installerat det själva; det är ett indirekt beroende, alltså ett paket som något annat paket drar in i bakgrunden. Vår egen kod anropar aldrig det. Det betyder att dom   
6 bristerna inte kan utnyttjas mot oss i nuläget \- vi återkommer till varför vi ändå tar dom på allvar.

Vite, esbuild och launch-editor:  har också 6st alerts. Det här är utvecklingsverktyg \- ett program vi bara använder lokalt när vi bygger appen. Vite och esbuild bygger ihop koden, launch-editor öppnar filer i editorn. Alerts:en är markerade som "Development", vilket betyder att de bara berör utvecklingsläget. I produktion byggs appen om till vanliga statiska filer och dom här verktygen körs inte, så slutanvändaren möts aldrig av dom.

Och qs: har 1 alert. QS är paketet som Express använder för att tolka query-parametrar i en URL, det som står efter frågetecknet i en webbadress. Sårbarheten gör att ett specialformaterat anrop kan överbelasta servern. Men den mildras redan av den rate limit vi byggde i Fas 2, som stoppar en angripare från att skicka tillräckligt många anrop.

Det är 16st sårbarheter\! Men bara ett paket \- jsonwebtoken \- det påverkar våra användare direkt. Och dit går vi nu.

---

### 3\. Fördjupning: jsonwebtoken

När du loggar in skapar vår backend en jsonwebtoken åt dig. Det är en liten datasträng som fungerar som ett inloggningsbevis: din webbläsare skickar med den i varje anrop till API:et, så servern vet vem du är utan att du måste logga in på nytt varje gång.

För att denna token inte ska gå att förfalska signerar servern den med en hemlig nyckel; en kryptografisk signatur som bara vår server kan skapa. När en token kommer in kör backend en verifiering, som kontrollerar att signaturen är giltig.

Så vad är problemet?

Problemet sitter i versionen. I vår package.json står "jsonwebtoken": "8.5.1"; en uråldrig version från 2019\. Alla andra paket har ett tak-tecken framför versionsnumret, vilket tillåter automatiska uppdateringar till nyare, kompatibla versioner. Den här raden saknar detta tecken, så paketet är låst och har inte fått några säkerhetsuppdateringar på flera år. Sedan 2019 har tre sårbarheter hittats i just den versionen.

Den allvarligaste sårbarheten handlar om algoritmkontroll. En jsonwebtoken kan signeras med olika algoritmer. I version 8.5.1 är denna typ av verifiering inte tillräckligt strikt med vilken algoritm den accepterar; den verifierar att signaturen finns och stämmer, men kontrollerar inte hårt att rätt algoritm använts. Det öppnar för en så kallad algorithm confusion-attack, där angriparen med hjälp av en annan algoritm kan tvinga systemet att acceptera en “falsk” token.

---

###  

### 4\. Attacken steg för steg, och OWASP-kopplingen

För att förstå attacken behöver man veta att det finns två sätt att signera en token. Det ena använder en enda hemlig nyckel, som servern håller för sig själv och använder både till att skapa signaturen och kontrollera den. Det andra använder ett nyckelpar: en privat nyckel som skapar signaturen, och en separat publik nyckel som kontrollerar den. Den publika nyckeln är tänkt att kunna delas öppet, och det är ofarligt, eftersom den bara kan kontrollera signaturer, inte skapa nya.

Och det är där bristen kommer in. Den gamla versionen av jwt-token kontrollerar inte tillräckligt noga vilket av de här sätten som använts.

Så en angripare kan skapa en egen token och skriva in en annan användares ID i den.

De signerar tokenen med den publika nyckeln och lurar servern att behandla den som om det vore den hemliga nyckeln. Och den gamla versionen märker inte skillnaden.

Sen skickar de tokenen till vårt API. JWT-verifieringen godkänner den.

Resultatet är att angriparen är inloggad som någon annan, utan att någonsin ha vetat deras lösenord.

Den här attacken förutsätter att servern använder nyckelpar-metoden, med en publik nyckel. Vår app gör inte det,  vi använder endast en hemlig nyckel, så ingen publik nyckel finns att missbruka. Men ett autentiseringspaket med tre kända brister är en risk oavsett. \- och nästa ändringar i koden kan göra den nåbar.. 

I STRIDE är det här Spoofing. I OWASP  mappar det mot A03, Software Supply Chain Failures. Det handlar om att sårbarheter kommer in via tredjepartskod man inte skrivit själv.  Men vi bär ansvaret för det ändå. Och det är poängen med kategorin: för allt som körs i din app är ditt ansvar, även det du lånat in.

---

### 5\. Åtgärden \+ övriga fynd

Åtgärden är en rad.

Vi ändrar "jsonwebtoken": "8.5.1" till "^9.0.0" och kör npm install. Version 9 åtgärdar alla tre sårbarheterna och kräver dessutom att man explicit anger vilken algoritm som ska accepteras, vilket stänger algorithm confusion-attacken. Och tak-tecken framför versionsnumret gör att paketet får framtida säkerhetsuppdateringar automatiskt, så samma misstag inte upprepas.

Kort om resten:

node-tar: alla sex är path traversal. Det innebär att en angripare manipulerar en filsökväg för att skriva en fil utanför den avsedda mappen, till exempel skriva över en känslig fil genom att döpa en fil i arkivet till något som bla bla../../.env. Eftersom vår app aldrig packar upp arkiv går det inte att utnyttja idag. Men vi åtgärdar det ändå för att minska attack-ytan, skulle appen byggas ut, eller en angripare ta sig in en annan väg, ska det inte ligga kvar. Det fixas via versions-styrning av paketet (i vår branch med ett overrides-block, alternativt npm audit fix).

Vite-gruppen: åtgärdas på samma sätt och berör ändå bara utvecklingsläget.

QS: löser sig genom att uppdatera Express, som då drar in en patchad version.

---

### 6\. Slutsats

Sammanfattningsvis: 16 alerts, fyra paket, och det viktigaste fyndet löstes med en liten ändring.

En viktig poäng att notera här: Dependabot granskar bara beroenden, inte vår egen kod. Vår egen kod granskade vi själva i Fas 2: autentisering på DELETE, ägarkontroll, indatavalidering och rate limiting. De två granskningarna täcker olika saker; vi tog koden vi skrivit, Dependabot tog koden vi lånat in. Tillsammans täcker de hela appen.

länk till vår presentation: [FAS3.pdf](https://github.com/user-attachments/files/29040497/FAS3.pdf)

<img width="1204" height="907" alt="{933BD7C2-423C-415F-96D2-B434713388A5}" src="https://github.com/user-attachments/assets/9d185fa9-70a3-418b-8bcf-c7a18c6a05ca" />

