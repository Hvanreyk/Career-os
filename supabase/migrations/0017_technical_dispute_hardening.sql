-- Allow at most one dispute per attempt and restrict dispute creation to attempts
-- that have completed grading. The unique index is the concurrency
-- backstop; the function predicates provide clear errors for normal retries.

create unique index technical_disputes_one_per_attempt_idx
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
