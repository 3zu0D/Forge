const crypto = require("crypto");

function timingSafeEqualString(left, right) {
    const leftBuffer = Buffer.from(String(left || ""));
    const rightBuffer = Buffer.from(String(right || ""));

    if (leftBuffer.length !== rightBuffer.length) return false;

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function applySecurityHeaders(_req, res, next) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=(), usb=(), serial=(), bluetooth=()");
    res.setHeader(
        "Content-Security-Policy",
        [
            "default-src 'self'",
            "script-src 'self' https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "connect-src 'self'",
            "font-src 'self' data:",
            "object-src 'none'",
            "base-uri 'self'",
            "frame-ancestors 'none'",
            "form-action 'self'"
        ].join("; ")
    );
    next();
}

function createRequireForgeAuth(config) {
    return function requireForgeAuth(req, res, next) {
        if (!config.auth.enabled) return next();

        const header = req.headers.authorization || "";

        if (!header.startsWith("Basic ")) {
            res.setHeader("WWW-Authenticate", 'Basic realm="Forge"');
            return res.status(401).send("Authentification requise.");
        }

        let decoded = "";

        try {
            decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
        } catch (_error) {
            res.setHeader("WWW-Authenticate", 'Basic realm="Forge"');
            return res.status(401).send("Authentification invalide.");
        }

        const separatorIndex = decoded.indexOf(":");
        const submittedUser = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : decoded;
        const submittedPassword = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : "";

        if (
            timingSafeEqualString(submittedUser, config.auth.user) &&
            timingSafeEqualString(submittedPassword, config.auth.password)
        ) {
            return next();
        }

        res.setHeader("WWW-Authenticate", 'Basic realm="Forge"');
        return res.status(401).send("Authentification refusée.");
    };
}

function getClientKey(req) {
    return req.ip || req.socket?.remoteAddress || "unknown";
}

function createApiRateLimiter(config) {
    const buckets = new Map();

    const cleanup = setInterval(() => {
        const now = Date.now();
        const windowMs = 60 * 1000;

        for (const [key, bucket] of buckets.entries()) {
            if (now - bucket.startedAt > windowMs) {
                buckets.delete(key);
            }
        }
    }, 60 * 1000);

    cleanup.unref();

    return function apiRateLimiter(req, res, next) {
        const limit = config.api.rateLimitPerMinute;

        if (!req.path.startsWith("/api/") || !limit || limit <= 0) {
            return next();
        }

        const now = Date.now();
        const windowMs = 60 * 1000;
        const key = getClientKey(req);
        const bucket = buckets.get(key);

        if (!bucket || now - bucket.startedAt > windowMs) {
            buckets.set(key, {
                startedAt: now,
                count: 1
            });
            return next();
        }

        bucket.count += 1;

        if (bucket.count > limit) {
            return res.status(429).json({
                error: "Trop de requêtes. Réessaie dans quelques secondes."
            });
        }

        return next();
    };
}

module.exports = {
    applySecurityHeaders,
    createRequireForgeAuth,
    createApiRateLimiter
};
