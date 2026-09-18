-- Paket 29 D — Başlangıç jokerleri mevcut oyunculara da (sahibi onayladı, 18 Eyl 2026).
--
-- 238'deki baslangic_jokerleri_ver() yalnız handle_new_user() tetikleyicisinden
-- çağrılıyordu → Paket 27'den önce açılan hesaplar o 2'şer jokeri hiç almadı.
--
-- Kurallar (238 ile birebir aynı, tek fark ayrım noktası):
--   * Botlara verilmez (is_bot = true).
--   * Aynı yedi tür × ayar_sayi('baslangic_joker_adet', 2).
--   * Dağıtım joker_hareket() üzerinden — envantere doğrudan yazılmaz,
--     her adet joker_islemleri'ne kaynak = 'baslangic' olarak düşer.
--   * BİR KEZ: kullanıcının kaynak = 'baslangic' hareketi zaten varsa atlanır.
--     238'in "envanterde satır varsa verme" kuralı BURADA KULLANILMAZ — satın
--     almış ya da reklamla joker kazanmış bir oyuncu da başlangıç stokunu hak eder.
--   * ref = 'paket29_geriye_donuk' → sonradan "kaç tanesi geriye dönük verildi"
--     sorusu tek sorguyla ölçülür.
--
-- Anonim (misafir) hesaplar da alır: yeni açılan misafir hesap tetikleyiciden
-- zaten alıyor, geriye dönükte farklı davranmak tutarsız olurdu.
--
-- Fonksiyon olarak bırakıldı ki idempotentlik test edilebilsin (ikinci çağrı 0
-- döndürmeli). İstemciye açık DEĞİL: yalnız sahibi / service_role çağırır.

create or replace function public.baslangic_jokerleri_toplu_ver()
returns table(oyuncu integer, joker integer)
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_adet int := public.ayar_sayi('baslangic_joker_adet', 2)::int;
  v_user uuid;
  v_tur text;
begin
  oyuncu := 0;
  joker := 0;
  if v_adet <= 0 then return next; return; end if;

  for v_user in
    select p.id
      from public.profiles p
     where not coalesce(p.is_bot, false)
       and not exists (select 1 from public.joker_islemleri i
                        where i.user_id = p.id and i.kaynak = 'baslangic')
     order by p.created_at
       for update of p                      -- aynı anda iki çalıştırma çift vermesin
  loop
    foreach v_tur in array array['elli', 'sure', 'soru_degistir',
                                 'zaman_baskisi', 'saldiri_degistir', 'savunma_kilidi',
                                 'seri_koruma'] loop
      perform public.joker_hareket(v_user, v_tur, v_adet, 'baslangic', 'paket29_geriye_donuk');
      joker := joker + v_adet;
    end loop;
    oyuncu := oyuncu + 1;
  end loop;

  return next;
end;
$function$;

revoke all on function public.baslangic_jokerleri_toplu_ver() from public, anon, authenticated;

-- Tek seferlik dağıtım. İkinci kez çalışırsa hiçbir şey vermez (yukarıdaki kural).
select * from public.baslangic_jokerleri_toplu_ver();
