package com.company.project.controllers;

import com.company.project.dto.dashboard.DashboardDTOs.GenericResponse;
import com.company.project.services.DayReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Reports → Day Report: everything that happened on one date or over a date range
 * (yyyy-MM-dd). Pass either {@code date} or {@code from} + {@code to} (inclusive).
 */
@RestController
@RequestMapping("/api/reports")
public class DayReportController {

    /** Longest range one report may cover — the sections list every row, so keep it bounded. */
    private static final long MAX_DAYS = 366;

    private final DayReportService dayReportService;

    public DayReportController(DayReportService dayReportService) {
        this.dayReportService = dayReportService;
    }

    @GetMapping("/day")
    public ResponseEntity<GenericResponse<?>> day(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from == null) from = date;
        if (to == null) to = from;
        if (from == null) {
            return ResponseEntity.badRequest().body(new GenericResponse<>(false, "Pass a date, or from and to"));
        }
        if (to.isBefore(from)) {
            LocalDate swap = from;
            from = to;
            to = swap;
        }
        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_DAYS) {
            return ResponseEntity.badRequest().body(new GenericResponse<>(false, "The range can cover at most " + MAX_DAYS + " days"));
        }
        return ResponseEntity.ok(new GenericResponse<>(true, dayReportService.build(from, to)));
    }
}
