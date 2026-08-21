package com.company.project;

import com.company.project.services.PayrollAnalyticsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class TestPayroll {

    @Autowired
    private PayrollAnalyticsService payrollAnalyticsService;

    @Test
    public void testGetDashboardData() {
        try {
            payrollAnalyticsService.getDashboardData();
            System.out.println("SUCCESS: getDashboardData returned successfully.");
        } catch (Exception e) {
            System.err.println("FAILED WITH EXCEPTION:");
            e.printStackTrace();
        }
    }
}
