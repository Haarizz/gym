package com.company.project.services.pos;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.*;
import com.company.project.entities.*;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

import static com.company.project.services.pos.PosSupport.trimToNull;

/**
 * POS device manager (BillBull's DeviceManager, trimmed for a gym front desk): a register of the
 * branch's POS hardware with health and an event log, hardware profiles that bundle devices by role
 * and are assigned to terminals, a cash-drawer kick and a scanner test. Printers stay managed under
 * Printers — each one is mirrored here as a PRINTER device and its health follows its print jobs.
 */
@Service
@Transactional
public class PosDeviceService {

    public static final List<String> TYPES = List.of("PRINTER", "SCANNER", "CASH_DRAWER", "CARD_TERMINAL", "CUSTOMER_DISPLAY", "SCALE", "GENERIC");
    public static final List<String> STATUSES = List.of("ACTIVE", "INACTIVE", "MAINTENANCE", "DECOMMISSIONED");
    public static final List<String> HEALTH = List.of("HEALTHY", "DEGRADED", "OFFLINE");
    public static final List<String> ROLES = List.of("RECEIPT_PRINTER", "REPORT_PRINTER", "CASH_DRAWER", "SCANNER", "CARD_TERMINAL", "CUSTOMER_DISPLAY", "SCALE");
    private static final List<String> CONNECTIONS = List.of("USB", "NETWORK", "BLUETOOTH", "SERIAL", "AGENT", "BROWSER", "KEYBOARD_WEDGE", "PRINTER_PORT", "OTHER");
    /** Which device types can fill which profile role. */
    private static final Map<String, String> ROLE_TYPE = Map.of(
            "RECEIPT_PRINTER", "PRINTER", "REPORT_PRINTER", "PRINTER", "CASH_DRAWER", "CASH_DRAWER", "SCANNER", "SCANNER",
            "CARD_TERMINAL", "CARD_TERMINAL", "CUSTOMER_DISPLAY", "CUSTOMER_DISPLAY", "SCALE", "SCALE");
    /** ESC p 0 25 250 — pulse drawer pin 2. */
    private static final String DRAWER_KICK_B64 = Base64.getEncoder().encodeToString(new byte[]{0x1B, 0x70, 0x00, 0x19, (byte) 0xFA});

    private final PosDeviceRepository repository;
    private final PosDeviceEventRepository eventRepository;
    private final PosHardwareProfileRepository profileRepository;
    private final PosHardwareProfileDeviceRepository profileDeviceRepository;
    private final PosPrinterRepository printerRepository;
    private final PosTerminalRepository terminalRepository;
    private final PosPrintJobRepository jobRepository;
    private final PosAuditService auditService;
    private final PosSupport support;
    /** Lazy: the print queue reports back into this service. */
    private PosPrintJobService printJobService;
    private PosTerminalService terminalService;

    public PosDeviceService(PosDeviceRepository repository, PosDeviceEventRepository eventRepository,
                            PosHardwareProfileRepository profileRepository, PosHardwareProfileDeviceRepository profileDeviceRepository,
                            PosPrinterRepository printerRepository, PosTerminalRepository terminalRepository,
                            PosPrintJobRepository jobRepository, PosAuditService auditService, PosSupport support) {
        this.repository = repository;
        this.eventRepository = eventRepository;
        this.profileRepository = profileRepository;
        this.profileDeviceRepository = profileDeviceRepository;
        this.printerRepository = printerRepository;
        this.terminalRepository = terminalRepository;
        this.jobRepository = jobRepository;
        this.auditService = auditService;
        this.support = support;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setServices(@org.springframework.context.annotation.Lazy PosPrintJobService printJobService,
                            @org.springframework.context.annotation.Lazy PosTerminalService terminalService) {
        this.printJobService = printJobService;
        this.terminalService = terminalService;
    }

    // ── Devices ─────────────────────────────────────────────────────────────

    public List<DeviceDTO> list(String type, boolean includeRetired) {
        support.requireBranch();
        syncPrinters();
        String t = type == null ? "" : type.trim().toUpperCase(Locale.ROOT);
        Map<Long, List<String>> profiles = profileUse();
        return repository.findAllByOrderByDeviceTypeAscNameAsc().stream()
                .filter(d -> t.isEmpty() || "ALL".equals(t) || t.equals(d.getDeviceType()))
                .filter(d -> includeRetired || !"DECOMMISSIONED".equals(d.getStatus()))
                .map(d -> dto(d, profiles)).toList();
    }

    public DeviceDTO get(Long id) {
        return dto(find(id), profileUse());
    }

    public List<DeviceEventDTO> events(Long id) {
        PosDevice d = find(id);
        return eventRepository.findTop100ByDeviceIdOrderByIdDesc(id).stream().map(e -> eventDto(e, d.getName())).toList();
    }

    public DeviceDTO create(PosRequests.Device req) {
        Long branchId = support.requireBranch();
        String type = upper(req.deviceType());
        if (!TYPES.contains(type)) throw new BusinessRuleViolationException("Unknown device type: " + req.deviceType() + ".");
        if ("PRINTER".equals(type)) throw new BusinessRuleViolationException("Add printers under POS Console › Printers — they appear here automatically.");
        PosDevice d = new PosDevice();
        d.setBranchId(branchId);
        d.setDeviceType(type);
        d.setDeviceCode(uniqueCode(branchId, trimToNull(req.deviceCode()) != null ? req.deviceCode() : prefix(type), null, trimToNull(req.deviceCode()) == null));
        apply(d, req);
        d = repository.save(d);
        event(d, "DEVICE_REGISTERED", "INFO", describe(d), null);
        auditService.log("DEVICE_ADD", "PosDevice", d.getId(), d.getDeviceCode(), null, null, d.getName() + " (" + type + ")", null, d.getTerminalName());
        return get(d.getId());
    }

    public DeviceDTO update(Long id, PosRequests.Device req) {
        PosDevice d = find(id);
        if ("PRINTER".equals(d.getDeviceType())) throw new BusinessRuleViolationException("Edit this printer under POS Console › Printers.");
        if (trimToNull(req.deviceCode()) != null && !req.deviceCode().trim().equalsIgnoreCase(d.getDeviceCode())) {
            d.setDeviceCode(uniqueCode(d.getBranchId(), req.deviceCode(), d.getId(), false));
        }
        apply(d, req);
        d = repository.save(d);
        event(d, "CONFIGURATION_UPDATED", "INFO", describe(d), null);
        auditService.log("DEVICE_UPDATE", "PosDevice", d.getId(), d.getDeviceCode(), null, null, d.getName(), null, d.getTerminalName());
        return get(d.getId());
    }

    public DeviceDTO setStatus(Long id, PosRequests.DeviceStatus req) {
        PosDevice d = find(id);
        String status = upper(req.status());
        if (!STATUSES.contains(status)) throw new BusinessRuleViolationException("Status must be ACTIVE, INACTIVE, MAINTENANCE or DECOMMISSIONED.");
        if ("PRINTER".equals(d.getDeviceType())) {
            throw new BusinessRuleViolationException("Enable, disable or delete this printer under POS Console › Printers.");
        }
        if ("DECOMMISSIONED".equals(d.getStatus())) throw new BusinessRuleViolationException(d.getName() + " is decommissioned.");
        if ("DECOMMISSIONED".equals(status)) {
            List<PosHardwareProfileDevice> uses = profileDeviceRepository.findByDeviceId(d.getId());
            if (!uses.isEmpty()) throw new BusinessRuleViolationException("Remove " + d.getName() + " from its hardware profile(s) first.");
        }
        String old = d.getStatus();
        d.setStatus(status);
        d = repository.save(d);
        String reason = trimToNull(req.reason());
        event(d, "STATUS_CHANGED", "INFO", old + " → " + status + (reason != null ? " — " + reason : ""), null);
        auditService.log("DEVICE_STATUS", "PosDevice", d.getId(), d.getDeviceCode(), null, null, d.getName() + ": " + status, null, d.getTerminalName());
        return get(d.getId());
    }

    /** Health reported by a till, the print agent or a technician. */
    public DeviceDTO reportHealth(Long id, PosRequests.DeviceHealth req) {
        PosDevice d = find(id);
        String health = upper(req.health());
        if (!HEALTH.contains(health)) throw new BusinessRuleViolationException("Health must be HEALTHY, DEGRADED or OFFLINE.");
        setHealth(d, health, trimToNull(req.message()), trimToNull(req.terminalName()));
        return get(d.getId());
    }

    /** Pulses a cash drawer through the network printer it is wired to. A failure is still logged. */
    @Transactional(noRollbackFor = BusinessRuleViolationException.class)
    public DeviceDTO kickDrawer(Long id, String terminalName) {
        PosDevice d = find(id);
        if (!"CASH_DRAWER".equals(d.getDeviceType())) throw new BusinessRuleViolationException(d.getName() + " is not a cash drawer.");
        if (!"ACTIVE".equals(d.getStatus())) throw new BusinessRuleViolationException(d.getName() + " is " + d.getStatus().toLowerCase(Locale.ROOT) + ".");
        if (d.getPrinterId() == null) throw new BusinessRuleViolationException("Pick the printer " + d.getName() + " is plugged into.");
        PosPrinter p = printerRepository.findById(d.getPrinterId())
                .orElseThrow(() -> new BusinessRuleViolationException("The printer wired to " + d.getName() + " no longer exists."));
        if (!"NETWORK".equals(p.getConnectionType())) {
            throw new BusinessRuleViolationException(d.getName() + " is wired to " + p.getName() + " (" + p.getConnectionType().toLowerCase(Locale.ROOT)
                    + ") — open it from the till on that computer (No sale / Open drawer).");
        }
        try {
            printJobService.submitNetwork(p.getId(), new PosRequests.EscPosPrint(DRAWER_KICK_B64, "Drawer kick — " + d.getName(), "DRAWER_KICK", d.getDeviceCode(), terminalName));
        } catch (BusinessRuleViolationException e) {
            event(d, "DRAWER_KICK", "FAILURE", e.getMessage(), terminalName);
            setHealth(d, "OFFLINE", e.getMessage(), terminalName);
            throw e;
        }
        d.setLastUsedAt(LocalDateTime.now());
        event(d, "DRAWER_KICK", "SUCCESS", "Opened through " + p.getName(), terminalName);
        setHealth(d, "HEALTHY", null, terminalName);
        auditService.log("DRAWER_OPEN", "PosDevice", d.getId(), d.getDeviceCode(), null, null, "Opened from Devices: " + d.getName(), null, terminalName);
        return get(d.getId());
    }

    /** A test scan typed / scanned into the console: proves the scanner reads and its suffix submits. */
    public DeviceDTO scanTest(Long id, PosRequests.ScanTest req) {
        PosDevice d = find(id);
        if (!"SCANNER".equals(d.getDeviceType())) throw new BusinessRuleViolationException(d.getName() + " is not a scanner.");
        String value = trimToNull(req.value());
        if (value == null) throw new BusinessRuleViolationException("Scan a barcode first.");
        d.setLastUsedAt(LocalDateTime.now());
        event(d, "SCAN_TEST", "SUCCESS", "Read \"" + (value.length() > 80 ? value.substring(0, 80) + "…" : value) + "\"", trimToNull(req.terminalName()));
        setHealth(d, "HEALTHY", null, trimToNull(req.terminalName()));
        return get(d.getId());
    }

    // ── Printer mirror ──────────────────────────────────────────────────────

    /** Creates / refreshes the PRINTER device for every printer; printers that were deleted are retired. */
    public void syncPrinters() {
        Long branchId = support.requireBranch();
        Set<Long> live = new HashSet<>();
        for (PosPrinter p : printerRepository.findAll()) {
            live.add(p.getId());
            syncPrinter(p, branchId);
        }
        for (PosDevice d : repository.findAllByOrderByDeviceTypeAscNameAsc()) {
            if ("PRINTER".equals(d.getDeviceType()) && d.getPrinterId() != null && !live.contains(d.getPrinterId())
                    && !"DECOMMISSIONED".equals(d.getStatus())) {
                d.setStatus("DECOMMISSIONED");
                repository.save(d);
                event(d, "STATUS_CHANGED", "INFO", "Printer deleted", null);
            }
            if (!"PRINTER".equals(d.getDeviceType()) && d.getPrinterId() != null && !live.contains(d.getPrinterId())) {
                d.setPrinterId(null);
                repository.save(d);
                event(d, "CONFIGURATION_UPDATED", "INFO", "The printer it was wired to was deleted", null);
            }
        }
    }

    public void syncPrinter(PosPrinter p, Long branchId) {
        PosDevice d = repository.findFirstByPrinterIdAndDeviceType(p.getId(), "PRINTER").orElse(null);
        boolean created = d == null;
        if (created) {
            d = new PosDevice();
            d.setBranchId(p.getBranchId() != null ? p.getBranchId() : branchId);
            d.setDeviceType("PRINTER");
            d.setPrinterId(p.getId());
            d.setDeviceCode(uniqueCode(d.getBranchId(), "PRN", null, true));
        }
        d.setName(p.getName());
        d.setConnectionType(p.getConnectionType());
        d.setAddress("NETWORK".equals(p.getConnectionType()) ? p.getIpAddress() + ":" + (p.getPortNumber() == null ? 9100 : p.getPortNumber())
                : "AGENT".equals(p.getConnectionType()) ? p.getSystemPrinterName() : "Browser print dialog");
        d.setTerminalName(p.getTerminalName());
        d.setStatus(Boolean.FALSE.equals(p.getEnabled()) ? "INACTIVE" : "ACTIVE");
        d = repository.save(d);
        if (created) event(d, "DEVICE_REGISTERED", "INFO", "Printer " + p.getName() + " (" + p.getConnectionType() + ")", null);
    }

    /** A print job or printer test finished: the printer device's health follows it. */
    public void printerResult(PosPrinter p, boolean ok, String message, String terminalName, String jobType) {
        if (BranchSafe.none()) return;
        syncPrinter(p, p.getBranchId());
        PosDevice d = repository.findFirstByPrinterIdAndDeviceType(p.getId(), "PRINTER").orElse(null);
        if (d == null) return;
        d.setLastUsedAt(LocalDateTime.now());
        String type = jobType == null ? "PRINT" : jobType;
        event(d, "DRAWER_KICK".equals(type) ? "DRAWER_KICK" : "TEST".equals(type) ? "PRINTER_TEST" : "PRINT_" + (ok ? "COMPLETED" : "FAILED"),
                ok ? "SUCCESS" : "FAILURE", ok ? type.toLowerCase(Locale.ROOT).replace('_', ' ') + " printed" : message, terminalName);
        setHealth(d, ok ? "HEALTHY" : "OFFLINE", ok ? null : message, terminalName);
    }

    // ── Hardware profiles ───────────────────────────────────────────────────

    public List<HardwareProfileDTO> profiles() {
        support.requireBranch();
        return profileRepository.findAllByOrderByNameAsc().stream().map(this::profileDto).toList();
    }

    public HardwareProfileDTO createProfile(PosRequests.HardwareProfile req) {
        Long branchId = support.requireBranch();
        String name = trimToNull(req.name());
        if (name == null) throw new BusinessRuleViolationException("Name the hardware profile.");
        if (profileRepository.findFirstByBranchIdAndNameIgnoreCase(branchId, name).isPresent()) {
            throw new BusinessRuleViolationException("A hardware profile named \"" + name + "\" already exists.");
        }
        PosHardwareProfile pr = new PosHardwareProfile();
        pr.setBranchId(branchId);
        pr.setName(name);
        pr.setDescription(trimToNull(req.description()));
        pr.setStatus("ACTIVE");
        pr.setVersion(1);
        pr = profileRepository.save(pr);
        setDevices(pr, req.devices());
        auditService.log("HARDWARE_PROFILE_CREATE", "PosHardwareProfile", pr.getId(), pr.getName(), null, null, describeProfile(pr), null, null);
        return profileDto(pr);
    }

    public HardwareProfileDTO updateProfile(Long id, PosRequests.HardwareProfile req) {
        PosHardwareProfile pr = profile(id);
        String name = trimToNull(req.name());
        if (name != null && !name.equalsIgnoreCase(pr.getName())) {
            if (profileRepository.findFirstByBranchIdAndNameIgnoreCase(pr.getBranchId(), name).isPresent()) {
                throw new BusinessRuleViolationException("A hardware profile named \"" + name + "\" already exists.");
            }
        }
        if (name != null) pr.setName(name);
        if (req.description() != null) pr.setDescription(trimToNull(req.description()));
        if (req.status() != null) {
            String st = upper(req.status());
            if (!List.of("ACTIVE", "INACTIVE").contains(st)) throw new BusinessRuleViolationException("Profile status must be ACTIVE or INACTIVE.");
            if ("INACTIVE".equals(st) && !terminalsUsing(pr.getId()).isEmpty()) {
                throw new BusinessRuleViolationException("Unassign " + pr.getName() + " from its terminals before deactivating it.");
            }
            pr.setStatus(st);
        }
        if (req.devices() != null) {
            setDevices(pr, req.devices());
            pr.setVersion((pr.getVersion() == null ? 1 : pr.getVersion()) + 1);
        }
        pr = profileRepository.save(pr);
        auditService.log("HARDWARE_PROFILE_UPDATE", "PosHardwareProfile", pr.getId(), pr.getName(), null, null,
                "v" + pr.getVersion() + " · " + describeProfile(pr), null, null);
        return profileDto(pr);
    }

    /** Assigns (or clears, with null) a terminal's hardware profile. */
    public TerminalDTO assignProfile(Long terminalId, Long profileId) {
        PosTerminal t = terminalRepository.findById(terminalId)
                .orElseThrow(() -> new EntityNotFoundException("Terminal not found with id: " + terminalId));
        if (profileId != null) {
            PosHardwareProfile pr = profile(profileId);
            if (!"ACTIVE".equals(pr.getStatus())) throw new BusinessRuleViolationException(pr.getName() + " is inactive.");
        }
        t.setHardwareProfileId(profileId);
        terminalRepository.save(t);
        auditService.log("TERMINAL_UPDATE", "PosTerminal", t.getId(), t.getTerminalCode(), null, null,
                t.getName() + " · hardware profile " + (profileId == null ? "cleared" : profile(profileId).getName()), null, t.getName());
        return terminalService.get(t.getId());
    }

    /** The profile's receipt printer (pos_printers id), for a terminal. */
    public Long receiptPrinterOf(Long profileId) {
        if (profileId == null) return null;
        return profileDeviceRepository.findByProfileId(profileId).stream()
                .filter(x -> "RECEIPT_PRINTER".equals(x.getRole()))
                .map(x -> repository.findById(x.getDeviceId()).map(PosDevice::getPrinterId).orElse(null))
                .filter(Objects::nonNull).findFirst().orElse(null);
    }

    public String profileName(Long profileId) {
        return profileId == null ? null : profileRepository.findById(profileId).map(PosHardwareProfile::getName).orElse(null);
    }

    // ── Dashboard ───────────────────────────────────────────────────────────

    public DeviceDashboard dashboard() {
        support.requireBranch();
        syncPrinters();
        List<PosDevice> devices = repository.findAllByOrderByDeviceTypeAscNameAsc().stream()
                .filter(d -> !"DECOMMISSIONED".equals(d.getStatus())).toList();
        Map<String, Long> byType = new LinkedHashMap<>();
        for (String t : TYPES) byType.put(t, 0L);
        Map<String, Long> byHealth = new LinkedHashMap<>();
        for (String h : List.of("HEALTHY", "DEGRADED", "OFFLINE", "UNKNOWN")) byHealth.put(h, 0L);
        long attention = 0;
        for (PosDevice d : devices) {
            byType.merge(d.getDeviceType(), 1L, Long::sum);
            byHealth.merge(d.getHealth(), 1L, Long::sum);
            if ("ACTIVE".equals(d.getStatus()) && ("OFFLINE".equals(d.getHealth()) || "DEGRADED".equals(d.getHealth()))) attention++;
        }
        List<TerminalDTO> terminals = terminalService.list(false);
        long online = terminals.stream().filter(t -> "ACTIVE".equals(t.status()) && "ONLINE".equals(t.connectivity())).count();
        long offline = terminals.stream().filter(t -> "ACTIVE".equals(t.status()) && "OFFLINE".equals(t.connectivity())).count();
        long pending = terminals.stream().filter(t -> "PENDING".equals(t.status())).count();
        LocalDateTime dayAgo = LocalDateTime.now().minusHours(24);
        Map<Long, String> names = new HashMap<>();
        for (PosDevice d : repository.findAll()) names.put(d.getId(), d.getName());
        List<DeviceEventDTO> recent = eventRepository.findTop30ByOrderByIdDesc().stream()
                .map(e -> eventDto(e, names.get(e.getDeviceId()))).toList();
        return new DeviceDashboard(byType, byHealth, devices.size(), attention, online, offline, pending,
                jobRepository.countByStatus("QUEUED"), jobRepository.countByStatusAndCreatedAtAfter("FAILED", dayAgo),
                jobRepository.countByStatusAndCreatedAtAfter("SUCCEEDED", dayAgo), recent);
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private void apply(PosDevice d, PosRequests.Device req) {
        String name = trimToNull(req.name());
        if (name != null) d.setName(name.length() > 120 ? name.substring(0, 120) : name);
        if (d.getName() == null) throw new BusinessRuleViolationException("Name the device.");
        if (req.connectionType() != null) {
            String c = upper(req.connectionType());
            if (!c.isEmpty() && !CONNECTIONS.contains(c)) throw new BusinessRuleViolationException("Unknown connection type: " + req.connectionType() + ".");
            d.setConnectionType(c.isEmpty() ? null : c);
        }
        if (req.address() != null) d.setAddress(trimToNull(req.address()));
        if (req.terminalId() != null) {
            if (req.terminalId() <= 0) {
                d.setTerminalId(null);
                d.setTerminalName(null);
            } else {
                PosTerminal t = terminalRepository.findById(req.terminalId())
                        .orElseThrow(() -> new EntityNotFoundException("Terminal not found with id: " + req.terminalId()));
                d.setTerminalId(t.getId());
                d.setTerminalName(t.getName());
            }
        }
        if (req.printerId() != null) {
            if (req.printerId() <= 0) d.setPrinterId(null);
            else {
                printerRepository.findById(req.printerId()).orElseThrow(() -> new EntityNotFoundException("Printer not found with id: " + req.printerId()));
                d.setPrinterId(req.printerId());
            }
        }
        if (req.notes() != null) d.setNotes(trimToNull(req.notes()));
        if (req.configJson() != null) d.setConfigJson(trimToNull(req.configJson()));
    }

    private void setDevices(PosHardwareProfile pr, List<PosRequests.HardwareProfileDevice> devices) {
        Map<String, Long> byRole = new LinkedHashMap<>();
        if (devices != null) {
            for (PosRequests.HardwareProfileDevice x : devices) {
                if (x == null || x.deviceId() == null) continue;
                String role = upper(x.role());
                if (!ROLES.contains(role)) throw new BusinessRuleViolationException("Unknown role: " + x.role() + ".");
                if (byRole.containsKey(role)) throw new BusinessRuleViolationException("Only one device per role (" + role + ").");
                PosDevice d = find(x.deviceId());
                if (!ROLE_TYPE.get(role).equals(d.getDeviceType())) {
                    throw new BusinessRuleViolationException(d.getName() + " is a " + d.getDeviceType().toLowerCase(Locale.ROOT).replace('_', ' ')
                            + " — it can't be the " + role.toLowerCase(Locale.ROOT).replace('_', ' ') + ".");
                }
                if ("DECOMMISSIONED".equals(d.getStatus())) throw new BusinessRuleViolationException(d.getName() + " is decommissioned.");
                byRole.put(role, d.getId());
            }
        }
        profileDeviceRepository.deleteAll(profileDeviceRepository.findByProfileId(pr.getId()));
        profileDeviceRepository.flush();
        for (Map.Entry<String, Long> e : byRole.entrySet()) {
            PosHardwareProfileDevice link = new PosHardwareProfileDevice();
            link.setProfileId(pr.getId());
            link.setRole(e.getKey());
            link.setDeviceId(e.getValue());
            profileDeviceRepository.save(link);
        }
    }

    private void setHealth(PosDevice d, String health, String message, String terminalName) {
        String old = d.getHealth();
        d.setHealth(health);
        d.setHealthMessage(message != null && message.length() > 500 ? message.substring(0, 500) : message);
        d.setLastHealthAt(LocalDateTime.now());
        repository.save(d);
        if (!Objects.equals(old, health)) {
            event(d, "HEALTH_CHANGED", "HEALTHY".equals(health) ? "SUCCESS" : "FAILURE",
                    old + " → " + health + (message != null ? " — " + message : ""), terminalName);
        }
    }

    private void event(PosDevice d, String type, String result, String message, String terminalName) {
        PosDeviceEvent e = new PosDeviceEvent();
        e.setBranchId(d.getBranchId());
        e.setDeviceId(d.getId());
        e.setEventType(type);
        e.setResult(result);
        e.setMessage(message != null && message.length() > 1000 ? message.substring(0, 1000) : message);
        e.setTerminalName(terminalName);
        e.setPerformedBy(support.currentUsername());
        eventRepository.save(e);
    }

    private Map<Long, List<String>> profileUse() {
        Map<Long, List<String>> use = new HashMap<>();
        for (PosHardwareProfile pr : profileRepository.findAllByOrderByNameAsc()) {
            for (PosHardwareProfileDevice x : profileDeviceRepository.findByProfileId(pr.getId())) {
                use.computeIfAbsent(x.getDeviceId(), k -> new ArrayList<>()).add(pr.getName() + ": " + x.getRole());
            }
        }
        return use;
    }

    private List<PosTerminal> terminalsUsing(Long profileId) {
        return terminalRepository.findAll().stream()
                .filter(t -> profileId.equals(t.getHardwareProfileId()) && !List.of("ARCHIVED", "DECOMMISSIONED").contains(t.getStatus()))
                .toList();
    }

    private String uniqueCode(Long branchId, String raw, Long selfId, boolean numbered) {
        String base = PosCashCategoryService.slug(raw);
        if (numbered) {
            for (int i = 1; ; i++) {
                String code = base + "-" + String.format("%03d", i);
                if (repository.findFirstByBranchIdAndDeviceCodeIgnoreCase(branchId, code).isEmpty()) return code;
            }
        }
        String code = base;
        for (int i = 2; ; i++) {
            Optional<PosDevice> hit = repository.findFirstByBranchIdAndDeviceCodeIgnoreCase(branchId, code);
            if (hit.isEmpty() || hit.get().getId().equals(selfId)) return code;
            code = base + "_" + i;
        }
    }

    private static String prefix(String type) {
        return switch (type) {
            case "SCANNER" -> "SCN";
            case "CASH_DRAWER" -> "DRW";
            case "CARD_TERMINAL" -> "CRD";
            case "CUSTOMER_DISPLAY" -> "DSP";
            case "SCALE" -> "SCL";
            default -> "DEV";
        };
    }

    private static String upper(String s) {
        return s == null ? "" : s.trim().toUpperCase(Locale.ROOT);
    }

    private String describe(PosDevice d) {
        List<String> parts = new ArrayList<>();
        parts.add(d.getDeviceType());
        if (d.getConnectionType() != null) parts.add(d.getConnectionType());
        if (d.getAddress() != null) parts.add(d.getAddress());
        if (d.getTerminalName() != null) parts.add("on " + d.getTerminalName());
        return d.getName() + " (" + String.join(", ", parts) + ")";
    }

    private String describeProfile(PosHardwareProfile pr) {
        List<String> parts = new ArrayList<>();
        for (PosHardwareProfileDevice x : profileDeviceRepository.findByProfileId(pr.getId())) {
            parts.add(x.getRole() + "=" + repository.findById(x.getDeviceId()).map(PosDevice::getName).orElse("?"));
        }
        return parts.isEmpty() ? "no devices" : String.join(", ", parts);
    }

    private PosDevice find(Long id) {
        return repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Device not found with id: " + id));
    }

    private PosHardwareProfile profile(Long id) {
        return profileRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Hardware profile not found with id: " + id));
    }

    private DeviceDTO dto(PosDevice d, Map<Long, List<String>> profiles) {
        String printerName = d.getPrinterId() == null ? null : printerRepository.findById(d.getPrinterId()).map(PosPrinter::getName).orElse(null);
        return new DeviceDTO(d.getId(), d.getDeviceCode(), d.getName(), d.getDeviceType(), d.getConnectionType(), d.getAddress(),
                d.getTerminalId(), d.getTerminalName(), d.getPrinterId(), printerName, d.getStatus(), d.getHealth(), d.getHealthMessage(),
                d.getLastHealthAt(), d.getLastUsedAt(), d.getConfigJson(), d.getNotes(),
                profiles.getOrDefault(d.getId(), List.of()), "PRINTER".equals(d.getDeviceType()));
    }

    private static DeviceEventDTO eventDto(PosDeviceEvent e, String deviceName) {
        return new DeviceEventDTO(e.getId(), e.getDeviceId(), deviceName, e.getEventType(), e.getResult(), e.getMessage(),
                e.getTerminalName(), e.getPerformedBy(), e.getCreatedAt());
    }

    private HardwareProfileDTO profileDto(PosHardwareProfile pr) {
        List<HardwareProfileDeviceDTO> devices = new ArrayList<>();
        for (PosHardwareProfileDevice x : profileDeviceRepository.findByProfileId(pr.getId())) {
            PosDevice d = repository.findById(x.getDeviceId()).orElse(null);
            devices.add(new HardwareProfileDeviceDTO(x.getRole(), x.getDeviceId(), d != null ? d.getName() : "(removed)",
                    d != null ? d.getDeviceType() : null, d != null ? d.getHealth() : null));
        }
        devices.sort(Comparator.comparingInt(x -> ROLES.indexOf(x.role())));
        return new HardwareProfileDTO(pr.getId(), pr.getName(), pr.getDescription(), pr.getStatus(), pr.getVersion(), devices,
                terminalsUsing(pr.getId()).stream().map(PosTerminal::getName).toList());
    }

    /** Device bookkeeping needs a branch; system calls without one (none today) skip it. */
    private static final class BranchSafe {
        static boolean none() {
            return com.company.project.security.BranchContextHolder.getActiveBranchId() == null;
        }
    }
}
