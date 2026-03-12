# GymBios Color Theme Guide

## 🎨 Official Color Palette

### Primary Colors

#### Teal Green (Primary Brand Color)
- **Hex**: `#2B7A78`
- **Usage**: Primary buttons, links, active states, brand elements
- **CSS Variable**: `--gymbios-primary`
- **Tailwind**: `bg-primary`, `text-primary`, `border-primary`

#### Red (Accent/CTA Color)
- **Hex**: `#E63946`
- **Usage**: Call-to-action buttons, destructive actions, alerts, important highlights
- **CSS Variable**: `--gymbios-accent` / `--destructive`
- **Tailwind**: `bg-accent`, `text-accent`, `bg-destructive`

### Background Colors

#### Light Background
- **Hex**: `#F9FAFB`
- **Usage**: Main application background, subtle container backgrounds
- **CSS Variable**: `--background` / `--gymbios-main-bg`
- **Tailwind**: `bg-background`

#### White
- **Hex**: `#FFFFFF`
- **Usage**: Cards, modals, input fields, overlays
- **CSS Variable**: `--card` / `--gymbios-white`
- **Tailwind**: `bg-white`, `bg-card`

### Text Colors

#### Dark Slate (Primary Text)
- **Hex**: `#1E293B`
- **Usage**: Headings, primary text, labels
- **CSS Variable**: `--foreground` / `--gymbios-heading`
- **Tailwind**: `text-foreground`

#### Medium Gray (Body Text)
- **Hex**: `#64748b`
- **Usage**: Secondary text, descriptions, muted content
- **CSS Variable**: `--gymbios-body` / `--muted-foreground`
- **Tailwind**: `text-muted-foreground`

---

## 🎭 Color Variations & Shades

### Primary Teal Variations
```css
--gymbios-primary: #2B7A78          /* Base */
--gymbios-primary-hover: #1d5856    /* Darker - Hover state */
--gymbios-secondary-hover: #134543  /* Darkest - Active state */
```

### Gradients
```css
/* Primary Teal Gradient */
--gymbios-gradient: linear-gradient(135deg, #2B7A78 0%, #1d5856 100%);

/* Hover Gradient (Darker) */
--gymbios-gradient-hover: linear-gradient(135deg, #1d5856 0%, #134543 100%);

/* Light Gradient (10% opacity) */
--gymbios-gradient-light: linear-gradient(135deg, rgba(43, 122, 120, 0.1) 0%, rgba(29, 88, 86, 0.1) 100%);
```

### Accent Red Variations
```css
--gymbios-accent: #E63946           /* Base */
--gymbios-error: #E63946            /* Error/Destructive */
Hover: #d62839                      /* Darker red for hover */
```

---

## 🔧 Usage Examples

### Buttons

#### Primary Button (Teal)
```jsx
<Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
  Save Changes
</Button>

// Or using utility class
<Button className="btn-primary">
  Save Changes
</Button>
```

#### Accent Button (Red)
```jsx
<Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
  Delete Account
</Button>

// Or using utility class
<Button className="btn-accent">
  Delete Account
</Button>
```

#### Secondary Button (Outlined Teal)
```jsx
<Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
  Cancel
</Button>

// Or using utility class
<Button className="btn-secondary">
  Cancel
</Button>
```

### Cards & Containers

#### Basic Card
```jsx
<Card className="bg-card border-border">
  <CardHeader>
    <CardTitle className="text-foreground">Card Title</CardTitle>
    <CardDescription className="text-muted-foreground">
      Description text
    </CardDescription>
  </CardHeader>
</Card>
```

#### Gradient Card Header
```jsx
<Card>
  <CardHeader className="bg-gradient-primary text-white">
    <CardTitle>Premium Feature</CardTitle>
  </CardHeader>
  <CardContent className="bg-card">
    Content here
  </CardContent>
</Card>
```

#### Card with Teal Border Accent
```jsx
<Card className="border-l-4 border-l-primary bg-card">
  <CardContent>
    Important information
  </CardContent>
</Card>
```

### Badges

#### Primary Badge
```jsx
<Badge className="bg-primary text-primary-foreground">Active</Badge>

// Or using utility
<Badge className="badge-primary">Active</Badge>
```

#### Accent Badge
```jsx
<Badge className="bg-accent text-accent-foreground">Urgent</Badge>

// Or using utility
<Badge className="badge-accent">Urgent</Badge>
```

#### Success Badge
```jsx
<Badge className="bg-success text-white">Completed</Badge>

// Or using utility
<Badge className="badge-success">Completed</Badge>
```

### Text & Typography

#### Heading with Primary Color
```jsx
<h1 className="text-foreground">Main Heading</h1>
<h2 className="text-primary">Teal Section Title</h2>
<h3 className="text-accent">Red Important Title</h3>
```

#### Body Text
```jsx
<p className="text-foreground">Primary body text</p>
<p className="text-muted-foreground">Secondary body text</p>
<p className="text-primary">Teal highlighted text</p>
```

#### Links
```jsx
<a href="#" className="text-primary hover:text-primary/80 underline">
  View more
</a>

// Or using utility class
<a href="#" className="link-primary">View more</a>
```

### Backgrounds

#### Gradient Background
```jsx
<div className="bg-gradient-primary text-white p-6 rounded-lg">
  Gradient content
</div>
```

#### Light Teal Background
```jsx
<div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
  Subtle teal highlight
</div>
```

#### Main App Background
```jsx
<div className="bg-background min-h-screen">
  App content
</div>
```

---

## 🎨 Component-Specific Color Usage

### Sidebar
```jsx
// Sidebar background uses teal gradient
<Sidebar className="bg-gradient-primary">
  <SidebarHeader className="border-b border-sidebar-border">
    <h2 className="text-white">GymBios</h2>
  </SidebarHeader>
  
  <SidebarContent>
    <SidebarMenuItem>
      <SidebarMenuButton 
        className="text-white hover:bg-white/10"
        isActive={active}
      >
        Menu Item
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarContent>
</Sidebar>
```

### Tables
```jsx
<Table>
  <TableHeader>
    <TableRow className="bg-primary/5">
      <TableHead className="text-primary font-semibold">Name</TableHead>
      <TableHead className="text-primary font-semibold">Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-primary/5">
      <TableCell className="text-foreground">John Doe</TableCell>
      <TableCell>
        <Badge className="bg-primary text-white">Active</Badge>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Forms
```jsx
<div className="space-y-4">
  <div>
    <Label className="text-foreground">Email</Label>
    <Input 
      className="border-border focus:border-primary focus:ring-primary/20"
      type="email"
    />
  </div>
  
  <div>
    <Label className="text-foreground">Message</Label>
    <Textarea 
      className="border-border focus:border-primary focus:ring-primary/20"
    />
  </div>
  
  <Button className="bg-primary hover:bg-primary/90">
    Submit
  </Button>
</div>
```

### Alerts
```jsx
// Info Alert (Teal)
<Alert className="border-primary/20 bg-primary/5">
  <AlertCircle className="h-4 w-4 text-primary" />
  <AlertDescription className="text-foreground">
    Information message
  </AlertDescription>
</Alert>

// Error Alert (Red)
<Alert className="border-destructive/20 bg-destructive/5">
  <AlertCircle className="h-4 w-4 text-destructive" />
  <AlertDescription className="text-foreground">
    Error message
  </AlertDescription>
</Alert>

// Success Alert
<Alert className="border-success/20 bg-success/5">
  <CheckCircle className="h-4 w-4 text-success" />
  <AlertDescription className="text-foreground">
    Success message
  </AlertDescription>
</Alert>
```

### Tabs
```jsx
<Tabs defaultValue="tab1">
  <TabsList className="bg-muted">
    <TabsTrigger 
      value="tab1" 
      className="data-[state=active]:bg-primary data-[state=active]:text-white"
    >
      Tab 1
    </TabsTrigger>
    <TabsTrigger 
      value="tab2"
      className="data-[state=active]:bg-primary data-[state=active]:text-white"
    >
      Tab 2
    </TabsTrigger>
  </TabsList>
</Tabs>
```

---

## 📊 Status & Semantic Colors

### Success States
- **Color**: `#10b981` (Green)
- **Usage**: Success messages, completed states, positive indicators
- **CSS Variable**: `--gymbios-success`
- **Tailwind**: `bg-success`, `text-success`

```jsx
<Badge className="bg-success text-white">Completed</Badge>
<p className="status-success">✓ Payment successful</p>
```

### Warning States
- **Color**: `#f59e0b` (Amber)
- **Usage**: Warning messages, pending states, cautionary indicators
- **CSS Variable**: `--gymbios-warning`
- **Tailwind**: `bg-warning`, `text-warning`

```jsx
<Badge className="bg-warning text-white">Pending</Badge>
<p className="status-warning">⚠ Action required</p>
```

### Error/Destructive States
- **Color**: `#E63946` (Red - same as accent)
- **Usage**: Error messages, failed states, destructive actions
- **CSS Variable**: `--gymbios-error` / `--destructive`
- **Tailwind**: `bg-destructive`, `text-destructive`

```jsx
<Badge className="bg-destructive text-white">Failed</Badge>
<p className="status-error">✗ Payment failed</p>
```

---

## 🌙 Dark Mode Colors

The theme supports dark mode with adjusted colors:

```css
.dark {
  --background: #0f172a;           /* Dark blue-gray */
  --foreground: #f8fafc;           /* Off-white */
  --card: #1e293b;                 /* Slightly lighter dark */
  --primary: #2B7A78;              /* Teal (unchanged) */
  --accent: #E63946;               /* Red (unchanged) */
  --muted: #334155;                /* Medium gray */
  --muted-foreground: #94a3b8;     /* Light gray */
}
```

---

## 🎯 Chart Colors

For data visualization consistency:

```css
--chart-1: #2B7A78    /* Teal - Primary data */
--chart-2: #E63946    /* Red - Secondary data */
--chart-3: #10b981    /* Green - Tertiary data */
--chart-4: #f59e0b    /* Amber - Quaternary data */
--chart-5: #8b5cf6    /* Purple - Quinary data */
```

Usage in Recharts:
```jsx
<BarChart data={data}>
  <Bar dataKey="revenue" fill="var(--chart-1)" />
  <Bar dataKey="expenses" fill="var(--chart-2)" />
  <Bar dataKey="profit" fill="var(--chart-3)" />
</BarChart>
```

---

## ✅ Do's and Don'ts

### ✅ Do's
- **DO** use `bg-primary` for primary actions
- **DO** use `bg-accent` for important CTAs and destructive actions
- **DO** use CSS variables for consistency
- **DO** maintain contrast ratios for accessibility (WCAG AA minimum)
- **DO** use gradients for hero sections and primary containers
- **DO** use `text-foreground` for main text
- **DO** use `text-muted-foreground` for secondary text

### ❌ Don'ts
- **DON'T** use hardcoded hex colors (use variables instead)
- **DON'T** mix old blue colors with new teal colors
- **DON'T** use accent red for everything (reserve for important actions)
- **DON'T** use low contrast color combinations
- **DON'T** override primary colors without good reason
- **DON'T** use multiple gradients on the same screen

---

## 🔍 Quick Reference Table

| Element | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| **Primary Button** | `#2B7A78` | `#FFFFFF` | None | `#1d5856` |
| **Accent Button** | `#E63946` | `#FFFFFF` | None | `#d62839` |
| **Secondary Button** | `#FFFFFF` | `#2B7A78` | `#2B7A78` | `rgba(43,122,120,0.1)` |
| **Card** | `#FFFFFF` | `#1E293B` | `rgba(43,122,120,0.2)` | - |
| **Sidebar** | Teal Gradient | `#FFFFFF` | `rgba(255,255,255,0.1)` | `rgba(255,255,255,0.1)` |
| **Table Header** | `rgba(43,122,120,0.05)` | `#2B7A78` | - | - |
| **Badge (Primary)** | `#2B7A78` | `#FFFFFF` | None | - |
| **Badge (Accent)** | `#E63946` | `#FFFFFF` | None | - |
| **Alert (Info)** | `rgba(43,122,120,0.05)` | `#1E293B` | `rgba(43,122,120,0.2)` | - |
| **Link** | Transparent | `#2B7A78` | None | `#1d5856` |

---

## 📝 CSS Variable Reference

### Complete Variable List
```css
/* Brand Colors */
--gymbios-primary: #2B7A78
--gymbios-secondary: #2B7A78
--gymbios-accent: #E63946
--gymbios-primary-hover: #1d5856
--gymbios-secondary-hover: #134543

/* Backgrounds */
--background: #F9FAFB
--card: #FFFFFF
--gymbios-main-bg: #F9FAFB
--gymbios-white: #FFFFFF

/* Text */
--foreground: #1E293B
--gymbios-heading: #1E293B
--gymbios-body: #64748b
--muted-foreground: #64748b

/* Status */
--gymbios-success: #10b981
--gymbios-warning: #f59e0b
--gymbios-error: #E63946
--destructive: #E63946

/* Borders */
--border: rgba(43, 122, 120, 0.2)
--sidebar-border: rgba(255, 255, 255, 0.1)

/* Gradients */
--gymbios-gradient: linear-gradient(135deg, #2B7A78 0%, #1d5856 100%)
--gymbios-gradient-hover: linear-gradient(135deg, #1d5856 0%, #134543 100%)
--gymbios-gradient-light: linear-gradient(135deg, rgba(43, 122, 120, 0.1) 0%, rgba(29, 88, 86, 0.1) 100%)
```

---

## 🚀 Implementation Checklist

When building new components:
- [ ] Use CSS variables instead of hardcoded colors
- [ ] Apply primary teal (`#2B7A78`) for brand elements
- [ ] Use accent red (`#E63946`) for important CTAs
- [ ] Set background to `#F9FAFB` or `#FFFFFF`
- [ ] Use `#1E293B` for headings and primary text
- [ ] Use `#64748b` for secondary/muted text
- [ ] Add hover states with appropriate color transitions
- [ ] Test dark mode compatibility
- [ ] Verify WCAG AA contrast ratios
- [ ] Use semantic color names (success, warning, error)

---

**Last Updated**: November 2, 2024  
**Version**: 2.0.0 (Teal & Red Theme)  
**Status**: ✅ Production Ready
