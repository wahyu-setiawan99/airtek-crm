-- Presales pipeline stages (user decision 14 Oct 2026):
--   Approach → Design → Submitted → Ready Tender → On Tender → On Negotiation → Deal (won) → Closed (won) → Loss (lost)
-- Existing default stages are renamed in place, so deals keep their stage:
--   Lead Masuk → Approach, Survey Lokasi → Design, Desain & BOQ → Submitted,
--   Estimasi Biaya → Ready Tender, Serah ke Sales → On Tender, Won → Deal, Lost → Loss.
-- On Negotiation and Closed are added. Stages renamed by hand are left alone. Safe to run twice.

do $$
declare
  pipe record;
  item record;
  existing uuid;
begin
  for pipe in select id, organization_id from public.pipelines where name ilike '%presales%' loop
    for item in
      select * from (values
        ('Lead Masuk', 'Approach', 0, 10, 14, 'open'),
        ('Survey Lokasi', 'Design', 1, 25, 14, 'open'),
        ('Desain & BOQ', 'Submitted', 2, 40, 14, 'open'),
        ('Estimasi Biaya', 'Ready Tender', 3, 55, 14, 'open'),
        ('Serah ke Sales', 'On Tender', 4, 65, 14, 'open'),
        (null, 'On Negotiation', 5, 80, 10, 'open'),
        ('Won', 'Deal', 6, 100, null, 'won'),
        (null, 'Closed', 7, 100, null, 'won'),
        ('Lost', 'Loss', 8, 0, null, 'lost')
      ) as t(old_name, new_name, pos, probability, rotting, stage_type)
    loop
      select id into existing from public.stages
        where pipeline_id = pipe.id and (name = item.new_name or (item.old_name is not null and name = item.old_name))
        order by (name = item.new_name) desc
        limit 1;
      if existing is not null then
        update public.stages
          set name = item.new_name, position = item.pos, probability = item.probability,
              rotting_days = item.rotting, type = item.stage_type, updated_at = now()
          where id = existing;
      else
        insert into public.stages (organization_id, pipeline_id, name, position, probability, rotting_days, type)
          values (pipe.organization_id, pipe.id, item.new_name, item.pos, item.probability, item.rotting, item.stage_type);
      end if;
      existing := null;
    end loop;
  end loop;
end $$;
