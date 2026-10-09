package com.company.project.controllers.mobile.community;

import com.company.project.community.global.CommunityException;
import com.company.project.community.global.CommunityModerationService;
import com.company.project.community.global.GlobalCommunityService;
import com.company.project.community.global.GlobalCommunityService.Request;
import com.company.project.community.global.content.CommunityRequestSizeFilter;
import com.company.project.community.global.rollout.CommunityRolloutService.Surface;
import com.company.project.dto.mobile.community.GlobalCommunityDtos;
import com.company.project.exceptions.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The wire format: snake_case JSON exactly as the app's Jackson config
 * produces it, error bodies, the 3 MB request cap, and surface routing.
 */
class GlobalCommunityControllerTest {

    private GlobalCommunityService community;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        community = mock(GlobalCommunityService.class);
        ObjectMapper mapper = new ObjectMapper()
                .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mvc = MockMvcBuilders.standaloneSetup(new GlobalCommunityController(community, mock(CommunityModerationService.class)))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper))
                .addFilters(new CommunityRequestSizeFilter())
                .build();
    }

    private static GlobalCommunityDtos.Post samplePost() {
        return new GlobalCommunityDtos.Post(1_000_000_001L, "Topic", "Body", "tip", "PUBLIC", "ACTIVE",
                LocalDateTime.of(2026, 9, 25, 10, 0), 3, 1,
                new GlobalCommunityDtos.Image("/api/mobile/community/posts/1000000001/image", 800, 1000, "4:5", 50, 100),
                new GlobalCommunityDtos.Author("John Doe", null, "MEMBER", "gym-a", "FitZone A", "Downtown", true),
                new GlobalCommunityDtos.PostViewer(true, true, true, false, true, false, true, false, false));
    }

    @Test
    void feedSerializesSnakeCaseWithoutAnyUserIds() throws Exception {
        when(community.feed(any(), isNull(), eq(10), isNull(), isNull()))
                .thenReturn(new GlobalCommunityDtos.FeedPage(List.of(samplePost()), "abc"));

        String json = mvc.perform(get("/api/mobile/community/feed").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.next_cursor").value("abc"))
                .andExpect(jsonPath("$.posts[0].like_count").value(3))
                .andExpect(jsonPath("$.posts[0].author.is_mine").value(true))
                .andExpect(jsonPath("$.posts[0].author.gym_name").value("FitZone A"))
                .andExpect(jsonPath("$.posts[0].viewer.liked_by_me").value(true))
                .andExpect(jsonPath("$.posts[0].viewer.can_hide").value(false))
                .andExpect(jsonPath("$.posts[0].image.aspect_ratio").value("4:5"))
                .andReturn().getResponse().getContentAsString();

        for (String leaked : List.of("user_id", "author_id", "global_user_id", "tenant_user_id", "author_user_id")) {
            assertEquals(-1, json.indexOf(leaked), "response must not expose " + leaked);
        }
    }

    @Test
    void createPostReadsSnakeCaseBody() throws Exception {
        when(community.createPost(any(), any())).thenReturn(samplePost());
        mvc.perform(post("/api/mobile/community/posts").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"topic\":\"T\",\"content\":\"C\",\"type\":\"tip\",\"gym_context\":\"gym-b\","
                                + "\"image\":{\"data_url\":\"data:image/png;base64,AA==\",\"aspect_ratio\":\"1:1\",\"crop_zoom\":120}}"))
                .andExpect(status().isOk());
        ArgumentCaptor<GlobalCommunityDtos.CreatePost> body = ArgumentCaptor.forClass(GlobalCommunityDtos.CreatePost.class);
        verify(community).createPost(any(), body.capture());
        assertEquals("gym-b", body.getValue().gymContext());
        assertEquals("data:image/png;base64,AA==", body.getValue().image().dataUrl());
        assertEquals(120, body.getValue().image().cropZoom());
    }

    @Test
    void communityErrorsCarryStatusAndStableCode() throws Exception {
        when(community.post(any(), anyLong())).thenThrow(CommunityException.notFound("Post"));
        mvc.perform(get("/api/mobile/community/posts/5"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));

        when(community.createPost(any(), any())).thenThrow(CommunityException.forbidden("NOT_A_MEMBER", "no"));
        mvc.perform(post("/api/mobile/community/posts").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("NOT_A_MEMBER"));
    }

    @Test
    void oversizedBodiesAreRejectedBeforeParsing() throws Exception {
        byte[] big = new byte[(int) CommunityRequestSizeFilter.MAX_BODY_BYTES + 1];
        mvc.perform(post("/api/mobile/community/posts").contentType(MediaType.APPLICATION_JSON).content(big))
                .andExpect(status().is(HttpStatus.PAYLOAD_TOO_LARGE.value()))
                .andExpect(jsonPath("$.error").value("PAYLOAD_TOO_LARGE"));
        verify(community, never()).createPost(any(), any());
    }

    @Test
    void eachPrefixMapsToItsOwnSurfaceAndTheHeaderIsOnlyAHint() throws Exception {
        when(community.feed(any(), any(), any(), any(), any())).thenReturn(new GlobalCommunityDtos.FeedPage(List.of(), null));
        ArgumentCaptor<Request> req = ArgumentCaptor.forClass(Request.class);

        mvc.perform(get("/api/community/global/feed")).andExpect(status().isOk());
        mvc.perform(get("/api/mobile/community/feed").header("X-Tenant-ID", " gym-a ")).andExpect(status().isOk());
        verify(community, org.mockito.Mockito.times(2)).feed(req.capture(), any(), any(), any(), any());

        assertEquals(Surface.WEB, req.getAllValues().get(0).surface());
        assertEquals("/api/community/global", req.getAllValues().get(0).imageBase());
        assertNull(req.getAllValues().get(0).selectedGym());
        assertEquals(Surface.MOBILE, req.getAllValues().get(1).surface());
        assertEquals("gym-a", req.getAllValues().get(1).selectedGym());
    }

    @Test
    void commentHiddenScopesSerializeAsList() throws Exception {
        GlobalCommunityDtos.Comment c = new GlobalCommunityDtos.Comment(1_000_000_005L, 1_000_000_001L, "hi",
                LocalDateTime.of(2026, 9, 25, 10, 0), true, Set.of("POST_OWNER_GYM"),
                new GlobalCommunityDtos.Author("Jessica", null, "MEMBER", "gym-b", null, null, false),
                new GlobalCommunityDtos.CommentViewer(false, false, Set.of(), Set.of("POST_OWNER_GYM")));
        when(community.comments(any(), eq(1_000_000_001L))).thenReturn(List.of(c));
        mvc.perform(get("/api/mobile/community/posts/1000000001/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].hidden").value(true))
                .andExpect(jsonPath("$[0].hidden_scopes[0]").value("POST_OWNER_GYM"))
                .andExpect(jsonPath("$[0].viewer.restore_scopes[0]").value("POST_OWNER_GYM"));
    }
}
