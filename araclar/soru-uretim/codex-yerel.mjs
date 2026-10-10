// Canlı bağlantı açmaz: yalnız loopback üzerindeki bağımsız kapı test veritabanı.
import {execFileSync} from 'node:child_process';
const PSQL='C:/Program Files/PostgreSQL/17/bin/psql.exe';
export function yerelSorgu(sql){
 const q=sql.trim().replace(/;$/,'');
 const out=execFileSync(PSQL,['-X','-A','-t','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','15439','-U','codex','-d','postgres'],{input:"select coalesce(json_agg(t),'[]'::json) from ("+q+") t;",encoding:'utf8',env:{...process.env,PGCLIENTENCODING:'UTF8'},maxBuffer:8e6});
 return JSON.parse(out.trim());
}
export const yerelDb=()=>({sorgu:async sql=>yerelSorgu(sql),kapat:async()=>{}});
