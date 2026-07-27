import React from "react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Package, Plus } from "lucide-react";
import { CurrencyValue } from "../../utils/currency";
import { FavoriteButton } from "./FavoriteButton";
import type { Product } from "../../utils/supabase/products-service";

interface POSProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: number) => void;
  onAddToCart: (product: Product) => void;
}

function POSProductCardImpl({ product, isFavorite, onToggleFavorite, onAddToCart }: POSProductCardProps) {
  const imageUrl = product.imageUrls?.[0] || (product as any).imageUrl || (product as any).image_url;
  const stock = product.totalStock ?? (product as any).stock ?? 0;

  return (
    <Card
      className="group flex flex-col cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-150 hover:-translate-y-1 hover:border-[#2B7A78] hover:shadow-lg active:translate-y-0 active:shadow-sm"
      onClick={() => onAddToCart(product)}
    >
      <div className="relative aspect-square bg-gradient-to-br from-[#F9FAFB] to-gray-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <Package className="h-12 w-12 text-[#2B7A78] opacity-30" />
        )}

        {/* Quick-add hint (top-right) */}
        <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#2B7A78] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
          <Plus className="h-4 w-4" />
        </div>

        <Badge
          className={`absolute left-2 top-2 border-0 text-xs ${
            stock > 10 ? 'bg-white/90 text-[#2B7A78]' : stock > 0 ? 'bg-amber-500/95 text-white' : 'bg-[#E63946]/95 text-white'
          }`}
        >
          {stock} left
        </Badge>
      </div>
      <CardContent className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-medium leading-snug text-[#1E293B] line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <p className="mt-1 truncate text-xs text-gray-400">
          {(product.sku || (product as any).code || 'SKU N/A')} • {product.categoryName || 'General'}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="text-lg font-semibold text-[#2B7A78]">
            <CurrencyValue amount={product.sellingPrice ?? (product as any).price ?? 0} />
          </p>
          <FavoriteButton
            isFavorite={isFavorite}
            productName={product.name}
            onToggle={() => onToggleFavorite(product.id)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Only re-render a card when ITS OWN product data or favorite flag changes —
// toggling one product's favorite (or unrelated POS state like the cart)
// must not re-render every other card in the grid.
export const POSProductCard = React.memo(POSProductCardImpl, (prev, next) => {
  return (
    prev.product === next.product &&
    prev.isFavorite === next.isFavorite &&
    prev.onToggleFavorite === next.onToggleFavorite &&
    prev.onAddToCart === next.onAddToCart
  );
});
