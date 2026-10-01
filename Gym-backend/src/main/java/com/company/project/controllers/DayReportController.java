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

/** Reports → Day Report: everything that happened on one date (yyyy-MM-dd). */
@RestController
@RequestMapping("/api/reports")
public class DayReportController {

    private final DayReportService dayReportService;

    public DayReportController(DayReportService dayReportService) {
        this.dayReportService = dayReportService;
    }

    @GetMapping("/day")
    public ResponseEntity<GenericResponse<?>> day(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(new GenericResponse<>(true, dayReportService.build(date)));
    }
}
