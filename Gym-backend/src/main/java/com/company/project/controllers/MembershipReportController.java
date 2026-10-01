package com.company.project.controllers;

import com.company.project.dto.dashboard.DashboardDTOs.GenericResponse;
import com.company.project.services.MembershipLifecycleReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/** Members → Reports: member lifecycle reports (dates are inclusive yyyy-MM-dd). */
@RestController
@RequestMapping("/api/membership-reports")
public class MembershipReportController {

    private final MembershipLifecycleReportService reportService;

    public MembershipReportController(MembershipLifecycleReportService reportService) {
        this.reportService = reportService;
    }

    /** type: expired | expiring | joined */
    @GetMapping("/members")
    public ResponseEntity<GenericResponse<?>> members(
            @RequestParam String type,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(new GenericResponse<>(true, reportService.memberReport(type, from, to)));
    }

    @GetMapping("/freezes")
    public ResponseEntity<GenericResponse<?>> freezes(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(new GenericResponse<>(true, reportService.freezeReport(from, to)));
    }
}
