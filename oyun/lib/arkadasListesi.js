import { supabase } from "../../src/lib/supabase.js";

// Kabul edilmiş arkadaşlar — FriendsPage ile aynı kaynak (friendships durum='arkadas' + profiles).
const SECIM = `id, requester, addressee, durum,
  req:profiles!friendships_requester_fkey(id, gorunen_ad, gorunen_avatar, gorunum, puan),
  add:profiles!friendships_addressee_fkey(id, gorunen_ad, gorunen_avatar, gorunum, puan)`;

/** Arkadaş profilleri dizisi döner; hata olursa fırlatır (çağıran yakalar). */
export async function arkadaslariGetir(userId) {
  const { data, error } = await supabase
    .from("friendships")
    .select(SECIM)
    .eq("durum", "arkadas")
    .or(`requester.eq.${userId},addressee.eq.${userId}`);
  if (error) throw error;
  return (data ?? [])
    .map((f) => (f.requester === userId ? f.add : f.req))
    .filter(Boolean);
}
