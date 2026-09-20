# DevEstimate — მიმდინარე ჩატის ცვლილებებისა და სამუშაო მდგომარეობის სრული კონტექსტი

> ეს ფაილი არის **handoff / continuation context**.  
> მისი მიზანია, რომ შემდეგ ჩატში ამ ფაილის წაკითხვის შემდეგ შესაძლებელი იყოს მუშაობის გაგრძელება ისე, თითქოს წინა ჩატის მთელი ტექნიკური კონტექსტი უკვე ცნობილია.
>
> **მნიშვნელოვანი:** ქვემოთ აღწერილია არა მხოლოდ დასრულებული ცვლილებები, არამედ ის პრობლემებიც, რომლებიც ბოლოს დარჩა გამოსასწორებელი და რა უნდა შემოწმდეს შემდეგ.

---

## 1. პროექტი

- GitHub repository: `PNatroshvili/devestimate`
- მთავარი branch: `main`
- პროდუქტი: **DevEstimate**
- ძირითადი არქიტექტურა:

```text
Client Request
    ↓
AI Analysis
    ↓
Structured Mockup Specs
    ↓
Deterministic UI Renderer
    ↓
Supabase Storage
    ↓
Dashboard / Client Requests Gallery
```

თავდაპირველად mockup-ები მთლიანად image-generation-ზე იყო დამოკიდებული, მაგრამ აღმოჩნდა, რომ FLUX ტიპის მოდელები ხშირად ცუდად ხატავენ UI-ს:
- ტექსტი არაზუსტია;
- ცხრილები/ფორმები არასწორად ლაგდება;
- რეალური UI-ს ნაცვლად იღება „UI-ს მსგავსი სურათი“.

ამიტომ გაკეთდა ახალი მიდგომა:

**AI აღწერს UI-ს სტრუქტურას → renderer რეალურად ხატავს UI-ს SVG-ში.**

Image generation დარჩა მხოლოდ როგორც სურვილისამებრ visual asset layer.

---

# 2. ამ ჩატში შესრულებული მთავარი ცვლილებები

## 2.1. Deterministic UI Mockup Architecture

შეიქმნა branch:

```text
feat/deterministic-ui-mockups
```

შემდეგ ცვლილებები გაერთიანდა `main`-ში.

PR:

```text
PR #1
Replace FLUX UI mockups with deterministic structured render
```

PR URL:

https://github.com/PNatroshvili/devestimate/pull/1

PR საბოლოოდ squash-merge-ით შევიდა `main`-ში.

ძირითადი merge commit-ის პერიოდის commit:

```text
3c8ffe796f7ee8568d4d6297f3bd98b513237d57
```

---

# 3. `analyze-request` — structured mockup specs

ფაილი:

```text
supabase/functions/analyze-request/index.ts
```

ცვლილება:

AI analysis-ს დაემატა ზუსტად 4 structured mockup specification:

```text
overview
core
admin
mobile
```

თითოეული mockup spec შეიცავს:

```text
slot
title
subtitle
nav
primaryAction
stats
widgets
tableColumns
formFields
theme
```

`theme` შეიძლება იყოს:

```text
light
dark
neutral
```

AI-ს prompt შეიცვალა ისე, რომ ის აღარ უნდა ეცადოს უბრალოდ „სქრინის დახატვას“.

ამის ნაცვლად AI აბრუნებს:

> რა უნდა დახატოს deterministic renderer-მა.

ანუ AI-ს ფუნქციაა:

```text
Business Request
    ↓
UX interpretation
    ↓
Structured UI description
```

ხოლო renderer-ის ფუნქციაა:

```text
Structured UI description
    ↓
Actual SVG UI
```

---

## 3.1. `analyze-request` deployment

`analyze-request` განახლდა:

```text
version 8
ACTIVE
verify_jwt: true
```

---

# 4. `generate-request-mockups` — FLUX UI painting → deterministic SVG

ფაილი:

```text
supabase/functions/generate-request-mockups/index.ts
```

ძველი მიდგომა იყო FLUX-ით UI-ს პირდაპირ სურათად გენერირება.

ახლა ფუნქცია:

1. იღებს structured `mockupSpecs`;
2. არჩევს slot-ს;
3. აგენერირებს deterministic SVG-ს;
4. SVG-ს ტვირთავს Supabase Storage-ში;
5. აახლებს `client_requests.mockups`;
6. მართავს `mockups_status`;
7. ინახავს `mockups_error`-ს.

Mockup slots:

```text
overview
core
admin
mobile
```

Storage path-ის ტიპი:

```text
userId/requestId/timestamp-slot.svg
```

---

# 5. Visual Assets / Cloudflare FLUX

მნიშვნელოვანი არქიტექტურული გადაწყვეტილება:

**Cloudflare FLUX აღარ არის UI-ს მთავარი renderer.**

იგი გამოიყენება მხოლოდ სურვილისამებრ visual asset layer-ისთვის.

ამჟამად ფუნქციაში არსებობს:

```text
generateVisualAsset(...)
```

რომელიც იყენებს:

```text
@cf/black-forest-labs/flux-2-klein-4b
```

თუ visual asset გენერაცია ვერ შესრულდა, deterministic SVG მაინც უნდა შეიქმნას.

ანუ:

```text
FLUX asset succeeds
    ↓
asset + deterministic UI

FLUX asset fails / unavailable
    ↓
deterministic UI მაინც უნდა იმუშაოს
```

ეს მნიშვნელოვანია, რადგან DevEstimate-ის mockup generation არ უნდა იყოს დამოკიდებული Cloudflare-ზე.

---

# 6. `generate-request-mockups` authentication fix

პრობლემა აღმოჩნდა Edge Function authentication/configuration-ში.

`supabase/config.toml`-ში დაემატა:

```toml
[functions.generate-request-mockups]
verify_jwt = false
```

რატომ:

ფუნქცია თვითონ ამოწმებს `Authorization: Bearer <JWT>` header-ს.

ფუნქციის შიგნით ხდება JWT parsing და `sub`-ის ამოღება.

ლოგიკა:

```text
Authorization header
    ↓
Bearer token
    ↓
JWT payload
    ↓
sub = userId
    ↓
request.owner_id === userId ?
    ↓
allow / reject
```

ეს გაკეთდა იმიტომ, რომ Supabase-ის platform-level legacy JWT verification შეიძლება პრობლემური იყოს ახალი asymmetric signing key-ების შემთხვევაში, მაშინ როცა custom verification უკვე ფუნქციაში არსებობს.

---

# 7. `deno.json` import map-ის პრობლემა

`generate-request-mockups` deployment-ის დროს თავდაპირველად მოხდა შეცდომა:

```text
import map path does not exist ... source/deno.json
```

ამის გამოსასწორებლად დაბრუნდა:

```text
supabase/functions/generate-request-mockups/deno.json
```

შიგთავსი:

```json
{
  "imports": {}
}
```

შემდეგ ფუნქცია წარმატებით დაიდეპლოინდა.

---

# 8. მიმდინარე Supabase Edge Function version

ბოლო წარმატებული deployment:

```text
generate-request-mockups
version 27
ACTIVE
verify_jwt: false
import_map: true
```

Supabase project:

```text
project ref:
tenbxnjymiiegarxdoxf
```

Project name:

```text
devestimate
```

Region:

```text
eu-west-1
```

Status:

```text
ACTIVE_HEALTHY
```

---

# 9. Client Request Detail — popup → dedicated page

თავდაპირველად Request Detail იხსნებოდა modal/popup-ად.

მიზანი გახდა:

```text
Dashboard
  ↓
Requests
  ↓
Click request
  ↓
Dedicated full-page request detail
```

გამოყენებული URL:

```text
/requests/?id=<request-id>
```

Static export compatibility-ს გამო არ გამოვიყენეთ:

```text
/requests/[id]/
```

რადგან GitHub Pages/static export-ს arbitrary dynamic route-ის build-time generation პრობლემა აქვს.

შეიქმნა:

```text
app/requests/page.tsx
```

რომელიც უბრალოდ აბრუნებს:

```tsx
<Dashboard />
```

---

# 10. `Dashboard.tsx` request routing

ფაილი:

```text
components/Dashboard.tsx
```

დაემატა URL parsing:

```ts
const readRequestIdFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const requestId = params.get("requestId") || params.get("id");

  const routeMatch = window.location.pathname.match(
    /^\/requests\/([^/]+)\/?$/
  );

  const routeRequestId = routeMatch
    ? decodeURIComponent(routeMatch[1])
    : null;

  return routeRequestId || requestId;
};
```

ანუ ორივე მხარდაჭერილია:

```text
/requests/?id=123
```

და:

```text
/requests/123
```

---

# 11. Browser history / tab navigation fix

ეს იყო ერთ-ერთი ყველაზე მნიშვნელოვანი UX პრობლემა.

პრობლემა:

1. შედიოდი request-ში;
2. URL ხდებოდა:

```text
/requests/?id=<id>
```

3. შემდეგ სხვა tab-ზე გადადიოდი;
4. URL მაინც request URL რჩებოდა;
5. შედეგად Dashboard-ის state და URL ერთმანეთს აღარ ემთხვეოდა;
6. UI ირეოდა.

ეს გამოსწორდა.

დაემატა:

```ts
useEffect(() => {
  const syncHistory = (event?: PopStateEvent) => {
    const requestId = readRequestIdFromLocation();
    const historyPage = event?.state?.page as Page | undefined;

    setRequestIdFromUrl(requestId);
    setPage(requestId ? "requests" : (historyPage || "dashboard"));
  };

  syncHistory();

  window.addEventListener("popstate", syncHistory);

  return () => {
    window.removeEventListener("popstate", syncHistory);
  };
}, []);
```

---

# 12. Centralized dashboard navigation

დაემატა:

```ts
const navigateToPage = (target: Page) => {
  setRequestIdFromUrl(null);
  setPage(target);

  window.history.pushState(
    { page: target },
    "",
    target === "requests" ? "/requests/" : "/",
  );

  window.scrollTo(0, 0);
};
```

ამის მიზანია:

**ნებისმიერ tab-ზე გადასვლისას ძველი request ID გაქრეს.**

მაგალითად:

```text
/requests/?id=ABC
```

→ Projects

უნდა გახდეს:

```text
/
```

და არა:

```text
/requests/?id=ABC
```

---

# 13. Request opening

ახლა request-ის გახსნა ხდება:

```ts
const openRequest = (requestId: string) => {
  setRequestIdFromUrl(requestId);
  setPage("requests");

  window.history.pushState(
    { page: "requests", requestId },
    "",
    "/requests/?id=" + encodeURIComponent(requestId),
  );

  window.scrollTo(0, 0);
};
```

ამით:

- browser history მუშაობს;
- request ID state-შია;
- URL-შია;
- tab state სწორად არის მიბმული URL-ზე.

---

# 14. `ClientRequests.tsx` changes

ფაილი:

```text
components/ClientRequests.tsx
```

დაემატა props:

```ts
onOpenRequest?: (requestId: string) => void;
requestIdFromUrl?: string | null;
standalone?: boolean;
```

Request row-ის click აღარ აკეთებს პირდაპირ:

```text
window.location.href = ...
```

ამის ნაცვლად:

```text
onOpenRequest?.(request.id)
```

ეს მნიშვნელოვანია, რადგან Dashboard ახლა ცენტრალურად აკონტროლებს history/state-ს.

---

# 15. Request detail standalone mode

`RequestDetailModal` შენარჩუნდა, მაგრამ დაემატა:

```text
standalone
```

რეჟიმი.

თუ:

```text
standalone === false
```

→ ჩვეულებრივი modal.

თუ:

```text
standalone === true
```

→ იგივე detail UI გამოიყენება full-page route-ში.

ამან თავიდან აგვაცილა request detail-ის UI-ს თავიდან დაწერა.

---

# 16. Full-page detail CSS

`app/globals.css`-ში დაემატა dedicated route styling.

მთავარი მიზნები:

```text
width: 100%
min-height: 100vh
no modal overlay
no max-height
no popup shadow
no rounded modal shell
normal document scrolling
sticky header
```

მთავარი selector-ებია:

```css
.request-detail-route
.request-detail-backdrop
.request-detail-card
```

Header sticky გახდა:

```css
position: sticky;
top: 0;
z-index: 4;
```

Body აღარ უნდა იყოს modal-ის შიდა scroll container.

---

# 17. Full-page scrolling პრობლემა

პირველი CSS fix-ის შემდეგ აღმოჩნდა, რომ გვერდი მაინც არ scroll-დებოდა.

მიზეზი აღმოჩნდა `RequestDetailModal`-ში არსებული body scroll lock:

ძველი ლოგიკა:

```ts
document.body.style.overflow = "hidden";
```

ეს ხდებოდა ყოველთვის, მათ შორის standalone full-page route-ზეც.

გასწორდა ასე:

```ts
if (!standalone) {
  document.body.style.overflow = "hidden";
}
```

cleanup-იც მხოლოდ modal რეჟიმში აბრუნებს ძველ მდგომარეობას.

Effect-ის dependency გახდა:

```text
[onClose, standalone]
```

commit:

```text
e7be42d5137ee08b0719baa888121158797a5eb8
```

commit message:

```text
Allow full page scrolling on request detail
```

---

# 18. Request detail CSS commit

ცალკე commit:

```text
c6842088f873234a238da638bb2656f7bb5b02af
```

message:

```text
Polish client request detail page and restore full scrolling
```

---

# 19. Request route/history commits

ორი მნიშვნელოვანი commit:

```text
e5bb5b57c79cb13055824d51b9a583084a2648b6
```

message:

```text
Fix request route state when switching dashboard tabs
```

და:

```text
9cdc6be3e9833b5e23c0f72ecefe22adbf19abee
```

message:

```text
Keep request navigation in sync with dashboard history
```

---

# 20. Dashboard page routing საბოლოო ლოგიკა

მნიშვნელოვანი render logic:

```tsx
if (page === "new")
  return <NewProject onBack={() => navigateToPage("dashboard")} />;

if (page === "rates")
  return <PricingRates onBack={() => navigateToPage("dashboard")} />;

if (page === "projects")
  return (
    <Projects
      onBack={() => navigateToPage("dashboard")}
      onNew={() => navigateToPage("new")}
      onOpen={openProject}
    />
  );

if (page === "templates")
  return (
    <Templates
      onBack={() => navigateToPage("dashboard")}
      onNew={() => navigateToPage("new")}
    />
  );

if (page === "analytics")
  return <Analytics onBack={() => navigateToPage("dashboard")} />;

if (page === "requests")
  return (
    <ClientRequests
      requestIdFromUrl={requestIdFromUrl}
      standalone={Boolean(requestIdFromUrl)}
      onOpenRequest={openRequest}
      onBack={() => navigateToPage("dashboard")}
    />
  );
```

---

# 21. Requests tab-ის ქცევა

მიზანი იყო:

როცა კონკრეტულ request-ში ხარ:

```text
Requests
  └── Selected Request
```

და სხვა tab-ზე გადასვლისას:

```text
Requests selected request state
```

უნდა გაქრეს.

სხვა tab-ზე გადასვლისას:

```text
setRequestIdFromUrl(null)
```

და URL უნდა დაბრუნდეს შესაბამის dashboard URL-ზე.

Requests tab-ზე დაბრუნებისას უნდა გამოჩნდეს Requests list.

---

# 22. GitHub Pages deployment

Workflow:

```text
.github/workflows/deploy.yml
```

Deploy ხდება `main` branch-ზე push-ის შემდეგ.

Build:

```text
npm run build
```

შემდეგ deploy GitHub Pages-ზე.

მნიშვნელოვანი: frontend ცვლილებების შემთხვევაში საჭიროა GitHub Actions-ის დასრულების შემოწმება.

**არ თქვა „დაიდეპლოინდა“ მხოლოდ commit-ის push-ის გამო — შეამოწმე workflow status.**

---

# 23. Live browser verification-ის შეზღუდვა

ამ ჩატში web tool-მა live site-ის გახსნა ვერ შეძლო.

მაგალითად:

```text
https://estimate.skup.ge/requests/?id=d8a455a9-1681-4977-bdb9-3a9d254266aa
```

web tool-ის პასუხი იყო დაახლოებით:

```text
Internal Error
URL is not accessible via this tool
```

ამიტომ:

**არ უნდა ჩაითვალოს, რომ live browser testing შესრულდა.**

კოდისა და deployment-ის დონეზე ცვლილებები შემოწმდა, მაგრამ real browser interaction-ის სრული verification არ ყოფილა შესაძლებელი.

---

# 24. Supabase Client Requests database

Project:

```text
tenbxnjymiiegarxdoxf
```

Table:

```text
public.client_requests
```

ძირითადი columns:

```text
id
owner_id
request_link_id
request_token
project_name
client_name
company
email
phone
type
description
features
deadline
budget
flags
notes
analysis
status
created_at
budget_currency
client_message
email_notification_sent_at
email_notification_error
mockups
mockups_status
mockups_error
```

RLS ჩართულია.

---

# 25. არსებული request-ები

ამ ჩატში ნანახი ძირითადი request IDs:

```text
41742dcc-7156-44d6-9e15-805a0ec70600
MegaCart Online Marketplace
```

```text
d14a5e2f-9937-4ad5-a722-9d802fd43599
MarketHub Mega Store
```

```text
d8a455a9-1681-4977-bdb9-3a9d254266aa
Smart Appointment & CRM
```

---

# 26. ახალი test request — დიდი საადვოკატო ბიზნესისთვის

ამ ჩატში შეიქმნა ახალი test request:

```text
id:
11f14744-c113-4fef-81a4-9f001c5d9df4
```

Project:

```text
LexBridge Legal Group — Corporate Law Platform
```

Company:

```text
LexBridge Legal Group
```

Email:

```text
qa@lexbridge.example
```

Phone:

```text
+995 555 321 789
```

Type:

```text
Web
```

Token:

```text
qa-lexbridge-20260920-2247
```

Deadline:

```text
2027-02-28
```

Budget:

```text
250000 GEL
```

Status:

```text
New
```

Feature count:

```text
16
```

---

# 27. LexBridge test request features

ტესტ request-ში გამოყენებულია დიდი law firm-ისთვის შესაბამისი scope:

1. მთავარი გვერდი და პრემიუმ ბრენდინგი
2. პრაქტიკის მიმართულებების კატალოგი და დეტალური გვერდები
3. ადვოკატებისა და პარტნიორების პროფილები
4. საქმეების / წარმატებული ქეისების ბიბლიოთეკა
5. იურიდიული სიახლეები და ბლოგი
6. კლიენტის კონსულტაციის მოთხოვნის ფორმა
7. კონტაქტი და მრავალფილიალური ოფისების გვერდები
8. ქართული / ინგლისური მრავალენოვანი ვერსიები
9. CMS
10. ადმინისტრაციული პანელი და როლები
11. SEO, sitemap, structured data და analytics
12. დოკუმენტების უსაფრთხო ატვირთვის საფუძველი
13. CRM integration-ready API architecture
14. ადვოკატების / პრაქტიკის / სტატიების ძებნა
15. კორპორატიული კლიენტებისთვის gated content
16. Mobile responsive UI

Visual direction:

```text
dark navy
ivory
restrained gold accents
clear typography
generous whitespace
premium corporate law-firm aesthetic
no real legal data
```

---

# 28. LexBridge request verification

შექმნის შემდეგ database-ით დადასტურდა:

```text
status = New
budget = 250000
currency = GEL
feature_count = 16
mockups_status = idle
has_analysis = false
```

AI analysis/mockup generation შექმნისას ავტომატურად არ გაეშვა.

ეს request უნდა აიღოს Client Requests-ის არსებული flow-მა refresh/open-ის შემდეგ.

---

# 29. Email notification პრობლემა

მომხმარებელმა აღნიშნა:

> ახალ request-ზე email არ მოვიდა.

გამოკვლევით აღმოჩნდა, რომ:

```text
submit_client_request
```

RPC request-ს database-ში ინახავდა, მაგრამ frontend:

```text
lib/clientRequests.ts
```

არ იძახებდა:

```text
send-request-email
```

Edge Function.

---

# 30. Email flow-ის fix

ფაილი:

```text
lib/clientRequests.ts
```

submit flow შეიცვალა.

ახლა:

```ts
const { data, error } = await supabase.rpc(
  "submit_client_request",
  {
    p_token: token,
    p_payload: payload,
  }
);

if (error) throw error;

const requestId = String(data);

const { error: emailError } =
  await supabase.functions.invoke(
    "send-request-email",
    {
      body: {
        requestId,
        requestToken: token,
      },
    }
  );

if (emailError) {
  console.error(
    "Request notification email failed:",
    emailError
  );
}

return requestId;
```

მნიშვნელოვანი UX გადაწყვეტილება:

**Email-ის failure არ უნდა ნიშნავდეს request submission failure-ს.**

ანუ:

```text
request saved successfully
+
email failed
=
request მაინც წარმატებულია
```

მომხმარებელს არ უნდა მოუწიოს request-ის მეორედ გაგზავნა მხოლოდ notification failure-ის გამო.

---

# 31. Email fix commit

Commit:

```text
c072f4c64bba0e0e5b7528742ce325f07503dfeb
```

Message:

```text
Fix request notification email
```

GitHub Actions ამ commit-ზე დასრულდა წარმატებით.

---

# 32. Resend verification

Resend-ში შემოწმდა ბოლო email-ები.

ნანახი იყო delivered emails, მათ შორის:

```text
MarketHub Mega Store
Smart Appointment & CRM
SKUP Test Booking & CRM
test project
```

მაგრამ LexBridge-ზე email არ არსებობდა, რადგან request შეიქმნა **email fix-ის გაკეთებამდე**.

ამიტომ LexBridge-ის არსებული request-ზე email retroactively არ გაიგზავნა.

ახალი request submission-ზე უკვე უნდა გაიაროს:

```text
submit_client_request
    ↓
request saved
    ↓
send-request-email
```

---

# 33. `send-request-email` Edge Function

არსებობს:

```text
supabase/functions/send-request-email
```

მდგომარეობა:

```text
ACTIVE
version 9
verify_jwt: false
```

---

# 34. მიმდინარე ბოლო პრობლემა — Mockup generation button

მომხმარებელმა ბოლოს გამოგზავნა screenshot.

Screenshot path:

```text
/mnt/data/2e89f0c7-4944-42d8-9d85-8a69efe0cf8a.png
```

სქრინზე ჩანს:

```text
07 Hybrid UI მოქაფები
```

და:

```text
ვიზუალური კონცეფცია ჯერ არ შექმნილა
```

Button:

```text
4 მოქაფის გენერირება
```

ქვემოთ:

```text
4 მაღალი ხარისხის UI/UX მოქაფი მზადდება ამ რექუესთიდან...
```

მომხმარებლის პრობლემა:

> „მოქაფის გენერირებას რომ ვაჭერ არაფერს შვება“

---

# 35. არსებული frontend mockup flow

`components/ClientRequests.tsx`-ში არსებობს:

```ts
const generateMockups = async () => {
  setMockupLoading(true);
  setMockupStatus("generating");
  setMockupError("");
  setMockupProgress(4);

  try {
    const next = await generateRequestMockupsWithAI(request.id);

    setMockups(next);
    setMockupStatus("ready");
    setMockupProgress(100);

    onMockupsSaved(next);
  } catch (error) {
    setMockupStatus("error");

    setMockupProgress(
      (current) =>
        current || Math.min(92, mockups.length * 25)
    );

    const raw =
      error instanceof Error
        ? error.message
        : "მოქაფების გენერირება ვერ მოხერხდა.";

    setMockupError(
      raw === "CLOUDFLARE_NOT_CONFIGURED"
        ? "უფასო AI მოქაფების გენერაციისთვის Cloudflare Workers AI ჯერ არ არის დაკავშირებული. დაამატე CLOUDFLARE_ACCOUNT_ID და CLOUDFLARE_API_TOKEN Supabase Secrets-ში."
        : raw
    );
  } finally {
    setMockupLoading(false);
  }
};
```

Button:

```tsx
<button
  className="secondary"
  onClick={() => void generateMockups()}
  disabled={mockupLoading || !analysis}
>
  <ImageIcon />
  {mockupLoading
    ? "იქმნება 4 მოქაფი..."
    : mockupStatus === "error"
      ? "თავიდან გენერირება"
      : mockups.length
        ? "თავიდან გენერირება"
        : "4 მოქაფის გენერირება"}
</button>
```

თუ `analysis` არ არსებობს, button disabled არის.

Screenshot-ში analysis უკვე ჩანს, ამიტომ ეს სავარაუდოდ არ არის ძირითადი პრობლემა.

---

# 36. Mockup polling

Frontend-ში არსებობს polling, დაახლოებით ყოველ 2 წამში, როცა:

```text
request.mockupStatus === "generating"
```

მიზანი:

```text
slot 1
slot 2
slot 3
slot 4
```

დასრულებისას UI განახლდეს.

---

# 37. Mockup generation-ის სავარაუდო latency პრობლემა

`generate-request-mockups` თითო invocation-ზე ერთ slot-ს ამუშავებს.

ამის შიგნით შეიძლება გაეშვას Cloudflare FLUX visual asset generation.

ამას აქვს timeout დაახლოებით:

```text
30 seconds per slot
```

ამიტომ თუ frontend 4 slot-ს **თანმიმდევრობით** იძახებს, შესაძლოა UX ძალიან ნელი გახდეს:

```text
slot 1 → up to 30s
slot 2 → up to 30s
slot 3 → up to 30s
slot 4 → up to 30s
```

თეორიულად შეიძლება რამდენიმე წუთამდე მივიდეს.

ეს არის ერთ-ერთი მთავარი რამ, რაც შემდეგ უნდა შემოწმდეს.

---

# 38. კიდევ ერთი მნიშვნელოვანი შესაძლო პრობლემა

Edge Function ზოგ შემთხვევაში აბრუნებს HTTP 200-ს, მაგრამ body-ში:

```json
{
  "ok": false,
  "code": "MOCKUP_GENERATION_FAILED",
  "error": "..."
}
```

თუ frontend helper:

```text
generateRequestMockupsWithAI(...)
```

მხოლოდ HTTP status-ს ამოწმებს და `ok:false`-ს არ ამოწმებს, შეიძლება:

```text
HTTP 200
+
ok:false
```

შეცდომად არ აღიქვას.

ამის შემოწმება აუცილებელია.

---

# 39. შემდეგი ყველაზე მნიშვნელოვანი ნაბიჯი

შემდეგ ჩატში პირველ რიგში შეამოწმე:

```text
lib/clientRequests.ts
```

კერძოდ:

```text
generateRequestMockupsWithAI
```

უნდა გაირკვეს:

1. რამდენჯერ იძახებს `generate-request-mockups`-ს;
2. იძახებს თუ არა 4 slot-ს sequential-ად;
3. ამოწმებს თუ არა response body-ში `ok`;
4. რას აკეთებს HTTP 200 + `{ok:false}`;
5. სწორად გადასცემს თუ არა `slot`;
6. სწორად გადასცემს თუ არა auth token-ს;
7. რამდენ ხანს ელოდება თითო invocation-ს.

---

# 40. რეკომენდებული mockup generation architecture

სასურველი სწრაფი UX:

```text
User clicks:
"4 მოქაფის გენერირება"

        ↓

Immediately:
mockupStatus = generating
progress = 4%

        ↓

Start 4 slot jobs concurrently

overview ─┐
core ─────┤
admin ────┼──→ Supabase Edge Function
mobile ───┘

        ↓

Each successful slot:
+25%

        ↓

All 4 ready:
100%
```

ან უკეთესი:

```text
Deterministic SVG
    ↓
immediately generate

Optional FLUX visual assets
    ↓
background enhancement
```

ამ შემთხვევაში UI საერთოდ აღარ უნდა დაელოდოს FLUX-ს.

---

# 41. Deterministic renderer-ის მთავარი პრინციპი

არ უნდა დაბრუნდეს ძველ architecture-ზე:

```text
Prompt → FLUX → fake UI screenshot
```

უნდა დარჩეს:

```text
Request
 ↓
AI structured spec
 ↓
Deterministic SVG renderer
 ↓
Real text/layout/table/form
```

FLUX მხოლოდ decorative/visual assets-ისთვის.

---

# 42. Security Advisor

Supabase Security Advisor-ზე დარჩა ორი warning.

ეს warnings ამ ჩატში **არ შეგვიცვლია**, რადგან ისინი ამ feature-ის ცვლილებებისგან დამოუკიდებელი იყო:

### Warning 1

```text
public.submit_client_request(p_token text, p_payload jsonb)
```

არის:

```text
SECURITY DEFINER
```

და executable არის anon role-ისთვის.

### Warning 2

```text
Leaked password protection disabled
```

ესენიც არ უნდა ჩაითვალოს ამ ჩატში გაკეთებულ fix-ებად.

თუ მომავალში security hardening გაკეთდება, ცალკე task-ად უნდა დამუშავდეს.

---

# 43. Current important commits

ყველაზე მნიშვნელოვანი commit-ები ამ ჩატიდან:

```text
c072f4c64bba0e0e5b7528742ce325f07503dfeb
Fix request notification email
```

```text
170e8568234b3efd5ad0abdee1e7bf3d1499a
Fix mockup function authentication flow
```

```text
d8b5bc7082014dff2f6db93e3e2ba92215feecb8
Restore mockup function import map
```

```text
e5bb5b57c79cb13055824d51b9a583084a2648b6
Fix request route state when switching dashboard tabs
```

```text
9cdc6be3e9833b5e23c0f72ecefe22adbf19abee
Keep request navigation in sync with dashboard history
```

```text
c6842088f873234a238da638bb2656f7bb5b02af
Polish client request detail page and restore full scrolling
```

```text
e7be42d5137ee08b0719baa888121158797a5eb8
Allow full page scrolling on request detail
```

და PR #1-ის მთავარი merge-era commit:

```text
3c8ffe796f7ee8568d4d6297f3bd98b513237d57
Replace FLUX UI mockups with deterministic render
```

---

# 44. Current files touched / relevant

ყველაზე მნიშვნელოვანი ფაილები:

```text
components/ClientRequests.tsx
components/Dashboard.tsx
lib/clientRequests.ts
app/requests/page.tsx
app/globals.css

supabase/config.toml

supabase/functions/analyze-request/index.ts

supabase/functions/generate-request-mockups/index.ts
supabase/functions/generate-request-mockups/deno.json

supabase/functions/send-request-email/...
```

Workflow:

```text
.github/workflows/deploy.yml
```

---

# 45. What is considered DONE

ეს ნაწილები შესრულებულად ჩაითვალოს:

### Architecture
- [x] Structured mockup specs
- [x] Deterministic SVG renderer
- [x] 4 mockup slots
- [x] Optional visual asset generation
- [x] Supabase Storage upload
- [x] mockup status/error updates

### Request Detail
- [x] Dedicated request route
- [x] Full-page detail
- [x] Modal reuse through `standalone`
- [x] Body scroll lock fixed for standalone route
- [x] Browser history support
- [x] Request ID removed when switching tabs
- [x] Centralized dashboard navigation

### Email
- [x] `send-request-email` integrated into new request submission
- [x] Email failure does not fail request submission
- [x] Existing old request not retroactively emailed

### Test Data
- [x] Large law-firm test request created
- [x] LexBridge request verified in database

### Supabase
- [x] `generate-request-mockups` v27 active
- [x] `verify_jwt=false`
- [x] custom JWT handling
- [x] deno import map restored

---

# 46. What is NOT fully verified yet

ესენი აუცილებლად უნდა დარჩეს როგორც open verification items:

### A. Live request detail scrolling
კოდი გასწორებულია, მაგრამ live browser verification tool-ის შეზღუდვის გამო სრულად არ შემოწმებულა.

### B. Live route behavior
უნდა შემოწმდეს რეალურ browser-ში:

```text
request → X/back
request → Requests tab
request → Projects
request → Analytics
request → Templates
browser Back
browser Forward
refresh
```

### C. Mockup button
ჯერ ბოლომდე არ არის დადასტურებული რატომ ჩანს მომხმარებლისთვის თითქოს არაფერი ხდება.

პირველი შესამოწმებელი:

```text
lib/clientRequests.ts
generateRequestMockupsWithAI
```

### D. Mockup generation latency
შესამოწმებელია sequential vs parallel.

### E. `{ok:false}` handling
უნდა დადასტურდეს frontend helper-ში.

### F. GitHub Actions latest statuses
საჭიროების შემთხვევაში ხელახლა შეამოწმე ბოლო commits-ის workflow status.

---

# 47. მნიშვნელოვანი სამუშაო პრინციპი შემდეგი ჩატისთვის

მომხმარებლის მთავარი მოთხოვნა:

> ცვლილებები რეალურად გააკეთე, დატესტე და მხოლოდ ამის შემდეგ თქვი, რომ გაკეთებულია.

ამიტომ:

1. არ შემოიფარგლო მხოლოდ ახსნით;
2. კოდი რეალურად შეცვალე;
3. build გაუშვი;
4. deployment status შეამოწმე;
5. Supabase function deployment გადაამოწმე;
6. სადაც live browser testing შეუძლებელია, პირდაპირ თქვი რომ ვერ იქნა შესრულებული;
7. არ თქვა „ყველაფერი მუშაობს“ მხოლოდ იმიტომ, რომ compile წარმატებულია.

---

# 48. შემდეგი სამუშაო — მოკლე checklist

შემდეგ ჩატში დაიწყე აქედან:

```text
[ ] Open lib/clientRequests.ts
[ ] Find generateRequestMockupsWithAI
[ ] Verify 4 slot calls
[ ] Verify sequential/parallel behavior
[ ] Verify response.ok handling
[ ] Verify function error propagation
[ ] Verify auth header
[ ] Run frontend build
[ ] Check GitHub Actions
[ ] Check Supabase generate-request-mockups version/status
[ ] Test mockup generation for LexBridge request:
    11f14744-c113-4fef-81a4-9f001c5d9df4
[ ] Verify mockups array grows:
    0 → 1 → 2 → 3 → 4
[ ] Verify UI progress
[ ] Verify SVGs render correctly
[ ] Verify request route + scrolling
[ ] Verify tab navigation clears request URL
```

---

# 49. LexBridge request — test target

თუ mockup flow-ის ხელით ტესტირება გჭირდება, გამოიყენე:

```text
Request ID:
11f14744-c113-4fef-81a4-9f001c5d9df4
```

Project:

```text
LexBridge Legal Group — Corporate Law Platform
```

ეს request სპეციალურად შეიქმნა ამ ჩატში QA/testing-ისთვის.

---

# 50. საბოლოო მდგომარეობის მოკლე შეჯამება

ამ ჩატში DevEstimate-ის ძირითადი მიმართულება შეიცვალა:

```text
OLD

Request
 ↓
AI
 ↓
FLUX paints UI
 ↓
Image


NEW

Request
 ↓
AI analysis
 ↓
Structured mockup spec
 ↓
Deterministic SVG renderer
 ↓
Real UI mockup
 ↓
Supabase Storage
 ↓
Dashboard
```

ამას დაემატა:

```text
Request Detail
    ↓
Dedicated route
    ↓
History-aware navigation
    ↓
No stale request URL
    ↓
Full-page scrolling
```

და:

```text
New Client Request
    ↓
Save to DB
    ↓
send-request-email
    ↓
Notification
```

**ყველაზე ბოლო unresolved საკითხი არის mockup generation button-ის რეალური runtime flow/latency.**

შემდეგი სამუშაო სწორედ `generateRequestMockupsWithAI`-ის შემოწმებით უნდა გაგრძელდეს და არა architecture-ის თავიდან შეცვლით.
