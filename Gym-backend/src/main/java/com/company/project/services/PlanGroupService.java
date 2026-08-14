package com.company.project.services;

import com.company.project.dto.PlanGroupDTO;
import com.company.project.entities.PlanGroup;
import com.company.project.repositories.PlanGroupRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class PlanGroupService {

    private final PlanGroupRepository planGroupRepository;

    public PlanGroupService(PlanGroupRepository planGroupRepository) {
        this.planGroupRepository = planGroupRepository;
    }

    @Transactional(readOnly = true)
    public List<PlanGroupDTO> getAll() {
        return planGroupRepository.findAllByOrderByNameAsc().stream()
                .map(PlanGroupDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public PlanGroupDTO create(PlanGroupDTO dto) {
        String name = dto.getName() == null ? "" : dto.getName().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Plan group name is required");
        }
        planGroupRepository.findByNameIgnoreCase(name).ifPresent(existing -> {
            throw new IllegalArgumentException("A plan group named \"" + name + "\" already exists");
        });

        PlanGroup group = new PlanGroup();
        group.setName(name);
        group.setStatus(dto.getStatus() != null ? dto.getStatus() : "Active");
        return PlanGroupDTO.fromEntity(planGroupRepository.save(group));
    }

    public PlanGroupDTO update(Long id, PlanGroupDTO dto) {
        PlanGroup group = planGroupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan group not found with id: " + id));

        if (dto.getName() != null && !dto.getName().trim().isEmpty()) {
            String name = dto.getName().trim();
            planGroupRepository.findByNameIgnoreCase(name).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new IllegalArgumentException("A plan group named \"" + name + "\" already exists");
                }
            });
            group.setName(name);
        }
        if (dto.getStatus() != null) group.setStatus(dto.getStatus());

        return PlanGroupDTO.fromEntity(planGroupRepository.save(group));
    }

    public void delete(Long id) {
        PlanGroup group = planGroupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan group not found with id: " + id));
        planGroupRepository.delete(group);
    }
}
