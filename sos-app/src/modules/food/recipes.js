/**
 * Emergency off-grid recipe database.
 * Mapped to standard homestead pantry categories for availability calculations.
 */
export const RECIPES = [
  {
    id: "bannock_bread",
    title: "Off-Grid Bannock Bread",
    description: "Classic wilderness pan bread requiring no oven, yeast, or fresh dairy.",
    prepTime: "15 mins",
    pantryCategoriesUsed: ["grains_starch", "fats_oils"],
    ingredients: [
      { name: "Flour / Starch", quantity: "2 cups", category: "grains_starch", critical: true },
      { name: "Cooking Oil or Lard", quantity: "2 tbsp", category: "fats_oils", critical: true },
      { name: "Salt", quantity: "0.5 tsp", category: "grains_starch", critical: false },
      { name: "Baking Powder (optional)", quantity: "1 tsp", category: "grains_starch", critical: false }
    ],
    instructions: [
      "Mix dry flour, salt, and baking powder in a bowl.",
      "Stir in cooking oil and warm water until a soft dough forms.",
      "Flatten the dough into a 1-inch thick patty.",
      "Fry in a greased pan over low campfire or stove heat for 8-10 minutes per side until golden brown."
    ]
  },
  {
    id: "tactical_rice_beans",
    title: "Tactical Rice & Beans",
    description: "High-protein, long shelf-life foundational off-grid meal.",
    prepTime: "40 mins",
    pantryCategoriesUsed: ["grains_starch", "proteins_legumes", "fats_oils"],
    ingredients: [
      { name: "White or Brown Rice", quantity: "1 cup", category: "grains_starch", critical: true },
      { name: "Dried or Canned Beans", quantity: "1 cup", category: "proteins_legumes", critical: true },
      { name: "Cooking Oil", quantity: "1 tbsp", category: "fats_oils", critical: false },
      { name: "Salt / Seasoning", quantity: "1 tsp", category: "grains_starch", critical: false }
    ],
    instructions: [
      "Boil 2 cups of water, add rice, cover, and simmer for 20 minutes (45 minutes if brown rice).",
      "If using dried beans, ensure pre-soaked and boiled; if canned, drain and rinse.",
      "Heat cooking oil in a pan, add cooked rice and beans.",
      "Season with salt and available spices, and sauté for 5 minutes until fully mixed."
    ]
  },
  {
    id: "pantry_stew",
    title: "Homestead Pantry Stew",
    description: "Hearty stew combining canned proteins and vegetables.",
    prepTime: "25 mins",
    pantryCategoriesUsed: ["proteins_legumes", "sugars_fruits", "fats_oils"],
    ingredients: [
      { name: "Canned Meat or Lentils", quantity: "1 can (12oz)", category: "proteins_legumes", critical: true },
      { name: "Canned Vegetables / Fruits", quantity: "1 can (15oz)", category: "sugars_fruits", critical: true },
      { name: "Fats or Lard", quantity: "1 tbsp", category: "fats_oils", critical: false },
      { name: "Water / Broth", quantity: "2 cups", category: "grains_starch", critical: false }
    ],
    instructions: [
      "Dice canned meat or prepare lentils.",
      "In a pot, heat fat and lightly sear meat/lentils.",
      "Add canned vegetables (including juices) and 2 cups of water or broth.",
      "Simmer uncovered for 15 minutes to reduce liquids and blend flavors. Serve hot."
    ]
  },
  {
    id: "milk_pudding",
    title: "Powdered Milk Sweet Pudding",
    description: "Quick high-calorie sweet dessert utilizing stable dairy reserves.",
    prepTime: "10 mins",
    pantryCategoriesUsed: ["dairy", "sugars_fruits", "grains_starch"],
    ingredients: [
      { name: "Powdered Milk", quantity: "1 cup", category: "dairy", critical: true },
      { name: "Sugar or Honey", quantity: "3 tbsp", category: "sugars_fruits", critical: true },
      { name: "Cornstarch or Flour", quantity: "1.5 tbsp", category: "grains_starch", critical: true },
      { name: "Water", quantity: "2 cups", category: "dairy", critical: false }
    ],
    instructions: [
      "Whisk powdered milk, sugar, cornstarch, and water together in a pot until smooth.",
      "Place pot over medium heat, stirring constantly to prevent burning.",
      "Bring to a gentle boil; stir for 2 minutes as mixture thickens.",
      "Remove from heat and let cool. It will solidify into a thick pudding."
    ]
  },
  {
    id: "sweet_cornbread",
    title: "Sweet Skillet Cornbread",
    description: "Skillet cornbread made easily using dry storage reserves.",
    prepTime: "25 mins",
    pantryCategoriesUsed: ["grains_starch", "sugars_fruits", "fats_oils", "dairy"],
    ingredients: [
      { name: "Cornmeal / Flour Mix", quantity: "1.5 cups", category: "grains_starch", critical: true },
      { name: "Sugar", quantity: "4 tbsp", category: "sugars_fruits", critical: true },
      { name: "Oil or Melted Butter", quantity: "3 tbsp", category: "fats_oils", critical: true },
      { name: "Powdered Milk (reconstituted)", quantity: "0.5 cup", category: "dairy", critical: false }
    ],
    instructions: [
      "Reconstitute powdered milk with water.",
      "Combine cornmeal, flour, sugar, and baking powder (if available) in a bowl.",
      "Stir in oil and reconstituted milk until a thick batter forms.",
      "Pour into a preheated, greased skillet. Cover with a lid and cook on low heat for 15 minutes, flip, and cook 5 more minutes."
    ]
  }
];
