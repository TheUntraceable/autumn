-- AI Deduction: Deduct input/output tokens from ai_balance JSONB column
-- Simpler than regular deduction: no entity scoping, no rollovers, no additional_balance.
-- Two independent deductions (input/output) against ai_balance.input and ai_balance.output.
DROP FUNCTION IF EXISTS deduct_ai_from_cus_ents(jsonb);

CREATE FUNCTION deduct_ai_from_cus_ents(params jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  sorted_entitlements jsonb := params->'sorted_entitlements';
  ai_deduction_input numeric := COALESCE((params->'ai_deduction'->>'input')::numeric, 0);
  ai_deduction_output numeric := COALESCE((params->'ai_deduction'->>'output')::numeric, 0);
  overage_behaviour text := NULLIF(params->>'overage_behaviour', '');
  overage_behavior_is_allow boolean := COALESCE((params->>'overage_behavior_is_allow')::boolean, false);
  feature_id text := NULLIF(params->>'feature_id', '');
  cus_ent_ids text[] := CASE
    WHEN params->'cus_ent_ids' IS NULL OR jsonb_typeof(params->'cus_ent_ids') != 'array' THEN NULL
    ELSE ARRAY(SELECT jsonb_array_elements_text(params->'cus_ent_ids'))
  END;

  remaining_input numeric;
  remaining_output numeric;
  ent_obj jsonb;
  ent_id text;
  usage_allowed boolean;

  current_ai_balance jsonb;
  current_input numeric;
  current_output numeric;
  ai_max_input numeric;
  ai_max_output numeric;

  input_deducted numeric;
  output_deducted numeric;
  new_input numeric;
  new_output numeric;

  updates_json jsonb := '{}'::jsonb;
  result_json jsonb;
BEGIN
  remaining_input := ai_deduction_input;
  remaining_output := ai_deduction_output;

  -- Lock all rows upfront
  IF cus_ent_ids IS NOT NULL AND array_length(cus_ent_ids, 1) > 0 THEN
    PERFORM 1 FROM customer_entitlements ce WHERE ce.id = ANY(cus_ent_ids) FOR UPDATE;
  END IF;

  -- ============================================================================
  -- PASS 1: Deduct down to 0 (floor)
  -- ============================================================================
  FOR ent_obj IN SELECT * FROM jsonb_array_elements(sorted_entitlements)
  LOOP
    EXIT WHEN remaining_input = 0 AND remaining_output = 0;

    ent_id := ent_obj->>'customer_entitlement_id';
    usage_allowed := COALESCE((ent_obj->>'usage_allowed')::boolean, false) OR overage_behavior_is_allow;

    -- Read current ai_balance from DB
    SELECT ce.ai_balance INTO current_ai_balance
    FROM customer_entitlements ce WHERE ce.id = ent_id;

    IF current_ai_balance IS NULL THEN
      CONTINUE;
    END IF;

    current_input := COALESCE((current_ai_balance->>'input')::numeric, 0);
    current_output := COALESCE((current_ai_balance->>'output')::numeric, 0);

    ai_max_input := CASE WHEN ent_obj->'ai_max_balance' IS NOT NULL AND ent_obj->'ai_max_balance'->>'input' IS NOT NULL
      THEN (ent_obj->'ai_max_balance'->>'input')::numeric ELSE NULL END;
    ai_max_output := CASE WHEN ent_obj->'ai_max_balance' IS NOT NULL AND ent_obj->'ai_max_balance'->>'output' IS NOT NULL
      THEN (ent_obj->'ai_max_balance'->>'output')::numeric ELSE NULL END;

    -- Pass 1: floor at 0
    input_deducted := LEAST(GREATEST(remaining_input, 0), GREATEST(current_input, 0));
    output_deducted := LEAST(GREATEST(remaining_output, 0), GREATEST(current_output, 0));

    IF input_deducted != 0 OR output_deducted != 0 THEN
      new_input := current_input - input_deducted;
      new_output := current_output - output_deducted;

      UPDATE customer_entitlements ce
      SET ai_balance = jsonb_build_object('input', new_input, 'output', new_output)
      WHERE ce.id = ent_id;

      updates_json := jsonb_set(
        updates_json,
        ARRAY[ent_id],
        jsonb_build_object(
          'balance', (SELECT ce.balance FROM customer_entitlements ce WHERE ce.id = ent_id),
          'additional_balance', 0,
          'adjustment', COALESCE((SELECT ce.adjustment FROM customer_entitlements ce WHERE ce.id = ent_id), 0),
          'entities', COALESCE((SELECT ce.entities FROM customer_entitlements ce WHERE ce.id = ent_id), '{}'::jsonb),
          'deducted', input_deducted + output_deducted,
          'additional_deducted', 0,
          'ai_balance', jsonb_build_object('input', new_input, 'output', new_output)
        )
      );

      remaining_input := remaining_input - input_deducted;
      remaining_output := remaining_output - output_deducted;
    END IF;
  END LOOP;

  -- ============================================================================
  -- PASS 2: Allow negative for usage_allowed entitlements
  -- ============================================================================
  IF remaining_input > 0 OR remaining_output > 0 THEN
    FOR ent_obj IN SELECT * FROM jsonb_array_elements(sorted_entitlements)
    LOOP
      EXIT WHEN remaining_input = 0 AND remaining_output = 0;

      ent_id := ent_obj->>'customer_entitlement_id';
      usage_allowed := COALESCE((ent_obj->>'usage_allowed')::boolean, false) OR overage_behavior_is_allow;

      IF NOT usage_allowed THEN
        CONTINUE;
      END IF;

      -- Re-read current state (may have been updated in Pass 1)
      SELECT ce.ai_balance INTO current_ai_balance
      FROM customer_entitlements ce WHERE ce.id = ent_id;

      IF current_ai_balance IS NULL THEN
        CONTINUE;
      END IF;

      current_input := COALESCE((current_ai_balance->>'input')::numeric, 0);
      current_output := COALESCE((current_ai_balance->>'output')::numeric, 0);

      -- Pass 2: allow negative (deduct everything remaining)
      input_deducted := remaining_input;
      output_deducted := remaining_output;

      IF input_deducted != 0 OR output_deducted != 0 THEN
        new_input := current_input - input_deducted;
        new_output := current_output - output_deducted;

        UPDATE customer_entitlements ce
        SET ai_balance = jsonb_build_object('input', new_input, 'output', new_output)
        WHERE ce.id = ent_id;

        IF updates_json ? ent_id THEN
          updates_json := jsonb_set(
            updates_json,
            ARRAY[ent_id],
            jsonb_build_object(
              'balance', (SELECT ce.balance FROM customer_entitlements ce WHERE ce.id = ent_id),
              'additional_balance', 0,
              'adjustment', COALESCE((SELECT ce.adjustment FROM customer_entitlements ce WHERE ce.id = ent_id), 0),
              'entities', COALESCE((SELECT ce.entities FROM customer_entitlements ce WHERE ce.id = ent_id), '{}'::jsonb),
              'deducted', (updates_json->ent_id->>'deducted')::numeric + input_deducted + output_deducted,
              'additional_deducted', 0,
              'ai_balance', jsonb_build_object('input', new_input, 'output', new_output)
            )
          );
        ELSE
          updates_json := jsonb_set(
            updates_json,
            ARRAY[ent_id],
            jsonb_build_object(
              'balance', (SELECT ce.balance FROM customer_entitlements ce WHERE ce.id = ent_id),
              'additional_balance', 0,
              'adjustment', COALESCE((SELECT ce.adjustment FROM customer_entitlements ce WHERE ce.id = ent_id), 0),
              'entities', COALESCE((SELECT ce.entities FROM customer_entitlements ce WHERE ce.id = ent_id), '{}'::jsonb),
              'deducted', input_deducted + output_deducted,
              'additional_deducted', 0,
              'ai_balance', jsonb_build_object('input', new_input, 'output', new_output)
            )
          );
        END IF;

        remaining_input := remaining_input - input_deducted;
        remaining_output := remaining_output - output_deducted;
      END IF;
    END LOOP;
  END IF;

  -- For AI features: raise INSUFFICIENT_BALANCE whenever tokens remain after both passes
  -- and overusage is not explicitly allowed (via usage_allowed or overage_behaviour='allow').
  -- Unlike standard features (which cap at 0 and succeed), AI tracks should always fail
  -- when the requested amount exceeds the available balance.
  IF (remaining_input > 0 OR remaining_output > 0) AND NOT overage_behavior_is_allow THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE|featureId:%|value:%|remaining:%',
      feature_id,
      COALESCE((ai_deduction_input + ai_deduction_output)::text, '0'),
      (remaining_input + remaining_output);
  END IF;

  result_json := jsonb_build_object(
    'updates', updates_json,
    'remaining', remaining_input + remaining_output,
    'rollover_updates', '[]'::jsonb
  );

  RETURN result_json;
END;
$$;
