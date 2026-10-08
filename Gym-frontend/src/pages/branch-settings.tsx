import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Building2,
  Image as ImageIcon,
  Shield,
  MapPin,
  Clock,
  Tag,
  Users,
  UploadCloud,
  Trash2,
  Star,
  Loader2,
  CalendarDays,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { TabsContent } from "../components/ui/tabs";
import { branchApi, BranchDTO, BranchImageDTO } from "../utils/supabase/branch-service";
import { SettingsSaveBar } from "../components/settings/SettingsSaveBar";

const CENTER_TYPES = ["Gym", "Fitness Center", "Wellness Center", "Studio"];
const ACCESS_TYPES = ["Mixed", "Ladies Only", "Men Only"];
const BASE_PAYMENT_METHODS = ["Cash", "Card"];

// Branch images are stored as backend-relative paths (/uploads/branch-images/...),
// served by the API server rather than this app's origin.
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(/\/api\/?$/, "");
function resolveImageUrl(url: string): string {
  if (!url || /^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Tab value rendered by {@link BranchSettingsTab}. The parent <Tabs> (the main
 * Settings page) owns the tab bar; this component only renders the panel.
 */
export const BRANCH_SETTINGS_TAB = "branch";

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

interface BranchSettingsTabProps {
  branchId: number;
  /** Disables every control — used in "All Branches" mode, where a single branch must be picked to edit. */
  readOnly?: boolean;
}

/**
 * Per-branch mobile discovery settings (profile, images, payments & tax, policies).
 * Must be rendered inside a <Tabs> root whose list includes BRANCH_SETTINGS_TAB.
 */
export function BranchSettingsTab({ branchId: id, readOnly = false }: BranchSettingsTabProps) {
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

  // Re-fetch whenever the branch changes (e.g. switching branches from the sidebar).
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setImagesLoading(true);
    setImages([]);
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

  const handleSave = async () => {
    if (!form || !branch || readOnly) return;
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
        // BNPL is no longer offered — saving switches it off for this branch.
        accepted_payment_methods: form.accepted_payment_methods.filter((m) => m !== "BNPL"),
        bnpl_enabled: false,
        bnpl_provider: undefined,
        // Tax % / inclusive are no longer edited here (see the Tax Configuration tab);
        // pass the stored values through so saving doesn't wipe them.
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
    if (!files || files.length === 0 || readOnly) return;
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
      <TabsContent value={BRANCH_SETTINGS_TAB}>
        <div className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </TabsContent>
    );
  }

  const coverImage = images.find((img) => img.is_cover);
  const galleryImages = images.filter((img) => !img.is_cover);

  return (
    <TabsContent value={BRANCH_SETTINGS_TAB}>
      <fieldset disabled={readOnly} className="sp-panel">
        {/* Profile + Hours & Location */}
        <div className="sp-grid sp-grid--2-1 sp-stretch">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Branch Profile</CardTitle>
              </div>
              <CardDescription>
                How <strong>{branch.branch_name}</strong> appears to members browsing centers in the mobile app.
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div className="space-y-2">
                  <Label htmlFor="established_year" className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-gray-500" />
                    Established Year
                  </Label>
                  <Input
                    id="established_year"
                    type="number"
                    placeholder="e.g. 2018"
                    value={form.established_year}
                    onChange={(e) => updateForm({ established_year: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Hours &amp; Location</CardTitle>
              </div>
              <CardDescription>Used to show opening hours and distance in the mobile app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="operating_hours">Timings</Label>
                <Textarea
                  id="operating_hours"
                  rows={3}
                  placeholder={"Mon–Sat: 6:00 AM – 10:00 PM\nSun: 7:00 AM – 8:00 PM"}
                  value={form.operating_hours}
                  onChange={(e) => updateForm({ operating_hours: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="lng" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    Longitude
                  </Label>
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
                Coordinates sort centers by distance and show members how far away this branch is.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Images */}
        <div className="sp-grid sp-grid--1-2 sp-stretch">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <CardTitle>Cover Image</CardTitle>
              </div>
              <CardDescription>The main image on this center's card and detail page.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="sp-dropzone sp-dropzone--cover">
                {uploadingCover ? (
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                ) : coverImage ? (
                  <>
                    <img src={resolveImageUrl(coverImage.image_url)} alt="Cover" />
                    {!readOnly && (
                      <div className="sp-overlay">
                        <span className="text-white text-sm font-medium">Change Cover Image</span>
                      </div>
                    )}
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
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                  onChange={(e) => {
                    handleUpload(e.target.files, true);
                    e.target.value = "";
                  }}
                  title={coverImage ? "Change Cover Image" : "Upload Cover Image"}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <CardTitle>Gallery</CardTitle>
                </div>
                {galleryImages.length > 0 && (
                  <span className="text-xs font-medium text-gray-500">
                    {galleryImages.length} photo{galleryImages.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <CardDescription>Additional photos in the center's detail gallery. Hover a photo to make it the cover or delete it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`sp-dropzone sp-dropzone--gallery ${
                  uploadingGallery || imagesLoading || readOnly ? "pointer-events-none opacity-50" : ""
                }`}
                data-drag={isDragOver}
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
                    <UploadCloud className="h-7 w-7 text-gray-400" />
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        Drag &amp; drop images here, or{" "}
                        <label className="text-primary font-medium cursor-pointer hover:underline">
                          browse
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              handleUpload(e.target.files, false);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </p>
                      <p className="text-xs text-gray-500">JPG, PNG, GIF, WebP (max 10MB each)</p>
                    </div>
                  </>
                )}
              </div>

              {galleryImages.length > 0 && (
                <div className="sp-thumbs">
                  {galleryImages.map((image) => (
                    <div key={image.id} className="sp-thumb">
                      <img src={resolveImageUrl(image.image_url)} alt="Gallery" />
                      {!readOnly && (
                        <div className="sp-thumb-actions">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                            onClick={() => handleSetCover(image.id)}
                            aria-label="Set as cover"
                            title="Set as cover"
                          >
                            <Star className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDeleteImage(image.id)}
                            aria-label="Delete image"
                            title="Delete image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
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

        {/* Payment Methods + Policies */}
        <div className="sp-grid sp-grid--1-2 sp-stretch">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Payment Methods</CardTitle>
              </div>
              <CardDescription>What this branch accepts — shown to members before they purchase a plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {BASE_PAYMENT_METHODS.map((method) => (
                  <label
                    key={method}
                    htmlFor={`method-${method}`}
                    className="border rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <Checkbox
                      id={`method-${method}`}
                      checked={form.accepted_payment_methods.includes(method)}
                      onCheckedChange={() => togglePaymentMethod(method)}
                    />
                    <span className="text-sm font-medium text-gray-700">{method}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
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
                  rows={6}
                  placeholder="e.g. No refund after 7 days of activation. Membership freeze available twice per year (max 30 days each). Non-transferable. Photo ID mandatory for enrollment."
                  value={form.terms_and_policies}
                  onChange={(e) => updateForm({ terms_and_policies: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile, Hours, Payment Methods and Policies share one form and save together.
            Images save immediately on upload, so they aren't part of this. */}
        <SettingsSaveBar
          isDirty={isDirty}
          saving={saving}
          onSave={handleSave}
          label="Save Branch Settings"
          disabled={readOnly}
          note={readOnly ? "Read-only — select a branch from the sidebar to edit" : undefined}
        />
      </fieldset>
    </TabsContent>
  );
}
