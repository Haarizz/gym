package com.company.project.services;

import com.company.project.dto.CashMovementDTO;
import com.company.project.dto.CashMovementRequestDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.PosSessionRequestDTO;
import com.company.project.dto.PosSessionResponseDTO;
import com.company.project.dto.SaleTransactionPageResponseDTO;
import com.company.project.dto.SaleTransactionResponseDTO;
import com.company.project.dto.SessionReportDTO;
import com.company.project.dto.SessionsPageResponseDTO;
import com.company.project.entities.CashMovement;
import com.company.project.entities.PosSession;
import com.company.project.entities.SaleTransaction;
import com.company.project.entities.SaleTransactionItem;
import com.company.project.repositories.CashMovementRepository;
import com.company.project.repositories.PosSessionRepository;
import com.company.project.repositories.SaleTransactionItemRepository;
import com.company.project.repositories.SaleTransactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class PosSessionService {

    private final PosSessionRepository posSessionRepository;
    private final SaleTransactionRepository saleTransactionRepository;
    private final SaleTransactionItemRepository saleTransactionItemRepository;
    private final CashMovementRepository cashMovementRepository;

    public PosSessionService(PosSessionRepository posSessionRepository,
                             SaleTransactionRepository saleTransactionRepository,
                             SaleTransactionItemRepository saleTransactionItemRepository,
                             CashMovementRepository cashMovementRepository) {
        this.posSessionRepository = posSessionRepository;
        this.saleTransactionRepository = saleTransactionRepository;
        this.saleTransactionItemRepository = saleTransactionItemRepository;
        this.cashMovementRepository = cashMovementRepository;
    }

    // ── Write ────────────────────────────────────────────────────────────────

    public PosSessionResponseDTO openSession(PosSessionRequestDTO req) {
        posSessionRepository.findFirstByStatusOrderByOpenedAtDesc("OPEN").ifPresent(existing -> {
            throw new RuntimeException("An active POS session already exists: " + existing.getSessionNumber());
        });

        PosSession session = new PosSession();
        session.setOpeningCash(req.getOpeningCash());
        session.setOpeningDenominations(req.getOpeningDenominations());
        session.setStaffName(req.getStaffName());
        session.setStatus("OPEN");
        session.setOpenedAt(LocalDateTime.now());

        // Save first to get id
        session = posSessionRepository.save(session);

        // Generate session number after id is known
        session.setSessionNumber("SES-" + String.format("%08d", session.getId()));
        session = posSessionRepository.save(session);

        return buildSessionDTO(session);
    }

    public PosSessionResponseDTO closeSession(Long id, String closingDenominations, BigDecimal closingCash, String notes) {
        PosSession session = posSessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("POS session not found with id: " + id));

        if (!"OPEN".equals(session.getStatus())) {
            throw new RuntimeException("Session is not open");
        }

        session.setStatus("CLOSED");
        session.setClosedAt(LocalDateTime.now());
        session.setClosingCash(closingCash);
        session.setClosingDenominations(closingDenominations);
        if (notes != null) session.setNotes(notes);

        session = posSessionRepository.save(session);
        return buildSessionDTO(session);
    }

    // ── Cash Movements ───────────────────────────────────────────────────────

    public CashMovementDTO addCashMovement(Long sessionId, CashMovementRequestDTO req) {
        posSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        CashMovement movement = new CashMovement();
        movement.setPosSessionId(sessionId);
        movement.setType(req.getType());
        movement.setAmount(req.getAmount());
        movement.setReason(req.getReason());
        return CashMovementDTO.fromEntity(cashMovementRepository.save(movement));
    }

    @Transactional(readOnly = true)
    public List<CashMovementDTO> getCashMovements(Long sessionId) {
        return cashMovementRepository.findByPosSessionIdOrderByCreatedAtDesc(sessionId)
                .stream().map(CashMovementDTO::fromEntity).collect(Collectors.toList());
    }

    // ── Session Report ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SessionReportDTO getSessionReport(Long sessionId) {
        PosSession session = posSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        List<SaleTransaction> transactions = saleTransactionRepository.findByPosSessionIdOrderByCreatedAtDesc(sessionId);
        List<SaleTransaction> completed = transactions.stream()
                .filter(t -> "COMPLETED".equals(t.getStatus())).collect(Collectors.toList());
        List<SaleTransaction> refunded = transactions.stream()
                .filter(t -> "REFUNDED".equals(t.getStatus())).collect(Collectors.toList());

        BigDecimal totalSales = completed.stream()
                .map(SaleTransaction::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalReturns = refunded.stream()
                .map(SaleTransaction::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        // Payment breakdown
        Map<String, List<SaleTransaction>> byPayment = completed.stream()
                .collect(Collectors.groupingBy(SaleTransaction::getPaymentMethod));
        List<SessionReportDTO.PaymentBreakdownItem> paymentBreakdown = byPayment.entrySet().stream()
                .map(e -> new SessionReportDTO.PaymentBreakdownItem(
                        e.getKey(),
                        e.getValue().size(),
                        e.getValue().stream().map(SaleTransaction::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add)
                )).collect(Collectors.toList());

        // Category breakdown — top products by sales
        List<SaleTransactionItem> allItems = completed.stream()
                .flatMap(t -> saleTransactionItemRepository.findByTransactionId(t.getId()).stream())
                .collect(Collectors.toList());
        Map<String, BigDecimal> byProduct = new LinkedHashMap<>();
        Map<String, Integer> byProductQty = new LinkedHashMap<>();
        for (SaleTransactionItem item : allItems) {
            String key = item.getProductName() != null ? item.getProductName() : "Unknown";
            byProduct.merge(key, item.getTotalAmount() != null ? item.getTotalAmount() : BigDecimal.ZERO, BigDecimal::add);
            byProductQty.merge(key, item.getQuantity() != null ? item.getQuantity() : 0, Integer::sum);
        }
        List<SessionReportDTO.CategoryBreakdownItem> categoryBreakdown = byProduct.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .limit(10)
                .map(e -> new SessionReportDTO.CategoryBreakdownItem(
                        e.getKey(),
                        byProductQty.getOrDefault(e.getKey(), 0),
                        e.getValue()))
                .collect(Collectors.toList());

        // Cash movements
        List<CashMovement> movements = cashMovementRepository.findByPosSessionIdOrderByCreatedAtDesc(sessionId);
        List<CashMovementDTO> movementDTOs = movements.stream()
                .map(CashMovementDTO::fromEntity).collect(Collectors.toList());
        BigDecimal totalCashDrops = movements.stream()
                .filter(m -> "DROP_IN".equals(m.getType()))
                .map(CashMovement::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCashOuts = movements.stream()
                .filter(m -> "CASH_OUT".equals(m.getType()))
                .map(CashMovement::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal cashSales = completed.stream()
                .filter(t -> "CASH".equals(t.getPaymentMethod()))
                .map(SaleTransaction::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal openingCash = session.getOpeningCash() != null ? session.getOpeningCash() : BigDecimal.ZERO;
        BigDecimal expectedCash = openingCash.add(cashSales).add(totalCashDrops).subtract(totalCashOuts);

        PosSessionResponseDTO sessionDTO = buildSessionDTO(session);

        return new SessionReportDTO(sessionDTO, totalSales, totalReturns, totalSales.subtract(totalReturns),
                completed.size(), refunded.size(), paymentBreakdown, categoryBreakdown,
                movementDTOs, totalCashDrops, totalCashOuts, cashSales, expectedCash);
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PosSessionResponseDTO getActiveSession() {
        PosSession session = posSessionRepository.findFirstByStatusOrderByOpenedAtDesc("OPEN")
                .orElseThrow(() -> new RuntimeException("No active POS session"));
        return buildSessionDTO(session);
    }

    @Transactional(readOnly = true)
    public PosSessionResponseDTO getSessionById(Long id) {
        PosSession session = posSessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("POS session not found with id: " + id));
        return buildSessionDTO(session);
    }

    @Transactional(readOnly = true)
    public SessionsPageResponseDTO getSessions(int page, int size) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "openedAt"));
        Page<PosSession> sessionPage = posSessionRepository.findAll(pageable);
        List<PosSessionResponseDTO> dtos = sessionPage.getContent().stream()
                .map(this::buildSessionDTO)
                .collect(Collectors.toList());
        PaginationDTO pagination = new PaginationDTO(page, size, sessionPage.getTotalElements(), sessionPage.getTotalPages());
        return new SessionsPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public SaleTransactionPageResponseDTO getSessionTransactions(Long sessionId, int page, int size) {
        posSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("POS session not found with id: " + sessionId));

        List<SaleTransaction> transactions = saleTransactionRepository.findByPosSessionIdOrderByCreatedAtDesc(sessionId);

        int total = transactions.size();
        int fromIndex = Math.min((page - 1) * size, total);
        int toIndex = Math.min(fromIndex + size, total);
        List<SaleTransaction> paged = transactions.subList(fromIndex, toIndex);

        List<SaleTransactionResponseDTO> dtos = paged.stream()
                .map(t -> SaleTransactionResponseDTO.fromEntity(t, saleTransactionItemRepository.findByTransactionId(t.getId())))
                .collect(Collectors.toList());

        int totalPages = (int) Math.ceil((double) total / size);
        PaginationDTO pagination = new PaginationDTO(page, size, total, totalPages);
        return new SaleTransactionPageResponseDTO(dtos, pagination);
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private PosSessionResponseDTO buildSessionDTO(PosSession session) {
        List<SaleTransaction> transactions = saleTransactionRepository.findByPosSessionIdOrderByCreatedAtDesc(session.getId());
        BigDecimal totalSales = transactions.stream()
                .filter(t -> "COMPLETED".equals(t.getStatus()))
                .map(SaleTransaction::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int transactionCount = (int) transactions.stream()
                .filter(t -> "COMPLETED".equals(t.getStatus()))
                .count();
        return PosSessionResponseDTO.fromEntity(session, totalSales, transactionCount);
    }
}
