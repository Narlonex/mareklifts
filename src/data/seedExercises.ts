/**
 * Seed exercise database.
 *
 * All names, groupings and coaching cues are original to MarekLifts. No
 * third-party text or imagery is reproduced; the "demonstration image" slot in
 * the UI renders an original generated placeholder tile.
 */

import type {
  Equipment,
  Exercise,
  ExerciseCategory,
  Muscle,
  MuscleGroup,
} from '../types'

/** Fine-grained muscle -> coarse statistics group. Single source of truth. */
export const MUSCLE_TO_GROUP: Record<Muscle, MuscleGroup> = {
  Chest: 'Chest',
  'Upper Chest': 'Chest',
  Lats: 'Back',
  'Upper Back': 'Back',
  'Lower Back': 'Back',
  Traps: 'Back',
  'Front Delts': 'Shoulders',
  'Side Delts': 'Shoulders',
  'Rear Delts': 'Shoulders',
  Biceps: 'Arms',
  Triceps: 'Arms',
  Forearms: 'Arms',
  Quads: 'Legs',
  Hamstrings: 'Legs',
  Glutes: 'Legs',
  Calves: 'Legs',
  Abs: 'Core',
  Obliques: 'Core',
}

export const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']

export const MUSCLES: Muscle[] = Object.keys(MUSCLE_TO_GROUP) as Muscle[]

export const EQUIPMENT: Equipment[] = [
  'Barbell',
  'Dumbbell',
  'Machine',
  'Cable',
  'Bodyweight',
  'EZ Bar',
  'Kettlebell',
  'Band',
  'Other',
]

type Row = [
  name: string,
  primary: Muscle,
  secondary: Muscle[],
  equipment: Equipment,
  category: ExerciseCategory,
  instructions: string,
]

const ROWS: Row[] = [
  // ---------------------------------------------------------------- chest
  ['Bench Press', 'Chest', ['Front Delts', 'Triceps'], 'Barbell', 'Compound',
    'Lie flat, grip just outside shoulder width, lower the bar to mid-chest and press back to lockout with the shoulder blades pinned.'],
  ['Incline Bench Press', 'Upper Chest', ['Front Delts', 'Triceps'], 'Barbell', 'Compound',
    'Set the bench to 30-45 degrees, lower the bar to the upper chest and press up without letting the elbows flare past the wrists.'],
  ['Decline Bench Press', 'Chest', ['Triceps'], 'Barbell', 'Compound',
    'Secure the legs, lower the bar to the lower chest and press straight up while keeping the ribcage down.'],
  ['Dumbbell Bench Press', 'Chest', ['Front Delts', 'Triceps'], 'Dumbbell', 'Compound',
    'Press two dumbbells from chest level to a slight inward touch at the top, keeping the wrists stacked over the elbows.'],
  ['Incline Dumbbell Press', 'Upper Chest', ['Front Delts', 'Triceps'], 'Dumbbell', 'Compound',
    'On a low incline, press the dumbbells up and slightly together, stopping just short of lockout to keep tension.'],
  ['Machine Chest Press', 'Chest', ['Triceps'], 'Machine', 'Compound',
    'Set the handles level with the mid-chest, press smoothly to near-lockout and control the return.'],
  ['Dumbbell Fly', 'Chest', ['Front Delts'], 'Dumbbell', 'Isolation',
    'With a soft elbow bend, sweep the dumbbells out wide and bring them back together over the chest in an arc.'],
  ['Cable Fly', 'Chest', ['Front Delts'], 'Cable', 'Isolation',
    'From a staggered stance, draw both handles together in front of the chest and squeeze before letting the arms travel back.'],
  ['Incline Cable Fly', 'Upper Chest', ['Front Delts'], 'Cable', 'Isolation',
    'Set the pulleys low, sweep the handles up and inward toward eye level to bias the upper chest.'],
  ['Pec Deck', 'Chest', [], 'Machine', 'Isolation',
    'Keep the back flat on the pad, bring the pads together in front of the chest and resist the opening phase.'],
  ['Push Up', 'Chest', ['Triceps', 'Front Delts'], 'Bodyweight', 'Compound',
    'Hands just outside shoulder width, body in one line, lower until the chest is a fist from the floor and press up.'],
  ['Chest Dip', 'Chest', ['Triceps', 'Front Delts'], 'Bodyweight', 'Compound',
    'Lean the torso forward, lower until the shoulders are just below the elbows and press back up under control.'],

  // ----------------------------------------------------------------- back
  ['Pull Up', 'Lats', ['Biceps', 'Upper Back'], 'Bodyweight', 'Compound',
    'Hang with an overhand grip slightly wider than the shoulders, drive the elbows down and pull the chin over the bar.'],
  ['Chin Up', 'Lats', ['Biceps'], 'Bodyweight', 'Compound',
    'Use a shoulder-width underhand grip and pull until the chest nears the bar, leading with the elbows.'],
  ['Lat Pulldown', 'Lats', ['Biceps', 'Upper Back'], 'Cable', 'Compound',
    'Grip just outside shoulder width, lean back slightly and pull the bar to the upper chest without shrugging.'],
  ['Close Grip Lat Pulldown', 'Lats', ['Biceps'], 'Cable', 'Compound',
    'Attach a close-grip handle, keep the torso tall and pull the handle to the sternum, pausing briefly.'],
  ['Straight Arm Pulldown', 'Lats', [], 'Cable', 'Isolation',
    'With arms nearly straight, pull the bar from overhead down to the thighs and squeeze the lats at the bottom.'],
  ['Barbell Row', 'Upper Back', ['Lats', 'Biceps', 'Lower Back'], 'Barbell', 'Compound',
    'Hinge to about 45 degrees, keep a neutral spine and row the bar to the lower ribs, pausing without jerking.'],
  ['Pendlay Row', 'Upper Back', ['Lats', 'Biceps'], 'Barbell', 'Compound',
    'Start from a torso-parallel position and pull explosively to the chest, resetting the bar on the floor each rep.'],
  ['Dumbbell Row', 'Lats', ['Upper Back', 'Biceps'], 'Dumbbell', 'Compound',
    'Brace one hand on a bench, keep the hips square and drive the elbow back toward the hip.'],
  ['Seated Cable Row', 'Upper Back', ['Lats', 'Biceps'], 'Cable', 'Compound',
    'Sit tall with a slight knee bend, pull the handle to the navel and let the shoulder blades travel forward on the return.'],
  ['T-Bar Row', 'Upper Back', ['Lats', 'Biceps'], 'Barbell', 'Compound',
    'Straddle the bar, hinge to 45 degrees and row the handles to the chest while keeping the lower back set.'],
  ['Machine Row', 'Upper Back', ['Lats', 'Biceps'], 'Machine', 'Compound',
    'Chest against the pad, pull the handles back until they pass the torso and control the stretch.'],
  ['Face Pull', 'Rear Delts', ['Upper Back', 'Traps'], 'Cable', 'Isolation',
    'Pull a rope toward the forehead with high elbows and rotate the hands apart at the end of the rep.'],
  ['Barbell Shrug', 'Traps', ['Forearms'], 'Barbell', 'Isolation',
    'Hold the bar at arms length and lift the shoulders straight up toward the ears without bending the elbows.'],
  ['Back Extension', 'Lower Back', ['Glutes', 'Hamstrings'], 'Bodyweight', 'Isolation',
    'Anchor the ankles, hinge at the hips and raise the torso until the body is straight, avoiding hyperextension.'],
  ['Conventional Deadlift', 'Lower Back', ['Glutes', 'Hamstrings', 'Traps', 'Forearms'], 'Barbell', 'Compound',
    'Bar over mid-foot, brace hard, push the floor away and stand tall while dragging the bar close to the legs.'],

  // ------------------------------------------------------------ shoulders
  ['Overhead Press', 'Front Delts', ['Side Delts', 'Triceps'], 'Barbell', 'Compound',
    'Squeeze the glutes, press the bar overhead to lockout and move the head slightly forward at the top.'],
  ['Dumbbell Shoulder Press', 'Front Delts', ['Side Delts', 'Triceps'], 'Dumbbell', 'Compound',
    'Start at ear height with the elbows under the wrists and press until the dumbbells nearly touch overhead.'],
  ['Arnold Press', 'Front Delts', ['Side Delts'], 'Dumbbell', 'Compound',
    'Begin with palms facing you and rotate the hands outward as you press, finishing with the palms forward.'],
  ['Machine Shoulder Press', 'Front Delts', ['Triceps'], 'Machine', 'Compound',
    'Adjust the seat so the handles start at shoulder height and press to a controlled lockout.'],
  ['Lateral Raise', 'Side Delts', [], 'Dumbbell', 'Isolation',
    'With a slight elbow bend, raise the dumbbells out to shoulder height leading with the elbows, not the hands.'],
  ['Cable Lateral Raise', 'Side Delts', [], 'Cable', 'Isolation',
    'Stand side-on to a low pulley and raise the handle across the body to shoulder height with a steady tempo.'],
  ['Front Raise', 'Front Delts', [], 'Dumbbell', 'Isolation',
    'Raise the dumbbells forward to about eye level with straight arms and lower them slowly.'],
  ['Rear Delt Fly', 'Rear Delts', ['Upper Back'], 'Dumbbell', 'Isolation',
    'Hinge forward, let the dumbbells hang and open the arms out wide with the thumbs pointing down.'],
  ['Reverse Pec Deck', 'Rear Delts', ['Upper Back'], 'Machine', 'Isolation',
    'Chest on the pad, sweep the handles apart in a wide arc and pause before returning.'],
  ['Upright Row', 'Side Delts', ['Traps'], 'Barbell', 'Compound',
    'With a grip just inside shoulder width, pull the bar to the lower chest keeping it close to the body.'],

  // ----------------------------------------------------------------- arms
  ['Barbell Curl', 'Biceps', ['Forearms'], 'Barbell', 'Isolation',
    'Keep the elbows pinned to the sides and curl the bar without swinging from the hips.'],
  ['Dumbbell Curl', 'Biceps', ['Forearms'], 'Dumbbell', 'Isolation',
    'Curl one dumbbell at a time, supinating the wrist as the hand rises, and control the lowering.'],
  ['Hammer Curl', 'Biceps', ['Forearms'], 'Dumbbell', 'Isolation',
    'Keep the palms facing each other throughout and curl without letting the elbows drift forward.'],
  ['Incline Dumbbell Curl', 'Biceps', ['Forearms'], 'Dumbbell', 'Isolation',
    'Lie back on an incline to stretch the biceps and curl the dumbbells with the upper arms fixed.'],
  ['Preacher Curl', 'Biceps', [], 'EZ Bar', 'Isolation',
    'Rest the upper arms on the pad and curl up, then lower until the arms are almost straight.'],
  ['Cable Curl', 'Biceps', ['Forearms'], 'Cable', 'Isolation',
    'From a low pulley, curl the bar with constant tension and keep the torso still.'],
  ['Concentration Curl', 'Biceps', [], 'Dumbbell', 'Isolation',
    'Brace the elbow against the inner thigh and curl with a strict, slow tempo.'],
  ['Triceps Pushdown', 'Triceps', [], 'Cable', 'Isolation',
    'Pin the elbows to the sides and extend the arms fully, squeezing the triceps at the bottom.'],
  ['Overhead Cable Extension', 'Triceps', [], 'Cable', 'Isolation',
    'Face away from a high pulley and extend the rope forward past the head keeping the upper arms still.'],
  ['Skull Crusher', 'Triceps', [], 'EZ Bar', 'Isolation',
    'Lower the bar toward the forehead by bending the elbows, then extend back to a near-lockout without flaring.'],
  ['Close Grip Bench Press', 'Triceps', ['Chest', 'Front Delts'], 'Barbell', 'Compound',
    'Use a shoulder-width grip, tuck the elbows and press with the triceps carrying the load.'],
  ['Dumbbell Overhead Extension', 'Triceps', [], 'Dumbbell', 'Isolation',
    'Hold one dumbbell overhead with both hands and lower it behind the head until the elbows reach 90 degrees.'],
  ['Bench Dip', 'Triceps', ['Front Delts'], 'Bodyweight', 'Compound',
    'Hands on the bench edge behind you, lower until the elbows reach 90 degrees and press back up.'],
  ['Triceps Kickback', 'Triceps', [], 'Dumbbell', 'Isolation',
    'Hinge forward, keep the upper arm parallel to the torso and straighten the arm behind you.'],
  ['Wrist Curl', 'Forearms', [], 'Dumbbell', 'Isolation',
    'Rest the forearms on the thighs and curl the wrists up through a full range with a slow return.'],

  // ----------------------------------------------------------------- legs
  ['Squat', 'Quads', ['Glutes', 'Lower Back', 'Abs'], 'Barbell', 'Compound',
    'Bar on the upper traps, brace, sit down between the hips and drive back up keeping the knees tracking over the toes.'],
  ['Front Squat', 'Quads', ['Glutes', 'Abs'], 'Barbell', 'Compound',
    'Bar racked on the front delts with high elbows, squat upright and stay tall out of the bottom.'],
  ['Goblet Squat', 'Quads', ['Glutes', 'Abs'], 'Kettlebell', 'Compound',
    'Hold the weight at the chest, squat deep between the knees and keep the chest lifted throughout.'],
  ['Hack Squat', 'Quads', ['Glutes'], 'Machine', 'Compound',
    'Set the back flat on the pad and lower until the knees reach roughly 90 degrees before driving up.'],
  ['Leg Press', 'Quads', ['Glutes', 'Hamstrings'], 'Machine', 'Compound',
    'Place the feet shoulder width on the platform and press without letting the lower back round off the pad.'],
  ['Bulgarian Split Squat', 'Quads', ['Glutes', 'Hamstrings'], 'Dumbbell', 'Compound',
    'Rear foot on a bench, drop straight down until the front thigh is parallel and drive up through the front heel.'],
  ['Walking Lunge', 'Quads', ['Glutes', 'Hamstrings'], 'Dumbbell', 'Compound',
    'Step forward, lower the back knee toward the floor and push through the front foot into the next step.'],
  ['Romanian Deadlift', 'Hamstrings', ['Glutes', 'Lower Back'], 'Barbell', 'Compound',
    'Push the hips back with soft knees, lower the bar along the thighs until you feel the hamstrings stretch, then stand.'],
  ['Sumo Deadlift', 'Hamstrings', ['Glutes', 'Quads', 'Lower Back'], 'Barbell', 'Compound',
    'Wide stance with the toes out, grip inside the knees and drive the floor apart while keeping the chest proud.'],
  ['Good Morning', 'Hamstrings', ['Lower Back', 'Glutes'], 'Barbell', 'Compound',
    'With the bar on the traps, hinge at the hips with a flat back until the torso nears parallel, then return.'],
  ['Hip Thrust', 'Glutes', ['Hamstrings'], 'Barbell', 'Compound',
    'Upper back on a bench, drive the hips up until the torso is level and squeeze the glutes at the top.'],
  ['Glute Bridge', 'Glutes', ['Hamstrings'], 'Bodyweight', 'Isolation',
    'Lie on the floor and press the hips up through the heels, pausing at the top with the ribs down.'],
  ['Leg Curl', 'Hamstrings', ['Calves'], 'Machine', 'Isolation',
    'Curl the pad toward the glutes and lower it slowly without letting the hips lift off the bench.'],
  ['Seated Leg Curl', 'Hamstrings', ['Calves'], 'Machine', 'Isolation',
    'Keep the thighs pinned and curl the pad down and under, controlling the return.'],
  ['Leg Extension', 'Quads', [], 'Machine', 'Isolation',
    'Extend the knees to a full squeeze, pause briefly and lower with a controlled tempo.'],
  ['Calf Raise', 'Calves', [], 'Machine', 'Isolation',
    'Rise onto the toes through a full range, pause at the top and let the heels drop for a deep stretch.'],
  ['Seated Calf Raise', 'Calves', [], 'Machine', 'Isolation',
    'With the knees bent, press through the balls of the feet and lower the heels below the platform.'],

  // ----------------------------------------------------------------- core
  ['Plank', 'Abs', ['Obliques'], 'Bodyweight', 'Isolation',
    'Forearms and toes on the floor, squeeze the glutes and hold a straight line from head to heels.'],
  ['Side Plank', 'Obliques', ['Abs'], 'Bodyweight', 'Isolation',
    'Stack the feet and hips, support on one forearm and hold the body in a straight line.'],
  ['Hanging Leg Raise', 'Abs', ['Obliques', 'Forearms'], 'Bodyweight', 'Isolation',
    'Hang from a bar and raise the legs to hip height without swinging, lowering under control.'],
  ['Cable Crunch', 'Abs', [], 'Cable', 'Isolation',
    'Kneel facing a high pulley and crunch the elbows toward the thighs by rounding the spine.'],
  ['Crunch', 'Abs', [], 'Bodyweight', 'Isolation',
    'Curl the shoulder blades off the floor by shortening the abs rather than pulling on the neck.'],
  ['Decline Sit Up', 'Abs', ['Obliques'], 'Bodyweight', 'Isolation',
    'Anchor the feet on a decline, sit up under control and lower without bouncing off the pad.'],
  ['Russian Twist', 'Obliques', ['Abs'], 'Bodyweight', 'Isolation',
    'Sit with the heels down, lean back slightly and rotate the torso side to side under control.'],
  ['Ab Wheel Rollout', 'Abs', ['Obliques', 'Lower Back'], 'Other', 'Compound',
    'From the knees, roll the wheel forward while keeping the ribs down, then pull back with the abs.'],
]

/** Slug used as a stable id so seeded exercises survive re-installs/imports. */
export function slugifyExerciseName(name: string): string {
  return `ex_${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`
}

function build(row: Row): Exercise {
  const [name, primaryMuscle, secondaryMuscles, equipment, category, instructions] = row
  return {
    id: slugifyExerciseName(name),
    name,
    primaryMuscle,
    muscleGroup: MUSCLE_TO_GROUP[primaryMuscle],
    secondaryMuscles,
    equipment,
    category,
    instructions,
  }
}

export const SEED_EXERCISES: Exercise[] = ROWS.map(build)

/** Fast lookup by id, including exercises the user adds at runtime. */
export function indexExercises(list: Exercise[]): Record<string, Exercise> {
  const out: Record<string, Exercise> = {}
  for (const e of list) out[e.id] = e
  return out
}
