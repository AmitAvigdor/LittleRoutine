// Volume Units
export type VolumeUnit = 'oz' | 'ml';

// Weight Units
export type WeightUnit = 'lbs' | 'kg';

// Length Units
export type LengthUnit = 'in' | 'cm';

// Baby Mood
export type BabyMood = 'happy' | 'fussy' | 'calm' | 'crying' | 'sleepy';

export const BABY_MOOD_CONFIG: Record<BabyMood, { label: string; icon: string; color: string }> = {
  happy: { label: 'Happy', icon: 'smile', color: '#ffc107' },
  fussy: { label: 'Fussy', icon: 'frown', color: '#ff9800' },
  calm: { label: 'Calm', icon: 'leaf', color: '#4caf50' },
  crying: { label: 'Crying', icon: 'droplet', color: '#f44336' },
  sleepy: { label: 'Sleepy', icon: 'moon', color: '#3f51b5' },
};

// Mom Mood
export type MomMood = 'energized' | 'tired' | 'stressed' | 'happy' | 'overwhelmed';

export const MOM_MOOD_CONFIG: Record<MomMood, { label: string; icon: string; color: string }> = {
  energized: { label: 'Energized', icon: 'zap', color: '#4caf50' },
  tired: { label: 'Tired', icon: 'battery-low', color: '#9e9e9e' },
  stressed: { label: 'Stressed', icon: 'activity', color: '#ff9800' },
  happy: { label: 'Happy', icon: 'heart', color: '#e91e63' },
  overwhelmed: { label: 'Overwhelmed', icon: 'cloud-rain', color: '#9c27b0' },
};

// Feeding Type Preference
export type FeedingTypePreference = 'breastfeeding' | 'formula';

// Breast Side
export type BreastSide = 'left' | 'right';

export const BREAST_SIDE_CONFIG: Record<BreastSide, { label: string; color: string }> = {
  left: { label: 'Left', color: '#9c27b0' },
  right: { label: 'Right', color: '#e91e63' },
};

// Pump Side
export type PumpSide = 'left' | 'right' | 'both';

export const PUMP_SIDE_CONFIG: Record<PumpSide, { label: string; color: string }> = {
  left: { label: 'Left', color: '#9c27b0' },
  right: { label: 'Right', color: '#e91e63' },
  both: { label: 'Both', color: '#7b1fa2' },
};

// Bottle Content Type
export type BottleContentType = 'breastMilk' | 'formula' | 'mixed';

export const BOTTLE_CONTENT_CONFIG: Record<BottleContentType, { label: string; color: string }> = {
  breastMilk: { label: 'Breast Milk', color: '#e91e63' },
  formula: { label: 'Formula', color: '#2196f3' },
  mixed: { label: 'Mixed', color: '#9c27b0' },
};

// Sleep Type
export type SleepType = 'nap' | 'night';

export const SLEEP_TYPE_CONFIG: Record<SleepType, { label: string; color: string; icon: string }> = {
  nap: { label: 'Nap', color: '#ff9800', icon: 'sun' },
  night: { label: 'Night', color: '#3f51b5', icon: 'moon' },
};

// Diaper Type
export type DiaperType = 'wet' | 'full';

export const DIAPER_TYPE_CONFIG: Record<DiaperType, { label: string; color: string; icon: string }> = {
  wet: { label: 'Wet', color: '#2196f3', icon: 'droplet' },
  full: { label: 'Full', color: '#795548', icon: 'circle' },
};

// Milk Storage Location
export type MilkStorageLocation = 'fridge' | 'freezer';

export const MILK_STORAGE_CONFIG: Record<MilkStorageLocation, { label: string; expirationDays: number; icon: string; color: string }> = {
  fridge: { label: 'Fridge', expirationDays: 4, icon: 'thermometer-snowflake', color: '#2196f3' },
  freezer: { label: 'Freezer', expirationDays: 180, icon: 'snowflake', color: '#3f51b5' },
};

// Food Category
export type FoodCategory = 'fruit' | 'vegetable' | 'grain' | 'protein' | 'dairy' | 'other';

export const FOOD_CATEGORY_CONFIG: Record<FoodCategory, { label: string; color: string; icon: string }> = {
  fruit: { label: 'Fruit', color: '#e91e63', icon: 'apple' },
  vegetable: { label: 'Vegetable', color: '#4caf50', icon: 'carrot' },
  grain: { label: 'Grain', color: '#ff9800', icon: 'wheat' },
  protein: { label: 'Protein', color: '#795548', icon: 'beef' },
  dairy: { label: 'Dairy', color: '#2196f3', icon: 'milk' },
  other: { label: 'Other', color: '#9e9e9e', icon: 'utensils' },
};

// Food Reaction
export type FoodReaction = 'none' | 'mild' | 'moderate' | 'severe';

export const FOOD_REACTION_CONFIG: Record<FoodReaction, { label: string; color: string }> = {
  none: { label: 'None', color: '#4caf50' },
  mild: { label: 'Mild', color: '#ffc107' },
  moderate: { label: 'Moderate', color: '#ff9800' },
  severe: { label: 'Severe', color: '#f44336' },
};

// Food Preference
export type FoodPreference = 'loved' | 'neutral' | 'disliked';

export const FOOD_PREFERENCE_CONFIG: Record<FoodPreference, { label: string; color: string; icon: string }> = {
  loved: { label: 'Loved', color: '#e91e63', icon: 'heart' },
  neutral: { label: 'Neutral', color: '#9e9e9e', icon: 'minus' },
  disliked: { label: 'Disliked', color: '#ff9800', icon: 'thumbs-down' },
};

// Medication Frequency
export type MedicationFrequency = 'asNeeded' | 'onceDaily' | 'twiceDaily' | 'threeTimesDaily' | 'fourTimesDaily' | 'everyHours';

export const MEDICATION_FREQUENCY_CONFIG: Record<MedicationFrequency, { label: string; hoursInterval?: number }> = {
  asNeeded: { label: 'As Needed' },
  onceDaily: { label: 'Once Daily', hoursInterval: 24 },
  twiceDaily: { label: 'Twice Daily', hoursInterval: 12 },
  threeTimesDaily: { label: '3x Daily', hoursInterval: 8 },
  fourTimesDaily: { label: '4x Daily', hoursInterval: 6 },
  everyHours: { label: 'Every X Hours' },
};

// Milestone Category
export type MilestoneCategory = 'motor' | 'cognitive' | 'social' | 'language' | 'feeding' | 'other';

export const MILESTONE_CATEGORY_CONFIG: Record<MilestoneCategory, { label: string; color: string; icon: string }> = {
  motor: { label: 'Motor Skills', color: '#ff9800', icon: 'activity' },
  cognitive: { label: 'Cognitive', color: '#9c27b0', icon: 'brain' },
  social: { label: 'Social', color: '#e91e63', icon: 'users' },
  language: { label: 'Language', color: '#2196f3', icon: 'message-circle' },
  feeding: { label: 'Feeding', color: '#4caf50', icon: 'utensils' },
  other: { label: 'Other', color: '#9e9e9e', icon: 'star' },
};

// Baby Colors
export type BabyColor = 'purple' | 'pink' | 'blue' | 'teal' | 'orange' | 'green';

export const BABY_COLOR_CONFIG: Record<BabyColor, { label: string; hex: string }> = {
  purple: { label: 'Purple', hex: '#9c27b0' },
  pink: { label: 'Pink', hex: '#e91e63' },
  blue: { label: 'Blue', hex: '#2196f3' },
  teal: { label: 'Teal', hex: '#009688' },
  orange: { label: 'Orange', hex: '#ff9800' },
  green: { label: 'Green', hex: '#4caf50' },
};

// Teething Symptoms
export type TeethingSymptom =
  | 'drooling'
  | 'fussiness'
  | 'biting'
  | 'sleepDisruption'
  | 'reducedAppetite'
  | 'earPulling'
  | 'cheekRubbing'
  | 'gumSwelling'
  | 'mildFever';

export const TEETHING_SYMPTOM_CONFIG: Record<TeethingSymptom, { label: string; icon: string }> = {
  drooling: { label: 'Drooling', icon: 'droplets' },
  fussiness: { label: 'Fussiness', icon: 'frown' },
  biting: { label: 'Biting/Chewing', icon: 'cookie' },
  sleepDisruption: { label: 'Sleep Disruption', icon: 'moon' },
  reducedAppetite: { label: 'Reduced Appetite', icon: 'utensils-crossed' },
  earPulling: { label: 'Ear Pulling', icon: 'ear' },
  cheekRubbing: { label: 'Cheek Rubbing', icon: 'hand' },
  gumSwelling: { label: 'Swollen Gums', icon: 'circle-dot' },
  mildFever: { label: 'Mild Fever', icon: 'thermometer' },
};

// Tooth Position (20 primary teeth)
export type ToothPosition =
  | 'lowerRightCentralIncisor' | 'lowerLeftCentralIncisor'
  | 'lowerRightLateralIncisor' | 'lowerLeftLateralIncisor'
  | 'upperRightCentralIncisor' | 'upperLeftCentralIncisor'
  | 'upperRightLateralIncisor' | 'upperLeftLateralIncisor'
  | 'lowerRightFirstMolar' | 'lowerLeftFirstMolar'
  | 'upperRightFirstMolar' | 'upperLeftFirstMolar'
  | 'lowerRightCanine' | 'lowerLeftCanine'
  | 'upperRightCanine' | 'upperLeftCanine'
  | 'lowerRightSecondMolar' | 'lowerLeftSecondMolar'
  | 'upperRightSecondMolar' | 'upperLeftSecondMolar';

export const TOOTH_POSITION_CONFIG: Record<ToothPosition, { name: string; shortName: string; typicalAgeMonths: [number, number]; isUpper: boolean }> = {
  lowerRightCentralIncisor: { name: 'Lower Right Central Incisor', shortName: 'LR1', typicalAgeMonths: [6, 10], isUpper: false },
  lowerLeftCentralIncisor: { name: 'Lower Left Central Incisor', shortName: 'LL1', typicalAgeMonths: [6, 10], isUpper: false },
  lowerRightLateralIncisor: { name: 'Lower Right Lateral Incisor', shortName: 'LR2', typicalAgeMonths: [10, 16], isUpper: false },
  lowerLeftLateralIncisor: { name: 'Lower Left Lateral Incisor', shortName: 'LL2', typicalAgeMonths: [10, 16], isUpper: false },
  upperRightCentralIncisor: { name: 'Upper Right Central Incisor', shortName: 'UR1', typicalAgeMonths: [8, 12], isUpper: true },
  upperLeftCentralIncisor: { name: 'Upper Left Central Incisor', shortName: 'UL1', typicalAgeMonths: [8, 12], isUpper: true },
  upperRightLateralIncisor: { name: 'Upper Right Lateral Incisor', shortName: 'UR2', typicalAgeMonths: [9, 13], isUpper: true },
  upperLeftLateralIncisor: { name: 'Upper Left Lateral Incisor', shortName: 'UL2', typicalAgeMonths: [9, 13], isUpper: true },
  lowerRightFirstMolar: { name: 'Lower Right First Molar', shortName: 'LRD', typicalAgeMonths: [14, 18], isUpper: false },
  lowerLeftFirstMolar: { name: 'Lower Left First Molar', shortName: 'LLD', typicalAgeMonths: [14, 18], isUpper: false },
  upperRightFirstMolar: { name: 'Upper Right First Molar', shortName: 'URD', typicalAgeMonths: [13, 19], isUpper: true },
  upperLeftFirstMolar: { name: 'Upper Left First Molar', shortName: 'ULD', typicalAgeMonths: [13, 19], isUpper: true },
  lowerRightCanine: { name: 'Lower Right Canine', shortName: 'LRC', typicalAgeMonths: [17, 23], isUpper: false },
  lowerLeftCanine: { name: 'Lower Left Canine', shortName: 'LLC', typicalAgeMonths: [17, 23], isUpper: false },
  upperRightCanine: { name: 'Upper Right Canine', shortName: 'URC', typicalAgeMonths: [16, 22], isUpper: true },
  upperLeftCanine: { name: 'Upper Left Canine', shortName: 'ULC', typicalAgeMonths: [16, 22], isUpper: true },
  lowerRightSecondMolar: { name: 'Lower Right Second Molar', shortName: 'LRE', typicalAgeMonths: [23, 31], isUpper: false },
  lowerLeftSecondMolar: { name: 'Lower Left Second Molar', shortName: 'LLE', typicalAgeMonths: [23, 31], isUpper: false },
  upperRightSecondMolar: { name: 'Upper Right Second Molar', shortName: 'URE', typicalAgeMonths: [25, 33], isUpper: true },
  upperLeftSecondMolar: { name: 'Upper Left Second Molar', shortName: 'ULE', typicalAgeMonths: [25, 33], isUpper: true },
};

// Common first foods
export const COMMON_FOODS: { name: string; category: FoodCategory }[] = [
  // Vegetables
  { name: 'Avocado', category: 'vegetable' },
  { name: 'Sweet Potato', category: 'vegetable' },
  { name: 'Carrots', category: 'vegetable' },
  { name: 'Peas', category: 'vegetable' },
  { name: 'Green Beans', category: 'vegetable' },
  { name: 'Butternut Squash', category: 'vegetable' },
  { name: 'Zucchini', category: 'vegetable' },
  { name: 'Broccoli', category: 'vegetable' },
  // Fruits
  { name: 'Banana', category: 'fruit' },
  { name: 'Apple', category: 'fruit' },
  { name: 'Pear', category: 'fruit' },
  { name: 'Mango', category: 'fruit' },
  { name: 'Peach', category: 'fruit' },
  { name: 'Blueberries', category: 'fruit' },
  { name: 'Strawberries', category: 'fruit' },
  { name: 'Raspberries', category: 'fruit' },
  // Grains
  { name: 'Rice Cereal', category: 'grain' },
  { name: 'Oatmeal', category: 'grain' },
  { name: 'Quinoa', category: 'grain' },
  { name: 'Pasta', category: 'grain' },
  { name: 'Bread', category: 'grain' },
  // Proteins
  { name: 'Chicken', category: 'protein' },
  { name: 'Turkey', category: 'protein' },
  { name: 'Fish', category: 'protein' },
  { name: 'Eggs', category: 'protein' },
  { name: 'Tofu', category: 'protein' },
  { name: 'Lentils', category: 'protein' },
  { name: 'Beans', category: 'protein' },
  // Dairy
  { name: 'Yogurt', category: 'dairy' },
  { name: 'Cheese', category: 'dairy' },
];

// Common milestones
export const COMMON_MILESTONES: { name: string; category: MilestoneCategory; typicalAgeMonths?: [number, number] }[] = [
  // Motor Skills
  { name: 'Holds head up', category: 'motor', typicalAgeMonths: [2, 4] },
  { name: 'Rolls over', category: 'motor', typicalAgeMonths: [4, 6] },
  { name: 'Sits without support', category: 'motor', typicalAgeMonths: [6, 8] },
  { name: 'Crawls', category: 'motor', typicalAgeMonths: [7, 10] },
  { name: 'Pulls to stand', category: 'motor', typicalAgeMonths: [9, 12] },
  { name: 'First steps', category: 'motor', typicalAgeMonths: [9, 15] },
  { name: 'Walks independently', category: 'motor', typicalAgeMonths: [12, 18] },
  // Cognitive
  { name: 'Follows objects with eyes', category: 'cognitive', typicalAgeMonths: [1, 3] },
  { name: 'Recognizes familiar faces', category: 'cognitive', typicalAgeMonths: [2, 4] },
  { name: 'Object permanence', category: 'cognitive', typicalAgeMonths: [8, 12] },
  { name: 'Points to objects', category: 'cognitive', typicalAgeMonths: [9, 14] },
  // Social
  { name: 'First smile', category: 'social', typicalAgeMonths: [1, 3] },
  { name: 'Laughs', category: 'social', typicalAgeMonths: [3, 5] },
  { name: 'Stranger anxiety', category: 'social', typicalAgeMonths: [6, 9] },
  { name: 'Waves bye-bye', category: 'social', typicalAgeMonths: [9, 12] },
  // Language
  { name: 'Coos', category: 'language', typicalAgeMonths: [2, 4] },
  { name: 'Babbles', category: 'language', typicalAgeMonths: [4, 7] },
  { name: 'First word', category: 'language', typicalAgeMonths: [10, 14] },
  { name: 'Says 2-3 words', category: 'language', typicalAgeMonths: [12, 18] },
  // Feeding
  { name: 'First solid food', category: 'feeding', typicalAgeMonths: [4, 6] },
  { name: 'Drinks from cup', category: 'feeding', typicalAgeMonths: [6, 12] },
  { name: 'Self-feeding with fingers', category: 'feeding', typicalAgeMonths: [8, 12] },
  { name: 'Uses spoon', category: 'feeding', typicalAgeMonths: [12, 18] },
];
