interface ColorToString {
  [key: string]: string;
}

const colorHex: ColorToString = {
  red: '#df1111',
  blue: '#1346df',
  green: '#109b08',
  yellow: '#fa9d0e',
  purple: '#991ad9',
};

const colorHexes = [colorHex.red, colorHex.blue, colorHex.green, colorHex.yellow, colorHex.purple];

export { ColorToString, colorHex, colorHexes };
