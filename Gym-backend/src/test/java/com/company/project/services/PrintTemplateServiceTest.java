package com.company.project.services;

import com.company.project.dto.PrintTemplateDTO;
import com.company.project.entities.PrintTemplate;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.PrintTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PrintTemplateServiceTest {

    @Mock private PrintTemplateRepository repository;

    private PrintTemplateService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new PrintTemplateService(repository);
        when(repository.save(any(PrintTemplate.class))).thenAnswer(inv -> {
            PrintTemplate t = inv.getArgument(0);
            if (t.getId() == null) t.setId(99L);
            return t;
        });
    }

    private static PrintTemplate template(long id, String category, boolean isDefault) {
        PrintTemplate t = new PrintTemplate();
        t.setId(id);
        t.setCategory(category);
        t.setName("Template " + id);
        t.setIsDefault(isDefault);
        return t;
    }

    private static PrintTemplateDTO dto(String category, String name) {
        PrintTemplateDTO d = new PrintTemplateDTO();
        d.setCategory(category);
        d.setName(name);
        d.setPaperSize("A4");
        d.setSettings("{\"accentColor\":\"#2B7A78\"}");
        return d;
    }

    @Test
    void firstTemplateOfATypeBecomesDefault() {
        when(repository.findByCategoryOrderByNameAsc("PURCHASE_ORDER")).thenReturn(List.of());

        PrintTemplateDTO created = service.create(dto("purchase_order", "Classic PO"));

        assertTrue(created.getIsDefault());
        assertEquals("PURCHASE_ORDER", created.getCategory());
        assertEquals("{\"accentColor\":\"#2B7A78\"}", created.getSettings());
    }

    @Test
    void laterTemplatesAreNotDefaultUnlessAsked() {
        when(repository.findByCategoryOrderByNameAsc("PURCHASE_ORDER")).thenReturn(List.of(template(1, "PURCHASE_ORDER", true)));

        assertFalse(service.create(dto("PURCHASE_ORDER", "Second")).getIsDefault());
    }

    @Test
    void settingDefaultClearsTheOtherDefaultOfTheSameType() {
        PrintTemplate current = template(1, "PURCHASE_INVOICE", true);
        PrintTemplate chosen = template(2, "PURCHASE_INVOICE", false);
        when(repository.findById(2L)).thenReturn(Optional.of(chosen));
        when(repository.findByCategoryOrderByNameAsc("PURCHASE_INVOICE")).thenReturn(List.of(current, chosen));

        service.setDefault(2L);

        assertTrue(chosen.getIsDefault());
        assertFalse(current.getIsDefault());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PrintTemplate>> saved = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(saved.capture());
        assertEquals(List.of(current), saved.getValue());
    }

    @Test
    void defaultTemplateCannotBeDeleted() {
        when(repository.findById(1L)).thenReturn(Optional.of(template(1, "PURCHASE_ORDER", true)));

        assertThrows(BusinessRuleViolationException.class, () -> service.delete(1L));
        verify(repository, never()).delete(any());
    }

    @Test
    void defaultBarcodeLabelTemplateCanBeDeleted() {
        PrintTemplate label = template(1, "BARCODE_LABEL", true);
        when(repository.findById(1L)).thenReturn(Optional.of(label));

        service.delete(1L);

        verify(repository).delete(label);
    }

    @Test
    void acceptsBarcodeLabelTemplates() {
        when(repository.findByCategoryOrderByNameAsc("BARCODE_LABEL")).thenReturn(List.of());

        assertEquals("BARCODE_LABEL", service.create(dto("barcode_label", "Shelf 50x25")).getCategory());
    }

    @Test
    void rejectsUnknownTypeAndBlankName() {
        assertThrows(BusinessRuleViolationException.class, () -> service.create(dto("QUOTATION", "X")));
        when(repository.findByCategoryOrderByNameAsc("PURCHASE_ORDER")).thenReturn(List.of());
        assertThrows(BusinessRuleViolationException.class, () -> service.create(dto("PURCHASE_ORDER", "  ")));
    }
}
