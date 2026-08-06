package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "workout_feedbacks")
public class WorkoutFeedback extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id", nullable = false)
    private Attendance attendance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt = LocalDateTime.now();

    @Column(name = "overall_satisfaction")
    private Integer overallSatisfaction;

    @Column(name = "workout_intensity")
    private Integer workoutIntensity;

    @Column(name = "trainer_rating")
    private Integer trainerRating;

    @Column(name = "equipment_quality")
    private Integer equipmentQuality;

    @Column(name = "facility_rating")
    private Integer facilityRating;

    @Column(name = "recommend_workout")
    private String recommendWorkout; 

    @Column(name = "difficulty_level")
    private String difficultyLevel; 

    @Column(name = "pace_rating")
    private String paceRating;

    @ElementCollection
    @CollectionTable(name = "workout_feedback_best_aspects", joinColumns = @JoinColumn(name = "feedback_id"))
    @Column(name = "aspect")
    private List<String> bestAspects;

    @ElementCollection
    @CollectionTable(name = "workout_feedback_improvement_areas", joinColumns = @JoinColumn(name = "feedback_id"))
    @Column(name = "area")
    private List<String> areasForImprovement;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column(columnDefinition = "TEXT")
    private String suggestions;

    @Column(name = "energy_after_workout")
    private String energyAfterWorkout;

    @Column(name = "likely_to_return")
    private Integer likelyToReturn;

    @Column(name = "would_recommend_trainer")
    private String wouldRecommendTrainer;

    @Column(columnDefinition = "TEXT", name = "trainer_notes")
    private String trainerNotes;

    @Column(name = "follow_up_required")
    private Boolean followUpRequired = false;

    @Column(name = "flagged_for_review")
    private Boolean flaggedForReview = false;

    public WorkoutFeedback() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Attendance getAttendance() { return attendance; }
    public void setAttendance(Attendance attendance) { this.attendance = attendance; }

    public Member getMember() { return member; }
    public void setMember(Member member) { this.member = member; }

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
