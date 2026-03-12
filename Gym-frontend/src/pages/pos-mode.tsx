import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  Calculator,
  ShoppingCart,
  Scan,
  Receipt,
  CreditCard,
  Banknote,
  Wallet,
  Split,
  FileCheck,
  ArrowLeftRight,
  Users,
  UserPlus,
  Package,
  Plus,
  Minus,
  Trash2,
  Search,
  Percent,
  Hash,
  DollarSign,
  Coffee,
  Utensils,
  Sandwich,
  Milk,
  ChefHat,
  Clock,
  MapPin,
  Truck,
  Home,
  Printer,
  Mail,
  CheckCircle,
  AlertCircle,
  X,
  Edit,
  Save,
  RotateCcw,
  Calculator as Calc,
  Tag,
  Zap,
  Filter,
  Settings
} from "lucide-react";

export function POSMode() {
  const [activeTab, setActiveTab] = useState("retail");
  const [retailCart, setRetailCart] = useState([]);
  const [fnbCart, setFnbCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("walk-in");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(5);

  // Mock data for products
  const retailProducts = [
    {
      id: 1,
      name: "Protein Powder - Whey",
      barcode: "123456789012",
      price: 125.00,
      category: "Supplements",
      stock: 45,
      image: null
    },
    {
      id: 2,
      name: "Gym T-Shirt - Black",
      barcode: "234567890123",
      price: 65.00,
      category: "Apparel",
      stock: 23,
      image: null
    },
    {
      id: 3,
      name: "Water Bottle - 750ml",
      barcode: "345678901234",
      price: 25.00,
      category: "Accessories",
      stock: 67,
      image: null
    },
    {
      id: 4,
      name: "Pre-Workout - Energy",
      barcode: "456789012345",
      price: 89.00,
      category: "Supplements",
      stock: 32,
      image: null
    },
    {
      id: 5,
      name: "Resistance Bands Set",
      barcode: "567890123456",
      price: 45.00,
      category: "Equipment",
      stock: 18,
      image: null
    },
    {
      id: 6,
      name: "Gym Towel - Premium",
      barcode: "678901234567",
      price: 35.00,
      category: "Accessories",
      stock: 29,
      image: null
    }
  ];

  const fnbProducts = [
    {
      id: 1,
      name: "Protein Smoothie",
      price: 28.00,
      category: "Smoothies",
      prepTime: "3 min",
      modifiers: ["Extra Protein (+AED 8)", "Sugar-free", "Add Banana (+AED 3)"]
    },
    {
      id: 2,
      name: "Fresh Orange Juice",
      price: 18.00,
      category: "Beverages",
      prepTime: "2 min",
      modifiers: ["Large Size (+AED 5)", "Add Ice", "No Sugar"]
    },
    {
      id: 3,
      name: "Grilled Chicken Salad",
      price: 42.00,
      category: "Meals",
      prepTime: "8 min",
      modifiers: ["Extra Chicken (+AED 12)", "No Dressing", "Add Avocado (+AED 8)"]
    },
    {
      id: 4,
      name: "Energy Bar",
      price: 15.00,
      category: "Snacks",
      prepTime: "0 min",
      modifiers: ["Chocolate Flavor", "Peanut Butter", "Coconut"]
    },
    {
      id: 5,
      name: "Post-Workout Shake",
      price: 32.00,
      category: "Smoothies",
      prepTime: "4 min",
      modifiers: ["BCAA Boost (+AED 10)", "Creatine (+AED 6)", "Berry Flavor"]
    },
    {
      id: 6,
      name: "Green Tea",
      price: 12.00,
      category: "Beverages",
      prepTime: "3 min",
      modifiers: ["Honey (+AED 2)", "Lemon", "Iced Version"]
    }
  ];

  const customers = [
    { id: "walk-in", name: "Walk-in Customer", type: "guest", credit: 0 },
    { id: "sarah", name: "Sarah Johnson", type: "member", credit: 45.50, membershipId: "MEM001" },
    { id: "alex", name: "Alex Martinez", type: "member", credit: 23.75, membershipId: "MEM002" },
    { id: "emma", name: "Emma Wilson", type: "member", credit: 67.20, membershipId: "MEM003" }
  ];

  const orderQueue = [
    {
      id: "ORD001",
      items: ["Protein Smoothie", "Energy Bar"],
      customer: "Sarah J.",
      orderTime: "14:32",
      status: "preparing",
      type: "takeaway",
      estimatedTime: "5 min"
    },
    {
      id: "ORD002",
      items: ["Grilled Chicken Salad"],
      customer: "Walk-in",
      orderTime: "14:35",
      status: "ready",
      type: "dine-in",
      estimatedTime: "Ready"
    },
    {
      id: "ORD003",
      items: ["Fresh Orange Juice", "Post-Workout Shake"],
      customer: "Alex M.",
      orderTime: "14:38",
      status: "pending",
      type: "delivery",
      estimatedTime: "8 min"
    }
  ];

  const addToCart = (product, isRetail = true) => {
    if (isRetail) {
      const existingItem = retailCart.find(item => item.id === product.id);
      if (existingItem) {
        setRetailCart(retailCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        ));
      } else {
        setRetailCart([...retailCart, { ...product, quantity: 1, total: product.price }]);
      }
    } else {
      const existingItem = fnbCart.find(item => item.id === product.id);
      if (existingItem) {
        setFnbCart(fnbCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        ));
      } else {
        setFnbCart([...fnbCart, { ...product, quantity: 1, total: product.price, modifiers: [] }]);
      }
    }
  };

  const removeFromCart = (productId, isRetail = true) => {
    if (isRetail) {
      setRetailCart(retailCart.filter(item => item.id !== productId));
    } else {
      setFnbCart(fnbCart.filter(item => item.id !== productId));
    }
  };

  const updateQuantity = (productId, newQuantity, isRetail = true) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, isRetail);
      return;
    }

    if (isRetail) {
      setRetailCart(retailCart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      ));
    } else {
      setFnbCart(fnbCart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      ));
    }
  };

  const calculateSubtotal = (cart) => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateDiscount = (subtotal) => {
    if (discountType === "percent") {
      return (subtotal * discountValue) / 100;
    }
    return Math.min(discountValue, subtotal);
  };

  const calculateTax = (amountAfterDiscount) => {
    return (amountAfterDiscount * taxRate) / 100;
  };

  const calculateTotal = (cart) => {
    const subtotal = calculateSubtotal(cart);
    const discount = calculateDiscount(subtotal);
    const amountAfterDiscount = subtotal - discount;
    const tax = calculateTax(amountAfterDiscount);
    return amountAfterDiscount + tax;
  };

  const clearCart = (isRetail = true) => {
    if (isRetail) {
      setRetailCart([]);
    } else {
      setFnbCart([]);
    }
  };

  const processPayment = (isRetail = true) => {
    const cart = isRetail ? retailCart : fnbCart;
    if (cart.length === 0) return;

    // Mock payment processing
    alert(`Payment processed successfully! Total: AED ${calculateTotal(cart).toFixed(2)}`);
    clearCart(isRetail);
    setDiscountValue(0);
    setSelectedCustomer("walk-in");
    setPaymentMethod("cash");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">POS Mode</h1>
          <p className="text-gray-600 mt-1">
            Point of Sale system for retail and F&B operations
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="retail" className="flex items-center">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Retail POS
          </TabsTrigger>
          <TabsTrigger value="fnb" className="flex items-center">
            <ChefHat className="h-4 w-4 mr-2" />
            F&B POS
          </TabsTrigger>
        </TabsList>

        {/* Retail POS */}
        <TabsContent value="retail" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products Grid */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Package className="h-5 w-5 mr-2" />
                      Product Catalog
                    </CardTitle>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Scan className="h-4 w-4 mr-2" />
                            Scan Barcode
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Barcode Scanner</DialogTitle>
                            <DialogDescription>
                              Point camera at barcode or enter manually
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input placeholder="Enter barcode manually..." />
                            <Button className="w-full">Add to Cart</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Input placeholder="Search products..." className="w-48" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {retailProducts.map((product) => (
                      <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                          <h4 className="font-medium text-sm mb-1 leading-tight">{product.name}</h4>
                          <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-green-600">AED {product.price}</span>
                            <Badge variant="secondary" className="text-xs">
                              {product.stock}
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full mt-2"
                            onClick={() => addToCart(product, true)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cart & Checkout */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Shopping Cart
                    </span>
                    {retailCart.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => clearCart(true)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {retailCart.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>No items in cart</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {retailCart.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-gray-500">AED {item.price} each</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1, true)}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity + 1, true)}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.id, true)}
                                className="h-6 w-6 p-0 text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Customer Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{customer.name}</span>
                            {customer.type === "member" && (
                              <Badge variant="outline" className="ml-2">Member</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCustomer !== "walk-in" && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                      <p>Credit Balance: AED {customers.find(c => c.id === selectedCustomer)?.credit || 0}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Billing Summary */}
              {retailCart.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calculator className="h-5 w-5 mr-2" />
                      Billing Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Discount Controls */}
                    <div className="space-y-2">
                      <Label>Discount</Label>
                      <div className="flex space-x-2">
                        <Select value={discountType} onValueChange={setDiscountType}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">%</SelectItem>
                            <SelectItem value="fixed">AED</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Number(e.target.value))}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Summary */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>AED {calculateSubtotal(retailCart).toFixed(2)}</span>
                      </div>
                      {discountValue > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Discount:</span>
                          <span>-AED {calculateDiscount(calculateSubtotal(retailCart)).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span>Tax ({taxRate}%):</span>
                        <span>AED {calculateTax(calculateSubtotal(retailCart) - calculateDiscount(calculateSubtotal(retailCart))).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Total:</span>
                        <span>AED {calculateTotal(retailCart).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">
                            <div className="flex items-center">
                              <Banknote className="h-4 w-4 mr-2" />
                              Cash
                            </div>
                          </SelectItem>
                          <SelectItem value="card">
                            <div className="flex items-center">
                              <CreditCard className="h-4 w-4 mr-2" />
                              Card
                            </div>
                          </SelectItem>
                          <SelectItem value="credit">
                            <div className="flex items-center">
                              <Wallet className="h-4 w-4 mr-2" />
                              Member Credit
                            </div>
                          </SelectItem>
                          <SelectItem value="multi">
                            <div className="flex items-center">
                              <Split className="h-4 w-4 mr-2" />
                              Multi-Pay (Split)
                            </div>
                          </SelectItem>
                          <SelectItem value="cheque">
                            <div className="flex items-center">
                              <FileCheck className="h-4 w-4 mr-2" />
                              Cheque
                            </div>
                          </SelectItem>
                          <SelectItem value="transfer">
                            <div className="flex items-center">
                              <ArrowLeftRight className="h-4 w-4 mr-2" />
                              Bank Transfer
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => clearCart(true)}
                      >
                        Clear
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={() => processPayment(true)}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Pay & Print
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* F&B POS */}
        <TabsContent value="fnb" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Menu Categories & Products */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Utensils className="h-5 w-5 mr-2" />
                    Menu Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <Button variant="outline" size="sm" className="flex items-center justify-center p-3">
                      <Coffee className="h-4 w-4 mr-1" />
                      <span className="text-xs">Beverages</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center justify-center p-3">
                      <Sandwich className="h-4 w-4 mr-1" />
                      <span className="text-xs">Snacks</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center justify-center p-3">
                      <ChefHat className="h-4 w-4 mr-1" />
                      <span className="text-xs">Meals</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center justify-center p-3">
                      <Milk className="h-4 w-4 mr-1" />
                      <span className="text-xs">Smoothies</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {fnbProducts.map((product) => (
                      <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                            <ChefHat className="h-8 w-8 text-gray-400" />
                          </div>
                          <h4 className="font-medium text-sm mb-1">{product.name}</h4>
                          <p className="text-xs text-gray-500 mb-1">{product.category}</p>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-green-600">AED {product.price}</span>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {product.prepTime}
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => addToCart(product, false)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Cart */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <ChefHat className="h-5 w-5 mr-2" />
                      Current Order
                    </span>
                    {fnbCart.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => clearCart(false)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {fnbCart.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>No items in order</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {fnbCart.map((item) => (
                          <div key={item.id} className="p-3 bg-gray-50 rounded">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">{item.name}</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.id, false)}
                                className="h-6 w-6 p-0 text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-500">AED {item.price} each</span>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1, false)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center text-sm">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1, false)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="text-xs text-gray-600">
                                <p>Modifiers: {item.modifiers.join(", ")}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Order Type & Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Order Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Order Type</Label>
                    <Select defaultValue="takeaway">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dine-in">
                          <div className="flex items-center">
                            <Home className="h-4 w-4 mr-2" />
                            Dine-in
                          </div>
                        </SelectItem>
                        <SelectItem value="takeaway">
                          <div className="flex items-center">
                            <Package className="h-4 w-4 mr-2" />
                            Takeaway
                          </div>
                        </SelectItem>
                        <SelectItem value="delivery">
                          <div className="flex items-center">
                            <Truck className="h-4 w-4 mr-2" />
                            Delivery
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Customer</Label>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {fnbCart.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>AED {calculateSubtotal(fnbCart).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tax ({taxRate}%):</span>
                          <span>AED {calculateTax(calculateSubtotal(fnbCart)).toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>AED {calculateTotal(fnbCart).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => clearCart(false)}
                        >
                          Clear
                        </Button>
                        <Button 
                          className="flex-1"
                          onClick={() => processPayment(false)}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          Send to Kitchen
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Queue */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Order Queue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {orderQueue.map((order) => (
                        <Card key={order.id} className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{order.id}</span>
                            <Badge 
                              className={`text-xs ${
                                order.status === 'ready' ? 'bg-green-100 text-green-800' :
                                order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">Customer: {order.customer}</p>
                          <p className="text-xs text-gray-600 mb-2">
                            Items: {order.items.join(", ")}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {order.orderTime} • {order.type}
                            </span>
                            <span className="text-xs font-medium">
                              {order.estimatedTime}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

