package com.company.project.dto;

import java.time.LocalDateTime;
import java.util.List;

public class WorkoutFeedbackDTO {
    private String id;
    private String sessionId;
    private String memberId;
    private String memberName;
    private String workoutType;
    private String className;
    private String trainerId;
    private String trainerName;
    private LocalDateTime submittedAt;
    
    private Integer overallSatisfaction;
    private Integer workoutIntensity;
    private Integer trainerRating;
    private Integer equipmentQuality;
    private Integer facilityRating;
    
    private String recommendWorkout;
    private String difficultyLevel;
    private String paceRating;
    
    private List<String> bestAspects;
    private List<String> areasForImprovement;
    
    private String comments;
    private String suggestions;
    
    private String energyAfterWorkout;
    private Integer likelyToReturn;
    private String wouldRecommendTrainer;
    
    private String trainerNotes;
    private Boolean followUpRequired;
    private Boolean flaggedForReview;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getWorkoutType() { return workoutType; }
    public void setWorkoutType(String workoutType) { this.workoutType = workoutType; }

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }

    public String getTrainerId() { return trainerId; }
    public void setTrainerId(String trainerId) { this.trainerId = trainerId; }

    public String getTrainerName() { return trainerName; }
    public void setTrainerName(String trainerName) { this.trainerName = trainerName; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public Integer getOverallSatisfaction() { return overallSatisfaction; }
    public void setOverallSatisfaction(Integer overallSatisfaction) { this.overallSatisfaction = overallSatisfaction; }

    public Integer getWorkoutIntensity() { return workoutIntensity; }
    public void setWorkoutIntensity(Integer workoutIntensity) { this.workoutIntensity = workoutIntensity; }

    public Integer getTrainerRating() { return trainerRating; }
    public void setTrainerRating(Integer trainerRating) { this.trainerRating = trainerRating; }

    public Integer getEquipmentQuality() { return equipmentQuality; }
    public void setEquipmentQuality(Integer equipmentQuality) { this.equipmentQuality = equipmentQuality; }

    public Integer getFacilityRating() { return facilityRating; }
    public void setFacilityRating(Integer facilityRating) { this.facilityRating = facilityRating; }

    public String getRecommendWorkout() { return recommendWorkout; }
    public void setRecommendWorkout(String recommendWorkout) { this.recommendWorkout = recommendWorkout; }

    public String getDifficultyLevel() { return difficultyLevel; }
    public void setDifficultyLevel(String difficultyLevel) { this.difficultyLevel = difficultyLevel; }

    public String getPaceRating() { return paceRating; }
    public void setPaceRating(String paceRating) { this.paceRating = paceRating; }

    public List<String> getBestAspects() { return bestAspects; }
    public void setBestAspects(List<String> bestAspects) { this.bestAspects = bestAspects; }

    public List<String> getAreasForImprovement() { return areasForImprovement; }
    public void setAreasForImprovement(List<String> areasForImprovement) { this.areasForImprovement = areasForImprovement; }

    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }

    public String getSuggestions() { return suggestions; }
    public void setSuggestions(String suggestions) { this.suggestions = suggestions; }

    public String getEnergyAfterWorkout() { return energyAfterWorkout; }
    public void setEnergyAfterWorkout(String energyAfterWorkout) { this.energyAfterWorkout = energyAfterWorkout; }

    public Integer getLikelyToReturn() { return likelyToReturn; }
    public void setLikelyToReturn(Integer likelyToReturn) { this.likelyToReturn = likelyToReturn; }

    public String getWouldRecommendTrainer() { return wouldRecommendTrainer; }
    public void setWouldRecommendTrainer(String wouldRecommendTrainer) { this.wouldRecommendTrainer = wouldRecommendTrainer; }

    public String getTrainerNotes() { return trainerNotes; }
    public void setTrainerNotes(String trainerNotes) { this.trainerNotes = trainerNotes; }

    public Boolean getFollowUpRequired() { return followUpRequired; }
    public void setFollowUpRequired(Boolean followUpRequired) { this.followUpRequired = followUpRequired; }

    public Boolean getFlaggedForReview() { return flaggedForReview; }
    public void setFlaggedForReview(Boolean flaggedForReview) { this.flaggedForReview = flaggedForReview; }
}
