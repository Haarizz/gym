package com.company.project.services.gymimport;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.DoubleConsumer;

/**
 * The rows of a phpMyAdmin / mysqldump export of the previous (PHP) GymBios.
 * Only INSERT statements are read; the schema is ignored. Quoted values come back
 * as Strings (MySQL escapes undone), unquoted ones as BigDecimal, NULL as null.
 */
public final class LegacyDump {

    private final Map<String, List<Row>> tables;

    private LegacyDump(Map<String, List<Row>> tables) {
        this.tables = tables;
    }

    public List<Row> rows(String table) {
        return tables.getOrDefault(table, Collections.emptyList());
    }

    public boolean has(String table) {
        return tables.containsKey(table);
    }

    /** One dumped row. Accessors trim strings and treat '' as absent where noted. */
    public static final class Row {
        private final Map<String, Object> values;

        Row(Map<String, Object> values) {
            this.values = values;
        }

        public Object raw(String col) {
            return values.get(col);
        }

        /** Trimmed text, null when the value is NULL. */
        public String str(String col) {
            Object v = values.get(col);
            return v == null ? null : v.toString().trim();
        }

        /** Trimmed text, null when NULL or blank. */
        public String text(String col) {
            String s = str(col);
            return s == null || s.isEmpty() ? null : s;
        }

        public BigDecimal num(String col) {
            Object v = values.get(col);
            if (v == null) return null;
            if (v instanceof BigDecimal b) return b;
            String s = v.toString().trim();
            if (s.isEmpty()) return null;
            try {
                return new BigDecimal(s);
            } catch (NumberFormatException e) {
                return null;
            }
        }

        public Long lng(String col) {
            BigDecimal b = num(col);
            return b == null ? null : b.longValue();
        }
    }

    /**
     * Parses every INSERT of the wanted tables (others are skipped). progress gets
     * the fraction of the text read so far.
     */
    public static LegacyDump parse(String sql, Set<String> wanted, DoubleConsumer progress) {
        Map<String, List<Row>> tables = new HashMap<>();
        int len = sql.length();
        int i = 0;
        int lastReported = 0;
        while (true) {
            int at = sql.indexOf("INSERT INTO `", i);
            if (at < 0) break;
            int nameStart = at + "INSERT INTO `".length();
            int nameEnd = sql.indexOf('`', nameStart);
            if (nameEnd < 0) break;
            String table = sql.substring(nameStart, nameEnd);
            int colsStart = sql.indexOf('(', nameEnd);
            int colsEnd = sql.indexOf(')', colsStart);
            int valuesAt = sql.indexOf("VALUES", colsEnd);
            if (colsStart < 0 || colsEnd < 0 || valuesAt < 0) break;
            boolean keep = wanted == null || wanted.contains(table);
            String[] cols = keep ? splitColumns(sql.substring(colsStart + 1, colsEnd)) : null;
            List<Row> rows = keep ? tables.computeIfAbsent(table, k -> new ArrayList<>()) : null;
            i = parseValues(sql, valuesAt + "VALUES".length(), cols, rows);
            if (progress != null && i - lastReported > 200_000) {
                lastReported = i;
                progress.accept((double) i / len);
            }
        }
        if (progress != null) progress.accept(1.0);
        return new LegacyDump(tables);
    }

    private static String[] splitColumns(String list) {
        String[] parts = list.split(",");
        for (int k = 0; k < parts.length; k++) parts[k] = parts[k].trim().replace("`", "");
        return parts;
    }

    /** Reads "(…),(…);" from i; returns the index after the closing ';'. rows null = skip. */
    private static int parseValues(String s, int i, String[] cols, List<Row> rows) {
        List<Object> row = null;
        StringBuilder tok = new StringBuilder();
        boolean inStr = false, isStr = false;
        int depth = 0;
        int len = s.length();
        for (; i < len; i++) {
            char c = s.charAt(i);
            if (inStr) {
                if (c == '\\' && i + 1 < len) {
                    char n = s.charAt(++i);
                    if (rows != null) {
                        tok.append(switch (n) {
                            case 'n' -> '\n';
                            case 'r' -> '\r';
                            case 't' -> '\t';
                            case '0' -> '\0';
                            default -> n;
                        });
                    }
                } else if (c == '\'') {
                    if (i + 1 < len && s.charAt(i + 1) == '\'') {
                        if (rows != null) tok.append('\'');
                        i++;
                    } else {
                        inStr = false;
                    }
                } else if (rows != null) {
                    tok.append(c);
                }
                continue;
            }
            if (c == '\'') {
                inStr = true;
                isStr = true;
                tok.setLength(0);
                continue;
            }
            if (c == '(' && depth == 0) {
                depth = 1;
                row = rows == null ? null : new ArrayList<>();
                tok.setLength(0);
                isStr = false;
                continue;
            }
            if (depth == 1 && (c == ',' || c == ')')) {
                if (row != null) row.add(value(tok, isStr));
                tok.setLength(0);
                isStr = false;
                if (c == ')') {
                    if (row != null && cols != null) {
                        Map<String, Object> values = new LinkedHashMap<>();
                        for (int k = 0; k < cols.length && k < row.size(); k++) values.put(cols[k], row.get(k));
                        rows.add(new Row(values));
                    }
                    depth = 0;
                }
                continue;
            }
            if (depth == 0 && c == ';') return i + 1;
            if (depth == 1 && !isStr && rows != null) tok.append(c);
        }
        return i;
    }

    private static Object value(StringBuilder tok, boolean isStr) {
        if (isStr) return tok.toString();
        String t = tok.toString().trim();
        if (t.isEmpty() || t.equalsIgnoreCase("NULL")) return null;
        try {
            return new BigDecimal(t);
        } catch (NumberFormatException e) {
            return t;
        }
    }
}
