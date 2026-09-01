package com.company.project.dto.payroll;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

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

    public KPIData getKpiData() { return kpiData; }
    public void setKpiData(KPIData kpiData) { this.kpiData = kpiData; }
    public List<ClassBookingTrend> getClassBookingTrends() { return classBookingTrends; }
    public void setClassBookingTrends(List<ClassBookingTrend> classBookingTrends) { this.classBookingTrends = classBookingTrends; }
    public List<PayrollDistribution> getPayrollDistribution() { return payrollDistribution; }
    public void setPayrollDistribution(List<PayrollDistribution> payrollDistribution) { this.payrollDistribution = payrollDistribution; }
    public List<StaffByDepartment> getStaffByDepartment() { return staffByDepartment; }
    public void setStaffByDepartment(List<StaffByDepartment> staffByDepartment) { this.staffByDepartment = staffByDepartment; }
    public List<RecentHire> getRecentHires() { return recentHires; }
    public void setRecentHires(List<RecentHire> recentHires) { this.recentHires = recentHires; }
    public List<UpcomingPayment> getUpcomingPayments() { return upcomingPayments; }
    public void setUpcomingPayments(List<UpcomingPayment> upcomingPayments) { this.upcomingPayments = upcomingPayments; }
    public List<SalaryAdvanceInfo> getSalaryAdvances() { return salaryAdvances; }
    public void setSalaryAdvances(List<SalaryAdvanceInfo> salaryAdvances) { this.salaryAdvances = salaryAdvances; }
    public List<TopPerformingClass> getTopPerformingClasses() { return topPerformingClasses; }
    public void setTopPerformingClasses(List<TopPerformingClass> topPerformingClasses) { this.topPerformingClasses = topPerformingClasses; }

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class KPIData {
        private long totalStaffTrainers;
        private long activeTrainingsClasses;
        private long upcomingBookings;
        private BigDecimal monthlyPayroll;
        private long pendingSalaryPayments;
        private BigDecimal salaryAdvancesOutstanding;

        public long getTotalStaffTrainers() { return totalStaffTrainers; }
        public void setTotalStaffTrainers(long totalStaffTrainers) { this.totalStaffTrainers = totalStaffTrainers; }
        public long getActiveTrainingsClasses() { return activeTrainingsClasses; }
        public void setActiveTrainingsClasses(long activeTrainingsClasses) { this.activeTrainingsClasses = activeTrainingsClasses; }
        public long getUpcomingBookings() { return upcomingBookings; }
        public void setUpcomingBookings(long upcomingBookings) { this.upcomingBookings = upcomingBookings; }
        public BigDecimal getMonthlyPayroll() { return monthlyPayroll; }
        public void setMonthlyPayroll(BigDecimal monthlyPayroll) { this.monthlyPayroll = monthlyPayroll; }
        public long getPendingSalaryPayments() { return pendingSalaryPayments; }
        public void setPendingSalaryPayments(long pendingSalaryPayments) { this.pendingSalaryPayments = pendingSalaryPayments; }
        public BigDecimal getSalaryAdvancesOutstanding() { return salaryAdvancesOutstanding; }
        public void setSalaryAdvancesOutstanding(BigDecimal salaryAdvancesOutstanding) { this.salaryAdvancesOutstanding = salaryAdvancesOutstanding; }
    }

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class ClassBookingTrend {
        private String month;
        private long classes;
        private long bookings;
        private BigDecimal payroll;

        public String getMonth() { return month; }
        public void setMonth(String month) { this.month = month; }
        public long getClasses() { return classes; }
        public void setClasses(long classes) { this.classes = classes; }
        public long getBookings() { return bookings; }
        public void setBookings(long bookings) { this.bookings = bookings; }
        public BigDecimal getPayroll() { return payroll; }
        public void setPayroll(BigDecimal payroll) { this.payroll = payroll; }
    }

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class PayrollDistribution {
        private String category;
        private BigDecimal amount;
        private String color;

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
    }

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class StaffByDepartment {
        private String department;
        private long count;
        private String color;

        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }
        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
    }

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class RecentHire {
        private Long id;
        private String name;
        private String position;
        private String department;
        private LocalDate hireDate;
        private BigDecimal salary;
        private String status;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getPosition() { return position; }
        public void setPosition(String position) { this.position = position; }
        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }
        public LocalDate getHireDate() { return hireDate; }
        public void setHireDate(LocalDate hireDate) { this.hireDate = hireDate; }
        public BigDecimal getSalary() { return salary; }
        public void setSalary(BigDecimal salary) { this.salary = salary; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class UpcomingPayment {
        private Long id;
        private String employee;
        private String position;
        private BigDecimal amount;
        private LocalDate dueDate;
        private String type;
        private String status;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getEmployee() { return employee; }
        public void setEmployee(String employee) { this.employee = employee; }
        public String getPosition() { return position; }
        public void setPosition(String position) { this.position = position; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public LocalDate getDueDate() { return dueDate; }
        public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

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

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getEmployee() { return employee; }
        public void setEmployee(String employee) { this.employee = employee; }
        public String getPosition() { return position; }
        public void setPosition(String position) { this.position = position; }
        public BigDecimal getAdvanceAmount() { return advanceAmount; }
        public void setAdvanceAmount(BigDecimal advanceAmount) { this.advanceAmount = advanceAmount; }
        public LocalDate getIssueDate() { return issueDate; }
        public void setIssueDate(LocalDate issueDate) { this.issueDate = issueDate; }
        public BigDecimal getRemainingBalance() { return remainingBalance; }
        public void setRemainingBalance(BigDecimal remainingBalance) { this.remainingBalance = remainingBalance; }
        public BigDecimal getMonthlyDeduction() { return monthlyDeduction; }
        public void setMonthlyDeduction(BigDecimal monthlyDeduction) { this.monthlyDeduction = monthlyDeduction; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class TopPerformingClass {
        private Long id;
        private String className;
        private String instructor;
        private long bookings;
        private int capacity;
        private BigDecimal revenue;
        private double rating;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getClassName() { return className; }
        public void setClassName(String className) { this.className = className; }
        public String getInstructor() { return instructor; }
        public void setInstructor(String instructor) { this.instructor = instructor; }
        public long getBookings() { return bookings; }
        public void setBookings(long bookings) { this.bookings = bookings; }
        public int getCapacity() { return capacity; }
        public void setCapacity(int capacity) { this.capacity = capacity; }
        public BigDecimal getRevenue() { return revenue; }
        public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }
        public double getRating() { return rating; }
        public void setRating(double rating) { this.rating = rating; }
    }
}
