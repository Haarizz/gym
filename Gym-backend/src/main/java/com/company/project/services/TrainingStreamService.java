package com.company.project.services;

import com.company.project.dto.TrainingStreamAnalyticsDTO;
import com.company.project.dto.TrainingStreamRequestDTO;
import com.company.project.dto.TrainingStreamResponseDTO;
import com.company.project.entities.Staff;
import com.company.project.entities.TrainingStream;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.TrainingStreamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TrainingStreamService {

    private final TrainingStreamRepository streamRepository;
    private final StaffRepository staffRepository;

    public TrainingStreamService(TrainingStreamRepository streamRepository,
                                  StaffRepository staffRepository) {
        this.streamRepository = streamRepository;
        this.staffRepository = staffRepository;
    }

    public List<TrainingStreamResponseDTO> getStreams(String status, String category, String search) {
        List<TrainingStream> streams;

        if (StringUtils.hasText(status) && StringUtils.hasText(category)) {
            streams = streamRepository.findByStatusAndCategory(status, category);
        } else if (StringUtils.hasText(status)) {
            streams = streamRepository.findByStatus(status);
        } else if (StringUtils.hasText(category)) {
            streams = streamRepository.findByCategory(category);
        } else {
            streams = streamRepository.findAll();
        }

        if (StringUtils.hasText(search)) {
            String lowered = search.toLowerCase();
            streams = streams.stream()
                    .filter(s ->
                            (s.getTitle() != null && s.getTitle().toLowerCase().contains(lowered))
                            || (s.getDescription() != null && s.getDescription().toLowerCase().contains(lowered))
                            || (s.getInstructor() != null && s.getInstructor().getName() != null
                                && s.getInstructor().getName().toLowerCase().contains(lowered))
                    )
                    .collect(Collectors.toList());
        }

        return streams.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public TrainingStreamResponseDTO createStream(TrainingStreamRequestDTO request) {
        if (!StringUtils.hasText(request.getTitle())) {
            throw new RuntimeException("Stream title is required");
        }
        if (!StringUtils.hasText(request.getCategory())) {
            throw new RuntimeException("Stream category is required");
        }
        if (request.getDuration() == null || request.getDuration() <= 0) {
            throw new RuntimeException("Stream duration is required");
        }

        TrainingStream stream = new TrainingStream();
        applyRequest(stream, request);
        streamRepository.save(stream);
        return toResponse(stream);
    }

    @Transactional
    public TrainingStreamResponseDTO updateStream(Long id, TrainingStreamRequestDTO request) {
        TrainingStream stream = streamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stream not found"));
        applyRequest(stream, request);
        streamRepository.save(stream);
        return toResponse(stream);
    }

    @Transactional
    public void deleteStream(Long id) {
        if (!streamRepository.existsById(id)) {
            throw new RuntimeException("Stream not found");
        }
        streamRepository.deleteById(id);
    }

    @Transactional
    public TrainingStreamResponseDTO startStream(Long id) {
        TrainingStream stream = streamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stream not found"));
        if (!"Scheduled".equals(stream.getStatus())) {
            throw new RuntimeException("Only scheduled streams can be started");
        }
        stream.setStatus("Live");
        streamRepository.save(stream);
        return toResponse(stream);
    }

    @Transactional
    public TrainingStreamResponseDTO endStream(Long id) {
        TrainingStream stream = streamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stream not found"));
        if (!"Live".equals(stream.getStatus())) {
            throw new RuntimeException("Only live streams can be ended");
        }
        stream.setStatus("Ended");
        stream.setParticipants(0);
        streamRepository.save(stream);
        return toResponse(stream);
    }

    public TrainingStreamAnalyticsDTO getAnalytics() {
        TrainingStreamAnalyticsDTO analytics = new TrainingStreamAnalyticsDTO();
        analytics.setLiveCount(streamRepository.countLive());
        analytics.setScheduledCount(streamRepository.countScheduled());
        analytics.setActiveViewers(streamRepository.sumActiveParticipants());
        analytics.setAvgViews(Math.round(streamRepository.avgViews()));
        analytics.setTotalStreams(streamRepository.count());
        analytics.setTotalViews(streamRepository.sumViews());
        analytics.setEngagementRate(73); // can be computed from views vs likes in future

        List<Map<String, Object>> categoryStats = new ArrayList<>();
        for (Object[] row : streamRepository.countByCategory()) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("category", row[0]);
            entry.put("count", row[1]);
            categoryStats.add(entry);
        }
        analytics.setCategoryStats(categoryStats);

        return analytics;
    }

    private void applyRequest(TrainingStream stream, TrainingStreamRequestDTO request) {
        if (StringUtils.hasText(request.getTitle())) {
            stream.setTitle(request.getTitle());
        }
        if (request.getInstructorId() != null) {
            Staff instructor = staffRepository.findById(request.getInstructorId())
                    .orElseThrow(() -> new RuntimeException("Instructor not found"));
            stream.setInstructor(instructor);
        }
        if (StringUtils.hasText(request.getCategory())) {
            stream.setCategory(request.getCategory());
        }
        if (request.getDuration() != null) {
            stream.setDuration(request.getDuration());
        }
        if (request.getDifficulty() != null) {
            stream.setDifficulty(request.getDifficulty());
        }
        if (request.getMaxParticipants() != null) {
            stream.setMaxParticipants(request.getMaxParticipants());
        }
        if (request.getStatus() != null) {
            stream.setStatus(request.getStatus());
        }
        if (request.getScheduledTime() != null) {
            stream.setScheduledTime(request.getScheduledTime());
        }
        if (request.getDescription() != null) {
            stream.setDescription(request.getDescription());
        }
        if (request.getStreamUrl() != null) {
            stream.setStreamUrl(request.getStreamUrl());
        }
        if (request.getStreamType() != null) {
            stream.setStreamType(request.getStreamType());
        }
        if (request.getThumbnailUrl() != null) {
            stream.setThumbnailUrl(request.getThumbnailUrl());
        }
    }

    private TrainingStreamResponseDTO toResponse(TrainingStream stream) {
        TrainingStreamResponseDTO dto = new TrainingStreamResponseDTO();
        dto.setId(String.valueOf(stream.getId()));
        dto.setTitle(stream.getTitle());
        dto.setInstructorId(stream.getInstructor() == null ? null : stream.getInstructor().getId());
        dto.setInstructorName(stream.getInstructor() == null ? null : stream.getInstructor().getName());
        dto.setCategory(stream.getCategory());
        dto.setDuration(stream.getDuration());
        dto.setDifficulty(stream.getDifficulty());
        dto.setMaxParticipants(stream.getMaxParticipants());
        dto.setParticipants(stream.getParticipants() == null ? 0 : stream.getParticipants());
        dto.setStatus(stream.getStatus());
        dto.setScheduledTime(stream.getScheduledTime());
        dto.setViews(stream.getViews() == null ? 0 : stream.getViews());
        dto.setLikes(stream.getLikes() == null ? 0 : stream.getLikes());
        dto.setDescription(stream.getDescription());
        dto.setStreamUrl(stream.getStreamUrl());
        dto.setStreamType(stream.getStreamType());
        dto.setThumbnailUrl(stream.getThumbnailUrl());
        return dto;
    }
}
