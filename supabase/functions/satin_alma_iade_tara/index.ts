// Quiz Tactics — Google Play iade (voided purchase) taraması
//
// Play'den iade edilen/iptal edilen coin satın almalarını bulur ve coin'i geri
// alır (satin_alma_iade_isle: bakiye eksiye düşmez, yetmeyen kısım defterde
// `iade_eksik` olarak işaretlenir). Mantık: akis.ts.
//
// KAPALI BAŞLAR: oyun_ayarlari.satin_alma_iade_takibi = true olmadan hiçbir şey
// yapmaz ({durum:"kapali"}). Play servis hesabı girilince açılır.
//
// Çağrı: POST, başlık "x-cron-secret: <CRON_SECRET>" (JWT yok → --no-verify-jwt ile dağıt)
// Gerekli secret: PLAY_SERVICE_ACCOUNT, PLAY_PACKAGE_NAME, CRON_SECRET
// Günlük cron (açılış günü eklenecek):
//   select cron.schedule('satin-alma-iade-tara', '17 4 * * *', $$select net.http_post(
//     url := 'https://zfpnxzybcpkxsotwdsey.supabase.co/functions/v1/satin_alma_iade_tara',
//     headers := jsonb_build_object('x-cron-secret', public.gizli_al('cron_secret'), 'Content-Type', 'application/json'),
//     body := '{}'::jsonb)$$);
import { createClient } from "npm:@supabase/supabase-js@2";
import { googleErisimJetonu, playIstemcisi } from "../satin_alma_dogrula/play.ts";
import { iadeTara } from "./akis.ts";

function yanit(govde: unknown, durum = 200) {
  return new Response(JSON.stringify(govde), { status: durum, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return yanit({ hata: "Yalnızca POST" }, 405);
  const gizli = Deno.env.get("CRON_SECRET");
  if (!gizli || req.headers.get("x-cron-secret") !== gizli) return yanit({ hata: "Yetkisiz" }, 401);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const kaydet = (olay: string, ayrinti: Record<string, unknown>) =>
      console.error(JSON.stringify({ olay, ...ayrinti }));

    const bayrakAcik = async () => {
      const { data, error } = await db
        .from("oyun_ayarlari")
        .select("deger")
        .eq("anahtar", "satin_alma_iade_takibi")
        .maybeSingle();
      if (error) throw new Error("Ayar okunamadı: " + error.message);
      return data?.deger === true;
    };

    // Bayrak kapalıysa Play'e hiç gidilmez (secret'lar olmasa da hata vermez)
    if (!(await bayrakAcik())) return yanit({ durum: "kapali" });

    const saHam = Deno.env.get("PLAY_SERVICE_ACCOUNT");
    const paket = Deno.env.get("PLAY_PACKAGE_NAME");
    if (!saHam || !paket) {
      return yanit({ hata: "PLAY_SERVICE_ACCOUNT ve PLAY_PACKAGE_NAME secret'ları eksik." }, 503);
    }
    const play = playIstemcisi(paket, await googleErisimJetonu(JSON.parse(saHam)));

    const sonuc = await iadeTara({
      bayrakAcik,
      iadeleriListele: play.iadeleriListele,
      iadeIsle: async (p) => await db.rpc("satin_alma_iade_isle", p),
      kaydet,
    });
    if (sonuc.durum !== "hata") console.log(JSON.stringify({ olay: "iade_taramasi", ...sonuc }));
    return yanit(sonuc, sonuc.durum === "hata" ? 502 : 200);
  } catch (e) {
    const mesaj = String(e instanceof Error ? e.message : e);
    console.error(JSON.stringify({ olay: "iade_taramasi_beklenmeyen", hata: mesaj }));
    return yanit({ hata: mesaj }, 500);
  }
});
