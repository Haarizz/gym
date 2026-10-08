package com.company.project.controllers;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.ReturnDTO;
import com.company.project.dto.pos.PosResponses.TransactionDTO;
import com.company.project.dto.pos.PosResponses.TransactionsPage;
import com.company.project.services.pos.PosCheckoutService;
import com.company.project.services.pos.PosReturnService;
import com.company.project.services.pos.PosSalesService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** POS sales: checkout, lookups for reprint/return, returns and reprints. */
@RestController
@RequestMapping("/api/pos/transactions")
public class SaleTransactionController {

    private final PosCheckoutService checkoutService;
    private final PosSalesService salesService;
    private final PosReturnService returnService;

    public SaleTransactionController(PosCheckoutService checkoutService, PosSalesService salesService,
                                     PosReturnService returnService) {
        this.checkoutService = checkoutService;
        this.salesService = salesService;
        this.returnService = returnService;
    }

    /**
     * GET /api/pos/transactions?search=&paymentMethod=&status=&sessionId=&from=&to=&cashier=&memberId=&returnStatus=&page=1&size=20
     */
    @GetMapping
    public ResponseEntity<TransactionsPage> getTransactions(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long sessionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String cashier,
            @RequestParam(required = false) Long memberId,
            @RequestParam(required = false) String returnStatus,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(salesService.list(new PosSalesService.Filter(search, paymentMethod, status, sessionId,
                from, to, cashier, memberId, returnStatus), page, size));
    }

    /** GET /api/pos/transactions/lookup?number=TXN-0000000042 */
    @GetMapping("/lookup")
    public ResponseEntity<TransactionDTO> lookup(@RequestParam String number) {
        return ResponseEntity.ok(salesService.lookup(number));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionDTO> getTransactionById(@PathVariable Long id) {
        return ResponseEntity.ok(salesService.get(id));
    }

    /** POST /api/pos/transactions — complete a sale. */
    @PostMapping
    public ResponseEntity<TransactionDTO> createTransaction(@RequestBody PosRequests.Checkout request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(checkoutService.checkout(request));
    }

    /** POST /api/pos/transactions/{id}/refund — return everything still unreturned, refunded the way it was paid. */
    @PostMapping("/{id}/refund")
    public ResponseEntity<TransactionDTO> refundTransaction(@PathVariable Long id,
                                                            @RequestBody(required = false) PosRequests.Approval approval) {
        return ResponseEntity.ok(returnService.refundAll(id, approval != null ? approval.supervisorPin() : null));
    }

    /** POST /api/pos/transactions/{id}/returns — full or partial return. */
    @PostMapping("/{id}/returns")
    public ResponseEntity<ReturnDTO> createReturn(@PathVariable Long id, @RequestBody PosRequests.SaleReturn request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(returnService.createReturn(id, request));
    }

    @GetMapping("/{id}/returns")
    public ResponseEntity<List<ReturnDTO>> getReturns(@PathVariable Long id) {
        return ResponseEntity.ok(returnService.returnsForSale(id));
    }

    /** POST /api/pos/transactions/{id}/reprint — counts the reprint (receipt prints "COPY / REPRINT"). */
    @PostMapping("/{id}/reprint")
    public ResponseEntity<TransactionDTO> reprint(@PathVariable Long id,
                                                  @RequestBody(required = false) PosRequests.Approval approval) {
        return ResponseEntity.ok(salesService.reprint(id, approval != null ? approval.supervisorPin() : null));
    }
}
