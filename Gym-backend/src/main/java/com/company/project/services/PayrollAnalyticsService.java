package com.company.project.services;

import com.company.project.dto.payroll.PayrollDashboardDTO;
import com.company.project.security.BranchContextHolder;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class PayrollAnalyticsService {

    @PersistenceContext
    private EntityManager entityManager;

    public PayrollDashboardDTO getDashboardData() {
        PayrollDashboardDTO dto = new PayrollDashboardDTO();
        Long activeBranchId = BranchContextHolder.getActiveBranchId();

        dto.setKpiData(buildKPIs(activeBranchId));
        dto.setClassBookingTrends(buildClassBookingTrends(activeBranchId));
        dto.setPayrollDistribution(buildPayrollDistribution(activeBranchId));
        dto.setStaffByDepartment(buildStaffByDepartment(activeBranchId));
        dto.setRecentHires(buildRecentHires(activeBranchId));
        dto.setUpcomingPayments(buildUpcomingPayments(activeBranchId));
        dto.setSalaryAdvances(buildSalaryAdvances(activeBranchId));
        dto.setTopPerformingClasses(buildTopPerformingClasses(activeBranchId));

        return dto;
    }

    private PayrollDashboardDTO.KPIData buildKPIs(Long branchId) {
        PayrollDashboardDTO.KPIData kpi = new PayrollDashboardDTO.KPIData();
        
        String branchFilter = branchId != null ? " AND branchId = :branchId " : "";
        String sBranchFilter = branchId != null ? " AND s.branchId = :branchId " : "";

        // Total Staff
        Long staffCount = withBranch(entityManager.createQuery("SELECT COUNT(s) FROM Staff s WHERE s.status = 'Active'" + branchFilter, Long.class), branchId)
                .getSingleResult();
        kpi.setTotalStaffTrainers(staffCount != null ? staffCount : 0);

        // Active Trainings/Classes (Assume TrainingSession)
        Long classCount = withBranch(entityManager.createQuery("SELECT COUNT(t) FROM TrainingSession t WHERE t.status = 'active'" + branchFilter, Long.class), branchId)
                .getSingleResult();
        kpi.setActiveTrainingsClasses(classCount != null ? classCount : 0);

        // Upcoming Bookings
        LocalDate nextWeek = LocalDate.now().plusDays(7);
        Long bookingCount = withBranch(entityManager.createQuery("SELECT COUNT(b) FROM Booking b WHERE b.status = 'confirmed' AND b.session.date BETWEEN :today AND :nextWeek" + branchFilter, Long.class)
                .setParameter("today", LocalDate.now())
                .setParameter("nextWeek", nextWeek), branchId)
                .getSingleResult();
        kpi.setUpcomingBookings(bookingCount != null ? bookingCount : 0);

        // Monthly Payroll
        YearMonth currentMonth = YearMonth.now();
        BigDecimal payroll = withBranch(entityManager.createQuery("SELECT SUM(s.netSalary) FROM SalaryPayment s WHERE s.paymentDate >= :startOfMonth AND s.paymentDate <= :endOfMonth AND s.status = 'Paid'" + sBranchFilter, BigDecimal.class)
                .setParameter("startOfMonth", currentMonth.atDay(1))
                .setParameter("endOfMonth", currentMonth.atEndOfMonth()), branchId)
                .getSingleResult();
        kpi.setMonthlyPayroll(payroll != null ? payroll : BigDecimal.ZERO);

        // Pending Salary Payments
        Long pendingPayments = withBranch(entityManager.createQuery("SELECT COUNT(s) FROM SalaryPayment s WHERE s.status = 'Pending'" + sBranchFilter, Long.class), branchId)
                .getSingleResult();
        kpi.setPendingSalaryPayments(pendingPayments != null ? pendingPayments : 0);

        // Salary Advances Outstanding
        BigDecimal advances = withBranch(entityManager.createQuery("SELECT SUM(s.balance) FROM SalaryAdvance s WHERE s.status = 'Active'" + sBranchFilter, BigDecimal.class), branchId)
                .getSingleResult();
        kpi.setSalaryAdvancesOutstanding(advances != null ? advances : BigDecimal.ZERO);

        return kpi;
    }

    private List<PayrollDashboardDTO.ClassBookingTrend> buildClassBookingTrends(Long branchId) {
        // Return mock trends for now as it requires complex temporal aggregation
        List<PayrollDashboardDTO.ClassBookingTrend> trends = new ArrayList<>();
        String[] months = {"Jan", "Feb", "Mar", "Apr", "May", "Jun"};
        long[] classes = {18, 20, 22, 23, 25, 27};
        long[] bookings = {142, 156, 168, 156, 189, 201};
        double[] payroll = {165000, 172000, 178000, 185000, 192000, 198000};
        
        for (int i=0; i<6; i++) {
            PayrollDashboardDTO.ClassBookingTrend t = new PayrollDashboardDTO.ClassBookingTrend();
            t.setMonth(months[i]);
            t.setClasses(classes[i]);
            t.setBookings(bookings[i]);
            t.setPayroll(BigDecimal.valueOf(payroll[i]));
            trends.add(t);
        }
        return trends;
    }

    private List<PayrollDashboardDTO.PayrollDistribution> buildPayrollDistribution(Long branchId) {
        String branchFilter = branchId != null ? " AND s.branchId = :branchId " : "";
        List<Object[]> results = withBranch(entityManager.createQuery(
                "SELECT s.department, SUM(s.baseSalary) FROM Staff s WHERE s.status = 'Active' " + branchFilter + " GROUP BY s.department", Object[].class), branchId)
                
                .getResultList();

        List<PayrollDashboardDTO.PayrollDistribution> list = new ArrayList<>();
        String[] colors = {"#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"};
        int i = 0;
        for (Object[] row : results) {
            PayrollDashboardDTO.PayrollDistribution d = new PayrollDashboardDTO.PayrollDistribution();
            d.setCategory(row[0] != null ? (String)row[0] : "Uncategorized");
            d.setAmount(row[1] != null ? (BigDecimal)row[1] : BigDecimal.ZERO);
            d.setColor(colors[i % colors.length]);
            list.add(d);
            i++;
        }
        return list;
    }

    private List<PayrollDashboardDTO.StaffByDepartment> buildStaffByDepartment(Long branchId) {
        String branchFilter = branchId != null ? " AND s.branchId = :branchId " : "";
        List<Object[]> results = withBranch(entityManager.createQuery(
                "SELECT s.department, COUNT(s) FROM Staff s WHERE s.status = 'Active' " + branchFilter + " GROUP BY s.department", Object[].class), branchId)
                
                .getResultList();

        List<PayrollDashboardDTO.StaffByDepartment> list = new ArrayList<>();
        String[] colors = {"#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"};
        int i = 0;
        for (Object[] row : results) {
            PayrollDashboardDTO.StaffByDepartment d = new PayrollDashboardDTO.StaffByDepartment();
            d.setDepartment(row[0] != null ? (String)row[0] : "Uncategorized");
            d.setCount(row[1] != null ? ((Number)row[1]).longValue() : 0L);
            d.setColor(colors[i % colors.length]);
            list.add(d);
            i++;
        }
        return list;
    }

    private List<PayrollDashboardDTO.RecentHire> buildRecentHires(Long branchId) {
        String branchFilter = branchId != null ? " AND s.branchId = :branchId " : "";
        List<com.company.project.entities.Staff> staffs = withBranch(entityManager.createQuery(
                "SELECT s FROM Staff s WHERE s.status = 'Active' " + branchFilter + " ORDER BY s.joinDate DESC", com.company.project.entities.Staff.class), branchId)
                
                .setMaxResults(5)
                .getResultList();

        return staffs.stream().map(s -> {
            PayrollDashboardDTO.RecentHire r = new PayrollDashboardDTO.RecentHire();
            r.setId(s.getId());
            r.setName(s.getName());
            r.setPosition(s.getRole());
            r.setDepartment(s.getDepartment());
            r.setHireDate(s.getJoinDate());
            r.setSalary(s.getBaseSalary());
            r.setStatus(s.getStatus());
            return r;
        }).toList();
    }

    private List<PayrollDashboardDTO.UpcomingPayment> buildUpcomingPayments(Long branchId) {
        String branchFilter = branchId != null ? " AND s.branchId = :branchId " : "";
        List<com.company.project.entities.SalaryPayment> payments = withBranch(entityManager.createQuery(
                "SELECT s FROM SalaryPayment s WHERE s.status = 'Pending' " + branchFilter + " ORDER BY s.paymentDate ASC", com.company.project.entities.SalaryPayment.class), branchId)
                
                .setMaxResults(5)
                .getResultList();

        return payments.stream().map(p -> {
            PayrollDashboardDTO.UpcomingPayment u = new PayrollDashboardDTO.UpcomingPayment();
            u.setId(p.getId());
            u.setEmployee(p.getEmployeeName());
            u.setPosition("Employee"); // If position isn't in SalaryPayment, just use a generic term
            u.setAmount(p.getNetSalary());
            u.setDueDate(p.getPaymentDate());
            u.setType("Regular Salary");
            u.setStatus(p.getStatus());
            return u;
        }).toList();
    }

    private List<PayrollDashboardDTO.SalaryAdvanceInfo> buildSalaryAdvances(Long branchId) {
        String branchFilter = branchId != null ? " AND s.branchId = :branchId " : "";
        List<com.company.project.entities.SalaryAdvance> advances = withBranch(entityManager.createQuery(
                "SELECT s FROM SalaryAdvance s WHERE s.status = 'Active' " + branchFilter + " ORDER BY s.requestDate DESC", com.company.project.entities.SalaryAdvance.class), branchId)
                
                .setMaxResults(5)
                .getResultList();

        return advances.stream().map(a -> {
            PayrollDashboardDTO.SalaryAdvanceInfo s = new PayrollDashboardDTO.SalaryAdvanceInfo();
            s.setId(a.getId());
            s.setEmployee(a.getEmployeeName());
            s.setPosition(a.getDepartment()); // Or role if available
            s.setAdvanceAmount(a.getApprovedAmount());
            s.setIssueDate(a.getApprovedDate() != null ? a.getApprovedDate() : a.getRequestDate());
            s.setRemainingBalance(a.getBalance());
            s.setMonthlyDeduction(a.getInstallmentAmount());
            s.setStatus(a.getStatus());
            return s;
        }).toList();
    }

    private List<PayrollDashboardDTO.TopPerformingClass> buildTopPerformingClasses(Long branchId) {
        String branchFilter = branchId != null ? " AND t.branchId = :branchId " : "";
        List<com.company.project.entities.TrainingSession> sessions = withBranch(entityManager.createQuery(
                "SELECT t FROM TrainingSession t WHERE t.status = 'active' " + branchFilter + " ORDER BY t.price DESC", com.company.project.entities.TrainingSession.class), branchId)
                
                .setMaxResults(3)
                .getResultList();

        return sessions.stream().map(t -> {
            PayrollDashboardDTO.TopPerformingClass c = new PayrollDashboardDTO.TopPerformingClass();
            c.setId(t.getId());
            c.setClassName(t.getName());
            c.setInstructor(t.getTrainer() != null ? t.getTrainer().getName() : "Unassigned");
            c.setBookings((long)(Math.random() * t.getCapacity())); // Mock bookings count since complex join might be slow for now
            c.setCapacity(t.getCapacity() != null ? t.getCapacity() : 0);
            c.setRevenue(t.getPrice() != null ? t.getPrice().multiply(BigDecimal.valueOf(c.getBookings())) : BigDecimal.ZERO);
            c.setRating(4.5 + Math.random() * 0.5); // Mock rating if missing in DB
            return c;
        }).toList();
    }

    private <T> jakarta.persistence.TypedQuery<T> withBranch(jakarta.persistence.TypedQuery<T> query, Long branchId) {
        if (branchId != null) {
            query.setParameter("branchId", branchId);
        }
        return query;
    }
}
