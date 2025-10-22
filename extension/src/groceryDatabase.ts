/**
 * Comprehensive database of common grocery items for string matching and cleanup
 * Organized by category with common variations and plural forms
 */

export const GROCERY_DATABASE = [
  // Produce - Fruits
  "apple", "apples", "red apple", "green apple", "gala apple", "honeycrisp apple", "granny smith apple",
  "banana", "bananas", "plantain", "plantains",
  "orange", "oranges", "navel orange", "blood orange", "mandarin", "clementine", "tangerine",
  "grape", "grapes", "red grape", "green grape", "seedless grape",
  "strawberry", "strawberries",
  "blueberry", "blueberries",
  "raspberry", "raspberries",
  "blackberry", "blackberries",
  "watermelon", "cantaloupe", "honeydew", "melon",
  "pineapple", "pineapples",
  "mango", "mangos", "mangoes",
  "peach", "peaches",
  "pear", "pears", "bartlett pear", "bosc pear",
  "plum", "plums",
  "cherry", "cherries",
  "kiwi", "kiwis",
  "lemon", "lemons",
  "lime", "limes",
  "grapefruit", "grapefruits",
  "avocado", "avocados", "hass avocado",
  "coconut", "coconuts",
  "papaya", "papayas",
  "guava", "guavas",
  "fig", "figs",
  "date", "dates",
  "pomegranate", "pomegranates",
  "passion fruit",
  "dragonfruit", "dragon fruit",
  "persimmon", "persimmons",
  "apricot", "apricots",
  "nectarine", "nectarines",

  // Produce - Vegetables
  "tomato", "tomatoes", "roma tomato", "cherry tomato", "grape tomato", "beefsteak tomato",
  "potato", "potatoes", "russet potato", "red potato", "yukon gold potato", "sweet potato", "yam",
  "onion", "onions", "yellow onion", "white onion", "red onion", "sweet onion", "vidalia onion",
  "garlic", "garlic bulb", "garlic clove",
  "carrot", "carrots", "baby carrot",
  "celery", "celery stalk",
  "lettuce", "romaine lettuce", "iceberg lettuce", "butter lettuce", "red leaf lettuce",
  "spinach", "baby spinach",
  "kale", "curly kale", "lacinato kale", "tuscan kale",
  "broccoli", "broccoli crown", "broccoli floret",
  "cauliflower", "cauliflower head",
  "cabbage", "green cabbage", "red cabbage", "napa cabbage", "savoy cabbage",
  "brussels sprout", "brussels sprouts",
  "asparagus",
  "green bean", "green beans", "string bean",
  "pea", "peas", "snow pea", "snap pea", "sugar snap pea",
  "corn", "corn on the cob", "sweet corn",
  "pepper", "bell pepper", "green pepper", "red pepper", "yellow pepper", "orange pepper",
  "jalapeno", "jalapenos", "serrano pepper", "habanero", "poblano pepper", "anaheim pepper",
  "cucumber", "cucumbers", "english cucumber", "persian cucumber",
  "zucchini", "zucchinis", "yellow squash",
  "eggplant", "eggplants", "japanese eggplant",
  "mushroom", "mushrooms", "white mushroom", "cremini mushroom", "portobello mushroom", "shiitake mushroom",
  "radish", "radishes",
  "beet", "beets", "beetroot",
  "turnip", "turnips",
  "parsnip", "parsnips",
  "leek", "leeks",
  "shallot", "shallots",
  "ginger", "ginger root",
  "cilantro", "parsley", "basil", "mint", "dill", "rosemary", "thyme", "oregano", "sage",
  "scallion", "scallions", "green onion", "spring onion",
  "chard", "swiss chard",
  "arugula", "rocket",
  "bok choy", "baby bok choy",
  "collard greens", "mustard greens", "turnip greens",
  "artichoke", "artichokes",
  "fennel",
  "jicama",
  "okra",

  // Dairy & Eggs
  "milk", "whole milk", "2% milk", "1% milk", "skim milk", "non-fat milk", "lactose-free milk",
  "almond milk", "soy milk", "oat milk", "coconut milk", "rice milk", "cashew milk",
  "cream", "heavy cream", "whipping cream", "half and half", "light cream",
  "butter", "salted butter", "unsalted butter", "european butter", "grass-fed butter",
  "margarine",
  "cheese", "cheddar cheese", "mozzarella cheese", "swiss cheese", "american cheese", "provolone cheese",
  "parmesan cheese", "parmigiano reggiano", "romano cheese", "pecorino romano",
  "feta cheese", "goat cheese", "chevre", "brie", "camembert",
  "blue cheese", "gorgonzola", "roquefort",
  "cream cheese", "neufchatel",
  "cottage cheese", "ricotta cheese", "mascarpone",
  "string cheese", "cheese stick",
  "shredded cheese", "sliced cheese", "cheese block",
  "yogurt", "greek yogurt", "plain yogurt", "vanilla yogurt", "fruit yogurt",
  "sour cream", "creme fraiche",
  "egg", "eggs", "large eggs", "extra large eggs", "medium eggs",
  "egg white", "egg whites", "liquid egg white",

  // Meat & Seafood
  "chicken", "chicken breast", "chicken thigh", "chicken leg", "chicken wing", "whole chicken",
  "ground chicken", "chicken tender", "chicken cutlet",
  "turkey", "turkey breast", "ground turkey", "turkey leg", "whole turkey",
  "beef", "ground beef", "beef chuck", "beef roast", "pot roast",
  "steak", "ribeye steak", "sirloin steak", "t-bone steak", "filet mignon", "new york strip",
  "pork", "pork chop", "pork loin", "pork tenderloin", "pork shoulder", "pork butt",
  "bacon", "thick cut bacon", "turkey bacon",
  "sausage", "italian sausage", "breakfast sausage", "bratwurst", "kielbasa", "chorizo",
  "ham", "deli ham", "honey ham", "smoked ham", "black forest ham",
  "hot dog", "hot dogs", "beef frank", "all beef hot dog",
  "lamb", "lamb chop", "leg of lamb", "lamb shank", "ground lamb",
  "veal",
  "ribs", "pork ribs", "beef ribs", "baby back ribs", "spare ribs",
  "brisket", "beef brisket",
  "rotisserie chicken",
  "deli meat", "lunch meat", "salami", "pepperoni", "prosciutto", "pastrami", "roast beef",
  "salmon", "atlantic salmon", "sockeye salmon", "coho salmon", "salmon fillet",
  "tuna", "tuna steak", "ahi tuna", "yellowfin tuna",
  "cod", "cod fillet",
  "tilapia", "tilapia fillet",
  "halibut",
  "mahi mahi",
  "swordfish",
  "trout", "rainbow trout",
  "catfish",
  "bass", "sea bass", "striped bass",
  "shrimp", "jumbo shrimp", "large shrimp", "medium shrimp", "cocktail shrimp",
  "crab", "crab meat", "crab leg", "king crab", "snow crab",
  "lobster", "lobster tail",
  "scallop", "scallops", "sea scallop", "bay scallop",
  "clam", "clams", "little neck clam",
  "mussel", "mussels",
  "oyster", "oysters",
  "calamari", "squid",
  "octopus",

  // Bakery & Bread
  "bread", "white bread", "wheat bread", "whole wheat bread", "whole grain bread",
  "sourdough bread", "rye bread", "pumpernickel bread", "multigrain bread",
  "french bread", "baguette", "italian bread", "ciabatta",
  "pita bread", "pita pocket", "naan", "flatbread",
  "bagel", "bagels", "plain bagel", "everything bagel", "sesame bagel", "cinnamon raisin bagel",
  "english muffin", "english muffins",
  "roll", "rolls", "dinner roll", "kaiser roll", "hoagie roll", "sub roll",
  "hamburger bun", "hot dog bun", "brioche bun",
  "tortilla", "flour tortilla", "corn tortilla", "whole wheat tortilla",
  "croissant", "croissants",
  "muffin", "muffins", "blueberry muffin", "bran muffin", "corn muffin",
  "donut", "donuts", "doughnut", "doughnuts",
  "danish", "pastry",
  "cake", "birthday cake", "layer cake", "sheet cake", "cupcake", "cupcakes",
  "pie", "apple pie", "pumpkin pie", "pecan pie", "cherry pie",
  "brownie", "brownies",
  "cookie", "cookies", "chocolate chip cookie", "sugar cookie", "oatmeal cookie",
  "cracker", "crackers", "saltine", "graham cracker", "ritz cracker", "wheat thin",

  // Pantry & Canned Goods
  "rice", "white rice", "brown rice", "jasmine rice", "basmati rice", "arborio rice", "wild rice",
  "pasta", "spaghetti", "penne", "rigatoni", "fettuccine", "linguine", "macaroni", "shells",
  "noodle", "noodles", "egg noodle", "ramen noodle", "rice noodle", "udon noodle",
  "couscous", "quinoa", "bulgur", "farro", "barley",
  "oats", "oatmeal", "rolled oats", "steel cut oats", "quick oats", "instant oatmeal",
  "cereal", "corn flakes", "cheerios", "granola", "muesli",
  "flour", "all-purpose flour", "bread flour", "cake flour", "whole wheat flour", "almond flour",
  "sugar", "white sugar", "granulated sugar", "brown sugar", "powdered sugar", "confectioners sugar",
  "honey", "maple syrup", "agave nectar", "molasses",
  "salt", "table salt", "sea salt", "kosher salt", "himalayan salt",
  "pepper", "black pepper", "white pepper", "peppercorn",
  "olive oil", "extra virgin olive oil", "vegetable oil", "canola oil", "coconut oil",
  "cooking spray", "pam", "non-stick spray",
  "vinegar", "white vinegar", "apple cider vinegar", "balsamic vinegar", "red wine vinegar",
  "soy sauce", "tamari", "teriyaki sauce",
  "ketchup", "catsup",
  "mustard", "yellow mustard", "dijon mustard", "whole grain mustard", "honey mustard",
  "mayonnaise", "mayo",
  "hot sauce", "tabasco", "sriracha", "frank's red hot",
  "barbecue sauce", "bbq sauce",
  "salsa", "picante sauce", "pico de gallo",
  "pasta sauce", "marinara sauce", "tomato sauce", "spaghetti sauce", "alfredo sauce",
  "tomato paste", "tomato puree", "crushed tomato", "diced tomato", "whole tomato",
  "chicken broth", "beef broth", "vegetable broth", "chicken stock", "beef stock", "vegetable stock",
  "soup", "tomato soup", "chicken noodle soup", "cream of mushroom soup", "minestrone",
  "canned beans", "black beans", "kidney beans", "pinto beans", "chickpea", "garbanzo beans",
  "refried beans", "baked beans",
  "canned corn", "canned green beans", "canned peas", "canned carrots",
  "canned tuna", "canned salmon", "canned chicken",
  "peanut butter", "almond butter", "cashew butter", "sunflower butter",
  "jelly", "jam", "strawberry jam", "grape jelly", "preserves", "marmalade",
  "nutella", "chocolate spread",
  "pickles", "dill pickle", "sweet pickle", "bread and butter pickle", "pickle relish",
  "olives", "black olive", "green olive", "kalamata olive",
  "capers",

  // Snacks & Chips
  "chips", "potato chips", "tortilla chips", "corn chips", "pita chips",
  "pretzels", "pretzel stick", "pretzel nugget",
  "popcorn", "microwave popcorn", "popcorn kernel",
  "nuts", "peanuts", "almonds", "cashews", "walnuts", "pecans", "pistachios", "mixed nuts",
  "trail mix",
  "granola bar", "protein bar", "energy bar", "cereal bar",
  "fruit snack", "gummy fruit", "fruit roll-up",
  "pudding", "pudding cup", "jello", "gelatin",
  "applesauce", "fruit cup",

  // Frozen Foods
  "frozen vegetables", "frozen peas", "frozen corn", "frozen broccoli", "frozen cauliflower",
  "frozen pizza", "pizza", "frozen pie",
  "ice cream", "vanilla ice cream", "chocolate ice cream", "strawberry ice cream",
  "frozen yogurt", "gelato", "sorbet", "sherbet",
  "popsicle", "ice pop",
  "frozen waffle", "frozen pancake",
  "frozen dinner", "tv dinner", "frozen meal",
  "frozen burrito", "frozen taquito",
  "frozen chicken nugget", "frozen chicken tender", "frozen fish stick",
  "frozen french fries", "frozen tater tots", "frozen hash brown",
  "frozen fruit", "frozen berries", "frozen mango", "frozen strawberries",

  // Beverages
  "water", "bottled water", "sparkling water", "seltzer", "club soda", "tonic water",
  "juice", "orange juice", "apple juice", "grape juice", "cranberry juice", "grapefruit juice",
  "lemonade", "fruit punch", "kool-aid",
  "soda", "coke", "pepsi", "sprite", "7up", "dr pepper", "root beer", "ginger ale",
  "energy drink", "red bull", "monster",
  "sports drink", "gatorade", "powerade",
  "tea", "black tea", "green tea", "herbal tea", "iced tea", "sweet tea",
  "coffee", "ground coffee", "whole bean coffee", "instant coffee", "decaf coffee",
  "coffee creamer", "coffee mate",

  // Baking Supplies
  "baking soda", "baking powder",
  "yeast", "active dry yeast", "instant yeast",
  "vanilla extract", "vanilla", "almond extract",
  "cocoa powder", "chocolate chip", "chocolate chips", "semi-sweet chocolate chips",
  "sprinkles", "food coloring",
  "cornstarch", "corn starch",
  "gelatin",

  // Spices & Seasonings
  "cinnamon", "nutmeg", "ginger", "cloves", "allspice",
  "cumin", "coriander", "turmeric", "curry powder", "garam masala",
  "paprika", "smoked paprika", "cayenne pepper", "chili powder", "red pepper flakes",
  "garlic powder", "onion powder", "garlic salt", "onion salt",
  "italian seasoning", "herbs de provence", "bay leaf", "bay leaves",
  "taco seasoning", "fajita seasoning", "ranch seasoning",

  // Condiments
  "worcestershire sauce", "fish sauce", "oyster sauce", "hoisin sauce",
  "ranch dressing", "italian dressing", "caesar dressing", "balsamic dressing",
  "salad dressing",
  "hummus",
  "guacamole",

  // Baby & Kids
  "baby food", "baby cereal", "baby formula", "formula",
  "diaper", "diapers", "baby wipes", "wipes",
  "juice box", "capri sun",

  // Household (commonly on grocery lists)
  "paper towel", "paper towels", "napkin", "napkins",
  "toilet paper", "tissue", "kleenex",
  "trash bag", "garbage bag", "ziplock bag", "plastic bag", "sandwich bag", "freezer bag",
  "aluminum foil", "plastic wrap", "wax paper", "parchment paper",
  "dish soap", "dishwashing liquid", "dishwasher detergent",
  "laundry detergent", "fabric softener", "dryer sheet",
  "paper plate", "plastic cup", "plastic fork", "plastic spoon", "plastic knife",

  // Pet Food
  "dog food", "cat food", "pet food",
  "dog treat", "cat treat", "pet treat",

  // Miscellaneous
  "tofu", "tempeh", "seitan",
  "tortilla chips", "salsa verde",
  "coconut water",
  "protein powder", "whey protein",
  "vitamin", "vitamins", "supplement", "supplements",
];

/**
 * Normalize a grocery item name for better matching
 */
export function normalizeGroceryName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // normalize whitespace
    .replace(/[^\w\s-]/g, "") // remove special chars except hyphens
    .replace(/\b(the|a|an)\b/g, "") // remove articles
    .trim();
}

/**
 * Get all grocery items as normalized strings for matching
 */
export function getNormalizedDatabase(): string[] {
  return GROCERY_DATABASE.map(normalizeGroceryName);
}

