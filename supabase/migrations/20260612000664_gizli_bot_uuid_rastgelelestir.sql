-- Desenli 80 gizli bot kimliğini, ilişkili verileri yerinde koruyarak
-- rastgele UUID v4 değerlerine taşır. Diğer gizli botlara dokunmaz.
--
-- Yabancı anahtarlar yalnız bu transaction boyunca ertelenebilir yapılır;
-- işlem sonunda özgün durumlarına geri döner. Şemadaki UUID kolonları
-- dinamik tarandığı için FK tanımı olmayan tarihsel oyuncu kolonları da
-- (ör. duello_hamleler.saldiran) veri kaybetmeden taşınır.

do $gizli_bot_uuid$
declare
  r record;
  v_adet bigint;
  v_once bigint;
  v_sonra bigint;
  v_guncellenen bigint;
  v_diger_gizli bigint;
  v_toplam_gizli bigint;
begin
  create temporary table gizli_bot_uuid_esleme (
    eski_id uuid primary key,
    yeni_id uuid not null unique
  ) on commit drop;

  insert into gizli_bot_uuid_esleme (eski_id, yeni_id)
  select p.id, gen_random_uuid()
    from generate_series(1, 80) s(no)
    join public.profiles p
      on p.id = (
        'b17b0000-0000-4000-8000-' || lpad(s.no::text, 12, '0')
      )::uuid
   where p.is_bot
     and p.bot_turu = 'gizli';

  select count(*) into v_adet from gizli_bot_uuid_esleme;
  if v_adet <> 80 then
    raise exception 'Beklenen 80 desenli gizli bot yerine % bulundu; işlem durduruldu', v_adet;
  end if;

  if (select count(*) from auth.users u join gizli_bot_uuid_esleme m on m.eski_id = u.id) <> 80 then
    raise exception '80 desenli botun auth.users kayıtları eksik; işlem durduruldu';
  end if;

  -- Bot cron'u veya devam eden bir maç taşıma sırasında eski UUID ile yeni
  -- satır ekleyemesin. UUID kolonu taşıyan public tabloların tamamında
  -- okumayı açık bırakıp yalnız yazıları transaction bitene dek bekletiriz.
  -- Kilitler ad sırasıyla alındığından farklı işlerle kilit sırası çakışmaz.
  lock table auth.users in share row exclusive mode;
  for r in
    select distinct ns.nspname as tablo_semasi, cls.relname as tablo_adi
      from pg_attribute att
      join pg_class cls on cls.oid = att.attrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
     where ns.nspname = 'public'
       and cls.relkind in ('r', 'p')
       and att.attnum > 0
       and not att.attisdropped
       and att.attgenerated = ''
       and att.atttypid = 'uuid'::regtype
     order by ns.nspname, cls.relname
  loop
    execute format(
      'lock table %I.%I in share row exclusive mode',
      r.tablo_semasi, r.tablo_adi
    );
  end loop;

  -- Teorik olarak mümkün olan tanınabilir önek ve mevcut kullanıcı çakışmasını
  -- daha migration başlamadan yeniden üret.
  loop
    update gizli_bot_uuid_esleme m
       set yeni_id = gen_random_uuid()
     where m.yeni_id::text like 'b17b%'
        or exists (select 1 from auth.users u where u.id = m.yeni_id)
        or exists (select 1 from public.profiles p where p.id = m.yeni_id);
    exit when not exists (
      select 1
        from gizli_bot_uuid_esleme m
       where m.yeni_id::text like 'b17b%'
          or exists (select 1 from auth.users u where u.id = m.yeni_id)
          or exists (select 1 from public.profiles p where p.id = m.yeni_id)
    );
  end loop;

  create temporary table gizli_bot_profil_kaniti on commit drop as
  select m.eski_id, m.yeni_id, to_jsonb(p) - 'id' as icerik
    from gizli_bot_uuid_esleme m
    join public.profiles p on p.id = m.eski_id;

  create temporary table gizli_bot_auth_kaniti on commit drop as
  select m.eski_id, m.yeni_id, to_jsonb(u) - 'id' as icerik
    from gizli_bot_uuid_esleme m
    join auth.users u on u.id = m.eski_id;

  -- Zaten rastgele UUID kullanan gizli botların hem kimliğini hem profilini
  -- birebir koruduğumuzu transaction sonunda kanıtlamak için anlık görüntü.
  create temporary table diger_gizli_bot_kaniti on commit drop as
  select p.id, to_jsonb(p) as icerik
    from public.profiles p
   where p.is_bot
     and p.bot_turu = 'gizli'
     and not exists (select 1 from gizli_bot_uuid_esleme m where m.eski_id = p.id);

  select count(*) into v_diger_gizli from diger_gizli_bot_kaniti;
  if v_diger_gizli <> 75 then
    raise exception 'Dokunulmaması gereken rastgele UUIDli gizli bot sayısı 75 değil: %', v_diger_gizli;
  end if;

  select count(*) into v_toplam_gizli
    from public.profiles
   where is_bot and bot_turu = 'gizli';

  create temporary table gizli_bot_fk_kaniti on commit drop as
  select con.oid,
         ns.nspname as tablo_semasi,
         cls.relname as tablo_adi,
         con.conname as kisit_adi,
         con.condeferrable as ertelenebilir_miydi,
         con.condeferred as basta_ertelenmis_miydi
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace ns on ns.oid = cls.relnamespace
   where con.contype = 'f'
     and con.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
     -- Supabase'in auth iç tablolarının sahibi yönetilen auth yöneticisidir;
     -- botların bu tablolarda bağlı satırı yoktur. public tarafındaki bütün
     -- kullanıcı FK'ları ise taşıma boyunca ertelenmelidir.
     and ns.nspname <> 'auth';

  if exists (
    select 1
      from pg_constraint con
     where con.oid in (select oid from gizli_bot_fk_kaniti)
       and (cardinality(con.conkey) <> 1 or cardinality(con.confkey) <> 1)
  ) then
    raise exception 'Bileşik kullanıcı foreign key bulundu; güvenli otomatik taşıma durduruldu';
  end if;

  -- Ana ve bağlı satırlar tek transaction içinde birlikte değişeceği için
  -- yalnız ilgili FK kontrollerini geçici olarak transaction sonuna erteleriz.
  for r in select * from gizli_bot_fk_kaniti order by tablo_semasi, tablo_adi, kisit_adi loop
    execute format(
      'alter table %I.%I alter constraint %I deferrable initially immediate',
      r.tablo_semasi, r.tablo_adi, r.kisit_adi
    );
  end loop;
  set constraints all deferred;

  create temporary table gizli_bot_uuid_satir_kaniti (
    konum text primary key,
    onceki_satir bigint not null,
    sonraki_satir bigint not null
  ) on commit drop;

  -- public/auth içindeki her gerçek UUID kolonunu tara. Böylece hem 129 FK
  -- hem de FK'siz tarihsel oyuncu kolonları aynı eşlemeyle güncellenir.
  for r in
    select ns.nspname as tablo_semasi,
           cls.relname as tablo_adi,
           att.attname as kolon_adi
      from pg_attribute att
      join pg_class cls on cls.oid = att.attrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
     where ns.nspname in ('auth', 'public')
       and cls.relkind in ('r', 'p')
       and att.attnum > 0
       and not att.attisdropped
       and att.attgenerated = ''
       and att.atttypid = 'uuid'::regtype
     order by ns.nspname, cls.relname, att.attnum
  loop
    execute format(
      'select count(*) from %I.%I t where t.%I in (select eski_id from gizli_bot_uuid_esleme)',
      r.tablo_semasi, r.tablo_adi, r.kolon_adi
    ) into v_once;

    if v_once > 0 then
      execute format(
        'update %I.%I t set %I = m.yeni_id from gizli_bot_uuid_esleme m where t.%I = m.eski_id',
        r.tablo_semasi, r.tablo_adi, r.kolon_adi, r.kolon_adi
      );
      get diagnostics v_guncellenen = row_count;

      execute format(
        'select count(*) from %I.%I t where t.%I in (select yeni_id from gizli_bot_uuid_esleme)',
        r.tablo_semasi, r.tablo_adi, r.kolon_adi
      ) into v_sonra;

      if v_guncellenen <> v_once or v_sonra <> v_once then
        raise exception 'UUID taşıma sayısı uyuşmadı: %.%.% önce %, güncellenen %, sonra %',
          r.tablo_semasi, r.tablo_adi, r.kolon_adi, v_once, v_guncellenen, v_sonra;
      end if;

      insert into gizli_bot_uuid_satir_kaniti (konum, onceki_satir, sonraki_satir)
      values (format('%I.%I.%I', r.tablo_semasi, r.tablo_adi, r.kolon_adi), v_once, v_sonra);
    end if;
  end loop;

  -- Eski UUID'lerden biri herhangi bir public/auth UUID kolonunda kaldıysa
  -- transaction tamamlanamaz.
  for r in
    select ns.nspname as tablo_semasi,
           cls.relname as tablo_adi,
           att.attname as kolon_adi
      from pg_attribute att
      join pg_class cls on cls.oid = att.attrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
     where ns.nspname in ('auth', 'public')
       and cls.relkind in ('r', 'p')
       and att.attnum > 0
       and not att.attisdropped
       and att.attgenerated = ''
       and att.atttypid = 'uuid'::regtype
  loop
    execute format(
      'select count(*) from %I.%I t where t.%I in (select eski_id from gizli_bot_uuid_esleme)',
      r.tablo_semasi, r.tablo_adi, r.kolon_adi
    ) into v_adet;
    if v_adet <> 0 then
      raise exception 'Eski bot UUIDsi kaldı: %.%.% (% satır)',
        r.tablo_semasi, r.tablo_adi, r.kolon_adi, v_adet;
    end if;
  end loop;

  if (select count(*)
        from gizli_bot_profil_kaniti k
        join public.profiles p on p.id = k.yeni_id
       where (to_jsonb(p) - 'id') is not distinct from k.icerik) <> 80 then
    raise exception 'Bot profil özellikleri kimlik taşımasında değişti';
  end if;

  if (select count(*)
        from gizli_bot_auth_kaniti k
        join auth.users u on u.id = k.yeni_id
       where (to_jsonb(u) - 'id') is not distinct from k.icerik) <> 80 then
    raise exception 'Bot auth.users özellikleri kimlik taşımasında değişti';
  end if;

  if (select count(*)
        from diger_gizli_bot_kaniti k
        join public.profiles p on p.id = k.id
       where to_jsonb(p) is not distinct from k.icerik) <> v_diger_gizli then
    raise exception 'Rastgele UUID kullanan diğer gizli botlardan biri değişti';
  end if;

  if (select count(*) from public.profiles where is_bot and bot_turu = 'gizli') <> v_toplam_gizli then
    raise exception 'Gizli bot toplamı değişti';
  end if;

  if (select count(*)
        from public.profiles p
        join gizli_bot_uuid_esleme m on m.yeni_id = p.id
       where p.is_bot and p.bot_turu = 'gizli') <> 80 then
    raise exception 'Yeni UUIDli 80 gizli bot profili doğrulanamadı';
  end if;

  if exists (select 1 from public.profiles where id::text like 'b17b0000-0000-4000-8000-%')
     or exists (select 1 from auth.users where id::text like 'b17b0000-0000-4000-8000-%') then
    raise exception 'Tanımlı b17b bot kimliği migration sonunda hâlâ var';
  end if;

  -- Ertelenmiş kontrolleri şimdi zorla; ardından her FK'nın özgün
  -- deferrable durumunu eksiksiz geri yükle.
  set constraints all immediate;
  for r in select * from gizli_bot_fk_kaniti order by tablo_semasi, tablo_adi, kisit_adi loop
    if not r.ertelenebilir_miydi then
      execute format(
        'alter table %I.%I alter constraint %I not deferrable',
        r.tablo_semasi, r.tablo_adi, r.kisit_adi
      );
    elsif r.basta_ertelenmis_miydi then
      execute format(
        'alter table %I.%I alter constraint %I deferrable initially deferred',
        r.tablo_semasi, r.tablo_adi, r.kisit_adi
      );
    else
      execute format(
        'alter table %I.%I alter constraint %I deferrable initially immediate',
        r.tablo_semasi, r.tablo_adi, r.kisit_adi
      );
    end if;
  end loop;
end;
$gizli_bot_uuid$;
