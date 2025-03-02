import express, { Request, Response } from "express";

// ==== Type Definitions, feel free to add or modify ==========================
interface cookbookEntry {
  name: string;
  type: string;
}

interface requiredItem {
  name: string;
  quantity: number;
}

interface recipe extends cookbookEntry {
  requiredItems: requiredItem[];
}

interface ingredient extends cookbookEntry {
  cookTime: number;
}

interface recipeSummary {
  name: string;
  cookTime: number;
  ingredients: requiredItem[];
}


// =============================================================================
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook: Map<string, recipe | ingredient> = new Map();

// Task 1 helper (don't touch)
app.post("/parse", (req:Request, res:Response) => {
  const { input } = req.body;

  const parsed_string = parse_handwriting(input)
  if (parsed_string == null) {
    res.status(400).send("this string is cooked");
    return;
  } 
  res.json({ msg: parsed_string });
  return;
  
});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that 
const parse_handwriting = (recipeName: string): string | null => {
  
  if (!recipeName) return null;
  
  // Characters that are hyphen or underspace are made whitespace 
  let result = recipeName.replace(/[-_]/g, ' ');
  
  // Characters that aren't letters or whitespaces are removed
  result = result.replace(/[^a-zA-Z\s]/g, '');
  
  // Multiple whitespaces are replaced with a single whitespace
  result = result.replace(/\s+/g, ' ');
  result = result.trim();
  
  // String must have length > 0 otherwise returns null
  if (result.length === 0) return null;
  
  // Capitalize the first letter of each word
  result = result.split(' ').map(word => word.charAt(0).toUpperCase() 
  // make the rest of the word lowercase, join the words together
  + word.slice(1).toLowerCase()).join(' ');
  
  return result;
}

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook
app.post("/entry", (req: Request, res: Response) => {
  const entry = req.body as (recipe | ingredient);
  
  // Entry must be either "recipe" or "ingredient"
  if (entry.type !== "recipe" && entry.type !== "ingredient") {
    return res.status(400).send();
  }
  
  // Check that entry name is unique
  if (cookbook.has(entry.name)) {
    return res.status(400).send();
  }
  
  if (entry.type === "ingredient") {
    const ingredientEntry = entry as ingredient;
    
    // Check cookTime is non-negative
    if (ingredientEntry.cookTime < 0) {
      return res.status(400).send();
    }
  } else if (entry.type === "recipe") {
    const recipeEntry = entry as recipe;
    
    // Check for duplicate required items
    const itemNames = new Set<string>();
    for (const item of recipeEntry.requiredItems) {
      if (itemNames.has(item.name)) {
        return res.status(400).send();
      }
      itemNames.add(item.name);
    }
  }
  
  // Add the entry to the cookbook
  cookbook.set(entry.name, entry);
  return res.status(200).send();
});

// [TASK 3] ====================================================================
// Endpoint that returns a summary of a recipe that corresponds to a query name
app.get("/summary", (req: Request, res: Response) => {
  const recipeName = req.query.name as string;
  
  if (!recipeName) {
    return res.status(400).send();
  }
  
  const entry = cookbook.get(recipeName);
  
  if (!entry || entry.type !== "recipe") {
    return res.status(400).send();
  }
  
  try {
    const summary = generateRecipeSummary(recipeName);
    return res.status(200).json(summary);
  } catch (error) {
    return res.status(400).send();
  }
});

function generateRecipeSummary(recipeName: string): recipeSummary {
  const entry = cookbook.get(recipeName);
  
  if (!entry || entry.type !== "recipe") {
    throw new Error('Recipe not found');
  }
  
  const recipe = entry as recipe;
  const ingredients: Map<string, number> = new Map();
  let totalCookTime = 0;
  
  for (const item of recipe.requiredItems) {
    const requiredEntry = cookbook.get(item.name);
    
    if (!requiredEntry) {
      throw new Error('Required item not found');
    }
    
    if (requiredEntry.type === "ingredient") {
      const ingredient = requiredEntry as ingredient;
      
      const currentQuantity = ingredients.get(item.name) || 0;
      ingredients.set(item.name, currentQuantity + item.quantity);
      
      totalCookTime += ingredient.cookTime * item.quantity;
    } else {
      const subSummary = generateRecipeSummary(item.name);
      
      for (const subIngredient of subSummary.ingredients) {
        const currentQuantity = ingredients.get(subIngredient.name) || 0;
        ingredients.set(subIngredient.name, currentQuantity + (subIngredient.quantity * item.quantity));
      }
      
      totalCookTime += subSummary.cookTime * item.quantity;
    }
  }
  
  const ingredientsList: requiredItem[] = [];
  for (const [name, quantity] of ingredients.entries()) {
    ingredientsList.push({ name, quantity });
  }
  
  return {
    name: recipeName,
    cookTime: totalCookTime,
    ingredients: ingredientsList
  };
}

// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
  console.log(`Running on: http://127.0.0.1:8080`);
});
