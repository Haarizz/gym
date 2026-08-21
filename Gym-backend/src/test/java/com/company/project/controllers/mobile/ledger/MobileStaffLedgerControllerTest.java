package com.company.project.controllers.mobile.ledger;

import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO;
import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO.*;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.ledger.MobileStaffLedgerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileStaffLedgerControllerTest {

    @Mock
    private MobileStaffLedgerService ledgerService;

    @InjectMocks
    private MobileStaffLedgerController controller;

    private UserDetailsImpl testPrincipal;

    @BeforeEach
    void setUp() {
        testPrincipal = new UserDetailsImpl(100L, "staffuser", "staff@gymbios.com", "password", Collections.emptyList(), true);
    }

    @Test
    @DisplayName("GET /api/mobile/staff/ledger returns 200 OK with ledger data when authenticated")
    void testGetStaffLedgerSuccess() {
        StaffLedgerResponseDTO mockDTO = new StaffLedgerResponseDTO(
                new PeriodDTO(2026, 3, "March 2026"),
                new EarningsSummaryDTO(new BigDecimal("24000"), new BigDecimal("22000"), 9, new BigDecimal("18000"), new BigDecimal("4500")),
                new QuickStatsDTO("+9%", "Mar 30", "5 days"),
                new NextPayoutDTO("2026-03-30", 5),
                List.of(
                        new BreakdownItemDTO("Base Salary", new BigDecimal("18000"), 75.0),
                        new BreakdownItemDTO("Commission", new BigDecimal("4500"), 18.75),
                        new BreakdownItemDTO("Bonuses", new BigDecimal("1500"), 6.25)
                ),
                List.of(
                        new CommissionStructureItemDTO("MEMBERSHIP_SALE", "Membership Sale", "₹1,500"),
                        new CommissionStructureItemDTO("PT_PACKAGE_SALE", "PT Package Sale", "₹1,000")
                ),
                Collections.emptyList(),
                new TaxInfoDTO("2026", new BigDecimal("268000"), new BigDecimal("8040"), new BigDecimal("200000"), new BigDecimal("68000"), 42),
                List.of(new TaxDocumentDTO("1", "Q1 2026 Statement", "Q1 2026", "/api/mobile/staff/ledger/tax-documents/1"))
        );

        when(ledgerService.getStaffLedger(testPrincipal)).thenReturn(mockDTO);

        ResponseEntity<StaffLedgerResponseDTO> response = controller.getStaffLedger(testPrincipal);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(new BigDecimal("24000"), response.getBody().getSummary().getThisMonth());
        assertEquals(9, response.getBody().getSummary().getGrowthPercentage());
        assertEquals(3, response.getBody().getBreakdown().size());
        assertEquals("2026", response.getBody().getTaxInfo().getTaxYear());
    }

    @Test
    @DisplayName("GET /api/mobile/staff/ledger returns 401 Unauthorized when principal is null")
    void testGetStaffLedgerUnauthenticated() {
        ResponseEntity<StaffLedgerResponseDTO> response = controller.getStaffLedger(null);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNull(response.getBody());
        verifyNoInteractions(ledgerService);
    }

    @Test
    @DisplayName("GET /api/mobile/staff/ledger/salary-slip returns 200 OK with document bytes when authenticated")
    void testGetSalarySlipSuccess() {
        byte[] mockBytes = "GYMBIOS PAYROLL ADVICE".getBytes(StandardCharsets.UTF_8);
        when(ledgerService.getSalarySlip(testPrincipal, 2026, 3)).thenReturn(mockBytes);

        ResponseEntity<byte[]> response = controller.getSalarySlip(testPrincipal, 2026, 3);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertArrayEquals(mockBytes, response.getBody());
        assertTrue(response.getHeaders().getFirst("Content-Disposition").contains("salary-slip-2026-3.txt"));
    }

    @Test
    @DisplayName("GET /api/mobile/staff/ledger/salary-slip returns 401 Unauthorized when unauthenticated")
    void testGetSalarySlipUnauthenticated() {
        ResponseEntity<byte[]> response = controller.getSalarySlip(null, 2026, 3);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNull(response.getBody());
        verifyNoInteractions(ledgerService);
    }

    @Test
    @DisplayName("GET /api/mobile/staff/ledger/tax-documents/{id} returns 200 OK with tax document when authenticated")
    void testGetTaxDocumentSuccess() {
        byte[] mockBytes = "GYMBIOS TAX CERTIFICATE".getBytes(StandardCharsets.UTF_8);
        when(ledgerService.getTaxDocument(testPrincipal, "1")).thenReturn(mockBytes);

        ResponseEntity<byte[]> response = controller.getTaxDocument(testPrincipal, "1");

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertArrayEquals(mockBytes, response.getBody());
        assertTrue(response.getHeaders().getFirst("Content-Disposition").contains("tax-statement-1.txt"));
    }

    @Test
    @DisplayName("GET /api/mobile/staff/ledger/tax-documents/{id} returns 401 Unauthorized when unauthenticated")
    void testGetTaxDocumentUnauthenticated() {
        ResponseEntity<byte[]> response = controller.getTaxDocument(null, "1");

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNull(response.getBody());
        verifyNoInteractions(ledgerService);
    }
}
