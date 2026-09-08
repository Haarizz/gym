package com.company.project.services;

import com.company.project.entities.UserProfile;
import com.company.project.repositories.UserProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GlobalUserService {
    
    private final UserProfileRepository userProfileRepository;
    
    public GlobalUserService(UserProfileRepository userProfileRepository) {
        this.userProfileRepository = userProfileRepository;
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public UserProfile getUserProfileRequiresNew(Long globalUserId) {
        return userProfileRepository.findByUserId(globalUserId)
                .orElseThrow(() -> new RuntimeException("Global User Profile not found"));
    }
}
