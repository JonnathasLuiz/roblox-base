/**
 * Domain logic for the Game Model aspects.
 */

export const EffectType = {
    TAX_CHANGE: 'tax_change',
    TAX_FLOOR: 'tax_floor',
    TAX_CEILING: 'tax_ceiling',
    TAX_DISTRIBUTION: 'tax_distribution',
    BASE_PRICE: 'base_price',
    PRICE_FLOOR: 'price_floor',
    PRICE_CEILING: 'price_ceiling',
    REGULATION: 'regulation'
};

/**
 * Calculates the total tax rate and final price for a product.
 * @param {Object} product
 * @returns {Object} { totalTaxRate, finalPrice, breakdown }
 */
export function calculateProductPrice(product) {
    const taxes = product.taxes || {};
    const totalTaxRate = Object.values(taxes).reduce((acc, val) => acc + val, 0);
    const finalPrice = product.base_price * (1 + totalTaxRate);

    return {
        totalTaxRate,
        finalPrice,
        breakdown: taxes
    };
}
