package com.company.project.services;

import com.company.project.dto.CommissionRuleRequestDTO;
import com.company.project.dto.CommissionRuleResponseDTO;
import com.company.project.entities.CommissionRule;
import com.company.project.repositories.CommissionRuleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class CommissionRuleService {

    private final CommissionRuleRepository ruleRepository;

    public CommissionRuleService(CommissionRuleRepository ruleRepository) {
        this.ruleRepository = ruleRepository;
    }

    @Transactional(readOnly = true)
    public List<CommissionRuleResponseDTO> getAllRules() {
        return ruleRepository.findAll().stream()
                .map(CommissionRuleResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CommissionRuleResponseDTO getRuleById(Long id) {
        CommissionRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Commission rule not found: " + id));
        return CommissionRuleResponseDTO.fromEntity(rule);
    }

    public CommissionRuleResponseDTO createRule(CommissionRuleRequestDTO req) {
        CommissionRule rule = new CommissionRule();
        rule.setRole(req.getRole());
        rule.setBaseCommission(req.getBaseCommission());
        rule.setAdmissionCommission(req.getAdmissionCommission());
        if (req.getTargetBonusesJson() != null) rule.setTargetBonusesJson(req.getTargetBonusesJson());
        return CommissionRuleResponseDTO.fromEntity(ruleRepository.save(rule));
    }

    public CommissionRuleResponseDTO updateRule(Long id, CommissionRuleRequestDTO req) {
        CommissionRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Commission rule not found: " + id));
        if (req.getRole() != null) rule.setRole(req.getRole());
        if (req.getBaseCommission() != null) rule.setBaseCommission(req.getBaseCommission());
        if (req.getAdmissionCommission() != null) rule.setAdmissionCommission(req.getAdmissionCommission());
        if (req.getTargetBonusesJson() != null) rule.setTargetBonusesJson(req.getTargetBonusesJson());
        return CommissionRuleResponseDTO.fromEntity(ruleRepository.save(rule));
    }

    public void deleteRule(Long id) {
        ruleRepository.deleteById(id);
    }
}
