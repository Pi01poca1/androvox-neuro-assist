-- Create security definer function to get user's clinic_id
create or replace function public.get_user_clinic_id(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id
  from public.profiles
  where id = _user_id
  limit 1
$$;

-- Drop existing problematic policy
drop policy if exists "Users can view profiles in their clinic" on public.profiles;

-- Create new policy using the security definer function
create policy "Users can view profiles in their clinic"
on public.profiles
for select
to authenticated
using (
  clinic_id = public.get_user_clinic_id(auth.uid())
  or id = auth.uid()
);