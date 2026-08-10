package com.company.project.repositories;

import com.company.project.entities.CreditNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CreditNoteRepository
        extends JpaRepository<CreditNote, Long>, JpaSpecificationExecutor<CreditNote> {
}
