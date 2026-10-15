-- 1106 geri alma: son görülme. last_seen SELECT yetkisini eski (264) haline döndürür, ayar sütunu ve RPC'ler kalkar.
-- Dikkat: istemci (OyuncuKarti) yeniden profiles.last_seen okuyacaksa önce eski sürüm dağıtılmalı.
grant select (last_seen) on public.profiles to authenticated;
drop function if exists public.profil_cevrimici(uuid);
drop function if exists public.arkadas_son_gorulme(uuid[]);
drop function if exists public.son_gorulme_gizli_ayarla(boolean);
alter table public.profiles drop column if exists son_gorulme_gizli;
