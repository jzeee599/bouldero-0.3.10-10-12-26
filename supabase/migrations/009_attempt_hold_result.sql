-- 0.3.6: distinguish a controlled hold from a touch without changing the hold reference.
alter table public.attempts
  add column hold_result text
  check (hold_result in ('controlled', 'touched'));

update public.attempts
set hold_result = 'controlled'
where ended_hold_id is not null and hold_result is null;
