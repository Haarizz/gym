package com.company.project.services;

import com.company.project.dto.MobileProfileDTO;
import com.company.project.entities.UserProfile;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.UserProfileRepository;
import com.company.project.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

@Service
@Transactional
public class MobileProfileService {

    private final UserProfileRepository userProfileRepository;
    private final UserRepository userRepository;

    public MobileProfileService(UserProfileRepository userProfileRepository, UserRepository userRepository) {
        this.userProfileRepository = userProfileRepository;
        this.userRepository = userRepository;
    }

    public MobileProfileDTO getProfileByUserId(Long userId) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserProfile newProfile = new UserProfile();
                    newProfile.setUser(userRepository.getReferenceById(userId));
                    newProfile.setFullName("Member"); // Add a default since fullName is non-null
                    return userProfileRepository.save(newProfile);
                });
        return MobileProfileDTO.fromEntity(profile);
    }

    public MobileProfileDTO updateProfile(Long userId, MobileProfileDTO request) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserProfile newProfile = new UserProfile();
                    newProfile.setUser(userRepository.getReferenceById(userId));
                    newProfile.setFullName("Member");
                    return newProfile;
                });

        if (request.getFullName() != null) profile.setFullName(request.getFullName());
        if (request.getPhone() != null) profile.setPhone(request.getPhone());
        
        if (request.getDateOfBirth() != null) {
            try {
                profile.setDateOfBirth(LocalDate.parse(request.getDateOfBirth()));
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Invalid date format. Use YYYY-MM-DD");
            }
        }
        
        if (request.getGender() != null) profile.setGender(request.getGender());
        if (request.getNationality() != null) profile.setNationality(request.getNationality());
        if (request.getAddress() != null) profile.setAddress(request.getAddress());
        if (request.getEmergencyContact() != null) profile.setEmergencyContact(request.getEmergencyContact());
        if (request.getEmergencyPhone() != null) profile.setEmergencyPhone(request.getEmergencyPhone());
        if (request.getBloodType() != null) profile.setBloodType(request.getBloodType());
        if (request.getMedicalConditions() != null) profile.setMedicalConditions(request.getMedicalConditions());
        if (request.getPhotoUrl() != null) profile.setPhotoUrl(request.getPhotoUrl());

        profile = userProfileRepository.save(profile);
        return MobileProfileDTO.fromEntity(profile);
    }
}
