import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Plus,
  Search,
  ChefHat,
  Package,
  DollarSign,
  TrendingUp,
  Edit,
  Trash2,
  Copy,
  Eye,
  Printer,
  X,
  Save,
  ArrowLeft,
  BarChart3,
  Clock,
  CheckCircle,
  Activity,
  Utensils,
  ShoppingCart,
  Calendar,
  User,
  FileText,
  Flame,
  Zap,
  Boxes
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface Ingredient {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sugar: number;
  fiber: number;
}

interface Recipe {
  id: string;
  name: string;
  category: string;
  description: string;
  ingredients: Ingredient[];
  nutrition: NutritionInfo;
  totalCost: number;
  packagingCost: number;
  laborCost: number;
  sellingPrice: number;
  profitMargin: number;
  yield: number;
  yieldUnit: string;
  servingSize: string;
  prepTime: number;
  cookTime: number;
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
}

interface BatchProduction {
  id: string;
  recipeId: string;
  recipeName: string;
  batchNumber: string;
  quantity: number;
  productionDate: string;
  expiryDate: string;
  cost: number;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  producedBy: string;
  notes: string;
}

// Sample Data
const sampleRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Whey Protein Shake',
    category: 'Shake',
    description: 'High-protein chocolate shake for post-workout recovery',
    ingredients: [
      { id: '1', productId: 'P001', productName: 'Whey Isolate', quantity: 30, unit: 'g', costPerUnit: 0.12, totalCost: 3.60 },
      { id: '2', productId: 'P002', productName: 'Almond Milk', quantity: 250, unit: 'ml', costPerUnit: 0.008, totalCost: 2.00 },
      { id: '3', productId: 'P003', productName: 'Banana', quantity: 1, unit: 'piece', costPerUnit: 0.50, totalCost: 0.50 },
      { id: '4', productId: 'P004', productName: 'Cocoa Powder', quantity: 10, unit: 'g', costPerUnit: 0.10, totalCost: 1.00 },
      { id: '5', productId: 'P005', productName: 'Honey', quantity: 15, unit: 'ml', costPerUnit: 0.08, totalCost: 1.20 },
      { id: '6', productId: 'P006', productName: 'Ice Cubes', quantity: 100, unit: 'g', costPerUnit: 0.001, totalCost: 0.10 },
    ],
    nutrition: {
      calories: 280,
      protein: 32,
      carbs: 18,
      fats: 8,
      sugar: 6,
      fiber: 3
    },
    totalCost: 8.40,
    packagingCost: 1.00,
    laborCost: 0.80,
    sellingPrice: 15.00,
    profitMargin: 31.33,
    yield: 1,
    yieldUnit: 'serving',
    servingSize: '350 ml',
    prepTime: 5,
    cookTime: 0,
    status: 'active',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Energy Bar - Mixed Nuts',
    category: 'Snack',
    description: 'Homemade energy bars with mixed nuts and dates',
    ingredients: [
      { id: '1', productId: 'P005', productName: 'Almonds', quantity: 100, unit: 'g', costPerUnit: 0.05, totalCost: 5.00 },
      { id: '2', productId: 'P006', productName: 'Cashews', quantity: 100, unit: 'g', costPerUnit: 0.06, totalCost: 6.00 },
      { id: '3', productId: 'P007', productName: 'Dates', quantity: 150, unit: 'g', costPerUnit: 0.03, totalCost: 4.50 },
      { id: '4', productId: 'P008', productName: 'Honey', quantity: 50, unit: 'ml', costPerUnit: 0.08, totalCost: 4.00 },
    ],
    nutrition: {
      calories: 320,
      protein: 8,
      carbs: 35,
      fats: 16,
      sugar: 22,
      fiber: 5
    },
    totalCost: 19.50,
    packagingCost: 2.00,
    laborCost: 1.50,
    sellingPrice: 35.00,
    profitMargin: 34.29,
    yield: 12,
    yieldUnit: 'bars',
    servingSize: '50 g',
    prepTime: 15,
    cookTime: 0,
    status: 'active',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-20'
  },
  {
    id: '3',
    name: 'Pre-Workout Mix - Berry Blast',
    category: 'Shake',
    description: 'Energizing pre-workout drink with berry flavors',
    ingredients: [
      { id: '1', productId: 'P009', productName: 'Beta-Alanine', quantity: 3, unit: 'g', costPerUnit: 0.20, totalCost: 0.60 },
      { id: '2', productId: 'P010', productName: 'Caffeine', quantity: 200, unit: 'mg', costPerUnit: 0.01, totalCost: 2.00 },
      { id: '3', productId: 'P011', productName: 'Berry Flavor', quantity: 5, unit: 'g', costPerUnit: 0.30, totalCost: 1.50 },
      { id: '4', productId: 'P012', productName: 'Sweetener', quantity: 2, unit: 'g', costPerUnit: 0.15, totalCost: 0.30 },
    ],
    nutrition: {
      calories: 15,
      protein: 0,
      carbs: 3,
      fats: 0,
      sugar: 0,
      fiber: 0
    },
    totalCost: 4.40,
    packagingCost: 0.50,
    laborCost: 0.30,
    sellingPrice: 12.00,
    profitMargin: 56.67,
    yield: 1,
    yieldUnit: 'serving',
    servingSize: '250 ml',
    prepTime: 3,
    cookTime: 0,
    status: 'active',
    createdAt: '2024-01-05',
    updatedAt: '2024-01-18'
  }
];

const sampleBatches: BatchProduction[] = [
  {
    id: 'B001',
    recipeId: '1',
    recipeName: 'Whey Protein Shake',
    batchNumber: 'BATCH-2024-001',
    quantity: 50,
    productionDate: '2024-01-25',
    expiryDate: '2024-01-27',
    cost: 510.00,
    status: 'completed',
    producedBy: 'Ahmed Hassan',
    notes: 'Standard batch for weekend demand'
  },
  {
    id: 'B002',
    recipeId: '2',
    recipeName: 'Energy Bar - Mixed Nuts',
    batchNumber: 'BATCH-2024-002',
    quantity: 100,
    productionDate: '2024-01-26',
    expiryDate: '2024-02-26',
    cost: 2300.00,
    status: 'in-progress',
    producedBy: 'Sarah Ahmed',
    notes: 'Monthly stock replenishment'
  }
];

const categories = [
  'Shake',
  'Meal',
  'Snack',
  'Supplement',
  'Bar',
  'Smoothie'
];

const units = [
  'g', 'kg', 'ml', 'L', 'piece', 'cup', 'tbsp', 'tsp', 'oz', 'lb', 'mg'
];

export function ProductionRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>(sampleRecipes);
  const [batches, setBatches] = useState<BatchProduction[]>(sampleBatches);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [showBatchProduction, setShowBatchProduction] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState('recipes');

  // Recipe Form State
  const [recipeName, setRecipeName] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeYield, setRecipeYield] = useState('1');
  const [recipeYieldUnit, setRecipeYieldUnit] = useState('serving');
  const [recipeServingSize, setRecipeServingSize] = useState('');
  const [recipePrepTime, setRecipePrepTime] = useState('');
  const [recipeCookTime, setRecipeCookTime] = useState('');
  const [recipeSellingPrice, setRecipeSellingPrice] = useState('');
  const [recipePackagingCost, setRecipePackagingCost] = useState('1.00');
  const [recipeLaborCost, setRecipeLaborCost] = useState('0.80');
  const [recipeIngredients, setRecipeIngredients] = useState<Ingredient[]>([]);
  
  // Nutrition state
  const [recipeCalories, setRecipeCalories] = useState('');
  const [recipeProtein, setRecipeProtein] = useState('');
  const [recipeCarbs, setRecipeCarbs] = useState('');
  const [recipeFats, setRecipeFats] = useState('');
  const [recipeSugar, setRecipeSugar] = useState('');
  const [recipeFiber, setRecipeFiber] = useState('');

  // Batch Production State
  const [batchRecipeId, setBatchRecipeId] = useState('');
  const [batchQuantity, setBatchQuantity] = useState('');
  const [batchProductionDate, setBatchProductionDate] = useState('');
  const [batchExpiryDate, setBatchExpiryDate] = useState('');
  const [batchProducedBy, setBatchProducedBy] = useState('');
  const [batchNotes, setBatchNotes] = useState('');

  // Filter recipes
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || recipe.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || recipe.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate total cost
  const calculateTotalCost = (ingredients: Ingredient[]) => {
    return ingredients.reduce((sum, ing) => sum + ing.totalCost, 0);
  };

  // Calculate profit margin
  const calculateProfitMargin = (ingredientsCost: number, packagingCost: number, laborCost: number, sellingPrice: number) => {
    const totalCost = ingredientsCost + packagingCost + laborCost;
    if (sellingPrice === 0) return 0;
    return ((sellingPrice - totalCost) / sellingPrice) * 100;
  };

  // Add ingredient
  const addIngredient = () => {
    const newIngredient: Ingredient = {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      quantity: 0,
      unit: 'g',
      costPerUnit: 0,
      totalCost: 0
    };
    setRecipeIngredients([...recipeIngredients, newIngredient]);
  };

  // Update ingredient
  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setRecipeIngredients(recipeIngredients.map(ing => {
      if (ing.id === id) {
        const updated = { ...ing, [field]: value };
        // Recalculate total cost
        if (field === 'quantity' || field === 'costPerUnit') {
          updated.totalCost = updated.quantity * updated.costPerUnit;
        }
        return updated;
      }
      return ing;
    }));
  };

  // Remove ingredient
  const removeIngredient = (id: string) => {
    setRecipeIngredients(recipeIngredients.filter(ing => ing.id !== id));
  };

  // Save recipe
  const handleSaveRecipe = () => {
    if (!recipeName || !recipeCategory || recipeIngredients.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const ingredientsCost = calculateTotalCost(recipeIngredients);
    const packagingCost = parseFloat(recipePackagingCost) || 0;
    const laborCost = parseFloat(recipeLaborCost) || 0;
    const sellingPrice = parseFloat(recipeSellingPrice) || 0;
    const profitMargin = calculateProfitMargin(ingredientsCost, packagingCost, laborCost, sellingPrice);

    const newRecipe: Recipe = {
      id: editingRecipe?.id || Date.now().toString(),
      name: recipeName,
      category: recipeCategory,
      description: recipeDescription,
      ingredients: recipeIngredients,
      nutrition: {
        calories: parseFloat(recipeCalories) || 0,
        protein: parseFloat(recipeProtein) || 0,
        carbs: parseFloat(recipeCarbs) || 0,
        fats: parseFloat(recipeFats) || 0,
        sugar: parseFloat(recipeSugar) || 0,
        fiber: parseFloat(recipeFiber) || 0,
      },
      totalCost: ingredientsCost,
      packagingCost,
      laborCost,
      sellingPrice,
      profitMargin,
      yield: parseFloat(recipeYield) || 1,
      yieldUnit: recipeYieldUnit,
      servingSize: recipeServingSize,
      prepTime: parseFloat(recipePrepTime) || 0,
      cookTime: parseFloat(recipeCookTime) || 0,
      status: 'active',
      createdAt: editingRecipe?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    if (editingRecipe) {
      setRecipes(recipes.map(r => r.id === editingRecipe.id ? newRecipe : r));
      toast.success('Recipe updated successfully!');
    } else {
      setRecipes([...recipes, newRecipe]);
      toast.success('Recipe created successfully!');
    }

    resetRecipeForm();
    setShowAddRecipe(false);
  };

  // Reset recipe form
  const resetRecipeForm = () => {
    setRecipeName('');
    setRecipeCategory('');
    setRecipeDescription('');
    setRecipeYield('1');
    setRecipeYieldUnit('serving');
    setRecipeServingSize('');
    setRecipePrepTime('');
    setRecipeCookTime('');
    setRecipeSellingPrice('');
    setRecipePackagingCost('1.00');
    setRecipeLaborCost('0.80');
    setRecipeIngredients([]);
    setRecipeCalories('');
    setRecipeProtein('');
    setRecipeCarbs('');
    setRecipeFats('');
    setRecipeSugar('');
    setRecipeFiber('');
    setEditingRecipe(null);
  };

  // Edit recipe
  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setRecipeName(recipe.name);
    setRecipeCategory(recipe.category);
    setRecipeDescription(recipe.description);
    setRecipeYield(recipe.yield.toString());
    setRecipeYieldUnit(recipe.yieldUnit);
    setRecipeServingSize(recipe.servingSize);
    setRecipePrepTime(recipe.prepTime.toString());
    setRecipeCookTime(recipe.cookTime.toString());
    setRecipeSellingPrice(recipe.sellingPrice.toString());
    setRecipePackagingCost(recipe.packagingCost.toString());
    setRecipeLaborCost(recipe.laborCost.toString());
    setRecipeIngredients([...recipe.ingredients]);
    setRecipeCalories(recipe.nutrition.calories.toString());
    setRecipeProtein(recipe.nutrition.protein.toString());
    setRecipeCarbs(recipe.nutrition.carbs.toString());
    setRecipeFats(recipe.nutrition.fats.toString());
    setRecipeSugar(recipe.nutrition.sugar.toString());
    setRecipeFiber(recipe.nutrition.fiber.toString());
    setShowAddRecipe(true);
  };

  // Delete recipe
  const handleDeleteRecipe = (id: string) => {
    setRecipes(recipes.filter(r => r.id !== id));
    toast.success('Recipe deleted successfully');
  };

  // Duplicate recipe
  const handleDuplicateRecipe = (recipe: Recipe) => {
    const duplicated: Recipe = {
      ...recipe,
      id: Date.now().toString(),
      name: `${recipe.name} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };
    setRecipes([...recipes, duplicated]);
    toast.success('Recipe duplicated successfully');
  };

  // Create batch production
  const handleCreateBatch = () => {
    if (!batchRecipeId || !batchQuantity || !batchProductionDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const recipe = recipes.find(r => r.id === batchRecipeId);
    if (!recipe) return;

    const quantity = parseInt(batchQuantity);
    const cost = (recipe.totalCost + recipe.packagingCost + recipe.laborCost) * quantity;

    const newBatch: BatchProduction = {
      id: `B${Date.now()}`,
      recipeId: batchRecipeId,
      recipeName: recipe.name,
      batchNumber: `BATCH-${new Date().getFullYear()}-${(batches.length + 1).toString().padStart(3, '0')}`,
      quantity,
      productionDate: batchProductionDate,
      expiryDate: batchExpiryDate,
      cost,
      status: 'planned',
      producedBy: batchProducedBy,
      notes: batchNotes
    };

    setBatches([...batches, newBatch]);
    toast.success('Batch production created successfully!');
    resetBatchForm();
    setShowBatchProduction(false);
  };

  // Reset batch form
  const resetBatchForm = () => {
    setBatchRecipeId('');
    setBatchQuantity('');
    setBatchProductionDate('');
    setBatchExpiryDate('');
    setBatchProducedBy('');
    setBatchNotes('');
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'inactive':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'draft':
      case 'planned':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Statistics
  const totalRecipes = recipes.length;
  const activeRecipes = recipes.filter(r => r.status === 'active').length;
  const averageCost = recipes.reduce((sum, r) => sum + r.totalCost + r.packagingCost + r.laborCost, 0) / recipes.length || 0;
  const averageMargin = recipes.reduce((sum, r) => sum + r.profitMargin, 0) / recipes.length || 0;

  // Calculate total ingredients required for batch
  const selectedBatchRecipe = recipes.find(r => r.id === batchRecipeId);
  const batchQty = parseInt(batchQuantity) || 0;
  const totalIngredientsRequired = selectedBatchRecipe?.ingredients.map(ing => ({
    ...ing,
    totalQuantity: ing.quantity * batchQty,
    totalCost: ing.totalCost * batchQty
  })) || [];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {!showAddRecipe && !showBatchProduction && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Production / Recipes</h1>
              <p className="text-gray-600 mt-1">Manage recipes, ingredients, and batch production</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
              <Button 
                className="bg-[#327F74] hover:bg-[#2B6B62] text-white"
                onClick={() => {
                  resetRecipeForm();
                  setShowAddRecipe(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Recipe
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Recipes</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{totalRecipes}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <ChefHat className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Recipes</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{activeRecipes}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. Cost/Unit</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{averageCost.toFixed(2)} AED</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. Profit Margin</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{averageMargin.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white border">
              <TabsTrigger value="recipes" className="data-[state=active]:bg-[#327F74] data-[state=active]:text-white">
                <ChefHat className="h-4 w-4 mr-2" />
                Recipes
              </TabsTrigger>
              <TabsTrigger value="batches" className="data-[state=active]:bg-[#327F74] data-[state=active]:text-white">
                <Package className="h-4 w-4 mr-2" />
                Batch Production
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-[#327F74] data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Recipes Tab */}
            <TabsContent value="recipes" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[320px]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search recipes..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Recipes Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Recipe List</CardTitle>
                  <CardDescription>
                    {filteredRecipes.length} recipe(s) found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recipe</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Ingredients</TableHead>
                          <TableHead>Cost / Unit</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecipes.map((recipe) => (
                          <TableRow key={recipe.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{recipe.name}</p>
                                <p className="text-sm text-gray-500">{recipe.description.substring(0, 50)}...</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{recipe.category}</Badge>
                            </TableCell>
                            <TableCell>{recipe.ingredients.length} items</TableCell>
                            <TableCell className="font-medium">
                              AED {(recipe.totalCost + recipe.packagingCost + recipe.laborCost).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(recipe.status)}>
                                {recipe.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedRecipe(recipe)}
                                  className="text-[#327F74] hover:text-[#2B6B62]"
                                >
                                  View
                                </Button>
                                <span className="text-gray-300">•</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditRecipe(recipe)}
                                  className="text-[#327F74] hover:text-[#2B6B62]"
                                >
                                  Edit
                                </Button>
                                <span className="text-gray-300">•</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicateRecipe(recipe)}
                                  className="text-[#327F74] hover:text-[#2B6B62]"
                                >
                                  Duplicate
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Batch Production Tab */}
            <TabsContent value="batches" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Batch Production</h2>
                  <p className="text-gray-600">Track and manage production batches</p>
                </div>
                <Button 
                  className="bg-[#327F74] hover:bg-[#2B6B62] text-white"
                  onClick={() => setShowBatchProduction(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Batch
                </Button>
              </div>

              <Card>
                <CardContent className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch Number</TableHead>
                        <TableHead>Recipe</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Production Date</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Produced By</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batches.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                          <TableCell>{batch.recipeName}</TableCell>
                          <TableCell>{batch.quantity} units</TableCell>
                          <TableCell>{batch.productionDate}</TableCell>
                          <TableCell className="font-medium">{batch.cost.toFixed(2)} AED</TableCell>
                          <TableCell>{batch.producedBy}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(batch.status)}>
                              {batch.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Recipes by Profit Margin</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recipes
                        .sort((a, b) => b.profitMargin - a.profitMargin)
                        .slice(0, 5)
                        .map((recipe, index) => (
                          <div key={recipe.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-[#327F74] text-white rounded-full flex items-center justify-center font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{recipe.name}</p>
                                <p className="text-sm text-gray-500">{recipe.category}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">{recipe.profitMargin.toFixed(1)}%</p>
                              <p className="text-sm text-gray-500">{recipe.sellingPrice.toFixed(2)} AED</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cost Distribution by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categories.map(category => {
                        const categoryRecipes = recipes.filter(r => r.category === category);
                        const totalCost = categoryRecipes.reduce((sum, r) => sum + r.totalCost + r.packagingCost + r.laborCost, 0);
                        const count = categoryRecipes.length;
                        
                        if (count === 0) return null;
                        
                        return (
                          <div key={category} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{category}</span>
                              <span className="text-sm text-gray-600">{count} recipes</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-[#327F74] h-2 rounded-full" 
                                style={{ width: `${(totalCost / (averageCost * totalRecipes)) * 100}%` }}
                              />
                            </div>
                            <p className="text-sm text-gray-600">Total: {totalCost.toFixed(2)} AED</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Add/Edit Recipe Dialog - Full Screen */}
      {showAddRecipe && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetRecipeForm();
                      setShowAddRecipe(false);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {editingRecipe ? 'Edit Recipe' : 'Create Recipe'}
                    </h2>
                  </div>
                </div>
                <Button
                  className="bg-[#327F74] hover:bg-[#2B6B62] text-white"
                  onClick={handleSaveRecipe}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Recipe
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column - Form */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Basic Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Recipe Name</Label>
                          <Input
                            placeholder="E.g., Whey Protein Shake"
                            value={recipeName}
                            onChange={(e) => setRecipeName(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Category</Label>
                            <Select value={recipeCategory} onValueChange={setRecipeCategory}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Serving Size (ml / g)</Label>
                            <Input
                              placeholder="E.g., 350 ml"
                              value={recipeServingSize}
                              onChange={(e) => setRecipeServingSize(e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            placeholder="Brief description of the recipe..."
                            value={recipeDescription}
                            onChange={(e) => setRecipeDescription(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Prep Time (min)</Label>
                            <Input
                              type="number"
                              placeholder="5"
                              value={recipePrepTime}
                              onChange={(e) => setRecipePrepTime(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Cook Time (min)</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={recipeCookTime}
                              onChange={(e) => setRecipeCookTime(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Yield</Label>
                            <Input
                              type="number"
                              placeholder="1"
                              value={recipeYield}
                              onChange={(e) => setRecipeYield(e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Ingredients */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Ingredients</CardTitle>
                          <Button
                            size="sm"
                            className="bg-[#327F74] hover:bg-[#2B6B62] text-white"
                            onClick={addIngredient}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Ingredient
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {recipeIngredients.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>No ingredients added yet</p>
                            <p className="text-sm">Click "Add Ingredient" to start</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-12 gap-2 text-sm font-semibold text-gray-600 pb-2 border-b">
                              <div className="col-span-4">Ingredient</div>
                              <div className="col-span-2">Qty</div>
                              <div className="col-span-2">Unit</div>
                              <div className="col-span-2">Cost/Unit</div>
                              <div className="col-span-1">Total</div>
                              <div className="col-span-1"></div>
                            </div>
                            {recipeIngredients.map((ingredient) => (
                              <div key={ingredient.id} className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-4">
                                  <Input
                                    placeholder="Ingredient name"
                                    value={ingredient.productName}
                                    onChange={(e) => updateIngredient(ingredient.id, 'productName', e.target.value)}
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    placeholder="30"
                                    value={ingredient.quantity || ''}
                                    onChange={(e) => updateIngredient(ingredient.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Select 
                                    value={ingredient.unit} 
                                    onValueChange={(value) => updateIngredient(ingredient.id, 'unit', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {units.map(unit => (
                                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.12"
                                    value={ingredient.costPerUnit || ''}
                                    onChange={(e) => updateIngredient(ingredient.id, 'costPerUnit', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="col-span-1 text-sm font-medium">
                                  {ingredient.totalCost.toFixed(2)}
                                </div>
                                <div className="col-span-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeIngredient(ingredient.id)}
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column - Summaries */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Nutrition Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Activity className="h-5 w-5 mr-2 text-[#327F74]" />
                          Nutrition Summary
                        </CardTitle>
                        <CardDescription>Per Serving</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm">Calories (kcal)</Label>
                            <Input
                              type="number"
                              placeholder="280"
                              value={recipeCalories}
                              onChange={(e) => setRecipeCalories(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Protein (g)</Label>
                            <Input
                              type="number"
                              placeholder="32"
                              value={recipeProtein}
                              onChange={(e) => setRecipeProtein(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Carbs (g)</Label>
                            <Input
                              type="number"
                              placeholder="18"
                              value={recipeCarbs}
                              onChange={(e) => setRecipeCarbs(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Fats (g)</Label>
                            <Input
                              type="number"
                              placeholder="8"
                              value={recipeFats}
                              onChange={(e) => setRecipeFats(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Sugar (g)</Label>
                            <Input
                              type="number"
                              placeholder="6"
                              value={recipeSugar}
                              onChange={(e) => setRecipeSugar(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Fiber (g)</Label>
                            <Input
                              type="number"
                              placeholder="3"
                              value={recipeFiber}
                              onChange={(e) => setRecipeFiber(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Macros visualization */}
                        <div className="pt-4 border-t">
                          <p className="text-sm font-medium mb-3">Macros Distribution</p>
                          <div className="space-y-2">
                            {parseFloat(recipeProtein) > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm flex items-center">
                                  <span className="w-3 h-3 rounded-full bg-[#327F74] mr-2"></span>
                                  Protein
                                </span>
                                <span className="text-sm font-medium">{recipeProtein} g</span>
                              </div>
                            )}
                            {parseFloat(recipeCarbs) > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm flex items-center">
                                  <span className="w-3 h-3 rounded-full bg-[#EAB308] mr-2"></span>
                                  Carbs
                                </span>
                                <span className="text-sm font-medium">{recipeCarbs} g</span>
                              </div>
                            )}
                            {parseFloat(recipeFats) > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm flex items-center">
                                  <span className="w-3 h-3 rounded-full bg-[#E63946] mr-2"></span>
                                  Fats
                                </span>
                                <span className="text-sm font-medium">{recipeFats} g</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Cost Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <DollarSign className="h-5 w-5 mr-2 text-[#327F74]" />
                          Cost Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Ingredients Cost:</span>
                            <span className="font-medium">{calculateTotalCost(recipeIngredients).toFixed(2)} AED</span>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-sm text-gray-600">Packaging:</Label>
                              <span className="font-medium">{parseFloat(recipePackagingCost || '0').toFixed(2)} AED</span>
                            </div>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="1.00"
                              value={recipePackagingCost}
                              onChange={(e) => setRecipePackagingCost(e.target.value)}
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-sm text-gray-600">Labor:</Label>
                              <span className="font-medium">{parseFloat(recipeLaborCost || '0').toFixed(2)} AED</span>
                            </div>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.80"
                              value={recipeLaborCost}
                              onChange={(e) => setRecipeLaborCost(e.target.value)}
                            />
                          </div>
                          <div className="pt-3 border-t">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-[#327F74]">Total Cost / Unit:</span>
                              <span className="font-bold text-lg text-[#327F74]">
                                {(calculateTotalCost(recipeIngredients) + parseFloat(recipePackagingCost || '0') + parseFloat(recipeLaborCost || '0')).toFixed(2)} AED
                              </span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm">Selling Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="15.00"
                              value={recipeSellingPrice}
                              onChange={(e) => setRecipeSellingPrice(e.target.value)}
                            />
                          </div>
                          {recipeSellingPrice && (
                            <div className="pt-3 border-t">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Profit Margin:</span>
                                <span className={`font-bold ${calculateProfitMargin(
                                  calculateTotalCost(recipeIngredients),
                                  parseFloat(recipePackagingCost || '0'),
                                  parseFloat(recipeLaborCost || '0'),
                                  parseFloat(recipeSellingPrice)
                                ) > 40 ? 'text-green-600' : 'text-orange-600'}`}>
                                  {calculateProfitMargin(
                                    calculateTotalCost(recipeIngredients),
                                    parseFloat(recipePackagingCost || '0'),
                                    parseFloat(recipeLaborCost || '0'),
                                    parseFloat(recipeSellingPrice)
                                  ).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Production Dialog - Full Screen */}
      {showBatchProduction && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetBatchForm();
                      setShowBatchProduction(false);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Batch Production</h2>
                  </div>
                </div>
                <Button
                  className="bg-[#327F74] hover:bg-[#2B6B62] text-white"
                  onClick={handleCreateBatch}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create Batch
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column - Form */}
                  <div className="lg:col-span-7">
                    <Card>
                      <CardHeader>
                        <CardTitle>Batch Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Select Recipe</Label>
                          <Select value={batchRecipeId} onValueChange={setBatchRecipeId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a recipe" />
                            </SelectTrigger>
                            <SelectContent>
                              {recipes.filter(r => r.status === 'active').map(recipe => (
                                <SelectItem key={recipe.id} value={recipe.id}>
                                  {recipe.name} ({recipe.category})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Batch Size (units)</Label>
                            <Input
                              type="number"
                              placeholder="10"
                              value={batchQuantity}
                              onChange={(e) => setBatchQuantity(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Production Date</Label>
                            <Input
                              type="date"
                              value={batchProductionDate}
                              onChange={(e) => setBatchProductionDate(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Expiry Date</Label>
                            <Input
                              type="date"
                              value={batchExpiryDate}
                              onChange={(e) => setBatchExpiryDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Assigned To (Staff)</Label>
                            <Input
                              placeholder="Staff name"
                              value={batchProducedBy}
                              onChange={(e) => setBatchProducedBy(e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Notes</Label>
                          <Textarea
                            placeholder="Production notes..."
                            value={batchNotes}
                            onChange={(e) => setBatchNotes(e.target.value)}
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column - Stock Impact */}
                  <div className="lg:col-span-5">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Boxes className="h-5 w-5 mr-2 text-[#327F74]" />
                          Stock & Cost Impact
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedBatchRecipe && batchQty > 0 ? (
                          <div className="space-y-4">
                            <div>
                              <p className="font-semibold mb-2">Total Ingredients Required</p>
                              <div className="space-y-2">
                                {totalIngredientsRequired.map((ing, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">- {ing.productName}:</span>
                                    <span className="font-medium">{ing.totalQuantity} {ing.unit}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="pt-4 border-t space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Ingredients Cost:</span>
                                <span className="font-medium">{(selectedBatchRecipe.totalCost * batchQty).toFixed(2)} AED</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Packaging Cost:</span>
                                <span className="font-medium">{(selectedBatchRecipe.packagingCost * batchQty).toFixed(2)} AED</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Labor Cost:</span>
                                <span className="font-medium">{(selectedBatchRecipe.laborCost * batchQty).toFixed(2)} AED</span>
                              </div>
                              <div className="pt-3 border-t">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-[#327F74]">Estimated Total Cost:</span>
                                  <span className="font-bold text-lg text-[#327F74]">
                                    {((selectedBatchRecipe.totalCost + selectedBatchRecipe.packagingCost + selectedBatchRecipe.laborCost) * batchQty).toFixed(2)} AED
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Cost / Unit:</span>
                                <span className="font-medium">
                                  {(selectedBatchRecipe.totalCost + selectedBatchRecipe.packagingCost + selectedBatchRecipe.laborCost).toFixed(2)} AED
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Boxes className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p>Select a recipe and batch size</p>
                            <p className="text-sm">to see stock impact</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Recipe Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedRecipe?.name}</span>
              <Badge className={getStatusColor(selectedRecipe?.status || 'active')}>
                {selectedRecipe?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedRecipe?.category} • {selectedRecipe?.servingSize}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecipe && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Nutrition Facts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Nutrition Facts</CardTitle>
                    <CardDescription>Per Serving ({selectedRecipe.servingSize})</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center"><Flame className="h-4 w-4 mr-2 text-orange-500" />Calories:</span>
                      <span className="font-medium">{selectedRecipe.nutrition.calories} kcal</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center"><Zap className="h-4 w-4 mr-2 text-[#327F74]" />Protein:</span>
                      <span className="font-medium">{selectedRecipe.nutrition.protein} g</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Carbohydrates:</span>
                      <span className="font-medium">{selectedRecipe.nutrition.carbs} g</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Fats:</span>
                      <span className="font-medium">{selectedRecipe.nutrition.fats} g</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Sugar:</span>
                      <span className="font-medium">{selectedRecipe.nutrition.sugar} g</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Fiber:</span>
                      <span className="font-medium">{selectedRecipe.nutrition.fiber} g</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Cost Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Ingredients:</span>
                      <span className="font-medium">{selectedRecipe.totalCost.toFixed(2)} AED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Packaging:</span>
                      <span className="font-medium">{selectedRecipe.packagingCost.toFixed(2)} AED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Labor:</span>
                      <span className="font-medium">{selectedRecipe.laborCost.toFixed(2)} AED</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between font-semibold text-[#327F74]">
                        <span>Total Cost:</span>
                        <span>{(selectedRecipe.totalCost + selectedRecipe.packagingCost + selectedRecipe.laborCost).toFixed(2)} AED</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Selling Price:</span>
                      <span className="font-medium">{selectedRecipe.sellingPrice.toFixed(2)} AED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Profit Margin:</span>
                      <span className="font-bold text-green-600">{selectedRecipe.profitMargin.toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Ingredients */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ingredients ({selectedRecipe.ingredients.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingredient</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRecipe.ingredients.map((ing, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{ing.productName}</TableCell>
                          <TableCell>{ing.quantity}</TableCell>
                          <TableCell>{ing.unit}</TableCell>
                          <TableCell className="text-right">{ing.totalCost.toFixed(2)} AED</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Additional Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Prep Time</p>
                    <p className="font-medium">{selectedRecipe.prepTime} min</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Utensils className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Cook Time</p>
                    <p className="font-medium">{selectedRecipe.cookTime} min</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Yield</p>
                    <p className="font-medium">{selectedRecipe.yield} {selectedRecipe.yieldUnit}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
