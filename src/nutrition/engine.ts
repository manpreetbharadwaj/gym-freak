/**
 * Gym Freak calorie, macro and body-fat estimation engine.
 *
 * Pure TypeScript with no imports so the exact same file runs on the server (source of truth) and in the app
 * (offline fallback). The app keeps a byte-identical copy at gymFreak/src/nutrition/engine.ts; both repos test it
 * against the same reference cases (nutrition-engine.vectors.json). Change it here, then copy it over.
 *
 * Every number is an estimate from published equations, never a measurement:
 * - BMR: Mifflin-St Jeor (adults, 18+).
 * - TDEE: BMR × an activity factor for the user's day-to-day activity (not counting planned workouts as "very active").
 * - Goal: a conservative percentage adjustment with an absolute cap.
 * - Protein from body weight (adjusted weight above a BMI threshold), fat as a share of calories with a floor,
 *   carbohydrate = the remaining energy. 4 / 4 / 9 kcal per gram.
 * - Body fat: U.S. Navy circumference equations (metric form).
 */

export const NUTRITION_ENGINE_VERSION = 1;
export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

export type CalcSex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
export type NutritionGoal = 'build_muscle' | 'get_stronger' | 'lose_fat' | 'general_fitness' | 'endurance' | 'mobility';
export const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'very', 'extra'];
export const NUTRITION_GOALS: NutritionGoal[] = ['build_muscle', 'get_stronger', 'lose_fat', 'general_fitness', 'endurance', 'mobility'];

export interface GoalStrategy {
  /** Fraction of TDEE: +0.10 = 10 % surplus, -0.15 = 15 % deficit, 0 = maintenance. */
  calorieAdjustPct: number;
  /** Absolute cap on the adjustment in kcal (keeps large bodies from extreme deficits / surpluses). */
  maxAdjustKcal: number;
  proteinGPerKg: number;
}

export interface NutritionPolicy {
  version: number;
  activityFactors: Record<ActivityLevel, number>;
  goals: Record<NutritionGoal, GoalStrategy>;
  fat: { pctOfCalories: number; minGPerKg: number };
  protein: {
    minGPerKg: number;
    maxGPerKg: number;
    /** Used instead of the goal value when the user reports a condition needing individual dietary advice (RDA level). */
    cautionGPerKg: number;
    /** At or above this BMI, protein is based on adjusted body weight instead of total weight. */
    adjustedWeightBmi: number;
  };
  minCalories: Record<CalcSex, number>;
  maxCalories: number;
  /** A weight change smaller than this does not create a new automatic target (day-to-day fluctuation). */
  recalcWeightDeltaKg: number;
  features: { bodyComposition: boolean; healthImport: boolean };
}

/**
 * Bundled default (version 0). Activity factors are the conventional sedentary → extra-active multipliers;
 * goal adjustments are deliberately moderate (≈10–15 %), protein within 1.4–2.0 g/kg for exercising adults.
 */
export const DEFAULT_NUTRITION_POLICY: NutritionPolicy = {
  version: 0,
  activityFactors: { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, extra: 1.9 },
  goals: {
    build_muscle: { calorieAdjustPct: 0.1, maxAdjustKcal: 350, proteinGPerKg: 1.8 },
    get_stronger: { calorieAdjustPct: 0.05, maxAdjustKcal: 250, proteinGPerKg: 1.8 },
    lose_fat: { calorieAdjustPct: -0.15, maxAdjustKcal: 500, proteinGPerKg: 2.0 },
    general_fitness: { calorieAdjustPct: 0, maxAdjustKcal: 0, proteinGPerKg: 1.4 },
    endurance: { calorieAdjustPct: 0, maxAdjustKcal: 0, proteinGPerKg: 1.6 },
    mobility: { calorieAdjustPct: 0, maxAdjustKcal: 0, proteinGPerKg: 1.4 },
  },
  fat: { pctOfCalories: 0.25, minGPerKg: 0.6 },
  protein: { minGPerKg: 1.4, maxGPerKg: 2.0, cautionGPerKg: 0.8, adjustedWeightBmi: 30 },
  minCalories: { male: 1500, female: 1200 },
  maxCalories: 5000,
  recalcWeightDeltaKg: 1,
  features: { bodyComposition: true, healthImport: true },
};

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Problems that make a policy unsafe to use (empty = valid). Ranges are guard rails, not recommendations. */
export function validateNutritionPolicy(p: unknown): string[] {
  const errors: string[] = [];
  const policy = p as Partial<NutritionPolicy> | null;
  if (!policy || typeof policy !== 'object') return ['policy must be an object'];
  for (const level of ACTIVITY_LEVELS) {
    const f = policy.activityFactors?.[level];
    if (!num(f) || f < 1.1 || f > 2.4) errors.push(`activityFactors.${level} must be between 1.1 and 2.4`);
  }
  const factors = ACTIVITY_LEVELS.map((l) => policy.activityFactors?.[l] ?? 0);
  if (factors.some((f, i) => i > 0 && f < factors[i - 1])) errors.push('activityFactors must not decrease from sedentary to extra');
  for (const goal of NUTRITION_GOALS) {
    const g = policy.goals?.[goal];
    if (!g) { errors.push(`goals.${goal} is missing`); continue; }
    if (!num(g.calorieAdjustPct) || g.calorieAdjustPct < -0.25 || g.calorieAdjustPct > 0.2) errors.push(`goals.${goal}.calorieAdjustPct must be between -0.25 and 0.20`);
    if (!num(g.maxAdjustKcal) || g.maxAdjustKcal < 0 || g.maxAdjustKcal > 750) errors.push(`goals.${goal}.maxAdjustKcal must be between 0 and 750`);
    if (!num(g.proteinGPerKg) || g.proteinGPerKg < 0.8 || g.proteinGPerKg > 2.2) errors.push(`goals.${goal}.proteinGPerKg must be between 0.8 and 2.2`);
  }
  if (!num(policy.fat?.pctOfCalories) || policy.fat!.pctOfCalories < 0.2 || policy.fat!.pctOfCalories > 0.35) errors.push('fat.pctOfCalories must be between 0.20 and 0.35');
  if (!num(policy.fat?.minGPerKg) || policy.fat!.minGPerKg < 0.5 || policy.fat!.minGPerKg > 1) errors.push('fat.minGPerKg must be between 0.5 and 1.0');
  const pr = policy.protein;
  if (!pr || !num(pr.minGPerKg) || !num(pr.maxGPerKg) || pr.minGPerKg < 0.8 || pr.maxGPerKg > 2.2 || pr.minGPerKg > pr.maxGPerKg) errors.push('protein.minGPerKg / maxGPerKg must satisfy 0.8 ≤ min ≤ max ≤ 2.2');
  if (!pr || !num(pr.cautionGPerKg) || pr.cautionGPerKg < 0.6 || pr.cautionGPerKg > 1) errors.push('protein.cautionGPerKg must be between 0.6 and 1.0');
  if (!pr || !num(pr.adjustedWeightBmi) || pr.adjustedWeightBmi < 25 || pr.adjustedWeightBmi > 40) errors.push('protein.adjustedWeightBmi must be between 25 and 40');
  if (!num(policy.minCalories?.male) || policy.minCalories!.male < 1200 || policy.minCalories!.male > 2000) errors.push('minCalories.male must be between 1200 and 2000');
  if (!num(policy.minCalories?.female) || policy.minCalories!.female < 1000 || policy.minCalories!.female > 1800) errors.push('minCalories.female must be between 1000 and 1800');
  if (!num(policy.maxCalories) || policy.maxCalories < 3000 || policy.maxCalories > 6000) errors.push('maxCalories must be between 3000 and 6000');
  if (!num(policy.recalcWeightDeltaKg) || policy.recalcWeightDeltaKg < 0.5 || policy.recalcWeightDeltaKg > 5) errors.push('recalcWeightDeltaKg must be between 0.5 and 5');
  if (typeof policy.features?.bodyComposition !== 'boolean' || typeof policy.features?.healthImport !== 'boolean') errors.push('features.bodyComposition and features.healthImport must be booleans');
  return errors;
}

export interface NutritionInputs {
  weightKg?: number | null;
  heightCm?: number | null;
  age?: number | null;
  /** Sex used by the equations (asked separately; never inferred from gender identity). */
  sex?: CalcSex | null;
  activityLevel?: ActivityLevel | null;
  goal?: NutritionGoal | null;
  /** The user reported a condition that needs individual dietary advice (e.g. kidney disease). */
  medicalCaution?: boolean;
}

export type NutritionMissing = 'weight' | 'height' | 'age' | 'sex' | 'activityLevel';

export interface Macros { proteinG: number; carbsG: number; fatG: number; macroKcal: number }

export interface NutritionTargets extends Macros {
  status: 'ready';
  calories: number;
  bmr: number;
  tdee: number;
  adjustmentKcal: number;
  proteinGPerKg: number;
  proteinBasisKg: number;
  medicalCaution: boolean;
  policyVersion: number;
  engineVersion: number;
}

export type NutritionResult =
  | NutritionTargets
  | { status: 'needs_input'; missing: NutritionMissing[] }
  | { status: 'not_applicable'; reason: 'under_18' | 'out_of_range' };

const round = (v: number, step = 1) => Math.round(v / step) * step;

/** Mifflin-St Jeor resting energy (kcal/day). */
export function mifflinStJeor(weightKg: number, heightCm: number, age: number, sex: CalcSex) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
}

/** Weight protein is based on: total weight, or adjusted weight (ideal at BMI 25 + 40 % of the excess) from the policy BMI threshold. */
export function proteinBasisKg(weightKg: number, heightCm: number, policy: NutritionPolicy) {
  const m = heightCm / 100;
  if (weightKg / (m * m) < policy.protein.adjustedWeightBmi) return weightKg;
  const ideal = 25 * m * m;
  return ideal + 0.4 * (weightKg - ideal);
}

/**
 * Protein fixed first, then fat (share of calories, never under the per-kg floor), carbohydrate = the rest.
 * Grams are whole numbers; `macroKcal` is what those grams add up to (within rounding of the calorie target).
 */
export function macrosFor(calories: number, proteinG: number, weightKg: number, policy: NutritionPolicy): Macros {
  const protein = Math.max(0, Math.round(proteinG));
  let fat = Math.round(Math.max(calories * policy.fat.pctOfCalories / KCAL_PER_G.fat, policy.fat.minGPerKg * weightKg));
  let carbs = Math.round((calories - protein * KCAL_PER_G.protein - fat * KCAL_PER_G.fat) / KCAL_PER_G.carbs);
  if (carbs < 0) {
    // Very high protein + fat floor on a low target: give the energy back from fat, keeping protein.
    fat = Math.max(0, Math.round((calories - protein * KCAL_PER_G.protein) / KCAL_PER_G.fat));
    carbs = Math.max(0, Math.round((calories - protein * KCAL_PER_G.protein - fat * KCAL_PER_G.fat) / KCAL_PER_G.carbs));
  }
  return { proteinG: protein, carbsG: carbs, fatG: fat, macroKcal: protein * KCAL_PER_G.protein + carbs * KCAL_PER_G.carbs + fat * KCAL_PER_G.fat };
}

/** Daily calorie and macro targets from profile inputs and a policy. Missing inputs are reported, never guessed. */
export function calculateNutrition(inputs: NutritionInputs, policy: NutritionPolicy = DEFAULT_NUTRITION_POLICY): NutritionResult {
  const missing: NutritionMissing[] = [];
  if (!num(inputs.weightKg) || inputs.weightKg <= 0) missing.push('weight');
  if (!num(inputs.heightCm) || inputs.heightCm <= 0) missing.push('height');
  if (!num(inputs.age)) missing.push('age');
  if (inputs.sex !== 'male' && inputs.sex !== 'female') missing.push('sex');
  if (!inputs.activityLevel || !ACTIVITY_LEVELS.includes(inputs.activityLevel)) missing.push('activityLevel');
  if (missing.length) return { status: 'needs_input', missing };
  const weight = inputs.weightKg!, height = inputs.heightCm!, age = inputs.age!;
  if (age < 18) return { status: 'not_applicable', reason: 'under_18' };
  if (weight < 30 || weight > 300 || height < 120 || height > 230 || age > 100) return { status: 'not_applicable', reason: 'out_of_range' };
  const goal = inputs.goal && NUTRITION_GOALS.includes(inputs.goal) ? inputs.goal : 'general_fitness';
  const strategy = policy.goals[goal];
  const bmr = mifflinStJeor(weight, height, age, inputs.sex!);
  const tdee = bmr * policy.activityFactors[inputs.activityLevel!];
  const rawAdjust = tdee * strategy.calorieAdjustPct;
  const adjustment = Math.sign(rawAdjust) * Math.min(Math.abs(rawAdjust), strategy.maxAdjustKcal);
  const calories = Math.min(policy.maxCalories, Math.max(policy.minCalories[inputs.sex!], round(tdee + adjustment, 10)));
  const caution = !!inputs.medicalCaution;
  const perKg = caution ? policy.protein.cautionGPerKg : Math.min(policy.protein.maxGPerKg, Math.max(policy.protein.minGPerKg, strategy.proteinGPerKg));
  const basis = proteinBasisKg(weight, height, policy);
  const macros = macrosFor(calories, basis * perKg, weight, policy);
  return {
    status: 'ready', calories, bmr: round(bmr), tdee: round(tdee), adjustmentKcal: round(calories - tdee), ...macros,
    proteinGPerKg: perKg, proteinBasisKg: Math.round(basis * 10) / 10, medicalCaution: caution, policyVersion: policy.version, engineVersion: NUTRITION_ENGINE_VERSION,
  };
}

/** A manual target is accepted when it is within these bounds; carbs and fat are derived like automatic targets. */
export function validateManualTarget(calories: number, proteinG: number, weightKg: number | null | undefined, policy: NutritionPolicy = DEFAULT_NUTRITION_POLICY): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(calories) || calories < 1000 || calories > policy.maxCalories) errors.push(`Calories must be a whole number between 1000 and ${policy.maxCalories}`);
  if (!Number.isInteger(proteinG) || proteinG < 20 || proteinG > 400) errors.push('Protein must be a whole number of grams between 20 and 400');
  if (num(weightKg) && proteinG > weightKg * 3) errors.push('Protein above 3 g per kg of body weight is not accepted');
  if (proteinG * KCAL_PER_G.protein > calories * 0.6) errors.push('Protein cannot supply more than 60 % of the calories');
  return errors;
}

export interface NavyInputs { sex: CalcSex; heightCm: number; neckCm: number; waistCm: number; hipCm?: number | null }

/**
 * U.S. Navy circumference method (metric form, log10, centimetres). Men: neck below the larynx, waist at the
 * navel. Women: neck, waist at the narrowest point, hips at the widest point. An estimate, typically within a
 * few percentage points of lab methods and sometimes much further off.
 */
export function navyBodyFat(input: NavyInputs): { percent: number } | { error: string } {
  const { sex, heightCm, neckCm, waistCm, hipCm } = input;
  for (const [name, v, min, max] of [['height', heightCm, 120, 230], ['neck', neckCm, 20, 70], ['waist', waistCm, 40, 200]] as const) {
    if (!num(v) || v < min || v > max) return { error: `${name} must be between ${min} and ${max} cm` };
  }
  let pct: number;
  if (sex === 'male') {
    if (waistCm - neckCm <= 0) return { error: 'Waist must be larger than neck' };
    pct = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
  } else {
    if (!num(hipCm) || hipCm < 50 || hipCm > 220) return { error: 'hip must be between 50 and 220 cm' };
    if (waistCm + hipCm - neckCm <= 0) return { error: 'Waist plus hip must be larger than neck' };
    pct = 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm)) - 450;
  }
  if (!Number.isFinite(pct) || pct < 2 || pct > 60) return { error: 'These measurements give an implausible result; please re-measure' };
  return { percent: Math.round(pct * 10) / 10 };
}

/** Accepted range for any stored body-fat percentage. */
export const BODY_FAT_RANGE = { min: 2, max: 70 } as const;
