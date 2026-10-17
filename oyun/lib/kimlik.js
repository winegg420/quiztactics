// Kimlik denetimi — önizleme sahte kimlikleri ("onizleme-ben") toplu RPC'lere (oyuncu_kartlari vb.) gitmesin.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sunucuya gidebilecek geçerli kimlik mi? */
export const uuidMi = (id) => typeof id === "string" && UUID_RE.test(id);
