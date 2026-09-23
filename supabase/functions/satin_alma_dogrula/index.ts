// Quiz Tactics — Google Play satın alma doğrulama
//
// Akış: Android (TWA) istemcisi Digital Goods API + Payment Request ile satın
// alır, elindeki purchaseToken'ı buraya gönderir. Burada Play Developer API
// (purchases.products.get) ile makbuz DOĞRULANIR, coin/joker hesaba işlenir ve
// ürün SUNUCUDA tüketilir (purchases.products.consume). Mantık: akis.ts.
//
// Gerekli secret:
//   PLAY_SERVICE_ACCOUNT  → Google Cloud servis hesabı JSON'u (tek satır)
//   PLAY_PACKAGE_NAME     → Android uygulama paketi (com.quiztactics.app)
//
// PLAY_SERVICE_ACCOUNT yoksa fonksiyon AÇIK HATA döner; sahte onay VERMEZ.
//
// Çağrı: POST { urun_id, purchase_token }  + Authorization: Bearer <user JWT>
// Yanıt: 200 { tamam, sonuc (bakiye), tekrar, tuketildi } · 4xx/5xx { hata }
import { createClient } from "npm:@supabase/supabase-js@2";
import { googleErisimJetonu, playIstemcisi } from "./play.ts";
import { satinAlmaDogrula } from "./akis.ts";

const KOSE = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function yanit(govde: unknown, durum = 200) {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { ...KOSE, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: KOSE });
  if (req.method !== "POST") return yanit({ hata: "Yalnızca POST" }, 405);

  try {
    const saHam = Deno.env.get("PLAY_SERVICE_ACCOUNT");
    const paket = Deno.env.get("PLAY_PACKAGE_NAME");
    if (!saHam || !paket) {
      // Sahte onay YOK: yapılandırma eksikse açıkça söyle.
      return yanit(
        {
          hata: "Satın alma doğrulaması yapılandırılmamış.",
          detay: "PLAY_SERVICE_ACCOUNT ve PLAY_PACKAGE_NAME secret'ları eksik.",
        },
        503,
      );
    }

    // --- Kullanıcıyı JWT'den çöz ---
    const yetki = req.headers.get("Authorization") ?? "";
    if (!yetki.startsWith("Bearer ")) return yanit({ hata: "Giriş gerekli" }, 401);

    const kullaniciDb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: yetki } } },
    );
    const { data: { user }, error: kimlikHata } = await kullaniciDb.auth.getUser();
    if (kimlikHata || !user) return yanit({ hata: "Geçersiz oturum" }, 401);

    let govde: unknown;
    try {
      govde = await req.json();
    } catch {
      return yanit({ hata: "Geçersiz istek gövdesi" }, 400);
    }

    const play = playIstemcisi(paket, await googleErisimJetonu(JSON.parse(saHam)));
    const yonetimDb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const sonuc = await satinAlmaDogrula(user.id, govde, {
      play,
      coinPaketiMi: async (urun) => {
        const { data, error } = await yonetimDb
          .from("coin_paketleri")
          .select("urun_id")
          .eq("urun_id", urun)
          .eq("aktif", true)
          .maybeSingle();
        if (error) throw new Error("Katalog okunamadı: " + error.message);
        return !!data;
      },
      coinKaydet: async (p) => await yonetimDb.rpc("coin_satin_alma_kaydet", p),
      jokerIsle: async (p) => await yonetimDb.rpc("satin_alma_isle", p),
      tuketimYaz: async (jeton, hata) =>
        await yonetimDb.rpc("coin_satin_alma_tuketim_yaz", { p_token: jeton, p_hata: hata }),
      // Supabase fonksiyon günlüğüne düşer (Dashboard → Edge Functions → Logs)
      kaydet: (olay, ayrinti) => console.error(JSON.stringify({ olay, ...ayrinti })),
    });
    return yanit(sonuc.govde, sonuc.durum);
  } catch (e) {
    console.error(JSON.stringify({ olay: "beklenmeyen_hata", hata: String(e instanceof Error ? e.message : e) }));
    return yanit({ hata: String(e instanceof Error ? e.message : e) }, 500);
  }
});
