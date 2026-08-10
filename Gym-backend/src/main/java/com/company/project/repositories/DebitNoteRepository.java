package com.company.project.repositories;

import com.company.project.entities.DebitNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DebitNoteRepository
        extends JpaRepository<DebitNote, Long>, JpaSpecificationExecutor<DebitNote> {
}
