package com.company.project.community.global;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Code-review invariant, enforced by the build: in the global Community only
 * CommunityActorResolver may touch the authenticated principal, and nothing may
 * resolve users through UserRepository or switch the thread's tenant. This is
 * the class of mistake behind the legacy "User not found" bug (a global user
 * ID looked up as a tenant-local users.id).
 */
class CommunityIdentityBoundaryTest {

    private static final Path MAIN = Path.of("src/main/java/com/company/project");
    private static final String RESOLVER = "CommunityActorResolver.java";

    /** token → why it's forbidden */
    private static final Map<String, String> FORBIDDEN = Map.of(
            "UserRepository", "resolve identity through CommunityActorResolver, never UserRepository",
            "userRepository", "resolve identity through CommunityActorResolver, never UserRepository",
            "TenantContextHolder", "use explicit DataSources (TenantDataSources), never switch the thread's tenant",
            "getPrincipal()", "only CommunityActorResolver may read the principal",
            "UserDetailsImpl", "only CommunityActorResolver may read the principal",
            "@AuthenticationPrincipal", "only CommunityActorResolver may read the principal",
            "SecurityContextHolder", "only CommunityActorResolver may read the security context");

    @Test
    void globalCommunityCodeNeverBypassesTheActorResolver() throws IOException {
        List<Path> files = globalCommunitySources();
        assertFalse(files.isEmpty(), "no global Community sources found — is the working directory the module root?");
        assertTrue(files.stream().anyMatch(p -> p.endsWith(RESOLVER)), "resolver not found");

        List<String> violations = new ArrayList<>();
        for (Path file : files) {
            if (file.endsWith(RESOLVER)) {
                continue;
            }
            List<String> lines = Files.readAllLines(file);
            for (int i = 0; i < lines.size(); i++) {
                String line = lines.get(i).trim();
                if (line.startsWith("*") || line.startsWith("//") || line.startsWith("/*")) {
                    continue;
                }
                for (var rule : FORBIDDEN.entrySet()) {
                    if (line.contains(rule.getKey())) {
                        violations.add(MAIN.relativize(file) + ":" + (i + 1) + " uses " + rule.getKey() + " — " + rule.getValue());
                    }
                }
            }
        }
        assertTrue(violations.isEmpty(), String.join("\n", violations));
    }

    /** New global Community code: its own packages plus any global Community controller. */
    private static List<Path> globalCommunitySources() throws IOException {
        List<Path> files = new ArrayList<>();
        for (Path root : List.of(MAIN.resolve("community"), MAIN.resolve("controlplane/community"))) {
            if (Files.isDirectory(root)) {
                try (Stream<Path> walk = Files.walk(root)) {
                    walk.filter(p -> p.toString().endsWith(".java")).forEach(files::add);
                }
            }
        }
        try (Stream<Path> walk = Files.walk(MAIN.resolve("controllers"))) {
            walk.filter(p -> p.getFileName().toString().matches(".*Community.*Controller\\.java"))
                    // The legacy tenant-scoped controller predates the boundary and is replaced by the adapter.
                    .filter(p -> !p.getFileName().toString().equals("CommunityController.java"))
                    .forEach(files::add);
        }
        return files;
    }
}
