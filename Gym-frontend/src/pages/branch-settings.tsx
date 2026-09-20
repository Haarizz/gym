import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Image as ImageIcon,
  DollarSign,
  Shield,
  MapPin,
  Clock,
  Tag,
  Users,
  Zap,
  Percent,
  UploadCloud,
  Trash2,
  Star,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Checkbox } from "../components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { branchApi, BranchDTO, BranchImageDTO } from "../utils/supabase/branch-service";

const CENTER_TYPES = ["Gym", "Fitness Center", "Wellness Center", "Studio"];
const ACCESS_TYPES = ["Mixed", "Ladies Only", "Men Only"];
const BASE_PAYMENT_METHODS = ["Cash", "Card"];

interface DiscoveryFormState {
  description: string;
  established_year: string;
  center_type: string;
  access_type: string;
  operating_hours: string;
  lat: string;
  lng: string;
  accepted_payment_methods: string[];
  bnpl_enabled: boolean;
  bnpl_provider: string;
  tax_percentage: string;
  tax_inclusive: boolean;
  terms_and_policies: string;
}

function toFormState(branch: BranchDTO): DiscoveryFormState {
  return {
    description: branch.description || "",
    established_year: branch.established_year != null ? String(branch.established_year) : "",
    center_type: branch.center_type || "",
    access_type: branch.access_type || "",
    operating_hours: branch.operating_hours || "",
    lat: branch.lat != null ? String(branch.lat) : "",
    lng: branch.lng != null ? String(branch.lng) : "",
    accepted_payment_methods: branch.accepted_payment_methods || [],
    bnpl_enabled: branch.bnpl_enabled || false,
    bnpl_provider: branch.bnpl_provider || "",
    tax_percentage: branch.tax_percentage != null ? String(branch.tax_percentage) : "",
    tax_inclusive: branch.tax_inclusive || false,
    terms_and_policies: branch.terms_and_policies || "",
  };
}

export function BranchSettings() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const id = Number(branchId);

  const [branch, setBranch] = useState<BranchDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DiscoveryFormState | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [images, setImages] = useState<BranchImageDTO[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const loadBranch = useCallback(async () => {
    try {
      const data = await branchApi.getBranchById(id);
      setBranch(data);
      setForm(toFormState(data));
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to load branch", error);
      toast.error("Failed to load branch");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadImages = useCallback(async () => {
    try {
      const data = await branchApi.getBranchImages(id);
      setImages(data);
    } catch (error) {
      console.error("Failed to load branch images", error);
    } finally {
      setImagesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadBranch();
    loadImages();
  }, [id, loadBranch, loadImages]);

  const updateForm = (patch: Partial<DiscoveryFormState>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    setIsDirty(true);
  };

  const togglePaymentMethod = (method: string) => {
    if (!form) return;
    const has = form.accepted_payment_methods.includes(method);
    updateForm({
      accepted_payment_methods: has
        ? form.accepted_payment_methods.filter((m) => m !== method)
        : [...form.accepted_payment_methods, method],
    });
  };

  const toggleBnpl = (enabled: boolean) => {
    if (!form) return;
    const withoutBnpl = form.accepted_payment_methods.filter((m) => m !== "BNPL");
    updateForm({
      bnpl_enabled: enabled,
      accepted_payment_methods: enabled ? [...withoutBnpl, "BNPL"] : withoutBnpl,
    });
  };

  const handleSave = async () => {
    if (!form || !branch) return;
    setSaving(true);
    try {
      await branchApi.updateBranch(id, {
        branch_name: branch.branch_name,
        branch_code: branch.branch_code,
        status: branch.status,
        description: form.description || undefined,
        established_year: form.established_year ? Number(form.established_year) : undefined,
        center_type: form.center_type || undefined,
        access_type: form.access_type || undefined,
        operating_hours: form.operating_hours || undefined,
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        accepted_payment_methods: form.accepted_payment_methods,
        bnpl_enabled: form.bnpl_enabled,
        bnpl_provider: form.bnpl_provider || undefined,
        tax_percentage: form.tax_percentage ? Number(form.tax_percentage) : undefined,
        tax_inclusive: form.tax_inclusive,
        terms_and_policies: form.terms_and_policies || undefined,
      });
      toast.success("Branch settings saved");
      setIsDirty(false);
      await loadBranch();
    } catch (error: any) {
      console.error("Failed to save branch settings", error);
      toast.error(error.response?.data?.message || "Failed to save branch settings");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (files: FileList | null, isCover: boolean) => {
    if (!files || files.length === 0) return;
    const setUploading = isCover ? setUploadingCover : setUploadingGallery;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} isn't an image`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 10MB`);
          continue;
        }
        await branchApi.uploadBranchImage(id, file, isCover);
      }
      await loadImages();
    } catch (error: any) {
      console.error("Failed to upload image", error);
      toast.error(error.response?.data?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSetCover = async (imageId: number) => {
    try {
      await branchApi.setBranchImageCover(id, imageId);
      await loadImages();
    } catch (error) {
      console.error("Failed to set cover image", error);
      toast.error("Failed to set cover image");
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await branchApi.deleteBranchImage(id, imageId);
      await loadImages();
    } catch (error) {
      console.error("Failed to delete image", error);
      toast.error("Failed to delete image");
    }
  };

  if (loading || !form || !branch) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const coverImage = images.find((img) => img.is_cover);
  const galleryImages = images.filter((img) => !img.is_cover);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/branch-management")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Branch Settings</h1>
            <p className="text-gray-600 mt-1">
              Mobile discovery configuration for <strong>{branch.branch_name}</strong>
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={!isDirty || saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center space-x-2">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Images</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Payments &amp; Tax</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Policies</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <Card className="border-0 shadow-sm max-w-3xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Branch Profile</CardTitle>
              </div>
              <CardDescription>
                How this branch appears to members browsing centers in the mobile app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="description">About This Center</Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder="Tell prospective members what makes this center worth joining..."
                  value={form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="center_type" className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    Center Type
                  </Label>
                  <Select value={form.center_type} onValueChange={(v) => updateForm({ center_type: v })}>
                    <SelectTrigger id="center_type" className="w-full">
                      <SelectValue placeholder="Select center type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CENTER_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="access_type" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    Access Type
                  </Label>
                  <Select value={form.access_type} onValueChange={(v) => updateForm({ access_type: v })}>
                    <SelectTrigger id="access_type" className="w-full">
                      <SelectValue placeholder="Select access type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESS_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="established_year">Established Year</Label>
                <Input
                  id="established_year"
                  type="number"
                  placeholder="e.g. 2018"
                  value={form.established_year}
                  onChange={(e) => updateForm({ established_year: e.target.value })}
                  className="w-full md:w-48"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="operating_hours" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Timings
                </Label>
                <Textarea
                  id="operating_hours"
                  rows={2}
                  placeholder={"Mon–Sat: 6:00 AM – 10:00 PM\nSun: 7:00 AM – 8:00 PM"}
                  value={form.operating_hours}
                  onChange={(e) => updateForm({ operating_hours: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="lat" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    Latitude
                  </Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    placeholder="e.g. 19.0596"
                    value={form.lat}
                    onChange={(e) => updateForm({ lat: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    placeholder="e.g. 72.8295"
                    value={form.lng}
                    onChange={(e) => updateForm({ lng: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Coordinates are used to show distance to nearby members and to sort centers by distance in the mobile app.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Images */}
        <TabsContent value="images">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <CardTitle>Cover Image</CardTitle>
                </div>
                <CardDescription>The main image shown on this center's card and detail page.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-xl p-4 w-full flex flex-col items-center justify-center text-center gap-3 bg-gray-50/50 relative overflow-hidden transition-colors hover:bg-gray-50 h-48">
                  {uploadingCover ? (
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  ) : coverImage ? (
                    <>
                      <img
                        src={coverImage.image_url}
                        alt="Cover"
                        className="max-h-full max-w-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Label htmlFor="coverUpload" className="cursor-pointer text-white text-sm font-medium hover:underline">
                          Change Cover Image
                        </Label>
                      </div>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-gray-400" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-700">Upload Cover Image</p>
                        <p className="text-xs text-gray-500">Max size 10MB</p>
                      </div>
                    </>
                  )}
                  <input
                    id="coverUpload"
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => handleUpload(e.target.files, true)}
                    title={coverImage ? "Change Cover Image" : "Upload Cover Image"}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <CardTitle>Gallery</CardTitle>
                </div>
                <CardDescription>Additional photos shown in the center's detail gallery.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragOver ? "border-primary bg-primary/5" : "border-gray-300"
                  } ${uploadingGallery || imagesLoading ? "pointer-events-none opacity-50" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    handleUpload(e.dataTransfer.files, false);
                  }}
                >
                  {uploadingGallery ? (
                    <div className="space-y-2">
                      <Loader2 className="h-8 w-8 text-primary mx-auto animate-spin" />
                      <p className="text-sm text-gray-600">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Drag &amp; drop images here, or{" "}
                        <label className="text-primary cursor-pointer hover:underline">
                          browse
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={(e) => handleUpload(e.target.files, false)}
                          />
                        </label>
                      </p>
                      <p className="text-xs text-gray-500">JPG, PNG, GIF, WebP (max 10MB each)</p>
                    </>
                  )}
                </div>

                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {galleryImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <div className="w-full h-20 rounded-lg border shadow-sm bg-slate-100 overflow-hidden">
                          <img src={image.image_url} alt="Gallery" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 w-7 p-0"
                            onClick={() => handleSetCover(image.id)}
                            aria-label="Set as cover"
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 w-7 p-0"
                            onClick={() => handleDeleteImage(image.id)}
                            aria-label="Delete image"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!imagesLoading && images.length === 0 && (
                  <p className="text-sm text-gray-500">No images uploaded yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payments & Tax */}
        <TabsContent value="payments">
          <Card className="border-0 shadow-sm max-w-3xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle>Payments &amp; Tax</CardTitle>
              </div>
              <CardDescription>What this branch accepts and how tax is shown at checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base mb-1 block">Accepted Payment Methods</Label>
                <p className="text-sm text-muted-foreground mb-3">Shown to members before they purchase a plan</p>
                <div className="flex flex-wrap gap-3">
                  {BASE_PAYMENT_METHODS.map((method) => (
                    <div key={method} className="border rounded-lg p-3 flex items-center gap-2">
                      <Checkbox
                        id={`method-${method}`}
                        checked={form.accepted_payment_methods.includes(method)}
                        onCheckedChange={() => togglePaymentMethod(method)}
                      />
                      <Label htmlFor={`method-${method}`} className="cursor-pointer">
                        {method}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bnpl_enabled" className="flex items-center gap-2 cursor-pointer">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Buy Now, Pay Later (BNPL)
                  </Label>
                  <Switch id="bnpl_enabled" checked={form.bnpl_enabled} onCheckedChange={toggleBnpl} />
                </div>
                {form.bnpl_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="bnpl_provider">BNPL Provider</Label>
                    <Input
                      id="bnpl_provider"
                      placeholder="e.g. ZestMoney, LazyPay"
                      value={form.bnpl_provider}
                      onChange={(e) => updateForm({ bnpl_provider: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tax_percentage" className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-gray-500" />
                    Tax Percentage
                  </Label>
                  <Input
                    id="tax_percentage"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 18"
                    value={form.tax_percentage}
                    onChange={(e) => updateForm({ tax_percentage: e.target.value })}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="tax_inclusive"
                      checked={form.tax_inclusive}
                      onCheckedChange={(v) => updateForm({ tax_inclusive: v })}
                    />
                    <Label htmlFor="tax_inclusive" className="cursor-pointer">
                      Prices shown already include tax
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies */}
        <TabsContent value="policies">
          <Card className="border-0 shadow-sm max-w-3xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Policies</CardTitle>
              </div>
              <CardDescription>
                Refund, freeze, transfer and enrollment terms shown to members before they join.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="terms_and_policies">Terms &amp; Policies</Label>
                <Textarea
                  id="terms_and_policies"
                  rows={8}
                  placeholder="e.g. No refund after 7 days of activation. Membership freeze available twice per year (max 30 days each). Non-transferable. Photo ID mandatory for enrollment."
                  value={form.terms_and_policies}
                  onChange={(e) => updateForm({ terms_and_policies: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
