package com.company.project;

import com.company.project.dto.RewardRuleRequestDTO;
import com.company.project.services.ReferralService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class RewardRuleTest {

    @Autowired
    private ReferralService referralService;

    @Test
    public void testCreateRule() {
        RewardRuleRequestDTO req = new RewardRuleRequestDTO();
        req.setName("Test Script Rule");
        req.setIsActive(true);
        req.setType("Wallet Credit");
        
        System.out.println("========== RUNNING TEST ==========");
        referralService.createRule(req);
        System.out.println("========== FINISHED TEST ==========");
    }
}
