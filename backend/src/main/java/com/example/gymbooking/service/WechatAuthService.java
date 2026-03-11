package com.example.gymbooking.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
public class WechatAuthService {

    @Value("${app.wechat.miniapp.appid:}")
    private String appId;

    @Value("${app.wechat.miniapp.secret:}")
    private String secret;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public String getOpenidByCode(String code) {
        if (appId == null || appId.isBlank() || secret == null || secret.isBlank()) {
            throw new RuntimeException("微信配置未设置");
        }

        try {
            String url = "https://api.weixin.qq.com/sns/jscode2session" +
                    "?appid=" + URLEncoder.encode(appId, StandardCharsets.UTF_8) +
                    "&secret=" + URLEncoder.encode(secret, StandardCharsets.UTF_8) +
                    "&js_code=" + URLEncoder.encode(code, StandardCharsets.UTF_8) +
                    "&grant_type=authorization_code";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            Map<String, Object> body = objectMapper.readValue(response.body(), new TypeReference<>() {});

            Object errCode = body.get("errcode");
            if (errCode != null && !"0".equals(String.valueOf(errCode))) {
                Object errMsg = body.get("errmsg");
                throw new RuntimeException("微信接口错误: " + (errMsg == null ? "" : String.valueOf(errMsg)));
            }

            Object openid = body.get("openid");
            if (openid == null || String.valueOf(openid).isBlank()) {
                throw new RuntimeException("未获取到openid");
            }

            return String.valueOf(openid);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("微信登录请求失败");
        }
    }
}
