import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

public class TestApi {
    public static void main(String[] args) throws Exception {
        // Create basic auth header or login to get token if needed
        // Assuming we want to bypass auth for a second or auth is simple, but we don't have a token.
        // Let's just instantiate the DTO and serialize it using Jackson to see what it looks like!
        System.out.println("Wait, I can just write a Spring Boot test or use Jackson directly.");
    }
}
