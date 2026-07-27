package com.company.project.converters;

import com.company.project.dto.PaymentSplitDTO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

/**
 * Persists the per-leg breakdown of a Mixed payment (Cash + Card + Cheque, ...)
 * as a JSON array in a single TEXT column, mirroring SalaryPayment.splitPaymentsJson.
 */
@Converter
public class PaymentBreakdownConverter implements AttributeConverter<List<PaymentSplitDTO>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<PaymentSplitDTO> attribute) {
        if (attribute == null || attribute.isEmpty()) return null;
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public List<PaymentSplitDTO> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(dbData, new TypeReference<List<PaymentSplitDTO>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
