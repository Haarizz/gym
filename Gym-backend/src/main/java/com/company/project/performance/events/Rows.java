package com.company.project.performance.events;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** Null-safe conversions for native query columns (the JDBC driver hands back several types). */
final class Rows {

    private Rows() {}

    static Long lng(Object o) {
        return o == null ? null : ((Number) o).longValue();
    }

    static int integer(Object o) {
        return o == null ? 0 : ((Number) o).intValue();
    }

    static BigDecimal money(Object o) {
        if (o == null) return null;
        if (o instanceof BigDecimal b) return b;
        return new BigDecimal(o.toString());
    }

    static String str(Object o) {
        return o == null ? null : o.toString();
    }

    static LocalDateTime dateTime(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDateTime t) return t;
        if (o instanceof java.sql.Timestamp t) return t.toLocalDateTime();
        if (o instanceof java.time.OffsetDateTime t) return t.toLocalDateTime();
        if (o instanceof java.time.Instant i) return LocalDateTime.ofInstant(i, java.time.ZoneOffset.UTC);
        return LocalDateTime.parse(o.toString().replace(' ', 'T'));
    }

    static LocalDate date(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDate d) return d;
        if (o instanceof java.sql.Date d) return d.toLocalDate();
        return LocalDate.parse(o.toString().substring(0, 10));
    }

    static LocalTime time(Object o) {
        if (o == null) return null;
        if (o instanceof LocalTime t) return t;
        if (o instanceof java.sql.Time t) return t.toLocalTime();
        return LocalTime.parse(o.toString());
    }
}
