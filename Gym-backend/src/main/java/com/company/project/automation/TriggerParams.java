package com.company.project.automation;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Collections;
import java.util.Map;

/**
 * Thin helper to parse the JSON trigger_params / target_params columns
 * into a plain Map without pulling Jackson into every handler directly.
 */
public final class TriggerParams {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private TriggerParams() {}

    public static Map<String, Object> parse(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return MAPPER.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    public static int getInt(Map<String, Object> params, String key, int defaultValue) {
        Object v = params.get(key);
        if (v instanceof Number n) return n.intValue();
        if (v instanceof String s) {
            try { return Integer.parseInt(s); } catch (NumberFormatException ignored) {}
        }
        return defaultValue;
    }

    public static String getString(Map<String, Object> params, String key, String defaultValue) {
        Object v = params.get(key);
        return v != null ? v.toString() : defaultValue;
    }
}
