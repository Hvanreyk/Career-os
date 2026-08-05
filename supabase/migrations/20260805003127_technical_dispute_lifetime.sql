-- Upgrade databases that already applied 0017 from one active dispute to one
-- dispute for the lifetime of an attempt. A repeat dispute would otherwise be
-- impossible to process because dispute resolution does not restore the
-- attempt to the graded state.

do $$
begin
  if exists (
    select 1 from technical_disputes group by attempt_id having count(*) > 1
  ) then
    raise exception 'DUPLICATE_ATTEMPT_DISPUTES_REQUIRE_ADJUDICATION';
  end if;
end;
$$;

drop index if exists technical_disputes_one_active_per_attempt_idx;

create unique index if not exists technical_disputes_one_per_attempt_idx
  on technical_disputes (attempt_id);

create or replace function public.technical_submit_dispute(
  p_user_id uuid,
  p_attempt_id uuid,
  p_reason_code text,
  p_description text
)
returns table (id uuid, status text, created_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_attempt_id uuid;
begin
  if exists (
    select 1
    from technical_disputes d
    where d.attempt_id = p_attempt_id
      and d.user_id = p_user_id
  ) then
    raise exception 'DISPUTE_ALREADY_SUBMITTED';
  end if;

  update technical_attempts a
  set status = 'disputed'
  where a.id = p_attempt_id
    and a.user_id = p_user_id
    and a.status = 'graded'
  returning a.id into v_attempt_id;

  if v_attempt_id is null then
    raise exception 'ATTEMPT_NOT_ELIGIBLE_FOR_DISPUTE';
  end if;

  return query
  insert into technical_disputes (attempt_id, user_id, reason_code, description)
  values (p_attempt_id, p_user_id, p_reason_code, p_description)
  returning technical_disputes.id, technical_disputes.status, technical_disputes.created_at;
end;
$$;

revoke all on function public.technical_submit_dispute(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.technical_submit_dispute(uuid, uuid, text, text)
  to service_role;
