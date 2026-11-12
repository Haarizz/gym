package com.company.project.repositories;

import com.company.project.entities.CreditNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CreditNoteRepository
        extends JpaRepository<CreditNote, Long>, JpaSpecificationExecutor<CreditNote> {

    /** A member's refunds, oldest first (member statement / profile). */
    java.util.List<CreditNote> findByMemberDbIdOrderByDateAscIdAsc(Long memberDbId);

    /** Refunds against one bill (Billing › Refunds caps a new refund at what is left). */
    java.util.List<CreditNote> findByLinkedReceiptId(Long linkedReceiptId);

    /** Billing › Refunds history: member credit notes in a date range, newest first. */
    java.util.List<CreditNote> findByMemberDbIdIsNotNullAndDateBetweenOrderByDateDescIdDesc(
            java.time.LocalDate from, java.time.LocalDate to);
}
