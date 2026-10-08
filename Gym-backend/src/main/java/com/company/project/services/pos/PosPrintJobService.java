package com.company.project.services.pos;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.*;
import com.company.project.entities.PosPrinter;
import com.company.project.entities.PosPrintJob;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.PosPrintJobRepository;
import com.company.project.repositories.PosPrinterRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

import static com.company.project.services.pos.PosSupport.trimToNull;

/**
 * The POS print queue (BillBull's PosPrintJobService). Every ESC/POS stream for a NETWORK printer is
 * recorded as a job and sent by the server; a failed job keeps its payload so it can be retried
 * (from the till's error or POS Console › Devices). Prints the till sends itself (agent / browser)
 * are reported afterwards, so the print log and device health cover every printer.
 */
@Service
@Transactional(noRollbackFor = BusinessRuleViolationException.class)
public class PosPrintJobService {

    public static final List<String> JOB_TYPES = List.of("RECEIPT", "REPORT", "TEST", "DRAWER_KICK", "OTHER");
    private static final int MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;
    private static final int CONNECT_TIMEOUT_MS = 5000;

    private final PosPrintJobRepository repository;
    private final PosPrinterRepository printerRepository;
    private final PosDeviceService deviceService;
    private final PosSupport support;

    public PosPrintJobService(PosPrintJobRepository repository, PosPrinterRepository printerRepository,
                              PosDeviceService deviceService, PosSupport support) {
        this.repository = repository;
        this.printerRepository = printerRepository;
        this.deviceService = deviceService;
        this.support = support;
    }

    /** Queues and sends a job to a NETWORK printer. A failure is recorded on the job, then reported to the caller. */
    public PrintResult submitNetwork(Long printerId, PosRequests.EscPosPrint req) {
        PosPrinter p = printer(printerId);
        if (!"NETWORK".equals(p.getConnectionType())) throw new BusinessRuleViolationException(p.getName() + " is not a network printer.");
        if (Boolean.FALSE.equals(p.getEnabled())) throw new BusinessRuleViolationException(p.getName() + " is disabled.");
        byte[] data = decode(req.dataBase64());

        PosPrintJob job = new PosPrintJob();
        job.setBranchId(p.getBranchId());
        job.setJobType(jobType(req.jobType(), req.title()));
        job.setPrinterId(p.getId());
        job.setPrinterName(p.getName());
        job.setConnectionType(p.getConnectionType());
        job.setTerminalName(cut(trimToNull(req.terminalName()), 100));
        job.setTitle(cut(trimToNull(req.title()), 200));
        job.setSourceRef(cut(trimToNull(req.sourceRef()), 60));
        job.setPayload(req.dataBase64().trim());
        job.setPayloadBytes(data.length);
        job.setStatus("QUEUED");
        job.setRequestedBy(support.currentUsername());
        job = repository.save(job);
        return dispatch(job, p, data);
    }

    /** A print the till sent itself (agent or browser). */
    public PrintJobDTO report(PosRequests.PrintJobReport req) {
        PosPrintJob job = new PosPrintJob();
        PosPrinter p = req.printerId() == null ? null : printerRepository.findById(req.printerId()).orElse(null);
        job.setBranchId(p != null ? p.getBranchId() : support.requireBranch());
        job.setJobType(jobType(req.jobType(), req.title()));
        job.setPrinterId(p != null ? p.getId() : null);
        job.setPrinterName(p != null ? p.getName() : "Browser print");
        job.setConnectionType(p != null ? p.getConnectionType() : "BROWSER");
        job.setTerminalName(cut(trimToNull(req.terminalName()), 100));
        job.setTitle(cut(trimToNull(req.title()), 200));
        job.setSourceRef(cut(trimToNull(req.sourceRef()), 60));
        job.setPayloadBytes(req.bytes());
        boolean ok = !Boolean.FALSE.equals(req.success());
        LocalDateTime now = LocalDateTime.now();
        job.setStatus(ok ? "SUCCEEDED" : "FAILED");
        job.setAttemptCount(1);
        job.setDispatchedAt(now);
        job.setCompletedAt(now);
        job.setLastError(ok ? null : cut(orElse(req.message(), "Failed"), 1000));
        job.setRequestedBy(support.currentUsername());
        job = repository.save(job);
        if (p != null) deviceService.printerResult(p, ok, ok ? null : job.getLastError(), job.getTerminalName(), job.getJobType());
        return dto(job);
    }

    /** Sends a failed (or stuck) network job again. */
    public PrintJobDTO retry(Long id) {
        PosPrintJob job = find(id);
        if (!"FAILED".equals(job.getStatus()) && !"QUEUED".equals(job.getStatus())) {
            throw new BusinessRuleViolationException("Only a failed or queued job can be retried.");
        }
        if (job.getPayload() == null || job.getPrinterId() == null) {
            throw new BusinessRuleViolationException("This job was printed by the till itself — print it again from there.");
        }
        PosPrinter p = printer(job.getPrinterId());
        if (Boolean.FALSE.equals(p.getEnabled())) throw new BusinessRuleViolationException(p.getName() + " is disabled.");
        try {
            dispatch(job, p, decode(job.getPayload()));
        } catch (BusinessRuleViolationException e) {
            // recorded on the job — the caller gets the job back with its error
        }
        return dto(repository.findById(id).orElse(job));
    }

    public PrintJobDTO cancel(Long id) {
        PosPrintJob job = find(id);
        if (!"FAILED".equals(job.getStatus()) && !"QUEUED".equals(job.getStatus())) {
            throw new BusinessRuleViolationException("Only a failed or queued job can be cancelled.");
        }
        job.setStatus("CANCELLED");
        job.setPayload(null);
        job.setCompletedAt(LocalDateTime.now());
        return dto(repository.save(job));
    }

    @Transactional(readOnly = true)
    public PrintJobsPage list(String status, Long printerId, String jobType, int page, int size) {
        String st = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        String jt = jobType == null ? "" : jobType.trim().toUpperCase(Locale.ROOT);
        Specification<PosPrintJob> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (!st.isEmpty() && !"ALL".equals(st)) p.add(cb.equal(root.get("status"), st));
            if (!jt.isEmpty() && !"ALL".equals(jt)) p.add(cb.equal(root.get("jobType"), jt));
            if (printerId != null) p.add(cb.equal(root.get("printerId"), printerId));
            return cb.and(p.toArray(new Predicate[0]));
        };
        int safe = Math.min(Math.max(size, 1), 100);
        Page<PosPrintJob> result = repository.findAll(spec, PageRequest.of(Math.max(page, 1) - 1, safe, Sort.by(Sort.Direction.DESC, "id")));
        return new PrintJobsPage(result.getContent().stream().map(this::dto).toList(),
                new PageMeta(page, safe, result.getTotalElements(), result.getTotalPages()));
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private PrintResult dispatch(PosPrintJob job, PosPrinter p, byte[] data) {
        LocalDateTime now = LocalDateTime.now();
        job.setAttemptCount((job.getAttemptCount() == null ? 0 : job.getAttemptCount()) + 1);
        job.setDispatchedAt(now);
        job.setStatus("DISPATCHED");
        int port = p.getPortNumber() == null ? 9100 : p.getPortNumber();
        try {
            InetAddress address = PosPrinterService.lanAddress(p.getIpAddress());
            try (Socket socket = new Socket()) {
                socket.connect(new InetSocketAddress(address, port), CONNECT_TIMEOUT_MS);
                socket.setSoTimeout(CONNECT_TIMEOUT_MS);
                OutputStream out = socket.getOutputStream();
                out.write(data);
                out.flush();
            }
        } catch (Exception e) {
            String why = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            job.setStatus("FAILED");
            job.setLastError(cut("Could not reach " + p.getName() + " at " + p.getIpAddress() + ":" + port + " — " + why, 1000));
            job.setCompletedAt(LocalDateTime.now());
            repository.save(job);
            p.setLastTestAt(LocalDateTime.now());
            p.setLastTestResult(cut("FAILED: " + why, 500));
            printerRepository.save(p);
            deviceService.printerResult(p, false, job.getLastError(), job.getTerminalName(), job.getJobType());
            throw new BusinessRuleViolationException(job.getLastError() + " (print job #" + job.getId() + " can be retried)");
        }
        job.setStatus("SUCCEEDED");
        job.setLastError(null);
        job.setPayload(null);
        job.setCompletedAt(LocalDateTime.now());
        repository.save(job);
        deviceService.printerResult(p, true, null, job.getTerminalName(), job.getJobType());
        return new PrintResult(true, data.length, "Sent " + data.length + " bytes to " + p.getName());
    }

    private static byte[] decode(String base64) {
        if (base64 == null || base64.isBlank()) throw new BusinessRuleViolationException("Nothing to print.");
        byte[] data;
        try {
            data = Base64.getDecoder().decode(base64.trim());
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleViolationException("The print data is not valid base64.");
        }
        if (data.length == 0 || data.length > MAX_PAYLOAD_BYTES) throw new BusinessRuleViolationException("The print job is empty or too large.");
        return data;
    }

    static String jobType(String requested, String title) {
        String t = requested == null ? "" : requested.trim().toUpperCase(Locale.ROOT);
        if (JOB_TYPES.contains(t)) return t;
        String lower = title == null ? "" : title.toLowerCase(Locale.ROOT);
        if (lower.contains("drawer")) return "DRAWER_KICK";
        if (lower.contains("test")) return "TEST";
        if (lower.contains("report") || lower.contains("x-report") || lower.contains("z-report")) return "REPORT";
        return "RECEIPT";
    }

    private static String orElse(String v, String fallback) {
        String t = trimToNull(v);
        return t != null ? t : fallback;
    }

    private static String cut(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }

    private PosPrinter printer(Long id) {
        return printerRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Printer not found with id: " + id));
    }

    private PosPrintJob find(Long id) {
        return repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Print job not found with id: " + id));
    }

    PrintJobDTO dto(PosPrintJob j) {
        return new PrintJobDTO(j.getId(), j.getJobType(), j.getPrinterId(), j.getPrinterName(), j.getConnectionType(),
                j.getTerminalName(), j.getTitle(), j.getSourceRef(), j.getPayloadBytes(), j.getStatus(), j.getAttemptCount(),
                j.getMaxAttempts(), j.getLastError(), j.getRequestedBy(), j.getCreatedAt(), j.getDispatchedAt(), j.getCompletedAt(),
                j.getPayload() != null && ("FAILED".equals(j.getStatus()) || "QUEUED".equals(j.getStatus())));
    }
}
