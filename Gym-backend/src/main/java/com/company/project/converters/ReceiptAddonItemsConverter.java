package com.company.project.converters;

import com.company.project.dto.ReceiptAddonItemDTO;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

/**
 * Persists a receipt's add-on / facility-access lines as a JSON array in receipts.addon_items —
 * mirroring MinorChargeBreakdownConverter.
 */
@Converter
public class ReceiptAddonItemsConverter implements AttributeConverter<List<ReceiptAddonItemDTO>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .setSerializationInclusion(JsonInclude.Include.NON_NULL)
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @Override
    public String convertToDatabaseColumn(List<ReceiptAddonItemDTO> attribute) {
        if (attribute == null || attribute.isEmpty()) return null;
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public List<ReceiptAddonItemDTO> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(dbData, new TypeReference<List<ReceiptAddonItemDTO>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
