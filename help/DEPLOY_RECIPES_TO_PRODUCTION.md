# Getting the new code + your products + recipes onto the live site

This is a **two-part** job. Part A puts the new code and database tables on the
server (you do this over SSH). Part B loads your products and recipes through the
website itself (you do this in the browser, logged in as admin).

The live site (`erp.ghazanfarbrothers.com`) is a **separate server with its own
database** — it does not share anything with your local machine, which is why
nothing you did locally shows up there until you do the steps below.

---

## Part A — Deploy the code (SSH into the server)

All the code is already pushed to GitHub on the `main` branch. On the server:

```bash
# 1. Go to the folder that has docker-compose.yml (you know this path)
cd /path/to/ghazanfar-erp-backend

# 2. Pull the latest code
git fetch origin
git checkout main
git pull origin main

# 3. Rebuild and restart the backend + frontend with the new code
docker-compose up -d --build          # if that errors, try:  docker compose up -d --build

# 4. Apply the new database tables (recipes, manufacturing, product types)
docker-compose exec backend npx prisma migrate deploy

# 5. Check everything came up healthy
docker-compose ps
```

- Step 4 is important — the container does **not** migrate the database by
  itself. If it prints an error, copy the whole error and send it to me.
- After this, `erp.ghazanfarbrothers.com` is running the new code, but its
  database is still empty of products/recipes — that's Part B.

---

## Part B — Load your data (in the browser, on the live site)

Two files were generated for you on your local machine, here:

```
d:\ghazanfar-erp-backend\prod-import\products.csv     (2,541 products)
d:\ghazanfar-erp-backend\prod-import\recipes.xlsx     (31 recipes, 837 lines)
```

**Do them in this order — products first, recipes second** (the recipes point at
the products by their code, so the products must exist first).

### B1. Import the products
1. Log in to `erp.ghazanfarbrothers.com` as your admin user.
2. Go to **Administration → Import/Export**.
3. Click the **Import** tab, choose entity **Products**.
4. Upload **`products.csv`**, let it parse/preview, then click **Import**.
5. You should see roughly **2,541 imported**. (If you run it twice, the second
   run just skips everything as duplicates — harmless.)

### B2. Import the recipes
1. Go to **Reports → Recipes (BOM)**.
2. On the **Recipes** tab, click **📁 Import CSV**.
3. Upload **`recipes.xlsx`**, review the preview (should say 31 recipes,
   0 errors), then click Import.
4. The Recipes tab should now list **31 recipes**.

### B3. Check it worked
- **Reports → Recipes (BOM)** shows 31 recipes.
- **Inventory & Stock → Manufacturing Orders → New Build** — searching a product
  (e.g. "juicer") now lists recipes you can build.

---

## Notes & gotchas

- **"More than 3k products"**: the file has **2,541** — that's everything
  currently in your local system. If you were expecting more, some rows in your
  original upload may have been duplicates or were filtered out during seeding.
  Compare against your source file if the count matters.
- **Product types**: the importer brings every product in as a normal product.
  The 66 component parts that were auto-created locally are included by code, so
  recipe costs are correct, but if you later want them tagged as "raw material"
  you can adjust that in the app.
- **Nothing is destructive**: every import only *adds*. If a recipe or product
  is wrong you can fix or deactivate it in the app; you won't lose data.
- The two files in `prod-import/` are local-only working files — they are not
  committed to git.
