package com.company.project.services;

import com.company.project.dto.SalaryPaymentEmployeeRequestDTO;
import com.company.project.dto.SalaryPaymentEmployeeResponseDTO;
import com.company.project.dto.SalaryPaymentRequestDTO;
import com.company.project.dto.SalaryPaymentResponseDTO;
import com.company.project.dto.SplitPaymentDTO;
import com.company.project.entities.SalaryPayment;
import com.company.project.entities.SalaryPaymentEmployee;
import com.company.project.entities.Staff;
import com.company.project.repositories.SalaryPaymentEmployeeRepository;
import com.company.project.repositories.SalaryPaymentRepository;
import com.company.project.repositories.StaffRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class SalaryPaymentService {

    private final SalaryPaymentEmployeeRepository employeeRepository;
    private final SalaryPaymentRepository paymentRepository;
    private final StaffRepository staffRepository;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;
    private final PaymentVoucherService paymentVoucherService;

    public SalaryPaymentService(SalaryPaymentEmployeeRepository employeeRepository,
                                SalaryPaymentRepository paymentRepository,
                                StaffRepository staffRepository,
                                ObjectMapper objectMapper,
                                NotificationService notificationService,
                                PaymentVoucherService paymentVoucherService) {
        this.employeeRepository = employeeRepository;
        this.paymentRepository = paymentRepository;
        this.staffRepository = staffRepository;
        this.objectMapper = objectMapper;
        this.notificationService = notificationService;
        this.paymentVoucherService = paymentVoucherService;
    }

    public List<SalaryPaymentEmployeeResponseDTO> getEmployees(String search, String department, String status) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        boolean hasSearch = !normalizedSearch.isBlank();
        boolean filterDepartment = department != null && !department.isBlank() && !department.equalsIgnoreCase("all");
        boolean filterStatus = status != null && !status.isBlank() && !status.equalsIgnoreCase("all");

        List<Staff> staff = staffRepository.findAll(Sort.by("name"));
        List<Staff> filteredStaff = staff.stream()
                .filter(s -> {
                    if (!hasSearch) return true;
                    return (s.getName() != null && s.getName().toLowerCase(Locale.ROOT).contains(normalizedSearch))
                            || (s.getStaffId() != null && s.getStaffId().toLowerCase(Locale.ROOT).contains(normalizedSearch));
                })
                .filter(s -> !filterDepartment || (s.getDepartment() != null && s.getDepartment().equalsIgnoreCase(department)))
                .collect(Collectors.toList());

        Map<String, Staff> staffById = filteredStaff.stream()
                .filter(s -> s.getStaffId() != null)
                .collect(Collectors.toMap(Staff::getStaffId, Function.identity(), (a, b) -> a));

        List<SalaryPaymentEmployee> employees = employeeRepository.findAll(Sort.by("employeeName"));
        List<SalaryPaymentEmployeeResponseDTO> mappedFromEmployees = employees.stream()
                .filter(e -> {
                    if (!hasSearch) return true;
                    return (e.getEmployeeName() != null && e.getEmployeeName().toLowerCase(Locale.ROOT).contains(normalizedSearch))
                            || (e.getEmployeeId() != null && e.getEmployeeId().toLowerCase(Locale.ROOT).contains(normalizedSearch));
                })
                .filter(e -> !filterDepartment || (e.getDepartment() != null && e.getDepartment().equalsIgnoreCase(department)))
                .filter(e -> !filterStatus || (e.getPaymentStatus() != null && e.getPaymentStatus().equalsIgnoreCase(status)))
                .filter(e -> staffById.isEmpty() || (e.getEmployeeId() != null && staffById.containsKey(e.getEmployeeId())))
                .map(SalaryPaymentEmployeeResponseDTO::fromEntity)
                .collect(Collectors.toList());

        if (!mappedFromEmployees.isEmpty()) {
            return mappedFromEmployees;
        }

        if (filterStatus && !"Pending".equalsIgnoreCase(status)) {
            return new ArrayList<>();
        }

        return filteredStaff.stream()
                .map(this::fromStaff)
                .collect(Collectors.toList());
    }

    public SalaryPaymentEmployeeResponseDTO createEmployee(SalaryPaymentEmployeeRequestDTO req) {
        SalaryPaymentEmployee e = new SalaryPaymentEmployee();
        e.setEmployeeId(req.getEmployeeId());
        e.setEmployeeName(req.getEmployeeName());
        e.setDepartment(req.getDepartment());
        e.setDesignation(req.getDesignation());
        e.setBaseSalary(req.getBaseSalary() != null ? req.getBaseSalary() : BigDecimal.ZERO);
        e.setAllowances(req.getAllowances() != null ? req.getAllowances() : BigDecimal.ZERO);
        e.setDeductions(req.getDeductions() != null ? req.getDeductions() : BigDecimal.ZERO);
        e.setNetSalary(req.getNetSalary() != null ? req.getNetSalary() : BigDecimal.ZERO);
        e.setPaymentStatus(req.getPaymentStatus() != null ? req.getPaymentStatus() : "Pending");
        e.setBankAccount(req.getBankAccount());
        e.setEmail(req.getEmail());
        return SalaryPaymentEmployeeResponseDTO.fromEntity(employeeRepository.save(e));
    }

    public SalaryPaymentEmployeeResponseDTO updateEmployee(Long id, SalaryPaymentEmployeeRequestDTO req) {
        SalaryPaymentEmployee e = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + id));
        if (req.getEmployeeId() != null) e.setEmployeeId(req.getEmployeeId());
        if (req.getEmployeeName() != null) e.setEmployeeName(req.getEmployeeName());
        if (req.getDepartment() != null) e.setDepartment(req.getDepartment());
        if (req.getDesignation() != null) e.setDesignation(req.getDesignation());
        if (req.getBaseSalary() != null) e.setBaseSalary(req.getBaseSalary());
        if (req.getAllowances() != null) e.setAllowances(req.getAllowances());
        if (req.getDeductions() != null) e.setDeductions(req.getDeductions());
        if (req.getNetSalary() != null) e.setNetSalary(req.getNetSalary());
        if (req.getPaymentStatus() != null) e.setPaymentStatus(req.getPaymentStatus());
        if (req.getBankAccount() != null) e.setBankAccount(req.getBankAccount());
        if (req.getEmail() != null) e.setEmail(req.getEmail());
        return SalaryPaymentEmployeeResponseDTO.fromEntity(employeeRepository.save(e));
    }

    public List<SalaryPaymentResponseDTO> getPayments(String employeeId, String month, Integer year) {
        List<SalaryPayment> payments = paymentRepository.findAll(Sort.by(Sort.Direction.DESC, "paymentDate"));
        return payments.stream()
                .filter(p -> employeeId == null || employeeId.isBlank() || employeeId.equalsIgnoreCase(p.getEmployeeId()))
                .filter(p -> month == null || month.isBlank() || month.equalsIgnoreCase(p.getMonth()))
                .filter(p -> year == null || p.getYear() == null || p.getYear().equals(year))
                .map(p -> SalaryPaymentResponseDTO.fromEntity(p, parseSplitPayments(p.getSplitPaymentsJson())))
                .collect(Collectors.toList());
    }

    public SalaryPaymentResponseDTO createPayment(SalaryPaymentRequestDTO req) {
        SalaryPaymentEmployee employee = employeeRepository.findByEmployeeId(req.getEmployeeId())
                .orElseGet(() -> {
                    Staff staff = staffRepository.findByStaffId(req.getEmployeeId()).orElse(null);
                    if (staff == null) {
                        throw new RuntimeException("Employee not found with employeeId: " + req.getEmployeeId());
                    }
                    SalaryPaymentEmployee created = new SalaryPaymentEmployee();
                    created.setEmployeeId(staff.getStaffId());
                    created.setEmployeeName(staff.getName());
                    created.setDepartment(staff.getDepartment());
                    created.setDesignation(staff.getRole());
                    BigDecimal baseSalary = staff.getBaseSalary() != null ? staff.getBaseSalary()
                            : (req.getNetSalary() != null ? req.getNetSalary() : BigDecimal.ZERO);
                    created.setBaseSalary(baseSalary);
                    created.setAllowances(BigDecimal.ZERO);
                    created.setDeductions(BigDecimal.ZERO);
                    created.setNetSalary(req.getNetSalary() != null ? req.getNetSalary() : baseSalary);
                    created.setPaymentStatus("Pending");
                    created.setEmail(staff.getEmail());
                    return employeeRepository.save(created);
                });

        SalaryPayment payment = new SalaryPayment();
        payment.setEmployeeId(req.getEmployeeId());
        payment.setEmployeeName(req.getEmployeeName() != null ? req.getEmployeeName() : employee.getEmployeeName());
        payment.setMonth(req.getMonth());
        payment.setYear(req.getYear());
        payment.setNetSalary(req.getNetSalary() != null ? req.getNetSalary() : employee.getNetSalary());
        payment.setPaymentDate(req.getPaymentDate() != null ? req.getPaymentDate() : LocalDate.now());
        payment.setNotes(req.getNotes());
        payment.setProcessedBy(req.getProcessedBy() != null ? req.getProcessedBy() : "HR Manager");
        payment.setStatus("Paid");
        payment.setSplitPaymentsJson(toSplitJson(req.getSplitPayments()));
        payment = paymentRepository.save(payment);

        employee.setPaymentStatus("Paid");
        employee.setLastPaymentDate(payment.getPaymentDate());
        employeeRepository.save(employee);

        // Post to General Ledger as a debit (expense)
        paymentVoucherService.createPaymentVoucherFromModule(
                payment.getEmployeeName(),
                "Employee",
                "SAL-" + payment.getEmployeeId() + "-" + payment.getMonth() + "-" + payment.getYear(),
                payment.getNetSalary(),
                resolvePrimaryPaymentMethod(req.getSplitPayments()),
                "Salary: " + payment.getEmployeeName() + " – " + payment.getMonth() + "/" + payment.getYear(),
                payment.getNotes()
        );

        notificationService.notifyRoles(
                List.of("ADMIN", "HR"),
                "Salary Payment Processed",
                "Salary for " + payment.getEmployeeName() + " (" + payment.getMonth() + "/" + payment.getYear() +
                ") of AED " + payment.getNetSalary() + " has been processed.",
                "SUCCESS", "HIGH", "PAYROLL",
                payment.getId(), "/salary-payments",
                "PAYROLL_" + payment.getEmployeeId() + "_" + payment.getMonth() + "_" + payment.getYear()
        );

        return SalaryPaymentResponseDTO.fromEntity(payment, parseSplitPayments(payment.getSplitPaymentsJson()));
    }

    public List<SalaryPaymentResponseDTO> createBulkPayments(List<SalaryPaymentRequestDTO> reqs) {
        List<SalaryPaymentResponseDTO> created = new ArrayList<>();
        for (SalaryPaymentRequestDTO req : reqs) {
            created.add(createPayment(req));
        }
        return created;
    }

    private String resolvePrimaryPaymentMethod(List<SplitPaymentDTO> splits) {
        if (splits == null || splits.isEmpty()) return "Bank Transfer";
        return splits.stream()
                .filter(s -> s.getAmount() != null)
                .max(java.util.Comparator.comparing(SplitPaymentDTO::getAmount))
                .map(SplitPaymentDTO::getMode)
                .orElse("Bank Transfer");
    }

    private String toSplitJson(List<SplitPaymentDTO> splits) {
        try {
            if (splits == null) return "[]";
            return objectMapper.writeValueAsString(splits);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<SplitPaymentDTO> parseSplitPayments(String json) {
        try {
            if (json == null || json.isBlank()) return new ArrayList<>();
            return objectMapper.readValue(json, new TypeReference<List<SplitPaymentDTO>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private SalaryPaymentEmployeeResponseDTO fromStaff(Staff staff) {
        SalaryPaymentEmployeeResponseDTO dto = new SalaryPaymentEmployeeResponseDTO();
        dto.setId(staff.getId());
        dto.setEmployeeId(staff.getStaffId() != null ? staff.getStaffId() : String.valueOf(staff.getId()));
        dto.setEmployeeName(staff.getName());
        dto.setDepartment(staff.getDepartment());
        dto.setDesignation(staff.getRole());
        dto.setBaseSalary(staff.getBaseSalary() != null ? staff.getBaseSalary() : BigDecimal.ZERO);
        dto.setAllowances(BigDecimal.ZERO);
        dto.setDeductions(BigDecimal.ZERO);
        dto.setNetSalary(staff.getBaseSalary() != null ? staff.getBaseSalary() : BigDecimal.ZERO);
        dto.setPaymentStatus("Pending");
        dto.setLastPaymentDate(null);
        dto.setBankAccount(null);
        dto.setEmail(staff.getEmail());
        dto.setCreatedAt(staff.getCreatedAt());
        dto.setUpdatedAt(staff.getUpdatedAt());
        return dto;
    }
}
