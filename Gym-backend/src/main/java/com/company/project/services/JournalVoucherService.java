package com.company.project.services;

import com.company.project.dto.JournalVoucherLineDTO;
import com.company.project.dto.JournalVoucherRequestDTO;
import com.company.project.dto.JournalVoucherResponseDTO;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.JournalVoucherLine;
import com.company.project.repositories.JournalVoucherLineRepository;
import com.company.project.repositories.JournalVoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class JournalVoucherService {

    private final JournalVoucherRepository journalVoucherRepository;
    private final JournalVoucherLineRepository lineRepository;

    public JournalVoucherService(JournalVoucherRepository journalVoucherRepository,
                                 JournalVoucherLineRepository lineRepository) {
        this.journalVoucherRepository = journalVoucherRepository;
        this.lineRepository = lineRepository;
    }

    private synchronized String generateVoucherNo() {
        int year = LocalDate.now().getYear();
        String prefix = "JV-" + year + "-";
        Optional<JournalVoucher> last = journalVoucherRepository
                .findTopByVoucherNoStartingWithOrderByVoucherNoDesc(prefix);
        int seq = last.map(jv -> {
            try {
                return Integer.parseInt(jv.getVoucherNo().substring(prefix.length())) + 1;
            } catch (NumberFormatException e) {
                return 1;
            }
        }).orElse(1);
        return String.format("%s%05d", prefix, seq);
    }

    public List<JournalVoucherResponseDTO> getJournalVouchers(String search, String status) {
        List<JournalVoucher> all = journalVoucherRepository.findAllByOrderByDateDesc();
        return all.stream()
                .filter(jv -> {
                    if (search == null || search.isBlank()) return true;
                    String s = search.toLowerCase(Locale.ROOT);
                    return (jv.getVoucherNo() != null && jv.getVoucherNo().toLowerCase(Locale.ROOT).contains(s))
                            || (jv.getNarration() != null && jv.getNarration().toLowerCase(Locale.ROOT).contains(s))
                            || (jv.getReference() != null && jv.getReference().toLowerCase(Locale.ROOT).contains(s));
                })
                .filter(jv -> status == null || status.isBlank() || status.equalsIgnoreCase("all")
                        || (jv.getStatus() != null && jv.getStatus().equalsIgnoreCase(status)))
                .map(jv -> {
                    List<JournalVoucherLine> lines = lineRepository.findByJournalVoucherId(jv.getId());
                    return JournalVoucherResponseDTO.fromEntity(jv, lines);
                })
                .collect(Collectors.toList());
    }

    public JournalVoucherResponseDTO getJournalVoucherById(Long id) {
        JournalVoucher jv = journalVoucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Journal Voucher not found: " + id));
        List<JournalVoucherLine> lines = lineRepository.findByJournalVoucherId(id);
        return JournalVoucherResponseDTO.fromEntity(jv, lines);
    }

    public JournalVoucherResponseDTO createJournalVoucher(JournalVoucherRequestDTO req) {
        List<JournalVoucherLineDTO> lineDTOs = req.getLines() != null ? req.getLines() : Collections.emptyList();
        BigDecimal totalDebit = lineDTOs.stream()
                .map(l -> l.getDebit() != null ? l.getDebit() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCredit = lineDTOs.stream()
                .map(l -> l.getCredit() != null ? l.getCredit() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        JournalVoucher jv = new JournalVoucher();
        jv.setVoucherNo(generateVoucherNo());
        jv.setDate(req.getDate() != null ? req.getDate() : LocalDate.now());
        jv.setNarration(req.getNarration());
        jv.setStatus(req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus() : "DRAFT");
        jv.setReference(req.getReference());
        jv.setTotalDebit(totalDebit);
        jv.setTotalCredit(totalCredit);
        JournalVoucher saved = journalVoucherRepository.save(jv);
        List<JournalVoucherLine> lines = saveLines(saved.getId(), lineDTOs);
        return JournalVoucherResponseDTO.fromEntity(saved, lines);
    }

    public JournalVoucherResponseDTO updateJournalVoucher(Long id, JournalVoucherRequestDTO req) {
        JournalVoucher jv = journalVoucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Journal Voucher not found: " + id));
        if (!"DRAFT".equalsIgnoreCase(jv.getStatus())) {
            throw new RuntimeException("Only DRAFT journal vouchers can be edited");
        }
        List<JournalVoucherLineDTO> lineDTOs = req.getLines() != null ? req.getLines() : Collections.emptyList();
        BigDecimal totalDebit = lineDTOs.stream()
                .map(l -> l.getDebit() != null ? l.getDebit() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCredit = lineDTOs.stream()
                .map(l -> l.getCredit() != null ? l.getCredit() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        jv.setDate(req.getDate() != null ? req.getDate() : jv.getDate());
        jv.setNarration(req.getNarration());
        if (req.getStatus() != null && !req.getStatus().isBlank()) jv.setStatus(req.getStatus());
        jv.setReference(req.getReference());
        jv.setTotalDebit(totalDebit);
        jv.setTotalCredit(totalCredit);
        JournalVoucher saved = journalVoucherRepository.save(jv);
        lineRepository.deleteByJournalVoucherId(id);
        List<JournalVoucherLine> lines = saveLines(id, lineDTOs);
        return JournalVoucherResponseDTO.fromEntity(saved, lines);
    }

    public JournalVoucherResponseDTO postJournalVoucher(Long id) {
        JournalVoucher jv = journalVoucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Journal Voucher not found: " + id));
        if (!"DRAFT".equalsIgnoreCase(jv.getStatus())) {
            throw new RuntimeException("Only DRAFT vouchers can be posted");
        }
        jv.setStatus("POSTED");
        JournalVoucher saved = journalVoucherRepository.save(jv);
        List<JournalVoucherLine> lines = lineRepository.findByJournalVoucherId(id);
        return JournalVoucherResponseDTO.fromEntity(saved, lines);
    }

    public JournalVoucherResponseDTO cancelJournalVoucher(Long id) {
        JournalVoucher jv = journalVoucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Journal Voucher not found: " + id));
        if ("POSTED".equalsIgnoreCase(jv.getStatus())) {
            throw new RuntimeException("Posted vouchers cannot be cancelled directly — reverse them");
        }
        jv.setStatus("CANCELLED");
        JournalVoucher saved = journalVoucherRepository.save(jv);
        List<JournalVoucherLine> lines = lineRepository.findByJournalVoucherId(id);
        return JournalVoucherResponseDTO.fromEntity(saved, lines);
    }

    public void deleteJournalVoucher(Long id) {
        JournalVoucher jv = journalVoucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Journal Voucher not found: " + id));
        if (!"DRAFT".equalsIgnoreCase(jv.getStatus()) && !"CANCELLED".equalsIgnoreCase(jv.getStatus())) {
            throw new RuntimeException("Only DRAFT or CANCELLED vouchers can be deleted");
        }
        lineRepository.deleteByJournalVoucherId(id);
        journalVoucherRepository.delete(jv);
    }

    private List<JournalVoucherLine> saveLines(Long journalVoucherId, List<JournalVoucherLineDTO> lineDTOs) {
        if (lineDTOs == null || lineDTOs.isEmpty()) return Collections.emptyList();
        return lineDTOs.stream().map(dto -> {
            JournalVoucherLine line = new JournalVoucherLine();
            line.setJournalVoucherId(journalVoucherId);
            line.setAccountCode(dto.getAccountCode());
            line.setAccountName(dto.getAccountName());
            line.setDebit(dto.getDebit() != null ? dto.getDebit() : BigDecimal.ZERO);
            line.setCredit(dto.getCredit() != null ? dto.getCredit() : BigDecimal.ZERO);
            line.setDescription(dto.getDescription());
            line.setCostCenter(dto.getCostCenter());
            return lineRepository.save(line);
        }).collect(Collectors.toList());
    }
}
