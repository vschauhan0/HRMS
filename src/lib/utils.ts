import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function convertTwoDigit(n: number): string {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return TENS[ten] + (one ? ' ' + ONES[one] : '');
}

function convertThreeDigit(n: number): string {
  if (n >= 1000 || n < 0) return '';
  if (n === 0) return '';
  if (n < 100) return convertTwoDigit(n);
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  return ONES[hundred] + ' Hundred' + (remainder ? ' and ' + convertTwoDigit(remainder) : '');
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const isNegative = num < 0;
  if (isNegative) num = -num;

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);

  const paise = Math.round((num - Math.floor(num)) * 100);

  let result = '';

  if (crore > 0) result += convertTwoDigit(crore) + ' Crore ';
  if (lakh > 0) result += convertTwoDigit(lakh) + ' Lakh ';
  if (thousand > 0) result += convertTwoDigit(thousand) + ' Thousand ';
  if (remainder > 0) result += convertThreeDigit(remainder);

  result = result.trim();
  if (!result) result = 'Zero';

  result += ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertTwoDigit(paise) + ' Paise';
  }

  result += ' Only';

  if (isNegative) result = 'Minus ' + result;

  return result;
}
