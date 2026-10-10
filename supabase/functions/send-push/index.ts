// Quiz Tactics — push bildirim gönderici
// Çağıran: pg_net (cron / trigger), x-cron-secret ile doğrulanır.
// Gövde: { user_ids?: string[], baslik: string, govde: string, url?: string }
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { gizliEsitMi } from "../_shared/gizli.ts";

Deno.serve(async (req) => {
  if (!gizliEsitMi(req.headers.get("x-cron-secret"), Deno.env.get("CRON_SECRET"))) {
    return new Response("Yetkisiz", { status: 401 });
  }

  let girdi: { user_ids?: unknown; baslik?: string; govde?: string; url?: string };
  try {
    girdi = await req.json();
  } catch {
    return new Response(JSON.stringify({ hata: "Geçersiz istek gövdesi" }), { status: 400 });
  }
  const { user_ids, baslik, govde, url } = girdi ?? {};
  // Boş / eksik user_ids artık "herkese gönder" DEĞİL (bütün çağıranlar push_gonder ile kişi listesi yolluyor).
  if (!Array.isArray(user_ids) || user_ids.length === 0 || user_ids.length > 1000) {
    return new Response(JSON.stringify({ hata: "user_ids gerekli" }), { status: 400 });
  }

  try {
  webpush.setVapidDetails(
    "mailto:idagureli@gmail.com",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: abonelikler, error } = await db.from("push_subscriptions").select("*").in("user_id", user_ids);
  if (error) {
    // İç DB ayrıntısı yanıtta değil, fonksiyon günlüğünde
    console.error(JSON.stringify({ olay: "abonelik_okunamadi", hata: error.message }));
    return new Response(JSON.stringify({ hata: "Abonelikler okunamadı" }), { status: 500 });
  }

  let basarili = 0;
  let basarisiz = 0;

  await Promise.all(
    (abonelikler ?? []).map(async (abone) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: abone.endpoint,
            keys: { p256dh: abone.p256dh, auth: abone.auth },
          },
          JSON.stringify({ baslik, govde, url: url ?? "/" }),
        );
        basarili++;
      } catch (hata) {
        basarisiz++;
        const kod = (hata as { statusCode?: number })?.statusCode;
        if (kod === 404 || kod === 410) {
          // Ölü abonelik: temizle
          try {
            await db.from("push_subscriptions").delete().eq("endpoint", abone.endpoint);
          } catch (e) {
            console.error(JSON.stringify({ olay: "olu_abonelik_silinemedi", hata: String(e) }));
          }
        }
      }
    }),
  );

  return new Response(JSON.stringify({ basarili, basarisiz }), {
    headers: { "Content-Type": "application/json" },
  });
  } catch (e) {
    console.error(JSON.stringify({ olay: "beklenmeyen_hata", hata: String(e) }));
    return new Response(JSON.stringify({ hata: "Beklenmeyen hata" }), { status: 500 });
  }
});
