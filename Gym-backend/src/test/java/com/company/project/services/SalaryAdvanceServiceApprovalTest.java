package com.company.project.services;

import com.company.project.dto.SalaryAdvanceApprovalRequestDTO;
import com.company.project.entities.MobilePushToken;
import com.company.project.entities.SalaryAdvance;
import com.company.project.entities.Staff;
import com.company.project.exceptions.UnprocessableRequestException;
import com.company.project.repositories.FinancialSettingRepository;
import com.company.project.repositories.SalaryAdvanceRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.mobile.push.MobilePushTokenRepository;
import com.company.project.services.mobile.push.ExpoPushClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SalaryAdvanceServiceApprovalTest {

    @Mock private SalaryAdvanceRepository advanceRepository;
    @Mock private NotificationService notificationService;
    @Mock private FinancialEventService financialEventService;
    @Mock private StaffRepository staffRepository;
    @Mock private FinancialSettingRepository financialSettingRepository;
    @Mock private MobilePushTokenRepository pushTokenRepository;
    @Mock private ExpoPushClient expoPushClient;
    @Mock private PlatformTransactionManager transactionManager;

    private SalaryAdvanceService service;
    private SalaryAdvance advance;

    @BeforeEach
    void setUp() {
        service = new SalaryAdvanceService(advanceRepository, notificationService, financialEventService,
                staffRepository, financialSettingRepository, pushTokenRepository, expoPushClient, transactionManager);
        advance = new SalaryAdvance();
        advance.setId(5L);
        advance.setEmployeeId("EMP-0010");
        advance.setRequestedAmount(new BigDecimal("1500"));
        advance.setStatus(SalaryAdvanceService.STATUS_PENDING);
        advance.setRequestedByUserId(100L);
        when(advanceRepository.findById(5L)).thenReturn(Optional.of(advance));
        when(advanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(financialSettingRepository.findByCategoryAndBranchIdOrderBySettingKeyAsc(anyString(), any())).thenReturn(List.of());

        Staff staff = new Staff();
        staff.setId(10L);
        staff.setUserId(100L);
        when(staffRepository.findByStaffId("EMP-0010")).thenReturn(Optional.of(staff));
        MobilePushToken token = new MobilePushToken();
        token.setExpoPushToken("ExponentPushToken[x]");
        when(pushTokenRepository.findByStaffIdIn(List.of(10L))).thenReturn(List.of(token));
        when(expoPushClient.send(anyList(), anyString(), anyString(), anyMap()))
                .thenReturn(new ExpoPushClient.SendResult(List.of("ExponentPushToken[x]"), List.of()));
    }

    private static SalaryAdvanceApprovalRequestDTO decision(String status, String amount, String note) {
        SalaryAdvanceApprovalRequestDTO r = new SalaryAdvanceApprovalRequestDTO();
        r.setApprovalStatus(status);
        r.setApprovedAmount(amount != null ? new BigDecimal(amount) : null);
        r.setInstallmentCount(3);
        r.setStartMonth(LocalDate.of(2026, 12, 1));
        r.setApprovalRemarks(note);
        r.setApprovedBy("hr");
        return r;
    }

    @Test
    @DisplayName("Approving an advance that is not pending is refused and posts nothing")
    void approveTwiceRefused() {
        advance.setStatus("Active");
        assertThrows(UnprocessableRequestException.class, () -> service.approveAdvance(5L, decision("Approved", "1500", null)));
        verifyNoInteractions(financialEventService);
        verify(advanceRepository, never()).save(any());
    }

    @Test
    @DisplayName("Approving notifies the employee in-app and by push")
    void approveNotifies() {
        service.approveAdvance(5L, decision("Approved", "1500", null));
        assertEquals("Active", advance.getStatus());
        verify(financialEventService).onSalaryAdvanceDisbursed(advance);
        verify(notificationService).notifyUser(eq(100L), eq("Salary advance approved"),
                contains("AED 1500.00"), anyString(), anyString(), anyString(), eq(5L), anyString(), anyString());
        verify(expoPushClient).send(anyList(), eq("Salary advance approved"), anyString(),
                eq(Map.of("type", SalaryAdvanceService.PUSH_TYPE_DECIDED, "advanceId", 5L)));
    }

    @Test
    @DisplayName("Rejecting keeps the note in its own field")
    void rejectStoresNote() {
        advance.setRemarks("Rent");
        service.approveAdvance(5L, decision("Rejected", null, "Too soon after the last one"));
        assertEquals("Rejected", advance.getStatus());
        assertEquals("Too soon after the last one", advance.getRejectionNote());
        assertEquals("Rent", advance.getRemarks());
        verifyNoInteractions(financialEventService);
        verify(notificationService).notifyUser(eq(100L), eq("Salary advance rejected"),
                contains("Too soon"), anyString(), anyString(), anyString(), eq(5L), anyString(), anyString());
    }
}
