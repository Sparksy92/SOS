/**
 * Risk rules and safety warning configurations for high-risk categories.
 */

const RISKY_PATTERNS = {
  'medical': /medical|first aid|triage|burn|wound|poison|injury/i,
  'water_treatment': /water treatment|purification|filter|sanitize|chlorine/i,
  'wild_plants': /wild plant|foraging|edible weed|herbal/i,
  'mushrooms': /mushroom|fungi|amanita|mycology/i,
  'food_preservation': /canning|fermentation|preservation|botulism|curing/i,
  'electrical': /electrical|wiring|generator|inverter|solar battery|breaker/i,
  'fuel_generator': /fuel|generator|propane|butane|gasoline|kerosene/i,
  'firearms': /firearms|ammo|ballistics|reloading|shooting|gunsmith/i,
  'mechanical': /mechanical|engine|pump|transmission|weld|turbine/i,
  'chemical': /chemical|bleach|acid|lye|pesticide|herbicide/i
};

const SAFETY_WARNINGS = {
  'medical': "CRITICAL SAFETY DIRECTIVE: Field medical manuals are for auxiliary education only. Improper triage or treatment without qualified supervision carries high risk of morbidity.",
  'water_treatment': "WATER PURIFICATION PROTOCOL: Boiling or chemical disinfection must follow strict chemical dilution. Incorrectly sanitized water is a major vector for pathogens.",
  'wild_plants': "FORAGING NOTICE: Positive identification of plants is required. Consumption of look-alike wild species can result in severe poisoning.",
  'mushrooms': "MUSHROOM FORAGING DIRECTIVE: Absolutely do not consume wild mushrooms without expert, physical validation. Fungal toxins are frequently fatal.",
  'food_preservation': "PRESERVATION RISK: Botulism is highly toxic and scentless. Pressure canning schedules must be strictly verified for low-acid foods.",
  'electrical': "ELECTRICAL WARNING: High-voltage systems and batteries present shock and arc-flash hazards. Turn off main breakers before operations.",
  'fuel_generator': "COMBUSTION HAZARD: Carbon monoxide is odorless and deadly. Generators and fuel-burning devices must NEVER be operated indoors.",
  'firearms': "FIREARMS PROTOCOL: Ensure firearms are handled under active range rules with active direction. Reloading manuals require high-precision scales.",
  'mechanical': "MECHANICAL WARNING: Moving equipment, belts, and gears pose severe crush hazards. De-energize and lock-out systems before servicing.",
  'chemical': "CHEMICAL HAZARD: Fumes and caustic compounds require active ventilation and personal protective gear. Keep acids and bases isolated."
};

export const getRiskLevel = (item) => {
  const text = `${item.name || ''} ${item.path || ''}`.toLowerCase();
  for (const [category, pattern] of Object.entries(RISKY_PATTERNS)) {
    if (pattern.test(text)) {
      return { risk: 'HIGH', category };
    }
  }
  return { risk: 'LOW', category: null };
};

export const requiresAcknowledgement = (item) => {
  return getRiskLevel(item).risk === 'HIGH';
};

export const getSafetyWarning = (category) => {
  return SAFETY_WARNINGS[category] || "WARNING: Exercise extreme caution when performing technical, medical, or mechanical tasks.";
};
