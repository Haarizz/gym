package com.company.project.json;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Labels a LocalDateTime as the real UTC instant it is (the JVM's default
 * timezone is pinned to UTC in GymApplication.main, so every
 * LocalDateTime.now() capture already IS one) with a genuine trailing "Z",
 * instead of Jackson's default zone-less string. Without this, a browser
 * outside the server's assumed zone displays the raw digits as if they were
 * already its own local time; with it, the browser correctly converts the
 * UTC instant to whatever local time it actually is for that viewer.
 */
public class UtcLocalDateTimeSerializer extends JsonSerializer<LocalDateTime> {

    private static final DateTimeFormatter FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    @Override
    public void serialize(LocalDateTime value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        gen.writeString(value.format(FORMAT));
    }
}
