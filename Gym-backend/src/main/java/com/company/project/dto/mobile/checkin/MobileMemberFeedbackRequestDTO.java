package com.company.project.dto.mobile.checkin;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public class MobileMemberFeedbackRequestDTO {

    @JsonProperty("attendance_id")
    @JsonAlias({"attendance_id", "attendanceId"})
    private Long attendanceId;

    @JsonProperty("overall_satisfaction")
    @JsonAlias({"overall_satisfaction", "overallSatisfaction"})
    private Integer overallSatisfaction;

    @JsonProperty("workout_intensity")
    @JsonAlias({"workout_intensity", "workoutIntensity"})
    private Integer workoutIntensity;

    @JsonProperty("trainer_rating")
    @JsonAlias({"trainer_rating", "trainerRating"})
    private Integer trainerRating;

    @JsonProperty("equipment_quality")
    @JsonAlias({"equipment_quality", "equipmentQuality"})
    private Integer equipmentQuality;

    @JsonProperty("facility_rating")
    @JsonAlias({"facility_rating", "facilityRating"})
    private Integer facilityRating;

    @JsonProperty("recommend_workout")
    @JsonAlias({"recommend_workout", "recommendWorkout"})
    private String recommendWorkout;

    @JsonProperty("difficulty_level")
    @JsonAlias({"difficulty_level", "difficultyLevel"})
    private String difficultyLevel;

    @JsonProperty("pace_rating")
    @JsonAlias({"pace_rating", "paceRating"})
    private String paceRating;

    @JsonProperty("best_aspects")
    @JsonAlias({"best_aspects", "bestAspects"})
    private List<String> bestAspects;

    @JsonProperty("areas_for_improvement")
    @JsonAlias({"areas_for_improvement", "areasForImprovement"})
    private List<String> areasForImprovement;

    private String comments;
    private String suggestions;

    @JsonProperty("energy_after_workout")
    @JsonAlias({"energy_after_workout", "energyAfterWorkout"})
    private String energyAfterWorkout;

    @JsonProperty("likely_to_return")
    @JsonAlias({"likely_to_return", "likelyToReturn"})
    private Integer likelyToReturn;

    @JsonProperty("would_recommend_trainer")
    @JsonAlias({"would_recommend_trainer", "wouldRecommendTrainer"})
    private String wouldRecommendTrainer;

    public MobileMemberFeedbackRequestDTO() {}

    public Long getAttendanceId() {
        return attendanceId;
    }

    public void setAttendanceId(Long attendanceId) {
        this.attendanceId = attendanceId;
    }

    public Integer getOverallSatisfaction() {
        return overallSatisfaction;
    }

    public void setOverallSatisfaction(Integer overallSatisfaction) {
        this.overallSatisfaction = overallSatisfaction;
    }

    public Integer getWorkoutIntensity() {
        return workoutIntensity;
    }

    public void setWorkoutIntensity(Integer workoutIntensity) {
        this.workoutIntensity = workoutIntensity;
    }

    public Integer getTrainerRating() {
        return trainerRating;
    }

    public void setTrainerRating(Integer trainerRating) {
        this.trainerRating = trainerRating;
    }

    public Integer getEquipmentQuality() {
        return equipmentQuality;
    }

    public void setEquipmentQuality(Integer equipmentQuality) {
        this.equipmentQuality = equipmentQuality;
    }

    public Integer getFacilityRating() {
        return facilityRating;
    }

    public void setFacilityRating(Integer facilityRating) {
        this.facilityRating = facilityRating;
    }

    public String getRecommendWorkout() {
        return recommendWorkout;
    }

    public void setRecommendWorkout(String recommendWorkout) {
        this.recommendWorkout = recommendWorkout;
    }

    public String getDifficultyLevel() {
        return difficultyLevel;
    }

    public void setDifficultyLevel(String difficultyLevel) {
        this.difficultyLevel = difficultyLevel;
    }

    public String getPaceRating() {
        return paceRating;
    }

    public void setPaceRating(String paceRating) {
        this.paceRating = paceRating;
    }

    public List<String> getBestAspects() {
        return bestAspects;
    }

    public void setBestAspects(List<String> bestAspects) {
        this.bestAspects = bestAspects;
    }

    public List<String> getAreasForImprovement() {
        return areasForImprovement;
    }

    public void setAreasForImprovement(List<String> areasForImprovement) {
        this.areasForImprovement = areasForImprovement;
    }

    public String getComments() {
        return comments;
    }

    public void setComments(String comments) {
        this.comments = comments;
    }

    public String getSuggestions() {
        return suggestions;
    }

    public void setSuggestions(String suggestions) {
        this.suggestions = suggestions;
    }

    public String getEnergyAfterWorkout() {
        return energyAfterWorkout;
    }

    public void setEnergyAfterWorkout(String energyAfterWorkout) {
        this.energyAfterWorkout = energyAfterWorkout;
    }

    public Integer getLikelyToReturn() {
        return likelyToReturn;
    }

    public void setLikelyToReturn(Integer likelyToReturn) {
        this.likelyToReturn = likelyToReturn;
    }

    public String getWouldRecommendTrainer() {
        return wouldRecommendTrainer;
    }

    public void setWouldRecommendTrainer(String wouldRecommendTrainer) {
        this.wouldRecommendTrainer = wouldRecommendTrainer;
    }
}
