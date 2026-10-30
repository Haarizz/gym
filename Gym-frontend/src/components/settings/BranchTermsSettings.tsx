import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Smartphone, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { branchApi } from "../../utils/supabase/branch-service";
import { SettingsSaveBar } from "./SettingsSaveBar";

type TermsBlock = { kind: "heading" | "paragraph"; text: string };

/**
 * Splits plain-text terms into blocks: blank lines separate paragraphs, and a
 * short single line in ALL CAPS (e.g. "AGREEMENT TO TERMS") is a heading.
 * Mirrors TermsText in the mobile app, so the preview matches what members see.
 */
function parseTerms(terms: string): TermsBlock[] {
  return terms
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((text) => {
      const isHeading =
        !text.includes("\n") && text.length <= 80 && /\p{L}/u.test(text) && text === text.toUpperCase();
      return { kind: isHeading ? "heading" : "paragraph", text };
    });
}

interface BranchTermsSettingsProps {
  branchId: number;
  readOnly?: boolean;
}

/**
 * Terms & Conditions tab body: the branch's terms (branches.terms_and_policies),
 * shown to members on the center details screen of the mobile app.
 */
export function BranchTermsSettings({ branchId, readOnly = false }: BranchTermsSettingsProps) {
  const [terms, setTerms] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const branch = await branchApi.getBranchById(branchId);
      const value = branch.terms_and_policies || "";
      setTerms(value);
      setSaved(value);
    } catch (error) {
      console.error("Failed to load branch terms", error);
      toast.error("Failed to load terms & conditions");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  // Re-fetch whenever the branch changes (e.g. switching branches from the sidebar).
  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const isDirty = terms !== saved;

  const handleSave = async () => {
    if (readOnly || !isDirty) return;
    setSaving(true);
    try {
      // The update endpoint treats missing fields as unchanged, so only the terms are sent.
      // An empty string (not undefined) is sent on purpose so the terms can be cleared.
      const value = terms.trim();
      await branchApi.updateBranch(branchId, { terms_and_policies: value });
      setTerms(value);
      setSaved(value);
      toast.success("Terms & conditions saved");
    } catch (error: any) {
      console.error("Failed to save branch terms", error);
      toast.error(error.response?.data?.message || "Failed to save terms & conditions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="sp-panel">
      <div className="sp-grid sp-grid--2-1 sp-stretch">
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Branch Terms &amp; Conditions</CardTitle>
            </div>
            <CardDescription>
              Refund, freeze, transfer and enrollment terms for this branch. Members see them in the mobile app before they join.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="branch_terms">Terms &amp; Conditions</Label>
            <Textarea
              id="branch_terms"
              rows={16}
              disabled={readOnly}
              placeholder={
                "e.g.\n1. No refund after 7 days of activation.\n2. Membership freeze available twice per year (max 30 days each).\n3. Memberships are non-transferable.\n4. Photo ID is mandatory for enrollment."
              }
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Line breaks are kept, so you can write one term per line. Leave empty to show no terms.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle>Mobile Preview</CardTitle>
            </div>
            <CardDescription>How the terms appear on the center details screen.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-gray-50 p-4" style={{ maxHeight: 520, overflowY: "auto" }}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-gray-900">Terms &amp; Policies</span>
              </div>
              {terms.trim() ? (
                // Inline styles: the prebuilt Tailwind bundle has no whitespace/justify utilities.
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {parseTerms(terms).map((block, i) =>
                    block.kind === "heading" ? (
                      <p key={i} className="text-sm text-gray-900" style={{ fontWeight: 800, letterSpacing: "0.02em", marginTop: 4 }}>
                        {block.text}
                      </p>
                    ) : (
                      <p
                        key={i}
                        className="text-sm text-gray-700"
                        style={{ whiteSpace: "pre-wrap", textAlign: "justify", overflowWrap: "anywhere", lineHeight: 1.5 }}
                      >
                        {block.text}
                      </p>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">This center has not listed any terms or policies yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <SettingsSaveBar
        isDirty={isDirty}
        saving={saving}
        onSave={handleSave}
        label="Save Terms"
        disabled={readOnly}
        note={readOnly ? "Read-only — select a branch from the sidebar to edit" : undefined}
      />
    </div>
  );
}
