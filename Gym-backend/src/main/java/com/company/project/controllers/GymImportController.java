package com.company.project.controllers;

import com.company.project.services.gymimport.GymImportService;
import com.company.project.services.gymimport.GymImportService.OnboardRequest;
import com.company.project.services.gymimport.ImportedMemberAccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Super-admin "Import Gym" — moves a gym from the previous GymBios into a new
 * tenant. See GymImportService for the flow:
 *
 *   POST   /api/gym-imports                    start an import
 *   POST   /api/gym-imports/{id}/dump?offset=  upload the SQL export (chunked)
 *   POST   /api/gym-imports/{id}/analyze       read it (background, poll GET)
 *   POST   /api/gym-imports/{id}/photos        upload referenced member photos (batched)
 *   POST   /api/gym-imports/{id}/photos/done   refresh the report with the photos
 *   POST   /api/gym-imports/{id}/onboard       create the gym and load everything (background)
 *   GET    /api/gym-imports/{id}               progress, report and result
 *   DELETE /api/gym-imports/{id}               discard the import and its files
 *
 * App accounts for a gym imported before onboarding created them
 * (ImportedMemberAccountService):
 *
 *   POST   /api/gym-imports/app-accounts/dry-run?slug=   usernames it would give, changes nothing
 *   POST   /api/gym-imports/app-accounts                 {"slug": "…", "confirm": "CREATE"}
 */
@RestController
@RequestMapping("/api/gym-imports")
@PreAuthorize("hasAuthority('GYM_MANAGEMENT_CREATE')")
public class GymImportController {

    private final GymImportService gymImportService;
    private final ImportedMemberAccountService memberAccounts;

    public GymImportController(GymImportService gymImportService, ImportedMemberAccountService memberAccounts) {
        this.gymImportService = gymImportService;
        this.memberAccounts = memberAccounts;
    }

    @PostMapping("/app-accounts/dry-run")
    public ResponseEntity<Map<String, Object>> appAccountsDryRun(@RequestParam String slug) {
        return ResponseEntity.ok(memberAccounts.createAccounts(slug.trim(), true, null));
    }

    @PostMapping("/app-accounts")
    public ResponseEntity<Map<String, Object>> createAppAccounts(@RequestBody Map<String, Object> body) {
        if (!"CREATE".equals(text(body, "confirm"))) {
            throw new com.company.project.exceptions.BusinessRuleViolationException(
                    "Send \"confirm\": \"CREATE\" to create the accounts (try the dry run first).");
        }
        String slug = text(body, "slug");
        return ResponseEntity.ok(memberAccounts.createAccounts(slug == null ? null : slug.trim(), false, null));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(Authentication auth) throws IOException {
        return ResponseEntity.ok(gymImportService.create(auth == null ? null : auth.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> status(@PathVariable String id) {
        return ResponseEntity.ok(gymImportService.status(id));
    }

    @PostMapping("/{id}/dump")
    public ResponseEntity<Map<String, Object>> uploadDump(@PathVariable String id,
                                                          @RequestParam("file") MultipartFile file,
                                                          @RequestParam(defaultValue = "0") long offset,
                                                          @RequestParam(name = "file_name", required = false) String fileName)
            throws IOException {
        return ResponseEntity.ok(gymImportService.appendDump(id, file, offset,
                fileName != null ? fileName : file.getOriginalFilename()));
    }

    @PostMapping("/{id}/analyze")
    public ResponseEntity<Map<String, Object>> analyze(@PathVariable String id) {
        return ResponseEntity.ok(gymImportService.analyze(id));
    }

    @PostMapping("/{id}/photos")
    public ResponseEntity<Map<String, Object>> uploadPhotos(@PathVariable String id,
                                                            @RequestParam("files") List<MultipartFile> files)
            throws IOException {
        return ResponseEntity.ok(gymImportService.addPhotos(id, files));
    }

    @PostMapping("/{id}/photos/done")
    public ResponseEntity<Map<String, Object>> photosDone(@PathVariable String id) throws IOException {
        return ResponseEntity.ok(gymImportService.photosDone(id));
    }

    @PostMapping("/{id}/onboard")
    public ResponseEntity<Map<String, Object>> onboard(@PathVariable String id, @RequestBody Map<String, Object> body) {
        Object offset = body.get("utc_offset_minutes");
        OnboardRequest req = new OnboardRequest(
                text(body, "name"), text(body, "slug"), text(body, "address"), text(body, "phone"), text(body, "email"),
                text(body, "owner_username"), text(body, "owner_password"), text(body, "owner_email"),
                offset == null || offset.toString().isBlank() ? null : Integer.valueOf(offset.toString()));
        return ResponseEntity.ok(gymImportService.onboard(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> discard(@PathVariable String id) {
        gymImportService.discard(id);
        return ResponseEntity.noContent().build();
    }

    private static String text(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v == null ? null : v.toString();
    }
}
