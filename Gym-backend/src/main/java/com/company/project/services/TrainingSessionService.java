package com.company.project.services;

import com.company.project.dto.TrainingSessionRequestDTO;
import com.company.project.dto.TrainingSessionResponseDTO;
import com.company.project.entities.Staff;
import com.company.project.entities.TrainingSession;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.TrainingSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TrainingSessionService {

    private final TrainingSessionRepository sessionRepository;
    private final BookingRepository bookingRepository;
    private final StaffRepository staffRepository;

    public TrainingSessionService(TrainingSessionRepository sessionRepository,
                                  BookingRepository bookingRepository,
                                  StaffRepository staffRepository) {
        this.sessionRepository = sessionRepository;
        this.bookingRepository = bookingRepository;
        this.staffRepository = staffRepository;
    }

    public List<TrainingSessionResponseDTO> getSessions(String type,
                                                        Long trainerId,
                                                        LocalDate startDate,
                                                        LocalDate endDate,
                                                        String search) {
        List<TrainingSession> sessions = sessionRepository.findAll();

        if (StringUtils.hasText(type)) {
            sessions = sessions.stream()
                    .filter(s -> type.equalsIgnoreCase(s.getType()))
                    .collect(Collectors.toList());
        }
        if (trainerId != null) {
            sessions = sessions.stream()
                    .filter(s -> s.getTrainer() != null && trainerId.equals(s.getTrainer().getId()))
                    .collect(Collectors.toList());
        }
        if (startDate != null) {
            sessions = sessions.stream()
                    .filter(s -> s.getDate() != null && !s.getDate().isBefore(startDate))
                    .collect(Collectors.toList());
        }
        if (endDate != null) {
            sessions = sessions.stream()
                    .filter(s -> s.getDate() != null && !s.getDate().isAfter(endDate))
                    .collect(Collectors.toList());
        }
        if (StringUtils.hasText(search)) {
            String lowered = search.toLowerCase();
            sessions = sessions.stream()
                    .filter(s ->
                            (s.getName() != null && s.getName().toLowerCase().contains(lowered))
                            || (s.getLocation() != null && s.getLocation().toLowerCase().contains(lowered))
                            || (s.getTrainer() != null && s.getTrainer().getName() != null
                                && s.getTrainer().getName().toLowerCase().contains(lowered))
                    )
                    .collect(Collectors.toList());
        }

        Map<Long, Integer> bookedCounts = new HashMap<>();
        List<Long> sessionIds = sessions.stream().map(TrainingSession::getId).collect(Collectors.toList());
        if (!sessionIds.isEmpty()) {
            for (Object[] row : bookingRepository.countActiveBySessionIds(sessionIds)) {
                Long sessionId = (Long) row[0];
                Long count = (Long) row[1];
                bookedCounts.put(sessionId, count == null ? 0 : count.intValue());
            }
        }

        List<TrainingSessionResponseDTO> response = new ArrayList<>();
        for (TrainingSession session : sessions) {
            response.add(toResponse(session, bookedCounts.getOrDefault(session.getId(), 0)));
        }
        return response;
    }

    @Transactional
    public TrainingSessionResponseDTO createSession(TrainingSessionRequestDTO request) {
        validateRequest(request);

        TrainingSession session = new TrainingSession();
        applyRequest(session, request);
        sessionRepository.save(session);
        return toResponse(session, 0);
    }

    @Transactional
    public TrainingSessionResponseDTO updateSession(Long id, TrainingSessionRequestDTO request) {
        TrainingSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (request.getCapacity() != null) {
            int booked = Math.toIntExact(bookingRepository.countBySessionIdAndStatusNot(id, "cancelled"));
            if (request.getCapacity() < booked) {
                throw new RuntimeException("Capacity cannot be less than current bookings");
            }
        }

        applyRequest(session, request);
        sessionRepository.save(session);

        int booked = Math.toIntExact(bookingRepository.countBySessionIdAndStatusNot(id, "cancelled"));
        return toResponse(session, booked);
    }

    @Transactional
    public void deleteSession(Long id) {
        bookingRepository.deleteBySessionId(id);
        sessionRepository.deleteById(id);
    }

    private void validateRequest(TrainingSessionRequestDTO request) {
        if (!StringUtils.hasText(request.getName())) {
            throw new RuntimeException("Session name is required");
        }
        if (!StringUtils.hasText(request.getType())) {
            throw new RuntimeException("Session type is required");
        }
        if (request.getDate() == null) {
            throw new RuntimeException("Session date is required");
        }
        if (request.getStartTime() == null || request.getEndTime() == null) {
            throw new RuntimeException("Start and end time are required");
        }
    }

    private void applyRequest(TrainingSession session, TrainingSessionRequestDTO request) {
        if (StringUtils.hasText(request.getName())) {
            session.setName(request.getName());
        }
        if (StringUtils.hasText(request.getType())) {
            session.setType(request.getType());
        }
        if (request.getTrainerId() != null) {
            Staff trainer = staffRepository.findById(request.getTrainerId())
                    .orElseThrow(() -> new RuntimeException("Trainer not found"));
            session.setTrainer(trainer);
        }
        if (request.getDate() != null) {
            session.setDate(request.getDate());
        }
        if (request.getStartTime() != null) {
            session.setStartTime(request.getStartTime());
        }
        if (request.getEndTime() != null) {
            session.setEndTime(request.getEndTime());
        }
        if (request.getLocation() != null) {
            session.setLocation(request.getLocation());
        }
        if (request.getCapacity() != null) {
            session.setCapacity(request.getCapacity());
        }
        if (request.getPrice() != null) {
            session.setPrice(request.getPrice());
        }
        if (request.getStatus() != null) {
            session.setStatus(request.getStatus());
        }
        if (request.getDescription() != null) {
            session.setDescription(request.getDescription());
        }

        if ("pt".equalsIgnoreCase(session.getType()) && (session.getCapacity() == null || session.getCapacity() <= 0)) {
            session.setCapacity(1);
        } else if (session.getCapacity() == null || session.getCapacity() <= 0) {
            session.setCapacity(1);
        }

        Integer durationMinutes = request.getDurationMinutes();
        if (durationMinutes == null && session.getStartTime() != null && session.getEndTime() != null) {
            durationMinutes = calculateDuration(session.getStartTime(), session.getEndTime());
        }
        if (durationMinutes != null) {
            session.setDurationMinutes(durationMinutes);
        }
    }

    private int calculateDuration(LocalTime start, LocalTime end) {
        if (start == null || end == null) return 0;
        long minutes = Duration.between(start, end).toMinutes();
        return (int) Math.max(minutes, 0);
    }

    private TrainingSessionResponseDTO toResponse(TrainingSession session, int booked) {
        TrainingSessionResponseDTO dto = new TrainingSessionResponseDTO();
        dto.setId(String.valueOf(session.getId()));
        dto.setName(session.getName());
        dto.setType(session.getType());
        dto.setTrainerId(session.getTrainer() == null ? null : session.getTrainer().getId());
        dto.setTrainerName(session.getTrainer() == null ? null : session.getTrainer().getName());
        dto.setDate(session.getDate());
        dto.setStartTime(session.getStartTime());
        dto.setEndTime(session.getEndTime());
        dto.setDurationMinutes(session.getDurationMinutes());
        dto.setLocation(session.getLocation());
        dto.setCapacity(session.getCapacity());
        dto.setBooked(booked);
        dto.setPrice(session.getPrice());
        dto.setStatus(session.getStatus());
        dto.setDescription(session.getDescription());
        return dto;
    }
}
