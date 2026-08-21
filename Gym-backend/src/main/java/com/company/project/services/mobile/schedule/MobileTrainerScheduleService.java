package com.company.project.services.mobile.schedule;

import com.company.project.dto.BookingRequestDTO;
import com.company.project.dto.BookingResponseDTO;
import com.company.project.dto.TrainingSessionRequestDTO;
import com.company.project.dto.TrainingSessionResponseDTO;
import com.company.project.dto.mobile.schedule.*;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffScheduleSlot;
import com.company.project.repositories.StaffRepository;
import com.company.project.services.BookingService;
import com.company.project.services.TrainingSessionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MobileTrainerScheduleService {

    private final TrainingSessionService trainingSessionService;
    private final BookingService bookingService;
    private final StaffRepository staffRepository;

    public MobileTrainerScheduleService(TrainingSessionService trainingSessionService,
                                        BookingService bookingService,
                                        StaffRepository staffRepository) {
        this.trainingSessionService = trainingSessionService;
        this.bookingService = bookingService;
        this.staffRepository = staffRepository;
    }

    public MobileScheduleResponseDTO getSchedule(Long staffId, LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new RuntimeException("startDate cannot be after endDate");
        }

        List<TrainingSessionResponseDTO> sessions = trainingSessionService.getSessions(null, staffId, startDate, endDate, null);
        List<BookingResponseDTO> bookings = bookingService.getBookings(null, null, startDate, endDate, null, null);

        Map<String, String> sessionToMemberMap = bookings.stream()
                .filter(b -> !"cancelled".equalsIgnoreCase(b.getStatus()) && b.getSessionId() != null)
                .collect(Collectors.toMap(
                        BookingResponseDTO::getSessionId,
                        b -> b.getMemberName() != null ? b.getMemberName() : "",
                        (existing, replacement) -> existing // If multiple bookings, just take the first one (for PT)
                ));

        MobileScheduleResponseDTO response = new MobileScheduleResponseDTO();
        response.setStartDate(startDate);
        response.setEndDate(endDate);
        response.setTotalSessions(sessions.size());

        Map<LocalDate, List<MobileSessionDTO>> sessionsByDate = sessions.stream()
                .filter(s -> s.getDate() != null)
                .map(s -> {
                    MobileSessionDTO dto = new MobileSessionDTO();
                    dto.setId(Long.parseLong(s.getId()));
                    dto.setStartTime(s.getStartTime());
                    dto.setEndTime(s.getEndTime());
                    dto.setDurationMinutes(s.getDurationMinutes());
                    dto.setType(s.getType());
                    dto.setStatus(s.getStatus());
                    dto.setMemberName(sessionToMemberMap.get(s.getId()));
                    dto.setName(s.getName());
                    return new Object() {
                        LocalDate date = s.getDate();
                        MobileSessionDTO session = dto;
                    };
                })
                .collect(Collectors.groupingBy(o -> o.date, Collectors.mapping(o -> o.session, Collectors.toList())));

        List<MobileScheduleDayDTO> days = new ArrayList<>();
        if (startDate != null && endDate != null) {
            for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
                MobileScheduleDayDTO dayDTO = new MobileScheduleDayDTO();
                dayDTO.setDate(date);
                dayDTO.setDayOfWeek(date.getDayOfWeek().name());
                List<MobileSessionDTO> daySessions = sessionsByDate.getOrDefault(date, new ArrayList<>());
                dayDTO.setSessions(daySessions);
                dayDTO.setSessionCount(daySessions.size());
                days.add(dayDTO);
            }
        } else {
            for (Map.Entry<LocalDate, List<MobileSessionDTO>> entry : sessionsByDate.entrySet()) {
                MobileScheduleDayDTO dayDTO = new MobileScheduleDayDTO();
                dayDTO.setDate(entry.getKey());
                dayDTO.setDayOfWeek(entry.getKey().getDayOfWeek().name());
                dayDTO.setSessions(entry.getValue());
                dayDTO.setSessionCount(entry.getValue().size());
                days.add(dayDTO);
            }
            days.sort((d1, d2) -> d1.getDate().compareTo(d2.getDate()));
        }

        response.setDays(days);
        return response;
    }

    @Transactional
    public MobileSessionDTO createSession(Long staffId, MobileSessionRequestDTO request) {
        validateOverlap(staffId, request.getDate(), request.getStartTime(), request.getEndTime(), null);

        TrainingSessionRequestDTO tsRequest = new TrainingSessionRequestDTO();
        tsRequest.setName(request.getName());
        tsRequest.setType(request.getType());
        tsRequest.setTrainerId(staffId);
        tsRequest.setDate(request.getDate());
        tsRequest.setStartTime(request.getStartTime());
        tsRequest.setEndTime(request.getEndTime());
        tsRequest.setDurationMinutes(request.getDurationMinutes());
        tsRequest.setLocation(request.getLocation());
        tsRequest.setCapacity(request.getCapacity());
        tsRequest.setPrice(request.getPrice());
        tsRequest.setStatus(request.getStatus());
        tsRequest.setDescription(request.getDescription());

        TrainingSessionResponseDTO createdSession = trainingSessionService.createSession(tsRequest);

        String memberName = null;
        if (request.getMemberId() != null) {
            BookingRequestDTO bookingRequest = new BookingRequestDTO();
            bookingRequest.setSessionId(Long.parseLong(createdSession.getId()));
            bookingRequest.setMemberId(request.getMemberId());
            bookingRequest.setStatus("confirmed");
            BookingResponseDTO createdBooking = bookingService.createBooking(bookingRequest);
            memberName = createdBooking.getMemberName();
        }

        return toMobileSessionDTO(createdSession, memberName);
    }

    @Transactional
    public MobileSessionDTO updateSession(Long staffId, Long sessionId, MobileSessionRequestDTO request) {
        verifySessionOwnership(staffId, sessionId);
        validateOverlap(staffId, request.getDate(), request.getStartTime(), request.getEndTime(), sessionId);

        TrainingSessionRequestDTO tsRequest = new TrainingSessionRequestDTO();
        tsRequest.setName(request.getName());
        tsRequest.setType(request.getType());
        tsRequest.setTrainerId(staffId);
        tsRequest.setDate(request.getDate());
        tsRequest.setStartTime(request.getStartTime());
        tsRequest.setEndTime(request.getEndTime());
        tsRequest.setDurationMinutes(request.getDurationMinutes());
        tsRequest.setLocation(request.getLocation());
        tsRequest.setCapacity(request.getCapacity());
        tsRequest.setPrice(request.getPrice());
        tsRequest.setStatus(request.getStatus());
        tsRequest.setDescription(request.getDescription());

        TrainingSessionResponseDTO updatedSession = trainingSessionService.updateSession(sessionId, tsRequest);

        // memberName is not updated here because bookings are managed separately.
        // But we return what we can find.
        List<BookingResponseDTO> bookings = bookingService.getBookings(null, null, null, null, null, null);
        String memberName = bookings.stream()
                .filter(b -> !"cancelled".equalsIgnoreCase(b.getStatus()) && b.getSessionId() != null && b.getSessionId().equals(sessionId.toString()))
                .map(BookingResponseDTO::getMemberName)
                .findFirst()
                .orElse(null);

        return toMobileSessionDTO(updatedSession, memberName);
    }

    @Transactional
    public void deleteSession(Long staffId, Long sessionId) {
        verifySessionOwnership(staffId, sessionId);
        trainingSessionService.deleteSession(sessionId);
    }

    public MobileAvailabilityDTO getAvailability(Long staffId) {
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Staff not found"));
        
        MobileAvailabilityDTO dto = new MobileAvailabilityDTO();
        List<MobileScheduleSlotDTO> slots = staff.getScheduleSlots().stream()
                .map(s -> {
                    MobileScheduleSlotDTO slotDTO = new MobileScheduleSlotDTO();
                    slotDTO.setDay(s.getDay());
                    slotDTO.setSlot(s.getSlot());
                    return slotDTO;
                })
                .collect(Collectors.toList());
        dto.setSlots(slots);
        return dto;
    }

    @Transactional
    public MobileAvailabilityDTO updateAvailability(Long staffId, MobileAvailabilityDTO request) {
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Staff not found"));

        staff.getScheduleSlots().clear();
        
        if (request.getSlots() != null) {
            for (MobileScheduleSlotDTO slotDTO : request.getSlots()) {
                StaffScheduleSlot slot = new StaffScheduleSlot();
                slot.setStaff(staff);
                slot.setDay(slotDTO.getDay());
                slot.setSlot(slotDTO.getSlot());
                staff.getScheduleSlots().add(slot);
            }
        }
        
        staffRepository.save(staff);
        return getAvailability(staffId);
    }

    private void validateOverlap(Long trainerId, LocalDate date, LocalTime startTime, LocalTime endTime, Long excludeSessionId) {
        if (date == null || startTime == null || endTime == null) {
            return; // Can't validate
        }
        List<TrainingSessionResponseDTO> sessions = trainingSessionService.getSessions(null, trainerId, date, date, null);
        for (TrainingSessionResponseDTO session : sessions) {
            if ("cancelled".equalsIgnoreCase(session.getStatus())) {
                continue;
            }
            if (excludeSessionId != null && excludeSessionId.toString().equals(session.getId())) {
                continue;
            }
            LocalTime existingStart = session.getStartTime();
            LocalTime existingEnd = session.getEndTime();
            if (existingStart != null && existingEnd != null) {
                if (existingStart.isBefore(endTime) && existingEnd.isAfter(startTime)) {
                    throw new RuntimeException("Session overlaps with an existing active session");
                }
            }
        }
    }

    private void verifySessionOwnership(Long staffId, Long sessionId) {
        List<TrainingSessionResponseDTO> sessions = trainingSessionService.getSessions(null, staffId, null, null, null);
        boolean owns = sessions.stream().anyMatch(s -> s.getId().equals(sessionId.toString()));
        if (!owns) {
            throw new RuntimeException("Unauthorized: Session does not belong to the authenticated user");
        }
    }

    private MobileSessionDTO toMobileSessionDTO(TrainingSessionResponseDTO dto, String memberName) {
        MobileSessionDTO mobileDto = new MobileSessionDTO();
        mobileDto.setId(Long.parseLong(dto.getId()));
        mobileDto.setStartTime(dto.getStartTime());
        mobileDto.setEndTime(dto.getEndTime());
        mobileDto.setDurationMinutes(dto.getDurationMinutes());
        mobileDto.setType(dto.getType());
        mobileDto.setStatus(dto.getStatus());
        mobileDto.setMemberName(memberName);
        mobileDto.setName(dto.getName());
        return mobileDto;
    }
}
