# scripts/hooks

`pre-commit` hook'u, commit `oyun/`, `src/`, `supabase/migrations/` ya da
`araclar/` klasörlerine dokunuyorsa `PROGRESS.md`'nin de değişmiş olmasını
ister; değişmemişse commit'i reddeder ve hangi dosyalar yüzünden
tetiklendiğini yazar. Yalnız `.md`, kilit dosyası veya biçimlendirme
değişiyorsa karışmaz, commit mesajında `[progress-yok]` geçiyorsa da geçer.
`.git/hooks` paylaşılmadığı için hook depoda durur ve `package.json`'daki
`prepare` betiği `npm install` sırasında kendiliğinden bağlar; elle kurmak
için `git config core.hooksPath scripts/hooks` yeter.
