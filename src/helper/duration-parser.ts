function textToMilliseconds(durationText: string): number | undefined {
  const nums = durationText
    .split(/[A-z]+/g)
    .filter((num) => !!num) // Remove empty strings
    .map((char) => parseInt(char, 10));
  const codes = durationText.split(/[0-9]+/g).filter((char) => !!char);

  // If the number of nums and codes don't match, return undefined
  if (nums.length !== codes.length) return;

  let duration = 0;
  for (let i = 0; i < nums.length; i++) {
    switch (codes[i]) {
      case 'y':
        duration += 31536000000 * nums[i];
        break;
      case 'M':
        duration += 2629800000 * nums[i];
        break;
      case 'w':
        duration += 604800000 * nums[i];
        break;
      case 'd':
        duration += 86400000 * nums[i];
        break;
      case 'h':
        duration += 3600000 * nums[i];
        break;
      case 'm':
        duration += 60000 * nums[i];
      case 's':
        duration += 1000 * nums[i];
    }
  }

  return duration;
}

export { textToMilliseconds };
