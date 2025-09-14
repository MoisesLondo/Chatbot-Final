export function getUnit(unit: string | undefined, quantity: number): string {
    switch (unit) {
        case 'KILOGRAMO':
            return quantity === 1 ? 'kilogramo' : 'kilogramos';
        case 'UNIDAD':
            return quantity === 1 ? 'unidad' : 'unidades';
        case 'METRO':
            return quantity === 1 ? 'metro' : 'metros';
        case 'PIEZA':
            return quantity === 1 ? 'pieza' : 'piezas';
        default:
            return unit ? unit.toLowerCase() : '';
    }
}