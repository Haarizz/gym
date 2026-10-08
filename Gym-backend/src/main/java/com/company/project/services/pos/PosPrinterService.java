package com.company.project.services.pos;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.PrintResult;
import com.company.project.dto.pos.PosResponses.PrinterDTO;
import com.company.project.entities.PosPrinter;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.PosPrinterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

import static com.company.project.services.pos.PosSupport.trimToNull;

/**
 * POS receipt printers. NETWORK printers are driven straight from the backend: the
 * browser builds the ESC/POS byte stream and this relays it over a raw TCP socket
 * (port 9100 style) to the printer's LAN address, so it works from any device with no
 * local agent. To keep the relay from being usable as a generic network probe, only
 * literal private / link-local / loopback IPv4 addresses are accepted.
 */
@Service
@Transactional
public class PosPrinterService {

    private static final Set<String> CONNECTIONS = Set.of("BROWSER", "AGENT", "NETWORK");
    private static final Set<String> PAPERS = Set.of("58mm", "80mm", "A4");
    private static final Pattern IPV4 = Pattern.compile("^(25[0-5]|2[0-4]\\d|1?\\d?\\d)(\\.(25[0-5]|2[0-4]\\d|1?\\d?\\d)){3}$");
    private static final int MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;
    private static final int CONNECT_TIMEOUT_MS = 5000;

    private final PosPrinterRepository repository;
    private final PosAuditService auditService;
    private final PosSupport support;
    private final PosMapper mapper;

    public PosPrinterService(PosPrinterRepository repository, PosAuditService auditService,
                             PosSupport support, PosMapper mapper) {
        this.repository = repository;
        this.auditService = auditService;
        this.support = support;
        this.mapper = mapper;
    }

    /** Optional (absent in unit tests): the print queue and the device register. */
    private PosPrintJobService printJobService;
    private PosDeviceService deviceService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setDeviceManager(@org.springframework.context.annotation.Lazy PosPrintJobService printJobService,
                                 @org.springframework.context.annotation.Lazy PosDeviceService deviceService) {
        this.printJobService = printJobService;
        this.deviceService = deviceService;
    }

    @Transactional(readOnly = true)
    public List<PrinterDTO> list() {
        return repository.findAllByOrderByIsDefaultDescNameAsc().stream().map(mapper::printer).toList();
    }

    public PrinterDTO create(PosRequests.Printer req) {
        support.requireBranch();
        PosPrinter p = new PosPrinter();
        apply(p, req);
        p = repository.save(p);
        if (Boolean.TRUE.equals(p.getIsDefault())) clearOtherDefaults(p.getId());
        if (deviceService != null) deviceService.syncPrinter(p, support.requireBranch());
        auditService.log("PRINTER_ADD", "PosPrinter", p.getId(), p.getName(), null, null, p.getConnectionType(), null, null);
        return mapper.printer(p);
    }

    public PrinterDTO update(Long id, PosRequests.Printer req) {
        support.requireBranch();
        PosPrinter p = find(id);
        apply(p, req);
        p = repository.save(p);
        if (Boolean.TRUE.equals(p.getIsDefault())) clearOtherDefaults(p.getId());
        if (deviceService != null) deviceService.syncPrinter(p, support.requireBranch());
        auditService.log("PRINTER_UPDATE", "PosPrinter", p.getId(), p.getName(), null, null, p.getConnectionType(), null, null);
        return mapper.printer(p);
    }

    public void delete(Long id) {
        support.requireBranch();
        PosPrinter p = find(id);
        repository.delete(p);
        repository.flush();
        if (deviceService != null) deviceService.syncPrinters();
        auditService.log("PRINTER_DELETE", "PosPrinter", id, p.getName(), null, null, null, null, null);
    }

    public PrinterDTO recordTest(Long id, PosRequests.PrinterTestResult req) {
        PosPrinter p = find(id);
        p.setLastTestAt(LocalDateTime.now());
        String msg = trimToNull(req.message());
        String result = (Boolean.TRUE.equals(req.success()) ? "OK" : "FAILED") + (msg != null ? ": " + msg : "");
        p.setLastTestResult(result.length() > 500 ? result.substring(0, 500) : result);
        p = repository.save(p);
        if (deviceService != null) deviceService.printerResult(p, Boolean.TRUE.equals(req.success()), msg, null, "TEST");
        return mapper.printer(p);
    }

    /** Relays a browser-built ESC/POS stream to a NETWORK printer. A failed send is still recorded on the printer. */
    @Transactional(noRollbackFor = BusinessRuleViolationException.class)
    public PrintResult printEscPos(Long id, PosRequests.EscPosPrint req) {
        if (printJobService != null) return printJobService.submitNetwork(id, req);
        PosPrinter p = find(id);
        if (!"NETWORK".equals(p.getConnectionType())) {
            throw new BusinessRuleViolationException(p.getName() + " is not a network printer.");
        }
        if (Boolean.FALSE.equals(p.getEnabled())) throw new BusinessRuleViolationException(p.getName() + " is disabled.");
        if (req.dataBase64() == null || req.dataBase64().isBlank()) throw new BusinessRuleViolationException("Nothing to print.");
        byte[] data;
        try {
            data = Base64.getDecoder().decode(req.dataBase64().trim());
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleViolationException("The print data is not valid base64.");
        }
        if (data.length == 0 || data.length > MAX_PAYLOAD_BYTES) throw new BusinessRuleViolationException("The print job is empty or too large.");

        InetAddress address = lanAddress(p.getIpAddress());
        int port = p.getPortNumber() == null ? 9100 : p.getPortNumber();
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(address, port), CONNECT_TIMEOUT_MS);
            socket.setSoTimeout(CONNECT_TIMEOUT_MS);
            OutputStream out = socket.getOutputStream();
            out.write(data);
            out.flush();
        } catch (Exception e) {
            p.setLastTestAt(LocalDateTime.now());
            String failure = "FAILED: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            p.setLastTestResult(failure.length() > 500 ? failure.substring(0, 500) : failure);
            repository.save(p);
            throw new BusinessRuleViolationException("Could not reach " + p.getName() + " at " + p.getIpAddress() + ":" + port
                    + " — " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
        }
        return new PrintResult(true, data.length, "Sent " + data.length + " bytes to " + p.getName());
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private void apply(PosPrinter p, PosRequests.Printer req) {
        String name = trimToNull(req.name());
        if (name == null) throw new BusinessRuleViolationException("Give the printer a name.");
        String connection = req.connectionType() == null ? "BROWSER" : req.connectionType().trim().toUpperCase(Locale.ROOT);
        if (!CONNECTIONS.contains(connection)) throw new BusinessRuleViolationException("Connection must be BROWSER, AGENT or NETWORK.");
        String paper = req.paperSize() == null ? "80mm" : req.paperSize().trim();
        if (!PAPERS.contains(paper)) throw new BusinessRuleViolationException("Paper size must be 58mm, 80mm or A4.");
        if ("NETWORK".equals(connection)) {
            lanAddress(req.ipAddress());
            int port = req.portNumber() == null ? 9100 : req.portNumber();
            if (port < 1 || port > 65535) throw new BusinessRuleViolationException("Port must be between 1 and 65535.");
            p.setIpAddress(req.ipAddress().trim());
            p.setPortNumber(port);
        } else {
            p.setIpAddress(null);
            p.setPortNumber(null);
        }
        if ("AGENT".equals(connection) && trimToNull(req.systemPrinterName()) == null) {
            throw new BusinessRuleViolationException("Pick the Windows printer the print agent should use.");
        }
        p.setName(name);
        p.setConnectionType(connection);
        p.setSystemPrinterName("AGENT".equals(connection) ? req.systemPrinterName().trim() : null);
        p.setPaperSize(paper);
        p.setTerminalName(trimToNull(req.terminalName()));
        p.setIsDefault(Boolean.TRUE.equals(req.isDefault()));
        p.setOpenDrawer(Boolean.TRUE.equals(req.openDrawer()));
        p.setAutoCut(!Boolean.FALSE.equals(req.autoCut()));
        p.setEnabled(!Boolean.FALSE.equals(req.enabled()));
    }

    private void clearOtherDefaults(Long keepId) {
        for (PosPrinter other : repository.findAll()) {
            if (!other.getId().equals(keepId) && Boolean.TRUE.equals(other.getIsDefault())) {
                other.setIsDefault(false);
                repository.save(other);
            }
        }
    }

    static InetAddress lanAddress(String ip) {
        String value = ip == null ? "" : ip.trim();
        if (!IPV4.matcher(value).matches()) {
            throw new BusinessRuleViolationException("Enter the printer's IPv4 address, e.g. 192.168.1.50.");
        }
        try {
            InetAddress address = InetAddress.getByName(value); // literal IPv4: no DNS lookup
            if (!(address.isSiteLocalAddress() || address.isLinkLocalAddress() || address.isLoopbackAddress())) {
                throw new BusinessRuleViolationException("Network printers must be on the local network (10.x, 172.16-31.x or 192.168.x).");
            }
            return address;
        } catch (BusinessRuleViolationException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessRuleViolationException("Invalid printer IP address.");
        }
    }

    private PosPrinter find(Long id) {
        return repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Printer not found with id: " + id));
    }
}
