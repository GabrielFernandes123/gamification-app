-- Recompensas com estoque + cooldown voltam ao estoque maximo quando o cooldown acaba.

create or replace function app._purchase_reward(p_user_id uuid, p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path = app, public as $$
declare
  v_reward  rewards;
  v_already boolean;
  v_next_at timestamptz;
begin
  select * into v_reward from rewards where id = p_reward_id and user_id = p_user_id and is_active = true;
  if not found then raise exception 'Recompensa não encontrada'; end if;

  if not v_reward.is_repurchasable then
    select exists (select 1 from purchases where reference_id = v_reward.id and user_id = p_user_id)
      into v_already;
    if v_already then raise exception 'Recompensa não recomprável (já resgatada)'; end if;
  end if;

  if v_reward.cooldown_minutes is not null and v_reward.cooldown_minutes > 0
     and v_reward.last_purchased_at is not null then
    v_next_at := v_reward.last_purchased_at + (v_reward.cooldown_minutes || ' minutes')::interval;
    if now() < v_next_at then
      raise exception 'Em cooldown até %', v_next_at;
    end if;
  end if;

  if v_reward.has_stock
     and coalesce(v_reward.current_stock, 0) <= 0
     and v_reward.cooldown_minutes is not null
     and v_reward.cooldown_minutes > 0
     and v_reward.last_purchased_at is not null
     and v_next_at is not null
     and now() >= v_next_at then
    v_reward.current_stock := coalesce(v_reward.max_stock, 0);
    update rewards set current_stock = v_reward.current_stock where id = v_reward.id;
  end if;

  if v_reward.has_stock and coalesce(v_reward.current_stock, 0) <= 0 then
    raise exception 'Fora de estoque';
  end if;

  perform app._spend_gold(p_user_id, v_reward.cost);

  update rewards
     set last_purchased_at = now(),
         current_stock = case when has_stock then greatest(0, coalesce(v_reward.current_stock, 0) - 1) else current_stock end
   where id = v_reward.id;

  insert into purchases (user_id, kind, reference_id, name, gold_spent)
    values (p_user_id, 'reward', v_reward.id, v_reward.name, v_reward.cost);

  return jsonb_build_object('goldSpent', v_reward.cost);
end;
$$;
