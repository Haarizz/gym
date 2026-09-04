package com.company.project.controlplane.service.migration;

import com.company.project.controlplane.service.migration.SchemaIntrospector.ForeignKeyEdge;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Pure in-memory graph logic: classifies every table as ROOT (has its own branch_id
 * column), SCOPED (reachable from a ROOT via a real FK or a BridgeEdges entry), or
 * GLOBAL (no path to any ROOT — full unfiltered copy), and topologically sorts the
 * whole table set so every table is copied only after whatever it depends on.
 *
 * Deliberately has no JDBC of its own — takes already-introspected data as input, so
 * this class's logic is independently reasoned-about/testable apart from the live
 * database. See SchemaIntrospector for where the input data comes from.
 */
public class TenantTableGraph {

    public enum TableKind { ROOT, SCOPED, GLOBAL }

    public record ClassifiedTable(String tableName, TableKind kind, ForeignKeyEdge scopingEdge) {}

    /**
     * gyms/branches/users are excluded from the TOPOLOGICAL SORT itself — they are the
     * migration's explicit seed tables (see TenantDataMigrationService), already
     * copied before this graph runs, not schema-discovered or reordered. gyms/branches
     * have no self-referential scoping signal a generic walk could find, and users is
     * never the CHILD of a ROOT table in this schema (user_roles/user_branches/
     * community_posts all point TO users, not the other way around) — a naive
     * classification would wrongly call it GLOBAL and copy every user, including the
     * platform-owner account this migration must never copy into a tenant database.
     *
     * Their edges to non-seed children are NOT dropped, though — a table like
     * user_roles has real FK edges to both users (a seed table) AND roles (a global
     * table); dropping the users edge entirely left user_roles' classification to fall
     * through to "scoped via roles" (global), silently copying role assignments for
     * excluded users. Seed tables are instead treated as pre-classified virtual roots
     * (see computeCopyOrder's seeding of `classified` below), so their edges still
     * correctly scope children — TableCopyEngine.copyAll is responsible for pre-
     * registering the seed tables' actual copied-id sets before using this order.
     */
    public static final Set<String> SEED_TABLES = Set.of("gyms", "branches", "users");

    /**
     * Computes copy order for every table NOT in SEED_TABLES. Throws IllegalStateException
     * on a cycle or a table left unclassified — a hard failure here is a safety feature:
     * silently mis-ordering or mis-scoping a table is exactly the failure mode this
     * whole schema-introspection redesign exists to prevent.
     */
    public List<ClassifiedTable> computeCopyOrder(
            Set<String> rootTables,
            List<ForeignKeyEdge> allEdges,
            List<String> allTables
    ) {
        List<String> tables = new ArrayList<>();
        for (String t : allTables) {
            if (!SEED_TABLES.contains(t)) {
                tables.add(t);
            }
        }

        // Edges INTO a seed table (seed table as child) are dropped — seed tables are
        // already copied and never re-ordered by this sort. Edges OUT of a seed table
        // (seed table as parent, e.g. user_roles.user_id -> users) are KEPT, so a
        // non-seed child can still be classified as SCOPED via that edge.
        List<ForeignKeyEdge> edges = new ArrayList<>();
        for (ForeignKeyEdge e : allEdges) {
            if (!SEED_TABLES.contains(e.childTable())) {
                edges.add(e);
            }
        }

        // parent -> list of edges where parent is the parent_table (used both for Kahn's
        // algorithm's "release children" step and for classification's BFS-from-root).
        Map<String, List<ForeignKeyEdge>> childrenOf = new HashMap<>();
        // child -> distinct parent table names (used for in-degree and classification)
        Map<String, Set<String>> parentsOf = new HashMap<>();
        for (ForeignKeyEdge e : edges) {
            childrenOf.computeIfAbsent(e.parentTable(), k -> new ArrayList<>()).add(e);
            parentsOf.computeIfAbsent(e.childTable(), k -> new HashSet<>()).add(e.parentTable());
        }

        // ── Kahn's algorithm: topological sort using in-degree = distinct NON-SEED
        // parent count. Seed-table parents (e.g. user_roles -> users) are always
        // already copied before this graph runs and are never enqueued/polled here
        // (they're outside `tables`), so they must not count toward in-degree or their
        // children would wait forever for a "release" that can never come. ──
        Map<String, Integer> inDegree = new HashMap<>();
        for (String t : tables) {
            long nonSeedParents = parentsOf.getOrDefault(t, Set.of()).stream()
                    .filter(p -> !SEED_TABLES.contains(p))
                    .count();
            inDegree.put(t, (int) nonSeedParents);
        }

        Deque<String> queue = new ArrayDeque<>();
        for (String t : tables) {
            if (inDegree.get(t) == 0) {
                queue.add(t);
            }
        }

        List<String> order = new ArrayList<>();
        Map<String, Integer> remainingInDegree = new HashMap<>(inDegree);
        while (!queue.isEmpty()) {
            String t = queue.poll();
            order.add(t);
            for (ForeignKeyEdge e : childrenOf.getOrDefault(t, List.of())) {
                String child = e.childTable();
                int newDegree = remainingInDegree.get(child) - 1;
                remainingInDegree.put(child, newDegree);
                if (newDegree == 0) {
                    queue.add(child);
                }
            }
        }

        if (order.size() != tables.size()) {
            Set<String> missing = new HashSet<>(tables);
            missing.removeAll(order);
            throw new IllegalStateException(
                    "Table dependency graph has a cycle or an unresolved edge — cannot safely order "
                            + "the following tables for migration: " + missing
                            + ". Aborting rather than guessing an order.");
        }

        // ── Classification: ROOT if it has branch_id; else walk parents looking for a
        // ROOT/SCOPED ancestor. Since `order` is already topologically sorted, every
        // table's parents are classified before the table itself is reached. ──
        Map<String, ClassifiedTable> classified = new LinkedHashMap<>();
        for (String t : order) {
            if (rootTables.contains(t)) {
                classified.put(t, new ClassifiedTable(t, TableKind.ROOT, null));
                continue;
            }
            // A table can have multiple candidate parent edges (e.g. user_roles has
            // real FKs to both `users`, a seed table, AND `roles`, a global table).
            // Seed/Root parents are the strongest, most specific scoping signal
            // available and are preferred over a merely-transitively-scoped or
            // global one — picking whichever edge happened to be listed first would
            // let ordering luck decide between "correctly scoped by user" and
            // "wrongly scoped by a global table" for the exact same row.
            ForeignKeyEdge scopingEdge = null;
            ForeignKeyEdge fallbackScopedEdge = null;
            for (ForeignKeyEdge e : edges) {
                if (!e.childTable().equals(t)) {
                    continue;
                }
                if (rootTables.contains(e.parentTable()) || SEED_TABLES.contains(e.parentTable())) {
                    scopingEdge = e;
                    break;
                }
                ClassifiedTable parentClassified = classified.get(e.parentTable());
                if (fallbackScopedEdge == null && parentClassified != null && parentClassified.kind() != TableKind.GLOBAL) {
                    fallbackScopedEdge = e;
                }
            }
            if (scopingEdge == null) {
                scopingEdge = fallbackScopedEdge;
            }
            if (scopingEdge != null) {
                classified.put(t, new ClassifiedTable(t, TableKind.SCOPED, scopingEdge));
            } else {
                classified.put(t, new ClassifiedTable(t, TableKind.GLOBAL, null));
            }
        }

        List<ClassifiedTable> result = new ArrayList<>();
        for (String t : order) {
            result.add(classified.get(t));
        }
        return result;
    }
}
