import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import {
  Package,
  Upload,
  BarChart3,
  Printer,
  RefreshCw,
  Plus,
  X,
  Save,
  FileText,
  Image as ImageIcon,
  Palette,
  Calculator,
  Archive,
  ChevronDown,
  ChevronUp,
  Eye,
  Copy,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Zap,
  Grid3X3,
  Hash,
  Tags,
  Layers,
  Warehouse,
  DollarSign,
  Percent,
  ChefHat,
  ShoppingCart,
  Box,
  Ruler,
  Palette as PaletteIcon,
  Shirt,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import { productsService, Warehouse as WarehouseType, ProductCategory } from "../utils/supabase/products-service";
import QRCode from "react-qr-code";
import JsBarcode from "jsbarcode";

// Types
interface ProductUnit {
  id: string;
  unit: string;
  conversionFactor: number;
  costPrice: number;
  sellingPrice: number;
  barcode: string;
}

interface RecipeIngredient {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  costImpact: number;
}

interface ProductVariant {
  id: string;
  variantName: string;
  sku: string;
  barcode: string;
  price: number;
  stock: number;
  image?: string;
  attributes: Record<string, string>;
}

interface ProductAttribute {
  id: string;
  name: string;
  values: string[];
}

interface AddProductProps {
  onNavigate?: (section: string, params?: Record<string, any>) => void;
}

export function AddProduct({ onNavigate }: AddProductProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const productId = (location.state as { productId?: number } | null)?.productId;
  const isEditMode = !!productId;

  const [activeTab, setActiveTab] = useState("basic-info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  // Basic Product Information
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Product Images
  const [productImages, setProductImages] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Barcode Settings
  const [barcodeTemplate, setBarcodeTemplate] = useState("");
  const [generatedBarcode, setGeneratedBarcode] = useState("");
  const [barcodeSvgNode, setBarcodeSvgNode] = useState<SVGSVGElement | null>(null);
  const barcodeSvgRef = useCallback((node: SVGSVGElement | null) => {
    setBarcodeSvgNode(node);
  }, []);
  const qrContainerRef = useRef<HTMLDivElement | null>(null);
  const blobUrlsRef = useRef<string[]>([]);

  // Pricing & Multi-Unit Setup
  const [defaultUnit, setDefaultUnit] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);

  // Recipe / Production Formula
  const [isManufactured, setIsManufactured] = useState(false);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  // Item Variants & Attributes
  const [hasVariants, setHasVariants] = useState(false);
  const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);

  // Inventory & Stock Settings
  const [openingStock, setOpeningStock] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [supplier, setSupplier] = useState("");

  // Collapsible states
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // API data
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  const resolveImageUrl = useCallback((url: string) => {
    if (!url) return "";
    if (url.startsWith("data:") || url.startsWith("http") || url.startsWith("blob:")) return url;
    const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    if (!base) return url;
    const baseNoApi = base.endsWith("/api") ? base.slice(0, -4) : base;
    const resolvedBase = url.startsWith("/") && base.endsWith("/api") ? baseNoApi : base;
    return url.startsWith("/") ? `${resolvedBase}${url}` : `${resolvedBase}/${url}`;
  }, []);

  const brands = [
    "Optimum Nutrition", "BSN", "MuscleTech", "Dymatize", "Gold Standard", "MyProtein", "House Brand"
  ];

  const barcodeTemplates = [
    "Code 128", "Code 39", "EAN-13", "UPC-A", "QR Code"
  ];

  const units = [
    "Piece", "Box", "Bottle", "Pack", "Kg", "Gram", "Liter", "ML", "Dozen", "Pair"
  ];

  const attributeTypes = [
    { id: "color", name: "Color", values: ["Red", "Blue", "Green", "Black", "White", "Yellow", "Purple", "Orange"] },
    { id: "size", name: "Size", values: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] },
    { id: "material", name: "Material", values: ["Cotton", "Polyester", "Blend", "Nylon", "Spandex"] },
    { id: "flavor", name: "Flavor", values: ["Vanilla", "Chocolate", "Strawberry", "Banana", "Unflavored"] },
    { id: "weight", name: "Weight", values: ["1kg", "2kg", "5kg", "10kg"] },
  ];

  // Load warehouses and categories on mount
  useEffect(() => {
    const loadMeta = async () => {
      setIsLoadingMeta(true);
      try {
        const [warehouseData, categoryData] = await Promise.all([
          productsService.getActiveWarehouses(),
          productsService.getCategories(),
        ]);
        setWarehouses(warehouseData);
        setCategories(categoryData);
      } catch (error) {
        console.error('Failed to load warehouses/categories:', error);
        toast.error('Failed to load form data. Please refresh the page.');
      } finally {
        setIsLoadingMeta(false);
      }
    };
    loadMeta();
  }, []);

  // Load product data in edit mode
  useEffect(() => {
    if (!isEditMode || !productId) return;

    const loadProduct = async () => {
      setIsLoadingProduct(true);
      try {
        const product = await productsService.getProductById(productId);

        setProductName(product.name || "");
        setSku(product.sku || "");
        setSelectedCategory(product.categoryId ? String(product.categoryId) : "");
        setSelectedBrand(product.brand || "");
        setDescription(product.description || "");
        setIsActive(product.isActive ?? true);
        setProductImages(product.imageUrls || []);
        setBarcodeTemplate(product.barcodeTemplate || (product.barcode ? "Code 128" : ""));
        setGeneratedBarcode(product.barcode || "");
        setDefaultUnit(product.defaultUnit || "");
        setDefaultPrice(product.sellingPrice ? String(product.sellingPrice) : "");
        setCostPrice(product.costPrice ? String(product.costPrice) : "");
        setTaxRate(product.taxRate ? String(product.taxRate) : "0");
        setIsManufactured(product.isManufactured ?? false);
        setHasVariants(product.hasVariants ?? false);
        setSupplier(product.supplier || "");

        // Inventory
        const firstStock = product.stockByWarehouse?.[0];
        if (firstStock) {
          setOpeningStock(String(firstStock.openingStock || 0));
          setReorderLevel(String(firstStock.reorderLevel || 0));
          setSelectedWarehouseId(String(firstStock.warehouseId));
        }

        // Load product units
        if (product.units && product.units.length > 0) {
          setProductUnits(product.units.map((u: any) => ({
            id: String(u.id || Date.now() + Math.random()),
            unit: u.unit || "",
            conversionFactor: u.conversionFactor ?? 1,
            costPrice: u.costPrice ?? 0,
            sellingPrice: u.sellingPrice ?? 0,
            barcode: u.barcode || "",
          })));
        }
      } catch (error) {
        console.error('Failed to load product:', error);
        toast.error('Failed to load product data. Please try again.');
      } finally {
        setIsLoadingProduct(false);
      }
    };

    loadProduct();
  }, [isEditMode, productId]);

  // Revoke all blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Event Handlers
  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 5MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Create blob URLs synchronously for immediate preview
    const previews = validFiles.map((f) => URL.createObjectURL(f));

    setProductImages((prev) => {
      const available = 10 - prev.length;
      if (available <= 0) {
        previews.forEach((url) => URL.revokeObjectURL(url));
        toast.warning("Maximum 10 images allowed.");
        return prev;
      }
      const toAdd = previews.slice(0, available);
      // Revoke any excess blob URLs immediately
      previews.slice(available).forEach((url) => URL.revokeObjectURL(url));
      if (toAdd.length < validFiles.length) {
        toast.warning(`Only ${toAdd.length} image(s) added. Maximum 10 allowed.`);
      } else {
        toast.success(`${toAdd.length} image(s) added`);
      }
      blobUrlsRef.current.push(...toAdd);
      return [...prev, ...toAdd];
    });

    // Convert to base64 in background so the backend can persist the image data
    validFiles.forEach((file, i) => {
      const blobUrl = previews[i];
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string | undefined;
        if (!base64) return;
        setProductImages((curr) => {
          const idx = curr.indexOf(blobUrl);
          if (idx === -1) return curr; // already removed by user
          const next = [...curr];
          next[idx] = base64;
          return next;
        });
        URL.revokeObjectURL(blobUrl);
        blobUrlsRef.current = blobUrlsRef.current.filter((u) => u !== blobUrl);
      };
      reader.onerror = () => {
        setProductImages((curr) => curr.filter((u) => u !== blobUrl));
        URL.revokeObjectURL(blobUrl);
        blobUrlsRef.current = blobUrlsRef.current.filter((u) => u !== blobUrl);
        toast.error(`Failed to read ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleImageUpload(e.dataTransfer.files);
  };

  useEffect(() => {
    setImageErrors({});
  }, [productImages.length]);

  const barcodeFormat = useMemo(() => {
    switch (barcodeTemplate) {
      case "Code 128":
        return "CODE128";
      case "Code 39":
        return "CODE39";
      case "EAN-13":
        return "EAN13";
      case "UPC-A":
        return "UPC";
      default:
        return "CODE128";
    }
  }, [barcodeTemplate]);

  const qrPayload = useMemo(() => {
    const payload: Record<string, string> = {};
    if (productName) payload.name = productName;
    if (sku) payload.sku = sku;
    if (generatedBarcode) payload.barcode = generatedBarcode;
    if (defaultPrice) payload.price = defaultPrice;
    if (selectedCategory) payload.categoryId = selectedCategory;
    return JSON.stringify(payload);
  }, [productName, sku, generatedBarcode, defaultPrice, selectedCategory]);

  const generateBarcode = () => {
    if (!barcodeTemplate) {
      toast.error("Please select a barcode template first");
      return;
    }

    let newBarcode = "";

    switch (barcodeTemplate) {
      case "Code 128":
      case "Code 39":
        newBarcode = `${(sku || "PRD").toUpperCase()}${Date.now().toString().slice(-6)}`;
        break;
      case "EAN-13": {
        newBarcode = `${Math.floor(Math.random() * 1000000000000)}`.padStart(12, '0');
        const checkDigit = newBarcode.split('').reduce((sum, digit, index) => {
          return sum + parseInt(digit) * (index % 2 === 0 ? 1 : 3);
        }, 0) % 10;
        newBarcode += (10 - checkDigit) % 10;
        break;
      }
      case "UPC-A": {
        const upcBase = `${Math.floor(Math.random() * 100000000000)}`.padStart(11, '0');
        const sum = upcBase.split('').reduce((acc, digit, index) => {
          const n = parseInt(digit, 10);
          return acc + (index % 2 === 0 ? n * 3 : n);
        }, 0);
        const checkDigit = (10 - (sum % 10)) % 10;
        newBarcode = `${upcBase}${checkDigit}`;
        break;
      }
      case "QR Code":
        newBarcode = `${sku || "PRD"}-${Date.now()}`;
        break;
      default:
        newBarcode = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    }

    setGeneratedBarcode(newBarcode);
    toast.success(`${barcodeTemplate} barcode generated successfully!`);
  };

  // Render barcode whenever the SVG element mounts or barcode value/format changes
  useEffect(() => {
    if (!barcodeSvgNode) return;
    if (!generatedBarcode) return;
    if (barcodeTemplate === "QR Code") return;
    try {
      JsBarcode(barcodeSvgNode, generatedBarcode, {
        format: barcodeFormat,
        displayValue: true,
        lineColor: "#111827",
        background: "#ffffff",
        height: 60,
        width: 2,
        margin: 8,
        fontSize: 12,
      });
    } catch (error) {
      console.error("Failed to render barcode:", error);
      toast.error("Barcode format not supported for this value.");
    }
  }, [barcodeSvgNode, generatedBarcode, barcodeFormat, barcodeTemplate]);

  const printBarcode = () => {
    if (!generatedBarcode) {
      toast.error("Please generate a barcode first");
      return;
    }

    const isQr = barcodeTemplate === "QR Code";
    const qrSvg = qrContainerRef.current?.querySelector("svg");
    const svgMarkup = isQr
      ? qrSvg?.outerHTML
      : barcodeSvgNode?.outerHTML;

    if (!svgMarkup) {
      toast.error("Barcode not ready to print yet");
      return;
    }

    const printWindow = window.open('', '_blank', 'width=420,height=360');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Barcode - ${productName || 'Product'}</title></head>
          <body style="text-align:center;font-family:system-ui, sans-serif;padding:20px;">
            <h3 style="margin:0 0 8px;">${productName || 'Product'}</h3>
            <div style="display:flex;justify-content:center;margin:12px 0;">
              ${svgMarkup}
            </div>
            <p style="font-family:monospace;font-size:14px;margin:6px 0;">${isQr ? qrPayload : generatedBarcode}</p>
            ${sku ? `<p style="margin:4px 0;">SKU: ${sku}</p>` : ''}
            <p style="font-size:12px;color:#666;margin:4px 0;">Template: ${barcodeTemplate}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }

    toast.success(`Printing ${barcodeTemplate} barcode: ${generatedBarcode}`);
  };

  const addProductUnit = () => {
    const newUnit: ProductUnit = {
      id: Date.now().toString(),
      unit: "",
      conversionFactor: 1,
      costPrice: 0,
      sellingPrice: 0,
      barcode: "",
    };
    setProductUnits([...productUnits, newUnit]);
  };

  const updateProductUnit = (id: string, field: keyof ProductUnit, value: any) => {
    setProductUnits(prev =>
      prev.map(unit =>
        unit.id === id ? { ...unit, [field]: value } : unit
      )
    );
  };

  const removeProductUnit = (id: string) => {
    setProductUnits(prev => prev.filter(unit => unit.id !== id));
  };

  const addRecipeIngredient = () => {
    const newIngredient: RecipeIngredient = {
      id: Date.now().toString(),
      productId: "",
      productName: "",
      quantity: 0,
      unit: "",
      costImpact: 0,
    };
    setRecipeIngredients([...recipeIngredients, newIngredient]);
  };

  const updateRecipeIngredient = (id: string, field: keyof RecipeIngredient, value: any) => {
    setRecipeIngredients(prev =>
      prev.map(ingredient =>
        ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
      )
    );

    const newTotal = recipeIngredients.reduce((sum, ingredient) => sum + ingredient.costImpact, 0);
    setTotalCost(newTotal);
  };

  const removeRecipeIngredient = (id: string) => {
    setRecipeIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
  };

  const addAttribute = () => {
    const newAttribute: ProductAttribute = {
      id: Date.now().toString(),
      name: "",
      values: [],
    };
    setProductAttributes([...productAttributes, newAttribute]);
  };

  const updateAttribute = (id: string, field: keyof ProductAttribute, value: any) => {
    setProductAttributes(prev =>
      prev.map(attr =>
        attr.id === id ? { ...attr, [field]: value } : attr
      )
    );
  };

  const removeAttribute = (id: string) => {
    setProductAttributes(prev => prev.filter(attr => attr.id !== id));
  };

  const generateVariants = () => {
    if (productAttributes.length === 0) {
      toast.error("Please add attributes first");
      return;
    }

    const combinations: ProductVariant[] = [];
    const generate = (current: Record<string, string>, index: number) => {
      if (index === productAttributes.length) {
        const variantName = Object.values(current).join(" / ");
        combinations.push({
          id: Date.now().toString() + combinations.length,
          variantName,
          sku: `${sku}-${combinations.length + 1}`,
          barcode: "",
          price: parseFloat(defaultPrice) || 0,
          stock: 0,
          attributes: { ...current },
        });
        return;
      }

      const attribute = productAttributes[index];
      attribute.values.forEach(value => {
        generate({ ...current, [attribute.name]: value }, index + 1);
      });
    };

    generate({}, 0);
    setProductVariants(combinations);
    toast.success(`Generated ${combinations.length} variants`);
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const resetForm = () => {
    setProductName("");
    setSku("");
    setSelectedCategory("");
    setSelectedBrand("");
    setDescription("");
    setIsActive(true);
    setProductImages([]);
    setBarcodeTemplate("");
    setGeneratedBarcode("");
    setDefaultPrice("");
    setCostPrice("");
    setTaxRate("0");
    setProductUnits([]);
    setIsManufactured(false);
    setRecipeIngredients([]);
    setHasVariants(false);
    setProductVariants([]);
    setProductAttributes([]);
    setOpeningStock("");
    setReorderLevel("");
    setSelectedWarehouseId("");
    setSupplier("");
    setActiveTab("basic-info");
  };

  const goBack = () => {
    if (onNavigate) {
      onNavigate('products');
    } else {
      navigate('/products');
    }
  };

  const handleSave = async (saveAndNew = false) => {
    // Validation
    if (!productName.trim()) {
      toast.error("Product name is required");
      setActiveTab("basic-info");
      return;
    }

    if (!selectedCategory) {
      toast.error("Category is required");
      setActiveTab("basic-info");
      return;
    }

    if (!defaultPrice || isNaN(parseFloat(defaultPrice))) {
      toast.error("Selling price is required");
      setActiveTab("pricing-units");
      return;
    }

    if (!selectedWarehouseId) {
      toast.error("Please select a warehouse");
      setActiveTab("inventory-stock");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: productName.trim(),
        categoryId: parseInt(selectedCategory, 10),
        brand: selectedBrand || undefined,
        description: description || undefined,
        isActive,
        hasVariants,
        hasRecipe: recipeIngredients.length > 0,
        isManufactured,
        imageUrls: productImages.filter(Boolean),
        barcode: generatedBarcode || undefined,
        barcodeTemplate: barcodeTemplate || (generatedBarcode ? "Code 128" : undefined),
        defaultUnit: defaultUnit || undefined,
        sellingPrice: parseFloat(defaultPrice),
        costPrice: costPrice ? parseFloat(costPrice) : 0,
        taxRate: taxRate ? parseFloat(taxRate) : 0,
        supplier: supplier || undefined,
        openingStock: openingStock ? parseInt(openingStock, 10) : 0,
        reorderLevel: reorderLevel ? parseInt(reorderLevel, 10) : 0,
        warehouseId: parseInt(selectedWarehouseId, 10),
        units: productUnits.map(u => ({
          unit: u.unit || undefined,
          conversionFactor: u.conversionFactor || 1,
          costPrice: u.costPrice || 0,
          sellingPrice: u.sellingPrice || 0,
          barcode: u.barcode || undefined,
        })),
      };

      if (isEditMode && productId) {
        await productsService.updateProduct(productId, payload);
        toast.success(`Product "${productName}" updated successfully!`);
      } else {
        await productsService.createProduct(payload);
        toast.success(`Product "${productName}" saved successfully!`);
      }

      if (saveAndNew) {
        resetForm();
      } else {
        goBack();
      }
    } catch (error) {
      console.error('Save product error:', error);
      toast.error(isEditMode ? 'Failed to update product' : 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    goBack();
  };

  if (isLoadingProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading product data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary rounded-lg p-2">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {isEditMode ? 'Edit Product' : 'Add New Product'}
              </h1>
              <p className="text-sm text-gray-600">
                {isEditMode
                  ? 'Update product details'
                  : 'Create a new product with complete details and variants'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            {!isEditMode && (
              <Button
                variant="outline"
                onClick={() => handleSave(true)}
                disabled={isSubmitting || isLoadingMeta}
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Save & New
              </Button>
            )}
            <Button
              onClick={() => handleSave(false)}
              disabled={isSubmitting || isLoadingMeta}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditMode ? 'Update Product' : 'Save Product'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="basic-info" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Basic Info</span>
            </TabsTrigger>
            <TabsTrigger value="images-barcode" className="flex items-center space-x-2">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Images & Barcode</span>
            </TabsTrigger>
            <TabsTrigger value="pricing-units" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Pricing & Units</span>
            </TabsTrigger>
            <TabsTrigger value="recipe-production" className="flex items-center space-x-2">
              <ChefHat className="h-4 w-4" />
              <span className="hidden sm:inline">Recipe</span>
            </TabsTrigger>
            <TabsTrigger value="variants-attributes" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Variants</span>
            </TabsTrigger>
            <TabsTrigger value="inventory-stock" className="flex items-center space-x-2">
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}

          {/* Basic Product Information */}
          <TabsContent value="basic-info">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Basic Product Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="product-name">Product Name *</Label>
                    <Input
                      id="product-name"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Enter product name"
                      className="input-focus"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU / Product Code</Label>
                    <Input
                      id="sku"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Enter SKU or product code"
                      className="input-focus"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingMeta ? "Loading categories..." : "Select category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Enter supplier name"
                    className="input-focus"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter product description"
                    rows={4}
                    className="input-focus"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="status"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="status">Active Status</Label>
                  <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-success" : ""}>
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images & Barcode */}
          <TabsContent value="images-barcode">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Images */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <span>Product Images</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragOver ? 'border-primary bg-primary/5' : 'border-gray-300'
                    } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {isUploading ? (
                      <div className="space-y-3">
                        <RefreshCw className="h-8 w-8 text-primary mx-auto animate-spin" />
                        <p className="text-sm text-gray-600">Uploading images...</p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500">{Math.round(uploadProgress)}% complete</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          Drag & drop images here, or{" "}
                          <label className="text-primary cursor-pointer hover:underline">
                            browse
                            <input
                              type="file"
                              multiple
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e.target.files)}
                            />
                          </label>
                        </p>
                        <p className="text-xs text-gray-500">
                          Support for JPG, PNG, GIF, WebP (Max 5MB each, up to 10 images)
                        </p>
                      </>
                    )}
                  </div>

                  {/* Image Preview */}
                  {productImages.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Uploaded Images ({productImages.length}/10)</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProductImages([])}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Clear All
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {productImages.map((image, index) => {
                          const resolvedImage = resolveImageUrl(image);
                          return (
                          <div key={index} className="relative group">
                            <div className="w-full h-20 rounded-lg border shadow-sm bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                              {(!resolvedImage || imageErrors[index]) ? (
                                <ImageIcon className="h-6 w-6" />
                              ) : (
                                <img
                                  src={resolvedImage}
                                  alt={`Product ${index + 1}`}
                                  onError={() => setImageErrors(prev => ({ ...prev, [index]: true }))}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all duration-200 flex items-center justify-center">
                              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    if (!resolvedImage || imageErrors[index]) return;
                                    setPreviewImage(resolvedImage);
                                    setIsPreviewOpen(true);
                                  }}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 w-7 p-0"
                                  onClick={() => setProductImages(prev => prev.filter((_, i) => i !== index))}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {index === 0 && (
                              <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs bg-primary">
                                Primary
                              </Badge>
                            )}
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Product Image Preview</DialogTitle>
                    <DialogDescription>View the full-size image without leaving the page.</DialogDescription>
                  </DialogHeader>
                  <div className="bg-slate-50 rounded-lg border p-4 flex items-center justify-center min-h-[320px]">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt="Product preview"
                        className="max-h-[480px] w-auto object-contain"
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">No image selected.</div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Barcode Settings */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <span>Barcode Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="barcode-template">Barcode Template</Label>
                    <Select value={barcodeTemplate} onValueChange={setBarcodeTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select barcode template" />
                      </SelectTrigger>
                      <SelectContent>
                        {barcodeTemplates.map((template) => (
                          <SelectItem key={template} value={template}>
                            <div className="flex items-center space-x-2">
                              <Hash className="h-4 w-4" />
                              <span>{template}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Choose the appropriate barcode format for your business needs
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={generateBarcode}
                      disabled={!barcodeTemplate}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={printBarcode}
                      disabled={!generatedBarcode}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                  </div>

                  {barcodeTemplate && !generatedBarcode && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-xs text-blue-800">
                          <p className="font-medium">Template: {barcodeTemplate}</p>
                          <p className="mt-1">
                            {barcodeTemplate === "EAN-13" && "13-digit European Article Number"}
                            {barcodeTemplate === "UPC-A" && "12-digit Universal Product Code"}
                            {barcodeTemplate === "Code 128" && "High-density linear barcode"}
                            {barcodeTemplate === "Code 39" && "Alphanumeric barcode standard"}
                            {barcodeTemplate === "QR Code" && "2D matrix barcode with high data capacity"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {generatedBarcode && (
                    <div className="space-y-3">
                      <div className="bg-gray-50 border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium text-gray-900">Generated Barcode:</Label>
                          <Badge variant="secondary" className="text-xs">
                            {barcodeTemplate}
                          </Badge>
                        </div>

                        {/* Barcode Visual Representation */}
                        <div className="bg-white border rounded p-3 mb-3 text-center">
                          {barcodeTemplate === "QR Code" ? (
                            <div ref={qrContainerRef} className="flex justify-center">
                              <QRCode value={qrPayload} size={140} />
                            </div>
                          ) : (
                            <div className="flex justify-center overflow-x-auto">
                              <svg ref={barcodeSvgRef} />
                            </div>
                          )}
                        </div>

                        <div className="font-mono text-sm flex items-center justify-between bg-white border rounded p-2">
                          <span className="text-gray-900">{generatedBarcode}</span>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => {
                                navigator.clipboard.writeText(generatedBarcode);
                                toast.success("Barcode copied to clipboard");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={generateBarcode}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Barcode ready for printing and scanning</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pricing & Multi-Unit Setup */}
          <TabsContent value="pricing-units">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span>Pricing & Multi-Unit Setup</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Default Unit & Price */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-unit">Default Unit</Label>
                    <Select value={defaultUnit} onValueChange={setDefaultUnit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-price">Selling Price (AED) *</Label>
                    <Input
                      id="default-price"
                      type="number"
                      step="0.01"
                      value={defaultPrice}
                      onChange={(e) => setDefaultPrice(e.target.value)}
                      placeholder="0.00"
                      className="input-focus"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cost-price">Cost Price (AED)</Label>
                    <Input
                      id="cost-price"
                      type="number"
                      step="0.01"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="0.00"
                      className="input-focus"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                    <Input
                      id="tax-rate"
                      type="number"
                      step="0.01"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      placeholder="0"
                      className="input-focus"
                    />
                  </div>
                </div>

                <Button onClick={addProductUnit} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Additional Unit
                </Button>

                {/* Multiple Units Table */}
                {productUnits.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">Multiple Units</h3>
                      <Badge variant="secondary">{productUnits.length} units</Badge>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="table-header">Unit</TableHead>
                            <TableHead className="table-header">Conversion Factor</TableHead>
                            <TableHead className="table-header">Cost Price (AED)</TableHead>
                            <TableHead className="table-header">Selling Price (AED)</TableHead>
                            <TableHead className="table-header">Barcode</TableHead>
                            <TableHead className="table-header">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productUnits.map((unit) => (
                            <TableRow key={unit.id}>
                              <TableCell>
                                <Select
                                  value={unit.unit}
                                  onValueChange={(value) => updateProductUnit(unit.id, "unit", value)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {units.map((u) => (
                                      <SelectItem key={u} value={u}>
                                        {u}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={unit.conversionFactor}
                                  onChange={(e) => updateProductUnit(unit.id, "conversionFactor", parseFloat(e.target.value))}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={unit.costPrice}
                                  onChange={(e) => updateProductUnit(unit.id, "costPrice", parseFloat(e.target.value))}
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={unit.sellingPrice}
                                  onChange={(e) => updateProductUnit(unit.id, "sellingPrice", parseFloat(e.target.value))}
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={unit.barcode}
                                  onChange={(e) => updateProductUnit(unit.id, "barcode", e.target.value)}
                                  placeholder="Barcode"
                                  className="w-32"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeProductUnit(unit.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recipe / Production Formula */}
          <TabsContent value="recipe-production">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ChefHat className="h-5 w-5 text-primary" />
                  <span>Recipe / Production Formula</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-manufactured"
                    checked={isManufactured}
                    onCheckedChange={(checked) => setIsManufactured(!!checked)}
                  />
                  <Label htmlFor="is-manufactured">
                    This product is manufactured (requires recipe)
                  </Label>
                </div>

                {isManufactured && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Recipe Ingredients</h3>
                      <Button onClick={addRecipeIngredient} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Ingredient
                      </Button>
                    </div>

                    {recipeIngredients.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="table-header">Ingredient (Product)</TableHead>
                              <TableHead className="table-header">Quantity</TableHead>
                              <TableHead className="table-header">Unit</TableHead>
                              <TableHead className="table-header">Cost Impact (AED)</TableHead>
                              <TableHead className="table-header">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recipeIngredients.map((ingredient) => (
                              <TableRow key={ingredient.id}>
                                <TableCell>
                                  <Input
                                    value={ingredient.productName}
                                    onChange={(e) => updateRecipeIngredient(ingredient.id, "productName", e.target.value)}
                                    placeholder="Select ingredient"
                                    className="w-full"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={ingredient.quantity}
                                    onChange={(e) => updateRecipeIngredient(ingredient.id, "quantity", parseFloat(e.target.value))}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={ingredient.unit}
                                    onValueChange={(value) => updateRecipeIngredient(ingredient.id, "unit", value)}
                                  >
                                    <SelectTrigger className="w-24">
                                      <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {units.map((unit) => (
                                        <SelectItem key={unit} value={unit}>
                                          {unit}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={ingredient.costImpact}
                                    onChange={(e) => updateRecipeIngredient(ingredient.id, "costImpact", parseFloat(e.target.value))}
                                    className="w-24"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeRecipeIngredient(ingredient.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Total Recipe Cost:</span>
                        <span className="text-lg font-semibold text-primary">
                          {totalCost.toFixed(2)} AED
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Item Variants & Attributes */}
          <TabsContent value="variants-attributes">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <span>Item Variants & Attributes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has-variants"
                    checked={hasVariants}
                    onCheckedChange={(checked) => setHasVariants(!!checked)}
                  />
                  <Label htmlFor="has-variants">
                    Item with Variants (sizes, colors, etc.)
                  </Label>
                </div>

                {hasVariants && (
                  <div className="space-y-6">
                    {/* Attributes Configuration */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">Product Attributes</h3>
                        <Button onClick={addAttribute} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Attribute
                        </Button>
                      </div>

                      {productAttributes.length > 0 && (
                        <div className="space-y-3">
                          {productAttributes.map((attribute) => (
                            <div key={attribute.id} className="border rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label>Attribute Name</Label>
                                  <Select
                                    value={attribute.name}
                                    onValueChange={(value) => {
                                      const selectedType = attributeTypes.find(t => t.name === value);
                                      updateAttribute(attribute.id, "name", value);
                                      if (selectedType) {
                                        updateAttribute(attribute.id, "values", selectedType.values);
                                      }
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select attribute" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {attributeTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.name}>
                                          {type.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Values</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {attribute.values.map((value, index) => (
                                      <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                                        <span>{value}</span>
                                        <button
                                          onClick={() => {
                                            const newValues = attribute.values.filter((_, i) => i !== index);
                                            updateAttribute(attribute.id, "values", newValues);
                                          }}
                                          className="ml-1 text-red-500 hover:text-red-700"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAttribute(attribute.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Generate Variants */}
                    {productAttributes.length > 0 && (
                      <div>
                        <Button onClick={generateVariants} className="w-full">
                          <Zap className="h-4 w-4 mr-2" />
                          Auto-Generate Variant Combinations
                        </Button>
                      </div>
                    )}

                    {/* Variants Table */}
                    {productVariants.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium">Product Variants</h3>
                          <Badge variant="secondary">{productVariants.length} variants</Badge>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="table-header">Variant</TableHead>
                                <TableHead className="table-header">SKU</TableHead>
                                <TableHead className="table-header">Barcode</TableHead>
                                <TableHead className="table-header">Price (AED)</TableHead>
                                <TableHead className="table-header">Stock</TableHead>
                                <TableHead className="table-header">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {productVariants.map((variant) => (
                                <TableRow key={variant.id}>
                                  <TableCell className="font-medium">{variant.variantName}</TableCell>
                                  <TableCell>
                                    <Input
                                      value={variant.sku}
                                      onChange={(e) => {
                                        setProductVariants(prev =>
                                          prev.map(v =>
                                            v.id === variant.id ? { ...v, sku: e.target.value } : v
                                          )
                                        );
                                      }}
                                      className="w-32"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={variant.barcode}
                                      onChange={(e) => {
                                        setProductVariants(prev =>
                                          prev.map(v =>
                                            v.id === variant.id ? { ...v, barcode: e.target.value } : v
                                          )
                                        );
                                      }}
                                      placeholder="Barcode"
                                      className="w-32"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={variant.price}
                                      onChange={(e) => {
                                        setProductVariants(prev =>
                                          prev.map(v =>
                                            v.id === variant.id ? { ...v, price: parseFloat(e.target.value) } : v
                                          )
                                        );
                                      }}
                                      className="w-24"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      value={variant.stock}
                                      onChange={(e) => {
                                        setProductVariants(prev =>
                                          prev.map(v =>
                                            v.id === variant.id ? { ...v, stock: parseInt(e.target.value) } : v
                                          )
                                        );
                                      }}
                                      className="w-20"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setProductVariants(prev => prev.filter(v => v.id !== variant.id));
                                      }}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory & Stock Settings */}
          <TabsContent value="inventory-stock">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Archive className="h-5 w-5 text-primary" />
                  <span>Inventory & Stock Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="opening-stock">Opening Stock</Label>
                    <Input
                      id="opening-stock"
                      type="number"
                      value={openingStock}
                      onChange={(e) => setOpeningStock(e.target.value)}
                      placeholder="0"
                      className="input-focus"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reorder-level">Reorder Level</Label>
                    <Input
                      id="reorder-level"
                      type="number"
                      value={reorderLevel}
                      onChange={(e) => setReorderLevel(e.target.value)}
                      placeholder="0"
                      className="input-focus"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warehouse">Warehouse / Location *</Label>
                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingMeta ? "Loading warehouses..." : "Select warehouse"} />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Inventory Management</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Opening stock will be automatically added to the selected warehouse.
                        Reorder level helps trigger low stock alerts when inventory falls below this threshold.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Stock Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-semibold text-primary">
                        {openingStock || "0"}
                      </div>
                      <div className="text-sm text-gray-600">Opening Stock</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-semibold text-warning">
                        {reorderLevel || "0"}
                      </div>
                      <div className="text-sm text-gray-600">Reorder Level</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-semibold text-success">
                        {productVariants.length || "1"}
                      </div>
                      <div className="text-sm text-gray-600">SKU Count</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-semibold text-secondary">
                        {selectedWarehouseId ? "1" : "0"}
                      </div>
                      <div className="text-sm text-gray-600">Warehouse</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
