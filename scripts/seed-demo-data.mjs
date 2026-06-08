#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
const DEMO_PREFIX = 'Demo - ';

function demoName(name) {
  return `${DEMO_PREFIX}${name}`;
}

function loadEnvFile() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function arg(name) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index >= 0) return process.argv[index + 1];
  const inline = process.argv.find((item) => item.startsWith(`${flag}=`));
  return inline ? inline.slice(flag.length + 1) : undefined;
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function atDaysAgo(days, hour = 18, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function addMinutes(iso, minutes) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function pick(array, index) {
  return array[index % array.length];
}

async function currentUserId(supabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error('Usuário não autenticado.');
  return uid;
}

async function maybeSingle(query) {
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function byName(supabase, table, userId, name) {
  return maybeSingle(supabase.from(table).select('*').eq('user_id', userId).eq('name', name));
}

async function upsertNamed(supabase, table, userId, payload) {
  const existing = await byName(supabase, table, userId, payload.name);
  if (existing) {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from(table)
    .insert({ ...payload, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function insertIfMissing(supabase, table, userId, name, payload) {
  const existing = await byName(supabase, table, userId, name);
  if (existing) return existing;
  const { data, error } = await supabase
    .from(table)
    .insert({ ...payload, name, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function clearDemoWorkoutData(supabase, userId) {
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .like('name', 'Demo %');
  if (error) throw error;
  const ids = (sessions ?? []).map((item) => item.id);
  if (ids.length === 0) return;
  const { error: deleteError } = await supabase.from('workout_sessions').delete().in('id', ids);
  if (deleteError) throw deleteError;
}

async function createCompletedWorkoutThroughRpc(supabase, userId, name, startedAt, items, exercises) {
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      name,
      started_at: startedAt,
    })
    .select()
    .single();
  if (sessionError) throw sessionError;

  const setRows = items.map(([exerciseName, weight, reps], index) => ({
    user_id: userId,
    session_id: session.id,
    exercise_id: exercises[exerciseName].id,
    set_number: index + 1,
    weight,
    reps,
    created_at: addMinutes(startedAt, 8 + index * 7),
  }));
  const { error: setsError } = await supabase.from('workout_sets').insert(setRows);
  if (setsError) throw setsError;

  const { error: completeError } = await supabase.rpc('complete_workout_session', {
    p_session_id: session.id,
  });
  if (completeError) throw completeError;
}

async function seed() {
  loadEnvFile();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const email = arg('email') ?? process.env.SUPABASE_SEED_EMAIL;
  const password = arg('password') ?? process.env.SUPABASE_SEED_PASSWORD;

  if (!url || !anonKey) {
    throw new Error('Faltam EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY no .env.');
  }
  if (!email || !password) {
    throw new Error('Informe SUPABASE_SEED_EMAIL/SUPABASE_SEED_PASSWORD ou use --email e --password.');
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const userId = await currentUserId(supabase);
  console.log(`Seed demo para ${email}`);

  await supabase.from('profiles').update({ display_name: 'Gabriel', timezone: 'America/Cuiaba' }).eq('id', userId);
  await supabase.from('characters').update({ daily_xp_goal: 450, daily_gold_goal: 80 }).eq('user_id', userId);

  const skills = {};
  for (const skill of [
    ['Saúde', '#22C55E', 1280],
    ['Força', '#F97316', 2140],
    ['Hipertrofia', '#22D3EE', 1620],
    ['Mobilidade', '#3B82F6', 740],
    ['Disciplina', '#F5B301', 1880],
    ['Conhecimento', '#A78BFA', 420],
  ]) {
    const row = await upsertNamed(supabase, 'skills', userId, {
      name: demoName(skill[0]),
      color: skill[1],
      xp: skill[2],
      description: `Skill demo: ${skill[0]}`,
    });
    skills[skill[0]] = row;
  }

  const bodyParts = {};
  for (const part of [
    ['Peito', '#22D3EE', 940],
    ['Costas', '#3B82F6', 820],
    ['Pernas', '#F97316', 1280],
    ['Ombros', '#F5B301', 620],
    ['Bíceps', '#A78BFA', 430],
    ['Tríceps', '#EF4444', 510],
    ['Abdômen', '#22C55E', 360],
  ]) {
    const row = await upsertNamed(supabase, 'body_parts', userId, {
      name: demoName(part[0]),
      color: part[1],
      xp: part[2],
      is_active: true,
    });
    bodyParts[part[0]] = row;
  }

  const exercises = {};
  const exerciseRows = [
    ['Supino reto', 'Peito', 'Tríceps', 'Força'],
    ['Supino inclinado', 'Peito', 'Ombros', 'Hipertrofia'],
    ['Agachamento livre', 'Pernas', 'Abdômen', 'Força'],
    ['Remada curvada', 'Costas', 'Bíceps', 'Força'],
    ['Desenvolvimento', 'Ombros', 'Tríceps', 'Hipertrofia'],
    ['Rosca direta', 'Bíceps', null, 'Hipertrofia'],
    ['Tríceps corda', 'Tríceps', null, 'Hipertrofia'],
  ];
  for (const [name, primary, secondary, skill] of exerciseRows) {
    const row = await upsertNamed(supabase, 'fitness_exercises', userId, {
      name: demoName(name),
      category: 'strength',
      primary_skill_id: skills[skill]?.id ?? null,
      primary_body_part_id: bodyParts[primary]?.id ?? null,
      secondary_body_part_id: secondary ? bodyParts[secondary]?.id ?? null : null,
      notes: 'Exercício demo',
      is_active: true,
    });
    exercises[name] = row;
  }

  const habits = {};
  const habitRows = [
    { name: 'Beber água', type: 'positive', difficulty: 'easy', executions_per_day: 4, weekdays: [0, 1, 2, 3, 4, 5, 6], primary_skill_id: skills['Saúde'].id, reminder_times: ['09:00', '15:00'] },
    { name: 'Alongamento', type: 'positive', difficulty: 'medium', executions_per_day: 1, weekdays: [1, 2, 3, 4, 5], primary_skill_id: skills['Mobilidade'].id, reminder_times: ['20:30'] },
    { name: 'Dormir antes de 23:30', type: 'positive', difficulty: 'hard', executions_per_day: 1, weekdays: [0, 1, 2, 3, 4], primary_skill_id: skills['Disciplina'].id, reminder_times: [] },
    { name: 'Evitar açúcar', type: 'negative', difficulty: 'medium', executions_per_day: 1, weekdays: [0, 1, 2, 3, 4, 5, 6], primary_skill_id: skills['Saúde'].id, reminder_times: [] },
  ];
  for (const habit of habitRows) {
    const row = await insertIfMissing(supabase, 'habits', userId, demoName(habit.name), {
      ...habit,
      schedule: 'weekdays',
      weekly_target: null,
      monthly_target: null,
      monthly_day: null,
      secondary_skill_id: null,
      description: 'Hábito demo',
      current_streak: 6,
      best_streak: 18,
      last_streak: 5,
      is_active: true,
    });
    habits[habit.name] = row;
  }

  const demoHabitIds = Object.values(habits).map((habit) => habit.id);
  if (demoHabitIds.length > 0) {
    const { error: logsDeleteError } = await supabase
      .from('habit_logs')
      .delete()
      .eq('user_id', userId)
      .in('habit_id', demoHabitIds)
      .gte('occurred_on', daysAgo(24));
    if (logsDeleteError) throw logsDeleteError;
  }

  const habitLogs = [];
  for (let day = 0; day < 24; day += 1) {
    for (const habit of Object.values(habits)) {
      const success = habit.type === 'positive'
        ? (day % 7 !== 3 || habit.name === demoName('Beber água'))
        : day % 8 !== 2;
      habitLogs.push({
        user_id: userId,
        habit_id: habit.id,
        occurred_on: daysAgo(day),
        success,
        is_auto: false,
        xp_gained: success && habit.type === 'positive' ? pick([20, 35, 50, 80], day) : 0,
        gold_gained: success && habit.type === 'positive' ? pick([5, 8, 12, 18], day) : 0,
        damage_taken: success ? 0 : pick([8, 12, 18], day),
        streak_at_log: Math.max(1, 18 - day),
        logged_at: atDaysAgo(day, 9 + (day % 8), 10),
      });
    }
  }
  const { error: logsError } = await supabase.from('habit_logs').insert(habitLogs);
  if (logsError) throw logsError;

  await clearDemoWorkoutData(supabase, userId);

  const workoutPlans = [
    { name: 'Demo Push A', days: 1, duration: 58, items: [['Supino reto', 62, 8], ['Supino reto', 64, 6], ['Supino inclinado', 48, 10], ['Desenvolvimento', 30, 8], ['Tríceps corda', 24, 12]] },
    { name: 'Demo Pull A', days: 3, duration: 52, items: [['Remada curvada', 58, 8], ['Remada curvada', 60, 7], ['Rosca direta', 28, 10], ['Rosca direta', 30, 8]] },
    { name: 'Demo Legs A', days: 5, duration: 64, items: [['Agachamento livre', 82, 8], ['Agachamento livre', 86, 6], ['Agachamento livre', 88, 5]] },
    { name: 'Demo Push B', days: 9, duration: 55, items: [['Supino reto', 58, 8], ['Supino inclinado', 46, 10], ['Desenvolvimento', 28, 9], ['Tríceps corda', 22, 12]] },
    { name: 'Demo Pull B', days: 12, duration: 48, items: [['Remada curvada', 54, 9], ['Rosca direta', 26, 11]] },
  ];

  for (const plan of workoutPlans) {
    const started = atDaysAgo(plan.days, 18, 30);
    const ended = addMinutes(started, plan.duration);
    const totalVolume = plan.items.reduce((sum, [, weight, reps]) => sum + weight * reps, 0);
    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        name: plan.name,
        started_at: started,
        ended_at: ended,
        duration_minutes: plan.duration,
        status: 'completed',
        total_sets: plan.items.length,
        total_volume: totalVolume,
        xp_gained: Math.max(40, Math.floor(plan.items.length * 8 + totalVolume / 100)),
        gold_gained: Math.floor(Math.max(40, Math.floor(plan.items.length * 8 + totalVolume / 100)) / 8),
      })
      .select()
      .single();
    if (sessionError) throw sessionError;

    const setRows = plan.items.map(([exerciseName, weight, reps], index) => ({
      user_id: userId,
      session_id: session.id,
      exercise_id: exercises[exerciseName].id,
      set_number: index + 1,
      weight,
      reps,
      created_at: addMinutes(started, 8 + index * 7),
    }));
    const { error: setsError } = await supabase.from('workout_sets').insert(setRows);
    if (setsError) throw setsError;
  }

  await createCompletedWorkoutThroughRpc(
    supabase,
    userId,
    'Demo PR Push',
    atDaysAgo(0, 18, 10),
    [
      ['Supino reto', 72, 5],
      ['Remada curvada', 66, 6],
      ['Agachamento livre', 94, 4],
      ['Desenvolvimento', 34, 6],
    ],
    exercises,
  );

  const templates = [
    { name: 'Push A', exercises: [['Supino reto', 4], ['Supino inclinado', 3], ['Desenvolvimento', 3], ['Tríceps corda', 3]] },
    { name: 'Pull A', exercises: [['Remada curvada', 4], ['Rosca direta', 3]] },
    { name: 'Legs A', exercises: [['Agachamento livre', 5]] },
  ];
  for (const template of templates) {
    const row = await upsertNamed(supabase, 'workout_templates', userId, {
      name: demoName(template.name),
      description: 'Template demo',
      is_active: true,
    });
    await supabase.from('workout_template_exercises').delete().eq('template_id', row.id);
    const items = template.exercises.map(([exerciseName, planned_sets], index) => ({
      user_id: userId,
      template_id: row.id,
      exercise_id: exercises[exerciseName].id,
      planned_sets,
      sort_order: index,
      target_reps: 8,
    }));
    const { error } = await supabase.from('workout_template_exercises').insert(items);
    if (error) throw error;
  }

  const measurementRows = [
    { days: 35, weight_kg: 84.2, waist_cm: 91, chest_cm: 101, right_arm_cm: 36.2, left_arm_cm: 36, right_thigh_cm: 59, left_thigh_cm: 58.8 },
    { days: 28, weight_kg: 83.6, waist_cm: 90, chest_cm: 101.5, right_arm_cm: 36.4, left_arm_cm: 36.2, right_thigh_cm: 59.4, left_thigh_cm: 59 },
    { days: 21, weight_kg: 83.1, waist_cm: 89, chest_cm: 102, right_arm_cm: 36.6, left_arm_cm: 36.4, right_thigh_cm: 59.8, left_thigh_cm: 59.3 },
    { days: 14, weight_kg: 82.7, waist_cm: 88, chest_cm: 102.5, right_arm_cm: 36.8, left_arm_cm: 36.6, right_thigh_cm: 60, left_thigh_cm: 59.8 },
    { days: 7, weight_kg: 82.1, waist_cm: 87, chest_cm: 103, right_arm_cm: 37, left_arm_cm: 36.8, right_thigh_cm: 60.3, left_thigh_cm: 60 },
    { days: 1, weight_kg: 81.8, waist_cm: 86.5, chest_cm: 103.2, right_arm_cm: 37.2, left_arm_cm: 37, right_thigh_cm: 60.5, left_thigh_cm: 60.3 },
  ];
  for (const item of measurementRows) {
    const { days, ...measurement } = item;
    const { error } = await supabase.from('body_measurements').upsert({
      user_id: userId,
      measured_on: daysAgo(days),
      ...measurement,
    }, { onConflict: 'user_id,measured_on' });
    if (error) throw error;
  }

  await supabase.from('body_alert_settings').upsert({
    user_id: userId,
    workout_stale_days: 5,
    measurement_stale_days: 14,
    body_part_stale_days: 10,
  }, { onConflict: 'user_id' });

  const goals = [
    { title: demoName('Treinar 4x na semana'), type: 'frequency', target_metric: 'workouts_per_week', target_value: 4, difficulty: 'medium', body_part_id: null },
    { title: demoName('Supino 70kg x 5'), type: 'performance', target_metric: 'weight', target_value: 70, target_reps: 5, exercise_id: exercises['Supino reto'].id, body_part_id: bodyParts['Peito'].id, difficulty: 'hard' },
    { title: demoName('Cintura em 84cm'), type: 'measurement', target_metric: 'waist_cm', target_direction: 'decrease', target_value: 84, body_part_id: bodyParts['Abdômen'].id, difficulty: 'hard' },
    { title: demoName('Braço em 38cm'), type: 'measurement', target_metric: 'right_arm_cm', target_direction: 'increase', target_value: 38, body_part_id: bodyParts['Bíceps'].id, difficulty: 'medium' },
  ];
  for (const goal of goals) {
    const existing = await maybeSingle(supabase.from('body_goals').select('*').eq('user_id', userId).eq('title', goal.title));
    if (existing) continue;
    const { error } = await supabase.from('body_goals').insert({
      user_id: userId,
      status: 'active',
      target_direction: 'increase',
      is_manual: false,
      ...goal,
    });
    if (error) throw error;
  }

  for (const quest of [
    { name: demoName('Comprar suplemento'), difficulty: 'easy', due_date: daysAgo(-2), description: 'Side quest demo' },
    { name: demoName('Organizar roupas de treino'), difficulty: 'trivial', due_date: daysAgo(1), description: 'Side quest demo' },
    { name: demoName('Marcar avaliação física'), difficulty: 'medium', due_date: daysAgo(-5), description: 'Side quest demo' },
  ]) {
    await insertIfMissing(supabase, 'side_quests', userId, quest.name, {
      ...quest,
      is_completed: false,
      primary_skill_id: skills['Disciplina'].id,
    });
  }

  for (const reward of [
    { name: demoName('Cinema sem culpa'), cost: 120, description: 'Recompensa demo', is_repurchasable: true, has_stock: false },
    { name: demoName('Hambúrguer planejado'), cost: 180, description: 'Recompensa demo', is_repurchasable: true, has_stock: false },
  ]) {
    await insertIfMissing(supabase, 'rewards', userId, reward.name, {
      ...reward,
      is_active: true,
    });
  }

  console.log('Seed demo finalizado.');
  console.log('Abra o app e puxe para atualizar as telas.');
}

seed().catch((error) => {
  console.error('Falha ao gerar dados demo:');
  console.error(error.message ?? error);
  process.exit(1);
});
