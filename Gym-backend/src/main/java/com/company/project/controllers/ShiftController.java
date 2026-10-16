package com.company.project.controllers;

import com.company.project.services.ShiftService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Shifts & Schedules: shift templates, assignments and the roster. */
@RestController
@RequestMapping("/api/shifts")
public class ShiftController {

    private final ShiftService shiftService;

    public ShiftController(ShiftService shiftService) {
        this.shiftService = shiftService;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return shiftService.listShifts();
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(shiftService.createShift(body));
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return shiftService.updateShift(id, body);
    }

    @PostMapping("/{id}/duplicate")
    public Map<String, Object> duplicate(@PathVariable Long id) {
        return shiftService.duplicateShift(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        shiftService.deleteShift(id);
        return ResponseEntity.noContent().build();
    }

    /** Every employee with the shift they work on the date (default today). */
    @GetMapping("/schedules")
    public List<Map<String, Object>> schedules(@RequestParam(required = false) String date) {
        return shiftService.employeeSchedules(date != null && !date.isBlank() ? LocalDate.parse(date) : null);
    }

    /** Body: { shift_id, staff_ids: [], effective_from, effective_to? } */
    @PostMapping("/assign")
    public Map<String, Object> assign(@RequestBody Map<String, Object> body) {
        return Map.of("assigned", shiftService.assign(body));
    }

    /** Body: { staff_ids: [], effective_from } */
    @PostMapping("/unassign")
    public Map<String, Object> unassign(@RequestBody Map<String, Object> body) {
        return Map.of("unassigned", shiftService.unassign(body));
    }

    @GetMapping("/roster")
    public Map<String, Object> roster(@RequestParam String from, @RequestParam String to) {
        return shiftService.roster(LocalDate.parse(from), LocalDate.parse(to));
    }

    /** Body: { staff_id, date, mode: shift|off|default, shift_id? } */
    @PostMapping("/roster/day")
    public ResponseEntity<Void> rosterDay(@RequestBody Map<String, Object> body) {
        shiftService.setRosterDay(body);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/roster/copy-week")
    public Map<String, Object> copyWeek(@RequestParam("week_start") String weekStart) {
        return Map.of("copied", shiftService.copyPreviousWeek(LocalDate.parse(weekStart)));
    }
}
