package com.company.project.converters;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

@Converter
public class JsonIntegerListConverter implements AttributeConverter<List<Integer>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<Integer> attribute) {
        if (attribute == null || attribute.isEmpty()) return "[]";
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (Exception e) {
            return "[]";
        }
    }

    @Override
    public List<Integer> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(dbData, new TypeReference<List<Integer>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
