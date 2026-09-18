# Buraya konacak dosya (Aşama 1H)

Quaternius **Universal Base Characters — SOURCE** sürümü (itch.io, ücretli; ücretsiz "Standard" pakette yalnız Superhero gövdeleri var).
Paketin `Godot - UE` klasöründeki **erkek** gövdenin `.gltf` + `.bin` dosyalarını buraya kopyala:

- `a_regular/kaynak/` → adında `Regular` ve `Male` geçen `.gltf` (ya da `.glb`)
- `b_teen/kaynak/` → adında `Teen` ve `Male` geçen `.gltf` (ya da `.glb`)

Dokular (`.png`) gerekmez — hazırlık onları söker. Sonra:

```
node oyun/harita/varlik/aday/hazirla.mjs
node oyun/harita/varlik/aday/ustveri_uret.mjs
npm run muayene -- aday_c_mevcut aday_a_regular_ham aday_a_regular_sade aday_b_teen_ham aday_b_teen_sade aday_a0_superhero_sade aday_d_beach_ham --karsilastir oyun/harita/muayene/karsilastirma/govde_karsilastirma.json oyun/harita/muayene/karsilastirma/govde_deformasyon.json
```
