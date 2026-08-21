package com.company.project;

import com.company.project.services.PayrollAnalyticsService;
import com.company.project.dto.payroll.PayrollDashboardDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class TestPayrollJson {

    @Autowired
    private PayrollAnalyticsService payrollAnalyticsService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testGetDashboardDataJson() throws Exception {
        PayrollDashboardDTO dto = payrollAnalyticsService.getDashboardData();
        String json = objectMapper.writeValueAsString(dto);
        System.out.println("JSON_OUTPUT: " + json);
    }
}
