-- 656 — Hesap silme (hesabimi_sil → auth.users cascade) için eksik yabancı anahtar indeksleri.
-- Sorun: match_answers / tournament_answers gibi tablolarda user_id başta olan indeks yoktu
-- (birincil anahtar (match_id, user_id, ...)); her hesap silme bu tabloları baştan sona tarıyordu.
-- Tablolar büyüdükçe authenticated rolünün 8 sn statement_timeout sınırı aşılırdı (D-417).
-- Yalnız public şeması, yalnız indeks — veri/yetki değişmez. Hepsi IF NOT EXISTS (idempotent).
-- Canlıya önce CONCURRENTLY ile kuruldu (araclar/hesap-silme-indeks.mjs); bu dosya sıfırdan kurulumlar
-- ve kayıt içindir.

create index if not exists match_answers_user_id_idx           on public.match_answers (user_id);
create index if not exists tournament_answers_user_id_idx      on public.tournament_answers (user_id);
create index if not exists tournament_players_user_id_idx      on public.tournament_players (user_id);
create index if not exists match_messages_user_id_idx          on public.match_messages (user_id);
create index if not exists group_match_answers_user_id_idx     on public.group_match_answers (user_id);
create index if not exists group_match_messages_user_id_idx    on public.group_match_messages (user_id);
create index if not exists group_match_jokers_user_id_idx      on public.group_match_jokers (user_id);
create index if not exists match_jokers_user_id_idx            on public.match_jokers (user_id);
create index if not exists soru_cevap_kaydi_user_id_idx        on public.soru_cevap_kaydi (user_id);
create index if not exists soru_degisimleri_user_id_idx        on public.soru_degisimleri (user_id);
create index if not exists question_votes_user_id_idx          on public.question_votes (user_id);
create index if not exists skill_ikinci_sans_denemeleri_user_id_idx on public.skill_ikinci_sans_denemeleri (user_id);
create index if not exists direkt_mesajlar_gonderen_id_idx     on public.direkt_mesajlar (gonderen_id);
create index if not exists meydan_ikramlari_gonderen_idx       on public.meydan_ikramlari (gonderen);

-- Boş olabilen (SET NULL / NO ACTION) kolonlar: yalnız dolu satırlar indekslenir.
create index if not exists matches_kazanan_idx        on public.matches (kazanan)     where kazanan is not null;
create index if not exists matches_terk_eden_idx      on public.matches (terk_eden)   where terk_eden is not null;
create index if not exists tournaments_kazanan_idx    on public.tournaments (kazanan) where kazanan is not null;
create index if not exists group_matches_kazanan_idx  on public.group_matches (kazanan) where kazanan is not null;
create index if not exists profiles_davet_eden_idx    on public.profiles (davet_eden) where davet_eden is not null;
create index if not exists sikayetler_sikayet_edilen_idx on public.sikayetler (sikayet_edilen);
