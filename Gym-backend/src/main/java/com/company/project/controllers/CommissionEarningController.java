package com.company.project.controllers;

import com.company.project.services.CommissionEarningService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.Map;

/** Target & Commission: per staff, month and category figures and the approve -> paid workflow. */
@RestController
@RequestMapping("/api/commission-earnings")
public class CommissionEarningController {

    private final CommissionEarningService service;

    public CommissionEarningController(CommissionEarningService service) {
        this.service = service;
    }

    /** from / to are yyyy-MM (at most 12 months; future months are left out). */
    @GetMapping
    public Map<String, Object> overview(@RequestParam String from, @RequestParam String to,
                                        @RequestParam(name = "staff_id", required = false) Long staffId) {
        return service.overview(YearMonth.parse(from), YearMonth.parse(to), staffId);
    }

    /**
     * action: approve | reject | pay | reset.
     * Body: { staff_id, period: yyyy-MM, category: memberships|pos, note? }
     */
    @PostMapping("/{action}")
    public ResponseEntity<Void> decide(@PathVariable String action, @RequestBody Map<String, Object> body) {
        Long staffId = Long.valueOf(String.valueOf(body.get("staff_id")));
        YearMonth period = YearMonth.parse(String.valueOf(body.get("period")));
        Object note = body.get("note");
        service.decide(staffId, period, String.valueOf(body.get("category")), action,
                note != null && !String.valueOf(note).isBlank() ? String.valueOf(note) : null);
        return ResponseEntity.noContent().build();
    }

    /** Body: { period: yyyy-MM } — approves every pending commission of that month. */
    @PostMapping("/bulk/approve")
    public Map<String, Object> approveAll(@RequestBody Map<String, Object> body) {
        return Map.of("approved", service.approveAll(YearMonth.parse(String.valueOf(body.get("period")))));
    }
}
