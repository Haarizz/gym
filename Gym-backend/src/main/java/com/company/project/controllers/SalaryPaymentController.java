package com.company.project.controllers;

import com.company.project.dto.SalaryPaymentEmployeeRequestDTO;
import com.company.project.dto.SalaryPaymentEmployeeResponseDTO;
import com.company.project.dto.SalaryPaymentRequestDTO;
import com.company.project.dto.SalaryPaymentResponseDTO;
import com.company.project.services.SalaryPaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/salary-payments")
public class SalaryPaymentController {

    private final SalaryPaymentService salaryPaymentService;

    public SalaryPaymentController(SalaryPaymentService salaryPaymentService) {
        this.salaryPaymentService = salaryPaymentService;
    }

    // Employees
    @GetMapping("/employees")
    public ResponseEntity<List<SalaryPaymentEmployeeResponseDTO>> getEmployees(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(salaryPaymentService.getEmployees(search, department, status));
    }

    @PostMapping("/employees")
    public ResponseEntity<SalaryPaymentEmployeeResponseDTO> createEmployee(
            @RequestBody SalaryPaymentEmployeeRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(salaryPaymentService.createEmployee(request));
    }

    @PutMapping("/employees/{id}")
    public ResponseEntity<SalaryPaymentEmployeeResponseDTO> updateEmployee(
            @PathVariable Long id,
            @RequestBody SalaryPaymentEmployeeRequestDTO request) {
        return ResponseEntity.ok(salaryPaymentService.updateEmployee(id, request));
    }

    // Payment history
    @GetMapping
    public ResponseEntity<List<SalaryPaymentResponseDTO>> getPayments(
            @RequestParam(required = false) String employeeId,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(salaryPaymentService.getPayments(employeeId, month, year));
    }

    @PostMapping
    public ResponseEntity<SalaryPaymentResponseDTO> createPayment(
            @RequestBody SalaryPaymentRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(salaryPaymentService.createPayment(request));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<SalaryPaymentResponseDTO>> createBulkPayments(
            @RequestBody List<SalaryPaymentRequestDTO> requests) {
        return ResponseEntity.status(HttpStatus.CREATED).body(salaryPaymentService.createBulkPayments(requests));
    }
}
