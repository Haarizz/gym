package com.company.project.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class ApplyAccessDaysRequestDTO {

    private Long promotionId;
    private List<Match> matches;

    public ApplyAccessDaysRequestDTO() {}

    public Long getPromotionId() { return promotionId; }
    public void setPromotionId(Long promotionId) { this.promotionId = promotionId; }

    public List<Match> getMatches() { return matches; }
    public void setMatches(List<Match> matches) { this.matches = matches; }

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class Match {
        private String ruleId;
        private String memberId;
        private Integer rewardDays;

        public Match() {}

        public String getRuleId() { return ruleId; }
        public void setRuleId(String ruleId) { this.ruleId = ruleId; }

        public String getMemberId() { return memberId; }
        public void setMemberId(String memberId) { this.memberId = memberId; }

        public Integer getRewardDays() { return rewardDays; }
        public void setRewardDays(Integer rewardDays) { this.rewardDays = rewardDays; }
    }
}
