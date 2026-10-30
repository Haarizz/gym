package com.company.project.services;

import com.company.project.dto.CheckInSettingsDTO;
import com.company.project.entities.Attendance;
import com.company.project.entities.CheckInSettings;
import com.company.project.entities.Member;
import com.company.project.exceptions.MinVisitNotReachedException;
import com.company.project.repositories.CheckInSettingsRepository;
import com.company.project.security.BranchContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Per-branch member check-in timing rules: minimum visit length, Take Break length
 * and the gap between visits. A branch with no saved row gets the entity defaults.
 */
@Service
public class CheckInSettingsService {

    /** Upper bound for any of the three values — a full day. */
    private static final int MAX_MINUTES = 24 * 60;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("h:mm a");

    private final CheckInSettingsRepository repository;
    private final BranchSettingsResolver branchSettingsResolver;

    public CheckInSettingsService(CheckInSettingsRepository repository,
                                  BranchSettingsResolver branchSettingsResolver) {
        this.repository = repository;
        this.branchSettingsResolver = branchSettingsResolver;
    }

    /**
     * The rules for this member's check-in: the desk's branch when staff are acting
     * (that's where they're walking in), else the member's home branch (member app).
     */
    @Transactional(readOnly = true)
    public CheckInSettings forMember(Member member) {
        Long branchId = BranchContextHolder.getActiveBranchId();
        if (branchId == null) branchId = member.getBranchId();
        if (branchId == null) branchId = branchSettingsResolver.resolveForRead();
        return forBranch(branchId);
    }

    private CheckInSettings forBranch(Long branchId) {
        return branchId != null
                ? repository.findByBranchId(branchId).orElseGet(CheckInSettings::new)
                : new CheckInSettings();
    }

    @Transactional(readOnly = true)
    public CheckInSettingsDTO get() {
        return toDto(forBranch(branchSettingsResolver.resolveForRead()));
    }

    @Transactional
    public CheckInSettingsDTO update(CheckInSettingsDTO request) {
        Long branchId = branchSettingsResolver.resolveForWrite();
        CheckInSettings settings = repository.findByBranchId(branchId).orElseGet(() -> {
            CheckInSettings s = new CheckInSettings();
            s.setBranchId(branchId);
            return s;
        });
        if (request.getMinVisitMinutes() != null) {
            settings.setMinVisitMinutes(validate(request.getMinVisitMinutes(), "Minimum visit time"));
        }
        if (request.getBreakGraceMinutes() != null) {
            settings.setBreakGraceMinutes(validate(request.getBreakGraceMinutes(), "Quick break time"));
        }
        if (request.getCooldownMinutes() != null) {
            settings.setCooldownMinutes(validate(request.getCooldownMinutes(), "Time before next check-in"));
        }
        repository.save(settings);
        return toDto(settings);
    }

    /**
     * Refuses a check-out before the minimum visit time. A visit left open from an
     * earlier day is never held back.
     */
    public void enforceMinVisit(Attendance visit, Member member) {
        if (visit.getCheckInTime() == null || AttendanceSessionService.isStale(visit)) return;
        int min = forMember(member).getMinVisitMinutes();
        if (min <= 0) return;
        LocalDateTime earliest = visit.getCheckInTime().plusMinutes(min);
        if (LocalDateTime.now().isBefore(earliest)) {
            throw new MinVisitNotReachedException("Minimum visit time is " + min + " min — check-out is possible from "
                    + earliest.format(TIME_FMT) + ".");
        }
    }

    private static int validate(int minutes, String label) {
        if (minutes < 0 || minutes > MAX_MINUTES) {
            throw new IllegalArgumentException(label + " must be between 0 and " + MAX_MINUTES + " minutes.");
        }
        return minutes;
    }

    private static CheckInSettingsDTO toDto(CheckInSettings s) {
        return new CheckInSettingsDTO(s.getMinVisitMinutes(), s.getBreakGraceMinutes(), s.getCooldownMinutes());
    }
}
