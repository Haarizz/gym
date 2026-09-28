package com.company.project.repositories.mobile.auth;

import com.company.project.entities.UserIdentityProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserIdentityProviderRepository extends JpaRepository<UserIdentityProvider, Long> {

    Optional<UserIdentityProvider> findByProviderAndProviderUserId(String provider, String providerUserId);
}
