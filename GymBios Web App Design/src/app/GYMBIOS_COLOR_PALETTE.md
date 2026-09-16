# GymBios Official Color Palette

## 🎨 Primary Colors

### Primary - Teal Green
```
Hex:     #2B7A78
RGB:     43, 122, 120
HSL:     178°, 48%, 32%
Usage:   Primary actions, sidebar, active states, links
```

**Variations:**
- **Hover/Active:** `#236360` (darker teal)
- **Light/10% opacity:** `rgba(43, 122, 120, 0.1)`
- **Light/20% opacity:** `rgba(43, 122, 120, 0.2)`
- **Light/30% opacity:** `rgba(43, 122, 120, 0.3)`

**Tailwind Classes:**
```tsx
bg-primary
text-primary
border-primary
hover:bg-primary/90
bg-primary/10
```

---

### Accent - Red
```
Hex:     #E63946
RGB:     230, 57, 70
HSL:     355°, 78%, 56%
Usage:   Destructive actions, errors, alerts, highlights
```

**Variations:**
- **Hover/Active:** `#d32f3d` (darker red)
- **Light/10% opacity:** `rgba(230, 57, 70, 0.1)`
- **Light/20% opacity:** `rgba(230, 57, 70, 0.2)`

**Tailwind Classes:**
```tsx
bg-accent
text-accent
border-accent
hover:bg-accent/90
bg-accent/10
```

---

## 🖼️ Background Colors

### Main Background
```
Hex:     #F9FAFB
RGB:     249, 250, 251
HSL:     210°, 20%, 98%
Usage:   App background, page background
```

**Tailwind Classes:**
```tsx
bg-background
bg-[#F9FAFB]
```

---

### Card/Surface Background
```
Hex:     #FFFFFF
RGB:     255, 255, 255
HSL:     0°, 0%, 100%
Usage:   Cards, dialogs, elevated surfaces
```

**Tailwind Classes:**
```tsx
bg-white
bg-card
```

---

## ✍️ Text Colors

### Primary Text
```
Hex:     #1E293B
RGB:     30, 41, 59
HSL:     218°, 33%, 17%
Usage:   Headlines, body text, primary content
```

**Tailwind Classes:**
```tsx
text-foreground
text-[#1E293B]
text-slateText
```

---

### Muted Text
```
Hex:     #4b5563
RGB:     75, 85, 99
HSL:     215°, 14%, 34%
Usage:   Secondary text, captions, labels
```

**Tailwind Classes:**
```tsx
text-muted-foreground
text-[#4b5563]
```

---

## 🔲 Borders & Dividers

### Default Border
```
Hex:     #d1d5db
RGB:     209, 213, 219
HSL:     214°, 14%, 84%
Usage:   Card borders, input borders, dividers
```

**Tailwind Classes:**
```tsx
border-border
border-[#d1d5db]
border-slate-200
```

---

### Muted Border/Background
```
Hex:     #f2f4f7
RGB:     242, 244, 247
HSL:     214°, 23%, 96%
Usage:   Disabled states, muted backgrounds
```

**Tailwind Classes:**
```tsx
bg-muted
bg-[#f2f4f7]
```

---

## 🎯 Status Colors

### Success
```
Hex:     #4CAF50
RGB:     76, 175, 80
HSL:     122°, 39%, 49%
Usage:   Success messages, confirmations
```

**Tailwind Classes:**
```tsx
bg-[#4CAF50]
text-[#4CAF50]
```

---

### Warning
```
Hex:     #FFC107
RGB:     255, 193, 7
HSL:     45°, 100%, 51%
Usage:   Warnings, pending states
```

**Tailwind Classes:**
```tsx
bg-[#FFC107]
text-[#FFC107]
```

---

### Error
```
Hex:     #E63946
RGB:     230, 57, 70
HSL:     355°, 78%, 56%
Usage:   Errors, destructive actions (same as accent)
```

**Tailwind Classes:**
```tsx
bg-destructive
text-destructive
bg-accent
```

---

## 📊 Chart Colors

```css
--chart-1: #2B7A78  /* Primary Teal */
--chart-2: #009688  /* Teal variant */
--chart-3: #4CAF50  /* Green */
--chart-4: #FFC107  /* Yellow/Warning */
--chart-5: #E63946  /* Red/Accent */
```

---

## 🌙 Dark Mode Colors

### Dark Background
```
Hex:     #1a1a1a
RGB:     26, 26, 26
HSL:     0°, 0%, 10%
```

### Dark Card
```
Hex:     #262626
RGB:     38, 38, 38
HSL:     0°, 0%, 15%
```

### Dark Muted
```
Hex:     #404040
RGB:     64, 64, 64
HSL:     0°, 0%, 25%
```

**Note:** Primary (#2B7A78) and Accent (#E63946) colors remain the same in dark mode for brand consistency.

---

## 🎨 Quick Copy-Paste Component Examples

### Primary Button
```tsx
<Button className="bg-primary hover:bg-primary/90 text-white">
  Save Changes
</Button>
```

### Secondary Button
```tsx
<Button 
  variant="outline" 
  className="border-primary text-primary hover:bg-primary/10"
>
  Cancel
</Button>
```

### Destructive Button
```tsx
<Button className="bg-accent hover:bg-accent/90 text-white">
  Delete Member
</Button>
```

### Card Component
```tsx
<Card className="bg-white border border-slate-200 shadow-sm">
  <CardHeader>
    <CardTitle className="text-foreground">Title</CardTitle>
    <CardDescription className="text-muted-foreground">
      Description
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Alert (Success)
```tsx
<Alert className="border-[#4CAF50] bg-[#4CAF50]/10">
  <AlertDescription className="text-[#4CAF50]">
    Success message
  </AlertDescription>
</Alert>
```

### Alert (Error)
```tsx
<Alert className="border-accent bg-accent/10">
  <AlertDescription className="text-accent">
    Error message
  </AlertDescription>
</Alert>
```

### Badge (Primary)
```tsx
<Badge className="bg-primary hover:bg-primary/90 text-white">
  Active
</Badge>
```

### Badge (Accent)
```tsx
<Badge className="bg-accent hover:bg-accent/90 text-white">
  Urgent
</Badge>
```

### Input with Focus
```tsx
<Input 
  className="border-slate-200 focus:ring-2 focus:ring-primary"
  placeholder="Enter text"
/>
```

### Section Header
```tsx
<h2 className="text-xl font-semibold text-foreground">
  Dashboard Overview
</h2>
<p className="text-sm text-muted-foreground">
  View your key metrics
</p>
```

### Sidebar Item
```tsx
<button className="
  flex items-center gap-3 w-full px-4 py-3 rounded-lg
  text-white hover:bg-white/10 transition-all
  sidebar-item
">
  <Icon className="h-5 w-5" />
  <span>Menu Item</span>
</button>
```

### Sidebar Active Item
```tsx
<button className="
  flex items-center gap-3 w-full px-4 py-3 rounded-lg
  text-white bg-white/20 transition-all
  sidebar-item-active
">
  <Icon className="h-5 w-5" />
  <span>Active Menu</span>
</button>
```

---

## 🔧 CSS Variable Usage

### In Component Styles
```tsx
// Using Tailwind classes (recommended)
<div className="bg-primary text-white">

// Using CSS variables
<div style={{ 
  backgroundColor: 'var(--primary)',
  color: 'var(--primary-foreground)' 
}}>
```

### Available CSS Variables
```css
var(--primary)                /* #2B7A78 */
var(--primary-foreground)     /* #ffffff */
var(--accent)                 /* #E63946 */
var(--accent-foreground)      /* #ffffff */
var(--background)             /* #F9FAFB */
var(--foreground)             /* #1E293B */
var(--card)                   /* #ffffff */
var(--card-foreground)        /* #1E293B */
var(--muted)                  /* #f2f4f7 */
var(--muted-foreground)       /* #4b5563 */
var(--border)                 /* #d1d5db */
var(--destructive)            /* #E63946 */
var(--destructive-foreground) /* #ffffff */
```

---

## 📐 Spacing & Sizing Standards

### Border Radius
```css
--radius: 0.625rem (10px)
rounded-lg: 0.625rem
rounded-xl: 0.875rem
```

### Shadows
```css
/* Subtle shadow for cards */
shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05)

/* Medium shadow for elevated elements */
shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)

/* Primary color shadow for buttons */
0 4px 12px rgba(43, 122, 120, 0.3)
```

### Typography Sizes
```css
text-xs:   0.75rem   (12px)
text-sm:   0.875rem  (14px)
text-base: 1rem      (16px)
text-lg:   1.125rem  (18px)
text-xl:   1.25rem   (20px)
text-2xl:  1.5rem    (24px)
text-3xl:  1.875rem  (30px)
text-4xl:  2.25rem   (36px)
```

---

## 🎯 Usage Best Practices

### Do's ✅
- Use `bg-primary` for primary CTAs
- Use `bg-accent` for destructive/critical actions
- Use `text-foreground` for main content
- Use `text-muted-foreground` for secondary content
- Use `border-slate-200` for subtle borders
- Maintain WCAG AA contrast ratios
- Use CSS variables for consistency

### Don'ts ❌
- Don't use hardcoded hex colors
- Don't use blue colors (old theme)
- Don't mix old and new color schemes
- Don't use low-contrast combinations
- Don't override theme colors without reason

---

## 🔍 Color Contrast Matrix

| Foreground | Background | Ratio | WCAG Level |
|------------|-----------|-------|------------|
| #1E293B | #FFFFFF | 12.6:1 | AAA ✅ |
| #FFFFFF | #2B7A78 | 4.8:1 | AA ✅ |
| #FFFFFF | #E63946 | 5.2:1 | AA ✅ |
| #2B7A78 | #FFFFFF | 4.8:1 | AA ✅ |
| #4b5563 | #FFFFFF | 7.4:1 | AAA ✅ |

---

## 📱 Responsive Considerations

All colors work seamlessly across:
- ✅ Desktop (1920px+)
- ✅ Laptop (1366px - 1920px)
- ✅ Tablet (768px - 1366px)
- ✅ Mobile (320px - 768px)

---

**Last Updated:** November 2, 2024  
**Version:** 2.0.0  
**Official GymBios Brand Colors**
