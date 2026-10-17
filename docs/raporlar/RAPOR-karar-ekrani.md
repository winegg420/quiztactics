# Hazine karar ekranı sadeleştirme — rapor (9 Eki 2026)

## Kaldırılan / değişen metinler
- Kaldırıldı: "Hazine sende: {k} puan" başlığı (sr-only sınıfı projede yok → tamamen kaldırıldı; bilgi HAZİNE kutusu + "Sende" etiketinde).
- Kaldırıldı: AÇ alt yazısı "Skor {s}/{h}" (`benimPuan` kullanılmaz olduğu için o değişken de silindi).
- Kaldırıldı: ayrı hak satırı (`.ks-karar-hak`: "DEVAM de: … kazan" / "… sende (en fazla 1)").
- Kaldırıldı: "Süre dolarsa DEVAM sayılır." Tavanda "Süre dolarsa otomatik AÇ sayılır." + "Hazine dolu ({t}): yalnız AÇ." kaldı; not satırı artık yalnız dolu iken çizilir.
- Değişti: DEVAM alt yazısı (devam_birakir iken): hak kazanılıyor → "Sahipsiz kalır · Savunma Hakkı"; hak var (savunma açık) → "Savunma Hakkı sende"; aksi → "Hazine sahipsiz kalır". devam_sans>0 → joker şansı yazısı aynen.
- Çeviri: kasa.js'e "Sahipsiz kalır · {h}" ve "{h} sende" (EN: "Unclaimed · {h}", "You hold a {h}"). Eski anahtarlar silinmedi. CSS'e dokunulmadı (`.ks-karar-*` kuralları duruyor, kullanılmayanlar zararsız).

## Test beklentisi güncellemeleri (silme/zayıflatma yok)
- kasa-savunma-ekran.mjs: Skor alt yazısı beklentisi → "Skor yok"; "hak satırı görünür" → "ayrı hak satırı/başlık yok" + "Süre dolarsa DEVAM yok"; DEVAM beklentisi "Sahipsiz kalır · Savunma Hakkı"; hak-var beklentisi alt yazıda "sende". Lobi `summary.click` → `{force:true, timeout:8000}` (kararla ilgisiz, tıklama kararsızlığı).
- kasa-efekt-ekran.mjs: "karar notunda sahipsiz kalır" → DEVAM düğmesi alt yazısında. (z9 satırı 348 'en çok 60' notu kodda zaten yoktu — önceden bayat, dokunulmadı.)

## Doğrulama
- kasa-savunma-ekran (taklit profil, canlıya yazmaz; 390×640/664/844, 360×640, TR+EN): karar/hak var/dolu(tavan) durumlarının tüm iddiaları geçti (99 geçti, 3 kaldı: "lobi: Savunma Hakkı kuralı" ve "tetik: kalkan anı 2,3 sn" — bu değişiklikle ilgisiz, önceden var).
- Ekran görüntüsü: tasarim/kasa-savunma/s2-karar-*.png, s2b-karar-80-*.png (commit edilmedi). Yatay taşma yok, düğme başlığı tek satır.
- `npm run build` temiz; `arayuz-denetim.mjs` TEMİZ.

## Çizilemeyen durumlar
- acKilit (AÇ kilitli) ve devam_birakir=false eski maç: mevcut taklit senaryolarında yok; kodu değişmedi (acKilit etiketi ve joker şansı dalı aynen). Ekran görüntüsü alınmadı.
- devam_birakir=false iken hak bilgisi artık hiçbir yerde yazılmıyor (önce ayrı satırdaydı); savunma açık + bu eski maç birleşimi pratikte yok.
- arayuz-denetim süresi dolmuş misafir oturumu yüzünden canlıda yeni bir misafir hesabı açtı; silinemedi (servis anahtarı yok).
