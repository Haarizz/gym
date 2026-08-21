package com.company.project.dto.payroll;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@Data
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class PayrollDashboardDTO {

    private KPIData kpiData;
    private List<ClassBookingTrend> classBookingTrends;
    private List<PayrollDistribution> payrollDistribution;
    private List<StaffByDepartment> staffByDepartment;
    private List<RecentHire> recentHires;
    private List<UpcomingPayment> upcomingPayments;
    private List<SalaryAdvanceInfo> salaryAdvances;
    private List<TopPerformingClass> topPerformingClasses;

    @Data
    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class KPIData {
        private long totalStaffTrainers;
        private long activeTrainingsClasses;
        private long upcomingBookings;
        private BigDecimal monthlyPayroll;
        private long pendingSalaryPayments;
        private BigDecimal salaryAdvancesOutstanding;
    }

    @Data
    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class ClassBookingTrend {
        private String month;
        private long classes;
        private long bookings;
        private BigDecimal payroll;
    }

    @Data
    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class PayrollDistribution {
        private String category;
        private BigDecimal amount;
        private String color;
    }

    @Data
    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class StaffByDepartment {
        private String department;
        private long count;
        private String color;
    }

    @Data
    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class RecentHire {
        private Long id;
        private String name;
        private String position;
        private String department;
        private LocalDate hireDate;
        private BigDecimal salary;
        private String status;
    }

    @Data
    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class UpcomingPayment {
        private Long id;
        private String employee;
        private String position;
        private BigDecimal amount;
        private LocalDate dueDate;
        private String type;
        private String status;
    }

    @Data
    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class SalaryAdvanceInfo {
        private Long id;
        private String employee;
        private String position;
        private BigDecimal advanceAmount;
        private LocalDate issueDate;
        private BigDecimal remainingBalance;
        private BigDecimal monthlyDeduction;
        private String status;
    }

    @Data
    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class TopPerformingClass {
        private Long id;
        private String className;
        private String instructor;
        private long bookings;
        private int capacity;
        private BigDecimal revenue;
        private double rating;
    }
}
