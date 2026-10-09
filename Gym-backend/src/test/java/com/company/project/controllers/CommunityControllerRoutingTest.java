package com.company.project.controllers;

import com.company.project.community.global.CommunityException;
import com.company.project.community.global.LegacyCommunityCompatAdapter;
import com.company.project.dto.CommunityEngagementStatsDTO;
import com.company.project.dto.CommunityPostsPageResponseDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.ToggleCommunityLikeResponseDTO;
import com.company.project.exceptions.GlobalExceptionHandler;
import com.company.project.services.CommunityService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The one controlled change to the legacy controller: authority decides which
 * implementation serves each endpoint, and both keep the legacy status mapping.
 */
class CommunityControllerRoutingTest {

    private CommunityService legacy;
    private LegacyCommunityCompatAdapter compat;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        legacy = mock(CommunityService.class);
        compat = mock(LegacyCommunityCompatAdapter.class);
        ObjectMapper mapper = new ObjectMapper().setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
                .registerModule(new JavaTimeModule());
        mvc = MockMvcBuilders.standaloneSetup(new CommunityController(legacy, compat))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper))
                .build();
    }

    private static CommunityPostsPageResponseDTO emptyPage() {
        return new CommunityPostsPageResponseDTO(List.of(), new PaginationDTO(1, 20, 0, 0));
    }

    @Test
    void beforeCutoverEverythingStaysOnTheLegacyService() throws Exception {
        when(compat.isActive()).thenReturn(false);
        when(legacy.getFeed(any(), any(), anyInt(), anyInt(), any())).thenReturn(emptyPage());
        when(legacy.toggleLike(5L)).thenReturn(new ToggleCommunityLikeResponseDTO(true, 1));
        when(legacy.getEngagementStats()).thenReturn(new CommunityEngagementStatsDTO());

        mvc.perform(get("/api/community/posts")).andExpect(status().isOk());
        mvc.perform(post("/api/community/posts/5/like")).andExpect(status().isOk()).andExpect(jsonPath("$.liked").value(true));
        mvc.perform(get("/api/community/stats")).andExpect(status().isOk());
        mvc.perform(delete("/api/community/posts/5")).andExpect(status().isOk());

        verify(legacy).deletePost(5L);
        verify(compat, never()).getFeed(any(), any(), anyInt(), anyInt(), any());
        verify(compat, never()).toggleLike(anyLong());
        verify(compat, never()).deletePost(anyLong());
    }

    @Test
    void afterCutoverEverythingGoesThroughTheAdapter() throws Exception {
        when(compat.isActive()).thenReturn(true);
        when(compat.getFeed(any(), any(), anyInt(), anyInt(), any())).thenReturn(emptyPage());
        when(compat.toggleLike(5L)).thenReturn(new ToggleCommunityLikeResponseDTO(false, 0));
        when(compat.getEngagementStats()).thenReturn(new CommunityEngagementStatsDTO());

        mvc.perform(get("/api/community/posts").param("archived", "true").param("page", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.pagination.total_pages").value(0));
        mvc.perform(post("/api/community/posts/5/like")).andExpect(status().isOk()).andExpect(jsonPath("$.like_count").value(0));
        mvc.perform(get("/api/community/stats")).andExpect(status().isOk());
        mvc.perform(post("/api/community/posts/5/delete")).andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        mvc.perform(post("/api/community/posts/5/archive")).andExpect(status().isOk());

        verify(compat).getFeed(any(), any(), eq(2), eq(20), eq(true));
        verify(compat).deletePost(5L);
        verify(compat).setArchived(5L, true);
        verifyNoInteractions(legacy);
    }

    @Test
    void adapterErrorsKeepTheLegacyStatusMapping() throws Exception {
        when(compat.isActive()).thenReturn(true);
        when(compat.toggleLike(5L)).thenThrow(new IllegalArgumentException("Post not found"));
        doThrow(new SecurityException("Not allowed to delete this post")).when(compat).deletePost(6L);
        when(compat.createPost(any())).thenThrow(CommunityException.forbidden("NOT_A_MEMBER", "no"));
        when(compat.setArchived(anyLong(), anyBoolean())).thenThrow(new SecurityException("Not allowed to update this post"));

        mvc.perform(post("/api/community/posts/5/like")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Post not found"));
        mvc.perform(delete("/api/community/posts/6")).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Not allowed to delete this post"));
        mvc.perform(post("/api/community/posts/7/unarchive")).andExpect(status().isForbidden());
        mvc.perform(post("/api/community/posts").contentType(MediaType.APPLICATION_JSON).content("{\"topic\":\"t\",\"content\":\"c\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.error").value("NOT_A_MEMBER"));
    }

    @Test
    void anUnreadableRolloutStateIsAnErrorNotASilentFallback() throws Exception {
        when(compat.isActive()).thenThrow(CommunityException.unavailable("COMMUNITY_STATE_UNAVAILABLE", "x"));
        mvc.perform(get("/api/community/stats")).andExpect(status().isServiceUnavailable());
        verifyNoInteractions(legacy);
    }
}
