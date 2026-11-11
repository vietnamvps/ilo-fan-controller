# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please **do not** open a public issue. Instead, report it privately to the maintainer:

- **Contact:** Open a private security advisory via GitHub Repository Security Advisories.

Please include:
1. Description of the vulnerability and attack vector.
2. Steps to reproduce or proof-of-concept.
3. Potential impact and proposed remediation.

We take security seriously and will investigate and patch verified vulnerabilities promptly.

## Security Best Practices for Deployment

1. **Keep within LAN:** Never expose this controller directly to the public internet without strong authentication and HTTPS reverse proxy (e.g., Nginx, Caddy, or Cloudflare Tunnel).
2. **Enable Secure Cookies:** When deploying behind an HTTPS reverse proxy, ensure `COOKIE_SECURE=true` or rely on `COOKIE_SECURE=auto` with proper `X-Forwarded-Proto: https` headers.
3. **Protect Data Volume:** Ensure filesystem permissions on `./data` are restricted (e.g. `chmod 700 ./data` and `chown 1000:1000 ./data` for Docker).
