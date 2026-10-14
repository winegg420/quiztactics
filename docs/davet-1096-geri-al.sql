-- 1096 bekleyen_davet GERİ ALMA. Tek seferde çalıştırılır (pg-mini ya da SQL düzenleyici).
-- İstemci (KurulumSayfasi / DavetEslestirme) RPC yoksa sessizce atlar; önce istemciyi geri almak gerekmez.
begin;
drop function if exists public.davet_bekleyen_cevapla(uuid, boolean);
drop function if exists public.davet_bekleyen_bul(text);
drop function if exists public.davet_bekle_kaydet(text, text, text);
drop function if exists public.davet_ip_ozet_ic();
drop table if exists public.bekleyen_davet;
delete from vault.secrets where name = 'davet_ip_tuzu';
delete from supabase_migrations.schema_migrations where version = '20260612001096';
commit;
