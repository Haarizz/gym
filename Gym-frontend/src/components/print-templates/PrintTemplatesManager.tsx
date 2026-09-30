import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2, Check, ClipboardList, Copy, Edit, FileText, Image as ImageIcon, Layers, Loader2, MapPin, Plus, Printer,
  Receipt, Settings as SettingsIcon, ShoppingCart, Star, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import { StatCard } from '../purchase/purchaseUi';
import pStyles from '../purchase/PurchaseInvoice.module.css';
import { displayDateTime } from '../purchase/purchaseInvoiceUtils';
import { getCompanyDetails, type CompanyDetails } from '../../utils/company-details';
import { useCurrency } from '../../utils/currency';
import { useBranch } from '../../utils/branch-context';
import { printTemplateService, type PrintTemplate } from '../../utils/supabase/print-template-service';
import { DOC_TYPES, defaultSettings, resolveSettings, type DocTemplateSettings, type DocType } from './documentTemplate';
import { TemplateDesigner } from './TemplateDesigner';
import styles from './PrintTemplates.module.css';

const DOC_ICONS: Record<DocType, React.ElementType> = {
  'sales-invoice': ShoppingCart,
  'purchase-order': ClipboardList,
  'purchase-invoice': Receipt,
};

type Editing = { docType: DocType; template: PrintTemplate | null; settings: DocTemplateSettings };

function Thumb({ accent }: { accent: string }) {
  return (
    <div className={styles.thumb} aria-hidden>
      <span style={{ top: 8, right: 30, background: '#1a1a2e' }} />
      <span style={{ top: 8, left: 36, width: 12, height: 12, borderRadius: '50%', background: accent }} />
      <span style={{ top: 26, height: 5, background: '#f1f5f9' }} />
      <span style={{ top: 35 }} />
      <span style={{ top: 42 }} />
      <span style={{ top: 49 }} />
      <span style={{ top: 60, left: 28, background: accent }} />
    </div>
  );
}

export function PrintTemplatesManager() {
  const navigate = useNavigate();
  const { currencyCode } = useCurrency();
  const { activeBranchName, isAllBranches } = useBranch();
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<PrintTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await printTemplateService.getTemplates());
    } catch (err: any) {
      toast.error(err.message || 'Failed to load print templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // The designer previews the active branch's header; re-read it when the branch changes.
  useEffect(() => {
    const read = () => getCompanyDetails().then(setCompany);
    read();
    window.addEventListener('branchChanged', read);
    return () => window.removeEventListener('branchChanged', read);
  }, []);

  const byType = (t: DocType) => {
    const cat = DOC_TYPES.find(d => d.id === t)!.category;
    return templates
      .filter(x => x.category === cat)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
  };

  const stats = useMemo(() => ({
    total: templates.length,
    defaults: templates.filter(t => t.isDefault).length,
    custom: templates.filter(t => !t.isDefault).length,
  }), [templates]);

  const guardBranch = () => {
    if (isAllBranches) {
      toast.error('Select a specific branch to change print templates');
      return false;
    }
    return true;
  };

  const openNew = (docType: DocType) => {
    if (!guardBranch()) return;
    const count = byType(docType).length;
    const label = DOC_TYPES.find(d => d.id === docType)!.label;
    setEditing({ docType, template: null, settings: { ...defaultSettings(docType), templateName: count ? `${label} Template ${count + 1}` : `Default ${label}` } });
  };

  const openEdit = (docType: DocType, template: PrintTemplate) => {
    if (!guardBranch()) return;
    setEditing({ docType, template, settings: resolveSettings(docType, { ...template.settings, templateName: template.name, paperSize: template.paperSize }) });
  };

  const handleSave = async (settings: DocTemplateSettings, makeDefault: boolean) => {
    if (!editing) return;
    setSaving(true);
    const meta = DOC_TYPES.find(d => d.id === editing.docType)!;
    const body = { category: meta.category, name: settings.templateName, paperSize: settings.paperSize, settings: settings as unknown as Record<string, unknown> };
    try {
      if (editing.template) {
        await printTemplateService.updateTemplate(editing.template.id, body);
        if (makeDefault && !editing.template.isDefault) await printTemplateService.setDefault(editing.template.id);
        toast.success(`${settings.templateName} updated`, {
          description: makeDefault && !editing.template.isDefault ? `${meta.label}s will now print with this template.` : undefined,
        });
      } else {
        const created = await printTemplateService.createTemplate({ ...body, isDefault: makeDefault });
        toast.success(`${settings.templateName} created`, {
          description: created.isDefault ? `${meta.label}s will now print with this template.` : undefined,
        });
      }
      setEditing(null);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (docType: DocType, t: PrintTemplate) => {
    if (!guardBranch()) return;
    setBusyId(t.id);
    try {
      const name = `${t.name} (Copy)`;
      await printTemplateService.createTemplate({
        category: t.category, name, paperSize: t.paperSize, isDefault: false,
        settings: { ...resolveSettings(docType, t.settings), templateName: name } as unknown as Record<string, unknown>,
      });
      toast.success('Template duplicated');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate template');
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (t: PrintTemplate) => {
    if (!guardBranch()) return;
    setBusyId(t.id);
    try {
      await printTemplateService.setDefault(t.id);
      toast.success(`${t.name} is now the default`);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to set default template');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    const t = deleting;
    setDeleting(null);
    if (!t) return;
    setBusyId(t.id);
    try {
      await printTemplateService.deleteTemplate(t.id);
      toast.success('Template deleted');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete template');
    } finally {
      setBusyId(null);
    }
  };

  if (editing && company) {
    return (
      <TemplateDesigner
        docType={editing.docType}
        initial={editing.settings}
        initialDefault={editing.template ? editing.template.isDefault : byType(editing.docType).length === 0}
        company={company}
        currencyCode={currencyCode}
        branchName={activeBranchName}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className={styles.stack}>
      <div className={pStyles.kpiGrid}>
        <StatCard title="Total Templates" value={stats.total} sub="Saved sales & purchase print layouts" icon={Layers} tone="blue" loading={loading} />
        <StatCard title="Default Templates" value={stats.defaults} sub="Used when a document is printed" icon={Star} tone="green" loading={loading} />
        <StatCard title="Custom Templates" value={stats.custom} sub="Alternative layouts kept on file" icon={FileText} tone="purple" loading={loading} />
        <StatCard title="Document Types" value={DOC_TYPES.length} sub={DOC_TYPES.map(d => d.label).join(', ')} icon={Printer} tone="orange" loading={false} />
      </div>

      {DOC_TYPES.map(dt => {
        const Icon = DOC_ICONS[dt.id];
        const list = byType(dt.id);
        return (
          <section key={dt.id} className={styles.section}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>
                <span className={styles.chip}><Icon size={20} /></span>
                <div>
                  <h2>{dt.label} Templates</h2>
                  <p>{dt.description}</p>
                </div>
              </div>
              <Button onClick={() => openNew(dt.id)} disabled={!company}><Plus className="h-4 w-4" /> New Template</Button>
            </div>

            {loading ? (
              <div className={styles.cards}>
                {[0, 1].map(i => <div key={i} className={pStyles.skeleton} style={{ height: 190, borderRadius: 12 }} />)}
              </div>
            ) : list.length === 0 ? (
              <div className={styles.empty}>
                <div>
                  <strong>Printing with the built-in classic layout</strong>
                  <p>Create a template to choose colours, columns, terms and stamp for every {dt.label.toLowerCase()} you print.</p>
                </div>
                <Button variant="outline" onClick={() => openNew(dt.id)} disabled={!company}><Edit className="h-4 w-4" /> Customize layout</Button>
              </div>
            ) : (
              <div className={styles.cards}>
                {list.map(t => {
                  const accent = String(t.settings.accentColor || '#F5C742');
                  const busy = busyId === t.id;
                  return (
                    <div key={t.id} className={styles.card}>
                      <div className={styles.cardTop}>
                        <div style={{ minWidth: 0 }}>
                          <h3 className={styles.cardName} title={t.name}>{t.name}</h3>
                          <div className={styles.pills}>
                            {t.isDefault && <span className={`${styles.pill} ${styles.pillPrimary}`}><Check size={12} /> Default</span>}
                            <span className={styles.pill}>{t.paperSize}</span>
                            <span className={styles.pill}>Classic</span>
                          </div>
                        </div>
                        <Thumb accent={accent} />
                      </div>
                      <div className={styles.cardMeta}>
                        <span>Last modified</span><b>{displayDateTime(t.updatedAt || t.createdAt)}</b>
                        {t.updatedBy && <><span>By</span><b>{t.updatedBy}</b></>}
                      </div>
                      <div className={styles.cardActions}>
                        <Button variant="outline" size="sm" onClick={() => openEdit(dt.id, t)} disabled={!company}><Edit className="h-4 w-4" /> Edit</Button>
                        <Button variant="outline" size="sm" title="Duplicate" aria-label="Duplicate" onClick={() => handleDuplicate(dt.id, t)} disabled={busy}>
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        {!t.isDefault && (
                          <Button variant="outline" size="sm" title="Delete" aria-label="Delete" onClick={() => guardBranch() && setDeleting(t)} disabled={busy}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                      {!t.isDefault && (
                        <Button variant="ghost" size="sm" onClick={() => handleSetDefault(t)} disabled={busy}>
                          <Star className="h-4 w-4" /> Set as default
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <section className={styles.section}>
        <div className={styles.sectionHead} style={{ marginBottom: 0 }}>
          <div className={styles.sectionTitle}>
            <span className={styles.chip}><Building2 size={20} /></span>
            <div>
              <h2>Where the header details come from</h2>
              <p>Each document prints the company details of the branch it was created in — not the branch you are viewing.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/settings')}><SettingsIcon className="h-4 w-4" /> Edit company details</Button>
        </div>
        <div className={styles.sourceGrid}>
          <div className={styles.sourceItem}><ImageIcon size={16} /><div><strong>Logo & stamp</strong><span>Settings › Company Details › Company Logo / Company Stamp</span></div></div>
          <div className={styles.sourceItem}><Building2 size={16} /><div><strong>Name, phone, email & TRN</strong><span>Settings › Company Details, saved per branch</span></div></div>
          <div className={styles.sourceItem}><MapPin size={16} /><div><strong>Address & currency</strong><span>The document branch’s address and display currency</span></div></div>
        </div>
      </section>

      <AlertDialog open={!!deleting} onOpenChange={o => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>“{deleting?.name}” will be removed. This can’t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
