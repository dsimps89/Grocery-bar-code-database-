# Home Inventory V2

A phone-friendly household purchasing/inventory prototype for GitHub Pages.

## What's new in V2
- Camera barcode scanning for common UPC/EAN formats when the browser supports `BarcodeDetector`
- Automatic recognition of barcodes already saved in your local product database
- Optional online food-product lookup using Open Food Facts for unknown barcodes
- Brand and category fields
- Warning for likely retailer-generated variable-measure UPCs (2xxxxxxxxxxx); V2 deliberately does not guess their embedded price/weight because encoding varies by retailer
- Purchase history
- Improved Fixed / Semi-variable / Variable monthly forecasting
- Estimated monthly spend for Fixed + Semi-variable items
- Cleaner print layout for browser **Print / Save as PDF**
- JSON backup/import

## Files
- `index.html` - main page
- `css/styles.css` - responsive/mobile styling and print/PDF styling
- `js/db.js` - local data storage
- `js/app.js` - lock screen, scanner, lookup, transactions, forecasts, JSON and PDF/print workflow

## Run locally
Camera access generally requires HTTPS or localhost. From this folder:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

Prototype access code: `1234`. Change `ACCESS_CODE` at the top of `js/app.js`.

## GitHub Pages
1. Create a GitHub repository.
2. Upload the **contents** of this folder so `index.html` is at the repository root.
3. Open repository **Settings > Pages** and deploy from your branch.
4. Open the HTTPS Pages address on your phone and allow camera access.

## How scanning works
The camera scanner reads the number encoded in a barcode. If the barcode is already in your local database, V2 fills its saved product information immediately. If it is unknown, V2 tries an Open Food Facts lookup. If no match is available, enter the product once; future scans will recognize it locally.

Browser barcode support varies. Manual entry always remains available. UPC-A, UPC-E, EAN-8, EAN-13 and Code 128 are requested when supported by the browser.

## Product lookup
Unknown barcodes are queried from the public Open Food Facts API. This is useful for many food products but is not a complete universal UPC database. Household/non-food items and some Canadian/private-label products may need one-time manual entry.

## Variable-weight/store labels
Some retailer-generated UPC labels (often beginning with `2`) can encode item/price/weight information. Retailers can use different schemes, so this prototype only identifies them as likely variable-measure labels and stores the complete barcode. A later store-specific parser can be added once sample labels from the stores you use are available.

## Forecast logic
- **Fixed:** average quantity across all represented months.
- **Semi-variable:** weighted average of the most recent three represented months, giving more weight to newer months.
- **Variable:** average quantity in months where the item was actually purchased; shown as optional rather than automatically included in the core spend estimate.

More history means a more useful forecast.

## PDF
Open **Monthly**, then choose **Print / Save PDF**. Print CSS hides the rest of the app and produces a clean monthly report.

## Storage and privacy
Inventory data is stored in the browser's `localStorage` on that device. GitHub Pages hosts the app code, not your inventory database. Export JSON periodically if you want backups or want to move data to another device.

The access-code screen is only a convenience barrier; the code is client-side and is not secure authentication.

## Suggested V3 upgrades
- PWA install/offline cache
- IndexedDB for larger data sets
- scan-IN / scan-OUT and current stock
- par/reorder levels
- expiration dates
- store and price history
- automatic classification from purchase regularity
- store-specific parsing of variable-weight labels
- shared cloud database + real authentication
