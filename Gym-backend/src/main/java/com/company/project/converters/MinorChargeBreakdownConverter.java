package com.company.project.converters;

import com.company.project.dto.MinorChargeDTO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

/**
 * Persists the itemized list of minor family members' fees folded into a
 * guardian's Receipt, as a JSON array in a single TEXT column — mirroring
 * PaymentBreakdownConverter.
 */
@Converter
public class MinorChargeBreakdownConverter implements AttributeConverter<List<MinorChargeDTO>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<MinorChargeDTO> attribute) {
        if (attribute == null || attribute.isEmpty()) return null;
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public List<MinorChargeDTO> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(dbData, new TypeReference<List<MinorChargeDTO>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
