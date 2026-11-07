const BRANDS = ["Chevrolet", "Dodge", "Nissan", "Ford", "Toyota", "Cadillac", "Buick", "Mazda", "BMW", "Mercedes"];
const MODELS = ["Impala", "Hellcat", "Skyline R34", "Mustang GT", "Supra MK4", "Coupe de Ville", "Grand National", "RX-7", "M3 E30", "AMG GT"];

export function generateDealershipCatalog() {
    const catalog = [];
    for (let i = 1; i <= 100; i++) {
        const brand = BRANDS[i % BRANDS.length];
        const model = MODELS[i % MODELS.length] + ` Mk.${i}`;
        const price = 15000 + (i * 3500);
        const topSpeed = 1.3 + (i * 0.005);
        catalog.push({ id: i, name: `${brand} ${model}`, price, topSpeed });
    }
    return catalog;
}
