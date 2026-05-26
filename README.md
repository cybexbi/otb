# Cybex Report PWA — Deployment Notes

## What's in this bundle

| File | Purpose |
|---|---|
| `index.html` | The report (your original HTML with PWA tags added) |
| `manifest.webmanifest` | Installable-app metadata (name, icons, theme color) |
| `service-worker.js` | Offline cache (cache-first, versioned) |
| `icon-192.png` | Home-screen icon (Android, Windows) |
| `icon-512.png` | Splash screen and store listings |
| `icon-maskable-512.png` | Adaptive icon for Android (safe-zone) |

## Hosting requirements

- **HTTPS is mandatory.** Service workers refuse to register over plain HTTP, except on `localhost`.
- **All files must sit at the same path/scope.** Don't split assets across CDNs unless you adjust the manifest `scope`.
- **MIME types matter.** `.webmanifest` should be served as `application/manifest+json` (most hosts do this automatically; if not, see IIS note below).

## Hosting options ranked for the Cybex stack

### 1. IIS on a Cybex-controlled VM (best for client-confidential reports)
Drop the folder into `C:\inetpub\wwwroot\reports\<client>\`. Bind an HTTPS cert (Let's Encrypt via win-acme works well, or your existing cert). Add this to `web.config` so `.webmanifest` is served correctly:

```xml
<configuration>
  <system.webServer>
    <staticContent>
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
    </staticContent>
  </system.webServer>
</configuration>
```

### 2. Azure Static Web Apps (free tier, HTTPS built in)
`az staticwebapp create` → drag the folder into the deployment. Custom domain support included.

### 3. GitHub Pages (zero-cost, public)
Push the folder to a repo, enable Pages on the `main` branch. URL: `https://<user>.github.io/<repo>/`. Good for public reports, not for confidential client data.

### 4. Cloudflare Pages or Netlify (drag-drop deploy)
Both accept a folder upload and serve HTTPS in seconds.

## Updating the report

When you publish a new version:

1. Replace `index.html` with the new content.
2. Open `service-worker.js` and bump `CACHE_VERSION` (e.g., `cybex-report-v1` → `cybex-report-v2`).
3. Redeploy.

Installed clients will pick up the new version on the next launch — the service worker's `activate` event clears the old cache.

## Verifying it works

After deployment, in Chrome/Edge:

1. Open the URL.
2. F12 → **Application** tab → **Manifest** — should show name, icons, theme color with no errors.
3. **Service Workers** sub-tab — should show "activated and is running".
4. The address bar should show an **install icon** (or three-dot menu → "Install Cybex Report…").

On iOS Safari: Share → "Add to Home Screen". On Android Chrome: a banner offers to install.

## Adapting the template for future reports

Reuse this bundle for every Cybex report:

1. Replace the contents of `index.html` (keep the PWA `<link>`/`<script>` tags in `<head>` and before `</body>`).
2. Update `manifest.webmanifest` — change `name`, `short_name`, and `description` per report.
3. Bump `CACHE_VERSION` in `service-worker.js`.
4. (Optional) Generate a client-specific icon if delivering to a single account.

For client-specific theming, the manifest `theme_color` and `background_color` can be overridden — this colors the title bar and splash screen on Android.

## Limitations to be aware of

- **No printing tweaks needed** — the existing `@media print` CSS still works. Add to Home Screen → open the app → browser print menu produces the same PDF output.
- **Offline = "last fetched version"**. The PWA caches whatever the user loaded last. There is no live data binding.
- **iOS doesn't show an install prompt** — users add via Share menu. The icon and launch screen still come from the manifest.
- **The cache holds ~5–6 MB without issue**; HTML reports are well under that.


Using Azure Blob Presigned URL

https://cybexdw.blob.core.windows.net/data/MerchPlanDynamicCSV.csv?sp=r&st=2026-05-20T15:30:51Z&se=2029-05-01T23:45:51Z&spr=https&sv=2026-02-06&sr=b&sig=xxFMO1RUiRqNvPPte1ITWT6PN9VuNfl5RcUYraIVA9U%3D

You must add your live GitHub Pages URL to your Azure Storage Account's CORS settings:

Log in to the Azure Portal.
Navigate to your Storage Account (cybexdw).
In the left menu, scroll down to Settings and click CORS.
Look at the Blob service tab.
Add a new row (or update your existing one) with these exact settings:
Allowed Origins: https://github.io (Replace username with your actual GitHub username. Do not add a trailing slash / at the end).
Allowed Methods: Select GET.
Allowed Headers: Type *
Exposed Headers: Type *
Click Save at the top of the page.


Using GCS public link

https://storage.googleapis.com/cybexbi/MerchPlanDynamicCSV.csv

Share the Entire Bucket (Recommended for many files)
This method makes every file in the bucket accessible to anyone with the link.
Open the Cloud Storage Buckets page in the Google Cloud console.
Click the name of the bucket you want to make public.
Select the Permissions tab at the top.
Click the Grant access button.
In the New principals field, type allUsers.
In the Select a role dropdown, choose Storage Object Viewer (under the Cloud Storage menu).
Click Save, then confirm by clicking Allow public access in the pop-up.
Get the link: Return to the Objects tab. 
A "Copy URL" button will now appear in the Public access column for every file.

Unlike Azure, GCS handles CORS at the bucket level. 
You can easily edit it in the Google Cloud Console:
Go to the Google Cloud Console Storage Buckets page.
Click the name of your bucket (cybexbi).
Select the Configuration tab.
Scroll down to the Cross-Origin Resource Sharing (CORS) section and click Edit CORS Configuration.
Provide your configuration rules using this structure:
Allowed Origins: https://github.io (and/or http://localhost:3000 for local testing).
Allowed Methods: GET.
Allowed Headers: *
Save the settings.


Using Amazon S3 public link

https://cybexnet.s3.us-east-1.amazonaws.com/data/Cybex/MerchPlanDynamicCSV.csv


Add this JSON payload to your S3 Bucket -> Permissions -> CORS settings

[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["Last-Modified"]
    }
]


Using SQL Azure Web App
https://icy-bay-0f47fa910.7.azurestaticapps.net/