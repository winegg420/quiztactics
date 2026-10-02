-- 880 · Düello: BAN AÇIKLAMA GÖSTERİM PAYI (Ida, 2 Eki 2026)
--
-- Ban fazı bitince saldırana "rakip şunu banladı" açıklaması (~1,2 sn) oynar. Bu gösterim saldıranın kategori seçme
-- süresinden yemesin: ban fazından çıkan 'kategori' fazının bitişine duello_ban_gosterim_ms kadar pay eklenir.
-- İstemci sayacı `gosterim_bas` (= faz_bitis − duello2_kategori_sn) gelene dek TAM süreyi gösterdiği için sayaç
-- açıklama boyunca bekler; botun seçim anı ve Kalkan penceresi de faz_bitis'ten hesaplandığından aynı kadar kayar.
--
-- Kural DEĞİŞMEZ: ban mantığı, süreler (duello_ban_sn, duello2_kategori_sn) ve yetkiler aynen. Yalnız duello2_ban_bitir
-- (853'teki tanım + tek satır pay) CREATE OR REPLACE ile değişir; yetkileri korunur (kimseye açık değil).
-- Ban kapalıysa (duello_ban_acik = 0) bu fonksiyon hiç çağrılmaz: eski akış aynen.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_ban_gosterim_ms', '1200'::jsonb,
   'Düello: ban fazından sonraki kategori fazının bitişine eklenen pay (ms) — ban açıklama animasyonu saldıranın seçme süresinden yemesin')
on conflict (anahtar) do nothing;

create or replace function public.duello2_ban_bitir(p_id uuid, p_kategori text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  d public.duellolar%rowtype;
  v_savunan1 boolean;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz <> 'ban' then return; end if;
  v_savunan1 := d.saldiran <> d.oyuncu1;
  update public.duellolar
     set ban_kategori = p_kategori,
         son_ban1 = case when v_savunan1 then p_kategori else son_ban1 end,
         son_ban2 = case when v_savunan1 then son_ban2 else p_kategori end,
         faz = 'kategori',
         faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi()
           -- 880: ban açıklaması payı (0–5 sn arasına sıkıştırılır; ayar bozulsa da faz kilitlenmez)
           + make_interval(secs => least(5000, greatest(0, public.ayar_sayi('duello_ban_gosterim_ms', 1200))) / 1000.0),
         son_hareket = now()
   where id = p_id;
end $function$;
