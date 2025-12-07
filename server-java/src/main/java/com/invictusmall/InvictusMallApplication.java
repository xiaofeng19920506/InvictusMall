package com.invictusmall;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class InvictusMallApplication {
    public static void main(String[] args) {
        SpringApplication.run(InvictusMallApplication.class, args);
    }
}


