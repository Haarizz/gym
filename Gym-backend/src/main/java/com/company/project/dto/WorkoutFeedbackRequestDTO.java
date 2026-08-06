package com.company.project.dto;

import java.util.List;

public class WorkoutFeedbackRequestDTO {
    private String sessionId;
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

    // Getters and Setters
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

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
}
