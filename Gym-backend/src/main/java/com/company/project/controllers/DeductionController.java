package com.company.project.controllers;

import com.company.project.services.AdvancesDeductionsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Advances & Deductions › Other Deductions and the deduction types behind them. */
@RestController
@RequestMapping("/api/deductions")
public class DeductionController {

    private final AdvancesDeductionsService service;

    public DeductionController(AdvancesDeductionsService service) {
        this.service = service;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return service.listDeductions();
    }

    /** Body: { staff_id, type_id, amount, quantity?, frequency, installments?, start_month, reason?, draft? } */
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createDeduction(body));
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return service.updateDeduction(id, body);
    }

    /** action: submit | approve | reject | pause | resume | cancel */
    @PostMapping("/{id}/{action}")
    public Map<String, Object> changeStatus(@PathVariable Long id, @PathVariable String action) {
        return service.changeDeductionStatus(id, action);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteDeduction(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/types")
    public List<Map<String, Object>> types() {
        return service.listTypes();
    }

    @PostMapping("/types")
    public Map<String, Object> createType(@RequestBody Map<String, Object> body) {
        return service.saveType(null, body);
    }

    @PutMapping("/types/{id}")
    public Map<String, Object> updateType(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return service.saveType(id, body);
    }
}
