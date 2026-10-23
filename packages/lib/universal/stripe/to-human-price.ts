export const toHumanPrice = (price: number, currency = 'usd') => {
  if (currency.toLowerCase() === 'jpy') {
    return price.toLocaleString('ja-JP');
  }
  return Number(price / 100).toFixed(2);
};
