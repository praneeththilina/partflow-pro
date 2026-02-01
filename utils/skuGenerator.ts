export const generateSKU = (description: string, existingSKUs: string[]): string => {
    if (!description) return '';

    // 1. Generate Base Acronym (First letter of every word)
    const base = description
        .split(/\s+/)
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, ''); // Remove special chars

    if (!base) return '';

    // 2. Find existing SKUs matching this base
    const matchingSKUs = existingSKUs.filter(sku => sku.startsWith(base));

    // 3. Find next available number
    let nextNum = 1;
    if (matchingSKUs.length > 0) {
        const numbers = matchingSKUs.map(sku => {
            const suffix = sku.substring(base.length);
            const num = parseInt(suffix);
            return isNaN(num) ? 0 : num;
        });
        nextNum = Math.max(...numbers) + 1;
    }

    // 4. Format: BASE + 01 (padded to 2 digits)
    return `${base}${nextNum.toString().padStart(2, '0')}`;
};
