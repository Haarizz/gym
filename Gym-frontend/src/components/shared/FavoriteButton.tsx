import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  /** Used only for the accessible label, e.g. "Whey Protein Isolate". */
  productName?: string;
  size?: number;
  className?: string;
}

const SPARKLE_ANGLES = [0, 60, 120, 180, 240, 300];

/**
 * Small circular "add to favorites" heart button meant to overlay a product
 * image (POS product grid). Purely presentational — favorite state and
 * persistence live in useFavorites.
 */
export const FavoriteButton = React.memo(function FavoriteButton({
  isFavorite,
  onToggle,
  productName,
  size = 26,
  className = "",
}: FavoriteButtonProps) {
  const [showSparkles, setShowSparkles] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Clear the sparkle burst after it plays; keyed on isFavorite so this
  // never lingers if the button unmounts mid-animation.
  useEffect(() => {
    if (!showSparkles) return;
    const timer = setTimeout(() => setShowSparkles(false), 450);
    return () => clearTimeout(timer);
  }, [showSparkles]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isFavorite) setShowSparkles(true);
    onToggle();
  };

  const label = isFavorite
    ? `Remove ${productName ?? "product"} from favorites`
    : `Add ${productName ?? "product"} to favorites`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          type="button"
          aria-label={label}
          aria-pressed={isFavorite}
          onClick={handleClick}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className={`relative flex items-center justify-center rounded-full bg-transparent transition-colors duration-150 hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B7A78] focus-visible:ring-offset-1 ${className}`}
          style={{ width: size, height: size }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isFavorite ? "filled" : "outline"}
              initial={{ scale: isFavorite ? 0.6 : 1, opacity: 0.7 }}
              animate={{
                scale: isFavorite ? [1, 1.35, 1] : [1, 0.85, 1],
                opacity: 1,
              }}
              transition={{
                duration: isFavorite ? 0.3 : 0.2,
                ease: "easeOut",
              }}
              className="flex items-center justify-center"
            >
              <Heart
                className="transition-colors duration-150"
                style={{
                  width: size * 0.62,
                  height: size * 0.62,
                  // Halo + shadow combo so the outline reads on both light and dark product photos.
                  filter:
                    "drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                }}
                strokeWidth={2}
                color={isFavorite ? (isHovered ? "#F87171" : "#EF4444") : isHovered ? "#4B5563" : "#6B7280"}
                fill={isFavorite ? (isHovered ? "#F87171" : "#EF4444") : "none"}
              />
            </motion.span>
          </AnimatePresence>

          {/* Sparkle burst on add-to-favorites */}
          <AnimatePresence>
            {showSparkles && (
              <>
                {SPARKLE_ANGLES.map((angle) => {
                  const rad = (angle * Math.PI) / 180;
                  const dx = Math.cos(rad) * (size * 0.8);
                  const dy = Math.sin(rad) * (size * 0.8);
                  return (
                    <motion.span
                      key={angle}
                      className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-[#EF4444]"
                      initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                      animate={{ x: dx, y: dy, opacity: 0, scale: 1.2 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                  );
                })}
              </>
            )}
          </AnimatePresence>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="left">
        {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      </TooltipContent>
    </Tooltip>
  );
});
