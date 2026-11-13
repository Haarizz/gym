package com.company.project.controllers.platform;

import com.company.project.services.platform.DbConsoleService;
import com.company.project.services.platform.DbConsoleService.ConsoleException;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Super admin Database Console (see DbConsoleService):
 *
 *   GET  /api/platform/db-console/status      connected? host, server key, expiry
 *   POST /api/platform/db-console/connect     {"password"} — SSH root password, used once
 *   POST /api/platform/db-console/disconnect
 *   GET  /api/platform/db-console/databases   every database on the server, tenants labelled
 *   POST /api/platform/db-console/query       {"database","sql","allow_writes"}
 *   POST /api/platform/db-console/cancel      cancel the running query
 *   GET  /api/platform/db-console/download/sql?database=            plain .sql dump
 *   GET  /api/platform/db-console/download/member-photos?database=  that gym's member photos (.zip)
 *
 * Console problems come back as 400 {code, message} — never 401/403, which the web
 * app treats as "signed out of GymBios".
 */
@RestController
@RequestMapping("/api/platform/db-console")
@PreAuthorize("hasRole('GYMBIOS_ADMIN')")
public class DbConsoleController {

    public record ConnectRequest(String password) {}
    public record QueryRequest(String database, String sql, Boolean allowWrites) {}

    private final DbConsoleService console;

    public DbConsoleController(DbConsoleService console) {
        this.console = console;
    }

    @GetMapping("/status")
    public DbConsoleService.Status status(Authentication auth) {
        return console.status(auth.getName());
    }

    @PostMapping("/connect")
    public DbConsoleService.Status connect(@RequestBody ConnectRequest body, Authentication auth) {
        return console.connect(auth.getName(), body == null ? null : body.password());
    }

    @PostMapping("/disconnect")
    public DbConsoleService.Status disconnect(Authentication auth) {
        console.disconnect(auth.getName(), "signed out of the console");
        return console.status(auth.getName());
    }

    @GetMapping("/databases")
    public List<DbConsoleService.DatabaseInfo> databases(Authentication auth) {
        return console.databases(auth.getName());
    }

    @PostMapping("/query")
    public DbConsoleService.QueryResult query(@RequestBody QueryRequest body, Authentication auth) {
        return console.run(auth.getName(), body.database(), body.sql(), Boolean.TRUE.equals(body.allowWrites()));
    }

    @PostMapping("/cancel")
    public Map<String, Object> cancel(Authentication auth) {
        return Map.of("cancelled", console.cancel(auth.getName()));
    }

    /** GET /download/sql?database= — the whole database as a plain .sql file (pg_dump on the server). */
    @GetMapping("/download/sql")
    public void downloadSql(@RequestParam String database, Authentication auth, HttpServletResponse response) throws IOException {
        send(console.sqlDump(auth.getName(), database), response);
    }

    /** GET /download/member-photos?database= — that gym's member photos as a .zip (+ index.csv). */
    @GetMapping("/download/member-photos")
    public void downloadPhotos(@RequestParam String database, Authentication auth, HttpServletResponse response) throws IOException {
        send(console.memberPhotos(auth.getName(), database), response);
    }

    // Written straight to the response (not StreamingResponseBody) so a long dump is not cut
    // off by the async request timeout. Problems before the first byte were already thrown.
    private static void send(DbConsoleService.Download d, HttpServletResponse response) throws IOException {
        response.setContentType(d.contentType());
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename(d.filename()).build().toString());
        response.setHeader("X-Download-Filename", d.filename());
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        d.body().writeTo(response.getOutputStream());
    }

    @ExceptionHandler(ConsoleException.class)
    public ResponseEntity<Map<String, Object>> consoleError(ConsoleException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("code", e.getCode(), "message", e.getMessage()));
    }
}
