function createStorageValidators(config) {
    function isForgeStorageKey(key) {
        if (typeof key !== "string") return false;
        if (!key || key.length > config.api.maxKeyLength) return false;
        if (!/^[A-Za-z0-9:_-]+$/.test(key)) return false;

        return (
            key.startsWith("forge_") ||
            key === "project_stakeholders_v7_compact_select" ||
            key.startsWith("project_stakeholders_")
        );
    }

    function normalizeStorageValue(value) {
        return String(value ?? "");
    }

    function validateStorageValue(value) {
        const normalizedValue = normalizeStorageValue(value);
        const sizeBytes = Buffer.byteLength(normalizedValue, "utf8");

        if (sizeBytes > config.api.maxValueBytes) {
            return {
                ok: false,
                error: `Valeur trop volumineuse (${sizeBytes} octets).`
            };
        }

        return {
            ok: true,
            value: normalizedValue,
            sizeBytes
        };
    }

    return {
        isForgeStorageKey,
        normalizeStorageValue,
        validateStorageValue
    };
}

module.exports = {
    createStorageValidators
};
