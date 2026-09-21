import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.mock.web.MockHttpServletRequest;

public class scratch {
    public static void main(String[] args) {
        AntPathRequestMatcher m = new AntPathRequestMatcher("/api/mobile/auth/**");
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/mobile/auth");
        System.out.println("Matches /api/mobile/auth : " + m.matches(req));
        
        MockHttpServletRequest req2 = new MockHttpServletRequest("GET", "/api/mobile/auth/");
        System.out.println("Matches /api/mobile/auth/ : " + m.matches(req2));
    }
}
