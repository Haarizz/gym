package com.company.project.dto.mobile.dashboard.trainer;

import java.util.List;

public class TrainerDashboardResponseDTO {
    private TrainerInfoDTO trainerInfo;
    private TrainerDashboardStatsDTO todaysStats;
    private List<TrainerDashboardSessionDTO> todaySessions;

    public TrainerDashboardResponseDTO() {}

    public TrainerDashboardResponseDTO(TrainerInfoDTO trainerInfo, TrainerDashboardStatsDTO todaysStats, List<TrainerDashboardSessionDTO> todaySessions) {
        this.trainerInfo = trainerInfo;
        this.todaysStats = todaysStats;
        this.todaySessions = todaySessions;
    }

    public TrainerInfoDTO getTrainerInfo() {
        return trainerInfo;
    }

    public void setTrainerInfo(TrainerInfoDTO trainerInfo) {
        this.trainerInfo = trainerInfo;
    }

    public TrainerDashboardStatsDTO getTodaysStats() {
        return todaysStats;
    }

    public void setTodaysStats(TrainerDashboardStatsDTO todaysStats) {
        this.todaysStats = todaysStats;
    }

    public List<TrainerDashboardSessionDTO> getTodaySessions() {
        return todaySessions;
    }

    public void setTodaySessions(List<TrainerDashboardSessionDTO> todaySessions) {
        this.todaySessions = todaySessions;
    }
}
