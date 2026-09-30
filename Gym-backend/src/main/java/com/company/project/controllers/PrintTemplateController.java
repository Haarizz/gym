package com.company.project.controllers;

import com.company.project.dto.PrintTemplateDTO;
import com.company.project.services.PrintTemplateService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/print-templates")
public class PrintTemplateController {

    private final PrintTemplateService printTemplateService;

    public PrintTemplateController(PrintTemplateService printTemplateService) {
        this.printTemplateService = printTemplateService;
    }

    /** GET /api/print-templates?category=PURCHASE_ORDER */
    @GetMapping
    public ResponseEntity<List<PrintTemplateDTO>> getAll(@RequestParam(required = false) String category) {
        return ResponseEntity.ok(printTemplateService.getAll(category));
    }

    /** GET /api/print-templates/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<PrintTemplateDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(printTemplateService.getById(id));
    }

    /** POST /api/print-templates */
    @PostMapping
    public ResponseEntity<PrintTemplateDTO> create(@RequestBody PrintTemplateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(printTemplateService.create(dto));
    }

    /** PUT /api/print-templates/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<PrintTemplateDTO> update(@PathVariable Long id, @RequestBody PrintTemplateDTO dto) {
        return ResponseEntity.ok(printTemplateService.update(id, dto));
    }

    /** POST /api/print-templates/{id}/default — makes this the template that prints for its type. */
    @PostMapping("/{id}/default")
    public ResponseEntity<PrintTemplateDTO> setDefault(@PathVariable Long id) {
        return ResponseEntity.ok(printTemplateService.setDefault(id));
    }

    /** DELETE /api/print-templates/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        printTemplateService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
