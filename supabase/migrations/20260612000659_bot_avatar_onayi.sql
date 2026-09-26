-- ============================================================
-- 659 — Gizli botların avatarı görünsün (D-414)
--
-- 610, avatarı boş botlara avatar_url verdi ama avatar_onayli'yı true yapmadı; oysa
-- profiles.gorunen_avatar yalnız avatar_onayli iken avatar_url'i döndürür (yoksa NULL).
-- 75 gizli bot (koray, Raymalifalitikko, Legends…) bu yüzden avatarsız, baş harfle çiziliyordu.
-- 171 aynı işi eski botlar için yapmıştı (avatar_onayli = true). Yalnız bot satırları; insan
-- hesapların onayına dokunulmaz. Yetki/politika değişmez. Tekrar çalıştırılabilir.
-- ============================================================
update public.profiles
   set avatar_onayli = true
 where coalesce(is_bot, false)
   and coalesce(avatar_url, '') <> ''
   and not coalesce(avatar_onayli, false);
