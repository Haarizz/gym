package com.company.project.converters;

import com.company.project.dto.MembershipApplicationDTOs.ApplicationFamilyMember;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

/**
 * The partner / family members on a Family or Couple membership application, as a JSON
 * array in one TEXT column — same approach as MinorChargeBreakdownConverter.
 */
@Converter
public class ApplicationFamilyMembersConverter implements AttributeConverter<List<ApplicationFamilyMember>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<ApplicationFamilyMember> attribute) {
        if (attribute == null || attribute.isEmpty()) return null;
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (Exception e) {
            // Never silently drop a household: fail the save instead.
            throw new IllegalStateException("Couldn't store the family members", e);
        }
    }

    @Override
    public List<ApplicationFamilyMember> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(dbData, new TypeReference<List<ApplicationFamilyMember>>() {});
        } catch (Exception e) {
            throw new IllegalStateException("Couldn't read the family members on this application", e);
        }
    }
}
