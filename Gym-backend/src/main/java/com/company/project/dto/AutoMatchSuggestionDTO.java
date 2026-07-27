package com.company.project.dto;

import java.util.List;

/**
 * One unmatched bank statement line plus the real posted journal vouchers
 * that could match it (exact amount + direction, within a date window),
 * ranked by date proximity. "HIGH" confidence means exactly one candidate
 * was found; "AMBIGUOUS" means more than one line up on amount and the
 * caller must pick which one is correct.
 */
public class AutoMatchSuggestionDTO {

    private Long lineId;
    private String confidence; // HIGH, AMBIGUOUS
    private List<MatchCandidateDTO> candidates;

    public AutoMatchSuggestionDTO() {}

    public AutoMatchSuggestionDTO(Long lineId, String confidence, List<MatchCandidateDTO> candidates) {
        this.lineId = lineId;
        this.confidence = confidence;
        this.candidates = candidates;
    }

    public Long getLineId() { return lineId; }
    public void setLineId(Long lineId) { this.lineId = lineId; }

    public String getConfidence() { return confidence; }
    public void setConfidence(String confidence) { this.confidence = confidence; }

    public List<MatchCandidateDTO> getCandidates() { return candidates; }
    public void setCandidates(List<MatchCandidateDTO> candidates) { this.candidates = candidates; }
}
