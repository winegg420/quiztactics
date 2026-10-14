// Misafir (anonim) hesap mı? — HesapGuvence.jsx'ten ayrıldı (Paket B/6, 15 Eki 2026): CikisOnayi ana pakette bu tek
// işlevi istiyordu ve bütün bağlama formunu (HesapGuvence) ilk açılış paketine çekiyordu.
export function misafirMi(user) {
  return Boolean(user?.is_anonymous);
}
