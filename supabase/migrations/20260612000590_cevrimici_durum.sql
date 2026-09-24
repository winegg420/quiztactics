-- ============================================================
-- 590 · ARKADAŞ LİSTESİNDE ÇEVRİMİÇİ DURUMU (Realtime Presence)
--
-- Güvenlik kuralı değişikliği — Ida onayladı (24 Eyl 2026).
-- Kapsam (onaylanan): realtime.messages üzerinde YALNIZ extension = 'presence' mesajlarına
-- 2 yeni RLS politikası + 1 yardımcı fonksiyon. DB'ye yazım yok (tablo/kolon/heartbeat yok).
-- Mevcut tepki kanalı kuralları (551: "tepki_kanal_oku" / "tepki_kanal_yaz",
-- tepki_kanal_uyesi_mi) DEĞİŞMEZ; başka tabloya, politikaya ya da GRANT'e dokunulmaz.
--
-- Tasarım:
--   Her oyuncunun ÖZEL (istemci config.private: true) bir kanalı var: 'cevrimici-<uid>'.
--   • Kanala presence TRACK (INSERT, extension 'presence') yalnız sahibi yapabilir:
--       topic = 'cevrimici-' || auth.uid()
--   • Kanalın presence durumunu OKUMA (SELECT, extension 'presence') yalnız sahibi ve
--     KABUL EDİLMİŞ arkadaşları (friendships.durum = 'arkadas', iki yönden biri):
--       cevrimici_kanal_okur_mu(topic)
--   Bekleyen istek ('bekliyor'), yabancı ve anon hiçbir şey okuyamaz/yazamaz.
--   Payload istemciden gelir ve yalnız {durum: 'cevrimici' | 'mac'} taşır; oyuncu yalnız KENDİ
--   durumunu yazabildiği için yanlış durum ancak kendisi hakkında olur.
--
-- Politikalar OR'lanır — sızıntı olmadığının gerekçesi:
--   • 551 tepki politikaları extension = 'broadcast' ile sınırlı ve konu yalnız
--     '^tepki-(mac|duello)-<uuid>$' kalıbına uyarsa geçer → presence mesajlarını ve
--     'cevrimici-…' konularını KAPSAMAZ.
--   • 590 politikaları extension = 'presence' ile sınırlı ve konu yalnız
--     '^cevrimici-<uuid>$' kalıbına uyarsa geçer → tepki kanallarını (broadcast) ve
--     tepki konularındaki presence'ı KAPSAMAZ (orada presence bugünkü gibi kapalı kalır).
--   • Sonuç: 'cevrimici-…' kanalında broadcast kimseye açık değil; tepki kanalında presence
--     kimseye açık değil.
--
-- Migration uygulanmadan önce: istemci özel kanala katılamaz (CHANNEL_ERROR), sessizce vazgeçer;
-- arkadaş listesi bugünkü gibi görünür.
-- Tekrar çalıştırılabilir (create or replace / drop policy if exists); yıkıcı değil.
-- ============================================================

-- ---------- 1. Yardımcı: bu konuyu (presence) kim okuyabilir ----------
-- Döner: konu 'cevrimici-<uuid>' ise ve <uuid> çağıranın kendisi ya da kabul edilmiş arkadaşıysa true.
-- Yalnız çağıranın KENDİ arkadaşlığını söyler (friendships RLS'inin zaten gösterdiği bilgi).
create or replace function public.cevrimici_kanal_okur_mu(p_konu text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_parca text[];
  v_sahip uuid;
begin
  if v_me is null or p_konu is null then return false; end if;
  v_parca := regexp_match(p_konu, '^cevrimici-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$');
  if v_parca is null then return false; end if;
  v_sahip := v_parca[1]::uuid;
  if v_sahip = v_me then return true; end if;
  return exists (
    select 1 from public.friendships f
     where f.durum = 'arkadas'
       and ((f.requester = v_me and f.addressee = v_sahip)
         or (f.requester = v_sahip and f.addressee = v_me)));
end;
$$;
-- Politika authenticated rolüyle değerlendirilir → yürütme izni gerekir.
revoke all on function public.cevrimici_kanal_okur_mu(text) from public, anon;
grant execute on function public.cevrimici_kanal_okur_mu(text) to authenticated;

-- ---------- 2. Realtime yetkisi (yalnız presence + cevrimici- konuları) ----------
do $$
begin
  if to_regclass('realtime.messages') is null then
    raise notice '590: realtime.messages yok — politika atlandı (yerel test ortamı)';
    return;
  end if;
  -- RLS Supabase'de realtime.messages'ta zaten açık (tablo sahibi realtime; burada değiştirilmez).
  execute 'drop policy if exists "cevrimici_oku" on realtime.messages';
  execute $p$create policy "cevrimici_oku" on realtime.messages
             for select to authenticated
             using (realtime.messages.extension = 'presence'
                    and public.cevrimici_kanal_okur_mu((select realtime.topic())))$p$;
  execute 'drop policy if exists "cevrimici_yaz" on realtime.messages';
  execute $p$create policy "cevrimici_yaz" on realtime.messages
             for insert to authenticated
             with check (realtime.messages.extension = 'presence'
                         and (select auth.uid()) is not null
                         and (select realtime.topic()) = 'cevrimici-' || (select auth.uid())::text)$p$;
end $$;
