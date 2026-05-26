# PWA Database Connection Options: Azure Blob, SQL Azure, Local MSSQL, and Neon PostgreSQL

Yes. Your PWA can use **SQL Azure, local SQL Server, or Neon PostgreSQL**, but the browser/PWA should **not connect directly to the database**.

Your current app is built around this pattern:

```js
fetch(blobUrl)
csvText = await response.text()
build(csvText, fileTimestamp)
```

It currently loads one CSV file from Azure Blob Storage and then parses/aggregates it entirely in the browser. The important part is that your `build(csvText, fileName)` function already expects a CSV text payload, so you can keep most of the report code unchanged.

---

## Best Architecture

Use this pattern:

```text
PWA / index.html
        ↓ fetch()
/api/MerchPlanDynamicCSV
        ↓ secure server-side connection
SQL Azure / Local MSSQL / Neon PostgreSQL
```

The database credentials stay on the server. The PWA only calls an HTTP endpoint.

---

## Recommended Options

### Option 1 — SQL Azure + Small API Layer

This is the best enterprise path for your current Cybex BI/DW architecture.

Use:

```text
Azure Static Web App or normal web host
+ Azure Function / App Service API
+ Azure SQL Database
+ SQL view or stored procedure
```

Microsoft’s Azure SQL JavaScript guidance uses server-side Node.js with passwordless/managed identity patterns, not browser-side database credentials. Microsoft explicitly describes using `DefaultAzureCredential` and managed identity for cloud environments.

Your browser code becomes:

```js
const dataUrl = "/api/MerchPlanDynamicCSV";

async function readData() {
  const response = await fetch(`${dataUrl}?_cb=${Date.now()}`);
  if (!response.ok) throw new Error(await response.text());

  const csvText = await response.text();
  build(csvText, "SQL Azure");
}

readData();
```

Your API returns the **same CSV shape** as the Blob file.

---

### Option 2 — Microsoft Data API Builder

This is probably the fastest “database-to-PWA” option if you do not want to write much API code.

Microsoft Data API Builder generates REST and GraphQL endpoints over **SQL Server, Azure SQL, PostgreSQL, MySQL, and Cosmos DB**.

This is attractive because your PWA could call:

```text
/api/MerchPlanDynamicCSV?$filter=YR eq 2025
```

or a GraphQL query. It supports database views and stored procedures, which fits your BI/DW pattern well.

For your app, I would expose a SQL view such as:

```sql
CREATE OR ALTER VIEW dbo.vwMerchPlanDynamicCSV
AS
SELECT
    MX,
    YR,
    Category,
    DeptID,
    ClassID,
    Sales,
    SalesLY,
    Units,
    UnitsLY,
    GM,
    MKDN,
    Stock,
    StockLY
FROM dbo.DWMXMerchPlan;
```

Then the PWA fetches JSON instead of CSV, or the API can convert it to CSV.

---

### Option 3 — Keep Blob, but Generate the CSV from SQL

This is the lowest-risk change.

```text
SQL Azure / Local SQL Server
        ↓ scheduled export
Azure Blob Storage CSV
        ↓ existing PWA fetch
index.html
```

Your PWA does not change. You simply replace the manual/static CSV with an automated export.

This is excellent for executive dashboards where the data updates nightly or hourly. It is less ideal if you need live filtering, drill-down, security by user, or writeback.

---

### Option 4 — Local MSSQL Server

A PWA cannot safely connect directly to local SQL Server. You need a local API:

```text
PWA
 ↓
http://localhost:5000/api/MerchPlanDynamicCSV
 ↓
Local SQL Server
```

This can be a small:

```text
ASP.NET Core Minimal API
Node.js Express API
Windows Service with HTTP endpoint
IIS-hosted API
```

For a client deployment, I would use **ASP.NET Core Minimal API** or **IIS-hosted .NET API** because it fits your MSSQL/Windows retail environment.

---

### Option 5 — Neon PostgreSQL

Neon is viable, especially if you want a lightweight serverless Postgres backend. Neon’s serverless driver is designed for JavaScript/TypeScript serverless and edge environments over HTTP or WebSockets.

But I would still not put a Neon database connection string directly inside `index.html`. Neon examples assume the connection string is stored in an environment variable such as `DATABASE_URL`, which belongs on the server/API side, not in a public PWA.

Good Neon architecture:

```text
PWA
 ↓
Vercel / Netlify / Azure Function / Cloudflare Worker
 ↓
Neon PostgreSQL
```

---

## My Recommendation for Your Case

For your Cybex BI/DW reports, use **SQL Azure + API endpoint returning the same CSV format**.

That gives you:

```text
Minimal front-end change
Same build(csvText) logic
Secure database credentials
Option to use views/stored procedures
Future support for filters, client selection, date range, category, department, class
```

The front-end change is tiny:

```js
const dataUrl = "/api/MerchPlanDynamicCSV";

async function readData() {
  try {
    const response = await fetch(`${dataUrl}?_cb=${Date.now()}`, {
      method: "GET",
      headers: {
        "Accept": "text/csv"
      }
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const lastModifiedHeader = response.headers.get("Last-Modified");
    const fileTimestamp = lastModifiedHeader
      ? new Date(lastModifiedHeader).toLocaleString()
      : "Live SQL";

    const csvText = await response.text();
    build(csvText, fileTimestamp);

  } catch (error) {
    setErr("Could not load SQL data: " + error.message);
  }
}

readData();
```

---

## Important Fix in the Attached File

Your script references these elements:

```js
document.getElementById("csvFile").addEventListener(...)
document.getElementById("demoBtn").addEventListener(...)
```

But the uploaded HTML does not include elements with IDs `csvFile` or `demoBtn`, so those lines can throw a browser error.

Make them safe:

```js
const csvFile = document.getElementById("csvFile");
if (csvFile) {
  csvFile.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const txt = await f.text();
    lastFileText = txt;
    build(txt, f.name);
  });
}

const demoBtn = document.getElementById("demoBtn");
if (demoBtn) {
  demoBtn.addEventListener("click", () => {
    if (!lastFileText) {
      setErr("No prior file selected yet.");
      return;
    }
    build(lastFileText, "last-selected.csv");
  });
}
```

---

## Bottom Line

Use:

```text
PWA → API → SQL Azure
```

or:

```text
PWA → API → Local MSSQL
```

or:

```text
PWA → API → Neon PostgreSQL
```

Do **not** use:

```text
PWA → direct SQL connection
```

For your current app, the cleanest implementation is to replace the Blob URL with `/api/MerchPlanDynamicCSV` and have that API return the exact same CSV columns your `build()` function already consumes.

---

## Source Notes

- The attached `index.html` loads CSV data from Azure Blob Storage and passes the CSV text to `build(csvText, fileTimestamp)`.
- Microsoft Azure SQL JavaScript guidance favors server-side access and managed identity/passwordless patterns.
- Microsoft Data API Builder supports REST and GraphQL endpoints over SQL Server, Azure SQL, PostgreSQL, MySQL, and Cosmos DB.
- Neon PostgreSQL serverless examples use server-side environment variables such as `DATABASE_URL`, not public browser-side connection strings.
