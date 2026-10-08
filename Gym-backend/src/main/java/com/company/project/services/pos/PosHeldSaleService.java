package com.company.project.services.pos;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.HeldSaleDTO;
import com.company.project.entities.PosHeldSale;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.PosHeldSaleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.company.project.services.pos.PosSupport.r2;
import static com.company.project.services.pos.PosSupport.trimToNull;

/** Parked carts (BillBull's Hold / Recall): stored server-side so any terminal of the branch can recall them. */
@Service
@Transactional
public class PosHeldSaleService {

    private static final int MAX_CART_JSON = 500_000;

    private final PosHeldSaleRepository repository;
    private final PosAuditService auditService;
    private final PosSupport support;
    private final PosMapper mapper;

    public PosHeldSaleService(PosHeldSaleRepository repository, PosAuditService auditService,
                              PosSupport support, PosMapper mapper) {
        this.repository = repository;
        this.auditService = auditService;
        this.support = support;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<HeldSaleDTO> list() {
        return repository.findAllByOrderByCreatedAtDesc().stream().map(mapper::heldSale).toList();
    }

    public HeldSaleDTO hold(PosRequests.HoldSale req) {
        support.requireBranch();
        if (req.cartJson() == null || req.cartJson().isBlank()) throw new BusinessRuleViolationException("The cart is empty.");
        if (req.cartJson().length() > MAX_CART_JSON) throw new BusinessRuleViolationException("The cart is too large to hold.");
        PosHeldSale h = new PosHeldSale();
        h.setPosSessionId(req.posSessionId());
        h.setLabel(trimToNull(req.label()));
        h.setMemberId(req.memberId());
        h.setMemberName(trimToNull(req.memberName()));
        h.setCartJson(req.cartJson());
        h.setItemCount(req.itemCount() == null ? 0 : Math.max(0, req.itemCount()));
        h.setTotal(r2(req.total()));
        h.setHeldBy(support.currentDisplayName());
        h.setTerminalName(trimToNull(req.terminalName()));
        h = repository.save(h);
        h.setHoldNumber("HLD-" + String.format("%06d", h.getId()));
        h = repository.save(h);
        auditService.log("SALE_HOLD", "PosHeldSale", h.getId(), h.getHoldNumber(), h.getPosSessionId(), h.getTotal(),
                h.getItemCount() + " item(s)" + (h.getLabel() != null ? " — " + h.getLabel() : ""), null, h.getTerminalName());
        return mapper.heldSale(h);
    }

    /** Returns the held cart and removes it, so it can only be recalled once. */
    public HeldSaleDTO recall(Long id) {
        support.requireBranch();
        PosHeldSale h = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Held sale not found (it may have been recalled already)."));
        HeldSaleDTO dto = mapper.heldSale(h);
        repository.delete(h);
        auditService.log("SALE_RECALL", "PosHeldSale", h.getId(), h.getHoldNumber(), h.getPosSessionId(), h.getTotal(),
                "Recalled", null, h.getTerminalName());
        return dto;
    }

    public void discard(Long id) {
        support.requireBranch();
        PosHeldSale h = repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Held sale not found."));
        repository.delete(h);
        auditService.log("SALE_HOLD_DISCARD", "PosHeldSale", h.getId(), h.getHoldNumber(), h.getPosSessionId(),
                h.getTotal(), "Discarded", null, h.getTerminalName());
    }
}
