package com.company.project.services;

import com.company.project.dto.PrintTemplateDTO;
import com.company.project.entities.PrintTemplate;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.PrintTemplateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class PrintTemplateService {

    static final String BARCODE_LABEL = "BARCODE_LABEL";
    /**
     * SALES_INVOICE / PURCHASE_ORDER / PURCHASE_INVOICE: Sales & Purchases › Settings › Print Templates.
     * BARCODE_LABEL: Sales & Purchases › Barcode Print label layouts.
     */
    static final Set<String> CATEGORIES = Set.of("SALES_INVOICE", "PURCHASE_ORDER", "PURCHASE_INVOICE", BARCODE_LABEL);
    private static final Set<String> PAPER_SIZES = Set.of("A4", "A5", "Letter");

    private final PrintTemplateRepository repository;

    public PrintTemplateService(PrintTemplateRepository repository) {
        this.repository = repository;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PrintTemplateDTO> getAll(String category) {
        List<PrintTemplate> list = category == null || category.isBlank()
                ? repository.findAllByOrderByCategoryAscNameAsc()
                : repository.findByCategoryOrderByNameAsc(requireCategory(category));
        return list.stream().map(PrintTemplateDTO::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PrintTemplateDTO getById(Long id) {
        return PrintTemplateDTO.fromEntity(find(id));
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public PrintTemplateDTO create(PrintTemplateDTO dto) {
        String category = requireCategory(dto.getCategory());
        PrintTemplate t = new PrintTemplate();
        t.setCategory(category);
        apply(t, dto);
        // The first template of a type is what prints until another is chosen.
        boolean firstOfType = repository.findByCategoryOrderByNameAsc(category).isEmpty();
        t.setIsDefault(firstOfType || Boolean.TRUE.equals(dto.getIsDefault()));
        t = repository.save(t);
        if (t.getIsDefault()) clearOtherDefaults(t);
        return PrintTemplateDTO.fromEntity(t);
    }

    public PrintTemplateDTO update(Long id, PrintTemplateDTO dto) {
        PrintTemplate t = find(id);
        apply(t, dto);
        t = repository.save(t);
        return PrintTemplateDTO.fromEntity(t);
    }

    public PrintTemplateDTO setDefault(Long id) {
        PrintTemplate t = find(id);
        t.setIsDefault(true);
        t = repository.save(t);
        clearOtherDefaults(t);
        return PrintTemplateDTO.fromEntity(t);
    }

    public void delete(Long id) {
        PrintTemplate t = find(id);
        // A document type needs a default so every print has a layout; barcode labels always
        // fall back to the built-in label layouts, so their default can simply be removed.
        if (Boolean.TRUE.equals(t.getIsDefault()) && !BARCODE_LABEL.equals(t.getCategory())) {
            throw new BusinessRuleViolationException(
                    "\"" + t.getName() + "\" is the default template. Set another template as default before deleting it.");
        }
        repository.delete(t);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private void apply(PrintTemplate t, PrintTemplateDTO dto) {
        if (dto.getName() != null || t.getName() == null) {
            String name = dto.getName() == null ? null : dto.getName().trim();
            if (name == null || name.isEmpty()) throw new BusinessRuleViolationException("Template name is required.");
            t.setName(name);
        }
        if (dto.getPaperSize() != null) {
            if (!PAPER_SIZES.contains(dto.getPaperSize())) {
                throw new BusinessRuleViolationException("Paper size must be one of " + PAPER_SIZES);
            }
            t.setPaperSize(dto.getPaperSize());
        }
        if (dto.getSettings() != null) t.setSettings(dto.getSettings());
    }

    private void clearOtherDefaults(PrintTemplate keep) {
        List<PrintTemplate> others = repository.findByCategoryOrderByNameAsc(keep.getCategory()).stream()
                .filter(o -> !o.getId().equals(keep.getId()) && Boolean.TRUE.equals(o.getIsDefault()))
                .collect(Collectors.toList());
        others.forEach(o -> o.setIsDefault(false));
        repository.saveAll(others);
    }

    private PrintTemplate find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Print template not found with id: " + id));
    }

    private static String requireCategory(String category) {
        String c = category == null ? "" : category.trim().toUpperCase(Locale.ROOT);
        if (!CATEGORIES.contains(c)) {
            throw new BusinessRuleViolationException("Unknown template type '" + category + "' — must be one of " + CATEGORIES);
        }
        return c;
    }
}
