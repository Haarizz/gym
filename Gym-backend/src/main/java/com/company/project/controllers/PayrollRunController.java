package com.company.project.controllers;

import com.company.project.services.PayrollRunService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Payroll runs: generate a month as a draft, approve, then pay it in Salary Payments. */
@RestController
@RequestMapping("/api/payroll")
public class PayrollRunController {

    private final PayrollRunService service;

    public PayrollRunController(PayrollRunService service) {
        this.service = service;
    }

    @GetMapping("/runs")
    public List<Map<String, Object>> runs() {
        return service.listRuns();
    }

    @GetMapping("/runs/{id}")
    public Map<String, Object> run(@PathVariable Long id) {
        return service.getRun(id);
    }

    /** Body: { year, month, notes? } — replaces an existing draft of that month. */
    @PostMapping("/runs")
    public Map<String, Object> generate(@RequestBody Map<String, Object> body) {
        int year = Integer.parseInt(String.valueOf(body.get("year")));
        int month = Integer.parseInt(String.valueOf(body.get("month")));
        Object notes = body.get("notes");
        return service.generate(year, month, notes != null ? String.valueOf(notes) : null);
    }

    @PostMapping("/runs/{id}/approve")
    public Map<String, Object> approve(@PathVariable Long id) {
        return service.approve(id);
    }

    /** Back to Draft while nobody on it has been paid. (An approved run is paid in Salary Payments.) */
    @PostMapping("/runs/{id}/reopen")
    public Map<String, Object> reopen(@PathVariable Long id) {
        return service.reopen(id);
    }

    @DeleteMapping("/runs/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteRun(id);
        return ResponseEntity.noContent().build();
    }

    /** Open items to clear before generating the month (pending OT, commission, corrections). */
    @GetMapping("/readiness")
    public Map<String, Object> readiness(@RequestParam int year, @RequestParam int month) {
        return service.readiness(year, month);
    }
}
