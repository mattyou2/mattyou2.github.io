-- Publiceren van packs + publieke gebruikersnamen voor Resource Pack Creator
alter table public.packs add column if not exists is_public boolean not null default false;

create table if not exists public.mc_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);
alter table public.mc_profiles enable row level security;

drop policy if exists "mc_profiles_public_read" on public.mc_profiles;
create policy "mc_profiles_public_read" on public.mc_profiles for select using (true);
drop policy if exists "mc_profiles_owner_upsert" on public.mc_profiles;
create policy "mc_profiles_owner_upsert" on public.mc_profiles for insert with check (auth.uid() = id);
drop policy if exists "mc_profiles_owner_update" on public.mc_profiles;
create policy "mc_profiles_owner_update" on public.mc_profiles for update using (auth.uid() = id);

create or replace function public.handle_new_mc_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base_username text; final_username text; n int := 0;
begin
  base_username := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email,'@',1));
  final_username := base_username;
  while exists (select 1 from public.mc_profiles where username = final_username) loop
    n := n + 1; final_username := base_username || n::text;
  end loop;
  insert into public.mc_profiles (id, username) values (new.id, final_username) on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_mc_profile on auth.users;
create trigger on_auth_user_created_mc_profile after insert on auth.users
  for each row execute function public.handle_new_mc_user();

-- bestaande accounts (van vóór deze migratie) ook een mc_profiles-rij geven
do $$
declare u record; base_username text; final_username text; n int;
begin
  for u in select * from auth.users where id not in (select id from public.mc_profiles) loop
    base_username := coalesce(nullif(trim(u.raw_user_meta_data->>'username'), ''), split_part(u.email,'@',1));
    final_username := base_username; n := 0;
    while exists (select 1 from public.mc_profiles where username = final_username) loop
      n := n + 1; final_username := base_username || n::text;
    end loop;
    insert into public.mc_profiles (id, username) values (u.id, final_username) on conflict (id) do nothing;
  end loop;
end $$;

-- publieke leesbaarheid voor gepubliceerde packs (community-pagina)
drop policy if exists "packs_public_read" on public.packs;
create policy "packs_public_read" on public.packs for select using (is_public = true or auth.uid() = user_id);
