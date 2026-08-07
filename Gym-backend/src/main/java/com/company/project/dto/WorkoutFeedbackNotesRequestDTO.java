package com.company.project.dto;

public class WorkoutFeedbackNotesRequestDTO {
    private String trainerNotes;
    private Boolean followUpRequired;
    private Boolean flaggedForReview;

    public String getTrainerNotes() { return trainerNotes; }
    public void setTrainerNotes(String trainerNotes) { this.trainerNotes = trainerNotes; }

    public Boolean getFollowUpRequired() { return followUpRequired; }
    public void setFollowUpRequired(Boolean followUpRequired) { this.followUpRequired = followUpRequired; }

    public Boolean getFlaggedForReview() { return flaggedForReview; }
    public void setFlaggedForReview(Boolean flaggedForReview) { this.flaggedForReview = flaggedForReview; }
}
